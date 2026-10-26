import prisma from "../db.server.js";
import { sendSetupReminderEmail } from "./email.server.js";
import { cacheGetOrSet } from "../cache.server.js";

const EXT_UUID = "eeecd3e9-ddb8-f1f8-6e66-ef13a12c0780e5eb934b";
const APP_HANDLE = "instafeed";

/**
 * Verify if the App Embed and Storefront Sections are enabled on the theme
 */
export async function verifyThemeEmbedAndSections(shop, themeId, accessToken, clientId = "") {
  if (!accessToken) {
    return { dynamicAppEmbedEnabled: false, dynamicSections: { grid: false } };
  }

  let resolvedThemeId = themeId;
  const apiVersion = "2024-01";

  if (!resolvedThemeId || resolvedThemeId === "current") {
    try {
      const themesUrl = `https://${shop}/admin/api/${apiVersion}/themes.json`;
      const themesRes = await fetch(themesUrl, {
        headers: { "X-Shopify-Access-Token": accessToken },
      }).then((r) => r.json());
      const liveTheme = themesRes.themes?.find((t) => t.role === "main") || themesRes.themes?.[0];
      if (liveTheme) {
        resolvedThemeId = String(liveTheme.id);
      }
    } catch (e) {
      console.warn("[setupReminder] Failed to resolve live theme ID:", e.message);
    }
  }

  if (!resolvedThemeId || resolvedThemeId === "current") {
    return { dynamicAppEmbedEnabled: false, dynamicSections: { grid: false } };
  }

  const cacheKey = `theme_embed_status:${shop}:${resolvedThemeId}`;
  return cacheGetOrSet(
    cacheKey,
    async () => {
      let dynamicAppEmbedEnabled = false;
      let dynamicSections = { grid: false };
      try {
        const assetKeys = [
          "config/settings_data.json",
          "templates/index.json",
          "templates/product.json",
          "templates/page.json",
          "templates/collection.json",
        ];

        const assetPromises = assetKeys.map((key) => {
          const url = `https://${shop}/admin/api/${apiVersion}/themes/${resolvedThemeId}/assets.json?asset[key]=${encodeURIComponent(key)}`;
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
            const allBlocks = [];
            if (parsedSettings.current?.blocks) allBlocks.push(...Object.values(parsedSettings.current.blocks));
            if (parsedSettings.blocks) allBlocks.push(...Object.values(parsedSettings.blocks));
            if (parsedSettings.current?.app_embeds) allBlocks.push(...Object.values(parsedSettings.current.app_embeds));
            if (parsedSettings.app_embeds) allBlocks.push(...Object.values(parsedSettings.app_embeds));
            if (parsedSettings.presets) {
              for (const preset of Object.values(parsedSettings.presets)) {
                if (preset?.blocks) allBlocks.push(...Object.values(preset.blocks));
              }
            }

            for (const b of allBlocks) {
              if (!b || !b.type) continue;
              const type = String(b.type).toLowerCase();
              const isInstafeed =
                type.includes("instafeed") ||
                type.includes("ai-instafeed") ||
                type.includes("ai_instafeed") ||
                (clientId && type.includes(clientId.toLowerCase())) ||
                type.includes(EXT_UUID.toLowerCase()) ||
                type.includes("019d9e97");

              const isAppEmbed = type.includes("app-embed") || type.includes("app_embed");
              const isDisabled = b.disabled === true || b.disabled === "true";

              if (isInstafeed && isAppEmbed && !isDisabled) {
                dynamicAppEmbedEnabled = true;
              }
            }
          } catch (e) {}
        }

        const templates = [indexData, productData, pageData, collectionData];
        for (const t of templates) {
          if (!t?.asset?.value) continue;
          try {
            const parsedTemplate = JSON.parse(t.asset.value);
            if (parsedTemplate.sections) {
              for (const sectionObj of Object.values(parsedTemplate.sections)) {
                if (sectionObj.disabled === true || sectionObj.disabled === "true") continue;

                const secType = String(sectionObj.type || "").toLowerCase();
                const isInstaSec =
                  (secType.includes("instafeed") ||
                    secType.includes("ai-instafeed") ||
                    secType.includes("ai_instafeed") ||
                    (clientId && secType.includes(clientId.toLowerCase())) ||
                    secType.includes(EXT_UUID.toLowerCase())) &&
                  secType.includes("feed-grid");

                if (isInstaSec) dynamicSections.grid = true;

                if (sectionObj.blocks) {
                  for (const blockObj of Object.values(sectionObj.blocks)) {
                    if (blockObj.disabled === true || blockObj.disabled === "true") continue;
                    const blkType = String(blockObj.type || "").toLowerCase();
                    const isInstaBlk =
                      (blkType.includes("instafeed") ||
                        blkType.includes("ai-instafeed") ||
                        blkType.includes("ai_instafeed") ||
                        (clientId && blkType.includes(clientId.toLowerCase())) ||
                        blkType.includes(EXT_UUID.toLowerCase())) &&
                      blkType.includes("feed-grid");

                    if (isInstaBlk) dynamicSections.grid = true;
                  }
                }
              }
            }
          } catch (err) {}
        }
      } catch (e) {
        console.warn("[setupReminder] Theme asset verification failed:", e.message);
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
