import prisma from "../db.server.js";
import { sendSetupReminderEmail } from "./email.server.js";
import { cacheGetOrSet } from "../cache.server.js";

const EXT_UUID = "eeecd3e9-ddb8-f1f8-6e66-ef13a12c0780e5eb934b";
const APP_HANDLE = "instafeed";

/**
 * Verify if the App Embed and Storefront Sections are enabled on the theme
 */
export async function verifyThemeEmbedAndSections(shop, themeId, accessToken, clientId = "") {
  if (!themeId || themeId === "current" || !accessToken) {
    return { dynamicAppEmbedEnabled: false, dynamicSections: { grid: false } };
  }
  const cacheKey = `theme_embed_status:${shop}:${themeId}`;
  return cacheGetOrSet(
    cacheKey,
    async () => {
      let dynamicAppEmbedEnabled = false;
      let dynamicSections = { grid: false };
      try {
        const apiVersion = "2024-01";
        const assetKeys = [
          "config/settings_data.json",
          "templates/index.json",
          "templates/product.json",
          "templates/page.json",
          "templates/collection.json",
        ];

        const assetPromises = assetKeys.map((key) => {
          const url = `https://${shop}/admin/api/${apiVersion}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`;
          return fetch(url, {
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          })
            .then((res) => res.json())
            .catch(() => null);
        });

        const [settingsData, indexData, productData, pageData, collectionData] = await Promise.all(assetPromises);

        if (settingsData?.asset?.value) {
          try {
            const parsedSettings = JSON.parse(settingsData.asset.value);
            if (parsedSettings.current?.blocks) {
              dynamicAppEmbedEnabled = Object.values(parsedSettings.current.blocks).some(
                (b) =>
                  b.type &&
                  (b.type.includes(clientId) || b.type.includes(EXT_UUID) || b.type.includes(APP_HANDLE)) &&
                  b.type.includes("app-embed") &&
                  !b.disabled
              );
            }
          } catch (e) {}
        }

        const templates = [indexData, productData, pageData, collectionData];
        for (const t of templates) {
          if (t?.asset?.value) {
            try {
              const parsedTemplate = JSON.parse(t.asset.value);
              if (parsedTemplate.sections) {
                for (const sectionObj of Object.values(parsedTemplate.sections)) {
                  if (sectionObj.disabled) continue;

                  if (
                    sectionObj.type &&
                    (sectionObj.type.includes(EXT_UUID) ||
                      sectionObj.type.includes(APP_HANDLE) ||
                      sectionObj.type.includes(clientId))
                  ) {
                    if (sectionObj.type.includes("feed-grid")) dynamicSections.grid = true;
                  }

                  if (sectionObj.blocks) {
                    for (const blockObj of Object.values(sectionObj.blocks)) {
                      if (blockObj.disabled) continue;
                      if (
                        blockObj.type &&
                        (blockObj.type.includes(EXT_UUID) ||
                          blockObj.type.includes(APP_HANDLE) ||
                          blockObj.type.includes(clientId))
                      ) {
                        if (blockObj.type.includes("feed-grid")) dynamicSections.grid = true;
                      }
                    }
                  }
                }
              }
            } catch (err) {}
          }
        }
      } catch (e) {
        console.warn("Theme asset verification failed:", e.message);
      }
      return { dynamicAppEmbedEnabled, dynamicSections };
    },
    300
  );
}

/**
 * Check a single store's setup status and send a reminder email if incomplete
 */
export async function checkAndSendSetupReminderForShop(shop, { force = false } = {}) {
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
  });

  if (!session || !session.accessToken) {
    return { success: false, reason: "No valid offline session found for store" };
  }

  // Deduplication: Don't send multiple reminder emails unless force is true
  if (!force) {
    const alreadySent = await prisma.webhookEvent.findFirst({
      where: { shop, topic: "setup/reminder_email" },
    });
    if (alreadySent) {
      return { success: false, reason: "Reminder email already sent previously", skipped: true };
    }
  }

  // Fetch shop metadata via GraphQL
  const shopQuery = `#graphql
    query {
      shop {
        name
        email
        myshopifyDomain
      }
      themes(first: 10, roles: [MAIN]) {
        nodes {
          id
          name
          role
        }
      }
    }
  `;

  const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": session.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: shopQuery }),
  });

  const resJson = await response.json();
  const shopData = resJson.data?.shop;
  const toEmail = shopData?.email || session.email;

  if (!toEmail) {
    return { success: false, reason: "No merchant email available for this shop" };
  }

  const liveThemeNode = resJson.data?.themes?.nodes?.[0];
  const liveThemeId = liveThemeNode ? liveThemeNode.id.replace("gid://shopify/Theme/", "") : "current";

  // Check Theme Embed and Grid Section status
  const clientId = process.env.SHOPIFY_CLIENT_ID || "";
  const { dynamicAppEmbedEnabled, dynamicSections } = await verifyThemeEmbedAndSections(
    shop,
    liveThemeId,
    session.accessToken,
    clientId
  );

  // Check Instagram connection status via metafield
  const mfQuery = `#graphql
    query {
      shop {
        metafield(namespace: "ai_instafeed", key: "config") {
          value
        }
      }
    }
  `;

  const mfRes = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": session.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: mfQuery }),
  });

  const mfJson = await mfRes.json();
  let isConnected = false;
  let instagramHandle = "";
  try {
    const rawVal = mfJson.data?.shop?.metafield?.value;
    if (rawVal) {
      const cfg = JSON.parse(rawVal);
      if (cfg?.account?.username) {
        isConnected = true;
        instagramHandle = cfg.account.username;
      }
    }
  } catch (_) {}

  const isAllSetupComplete = isConnected && dynamicAppEmbedEnabled && dynamicSections.grid;

  if (isAllSetupComplete && !force) {
    return { success: false, reason: "Store is already completely set up and live", skipped: true };
  }

  // Send the Reminder Email
  const emailRes = await sendSetupReminderEmail({
    to: toEmail,
    shop,
    shopName: shopData?.name || shop,
    myshopifyDomain: shopData?.myshopifyDomain || shop,
    isConnected,
    isEmbedActive: dynamicAppEmbedEnabled,
    isSectionActive: dynamicSections.grid,
    instagramHandle,
    themeId: liveThemeId,
  });

  if (emailRes.success) {
    await prisma.webhookEvent.create({
      data: {
        webhookId: `reminder_${shop}_${Date.now()}`,
        topic: "setup/reminder_email",
        shop,
      },
    }).catch(() => {});
  }

  return {
    success: emailRes.success,
    shop,
    to: toEmail,
    isConnected,
    isEmbedActive: dynamicAppEmbedEnabled,
    isSectionActive: dynamicSections.grid,
    error: emailRes.error,
  };
}

/**
 * Scan all installed stores and send setup reminder emails to those with incomplete setups
 */
export async function checkAndSendAllSetupReminders() {
  const sessions = await prisma.session.findMany({
    where: { isOnline: false },
  });

  const results = [];
  for (const session of sessions) {
    try {
      const res = await checkAndSendSetupReminderForShop(session.shop);
      results.push(res);
    } catch (e) {
      results.push({ shop: session.shop, success: false, error: e.message });
    }
  }

  return {
    totalChecked: sessions.length,
    results,
  };
}
