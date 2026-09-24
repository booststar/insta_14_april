import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFetcher, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { fetchShopConfig, fetchShopInstaData, fetchAllInstagramMedia } from "../instagramApi.server";
import { withRateLimit, trackApiResponse } from "../rateLimiter.server";
import { invalidateResource, cacheGetOrSet } from "../cache.server";
import { detectProductMatches } from "../utils/productMatcher";
import { sendSupportEmail } from "../utils/email.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Banner,
  Button,
  ButtonGroup,
  TextField,
  Select,
  RangeSlider,
  Checkbox,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Collapsible,
  ProgressBar,
  Modal,
  Icon,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  Spinner,
} from "@shopify/polaris";
import {
  XIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  ChatIcon,
  StarIcon,
  StoreIcon,
  DesktopIcon,
  MobileIcon,
  ViewIcon,
  ExternalIcon,
  PlayIcon,
  PlusIcon,
  CheckCircleIcon,
  EditIcon,
  MagicIcon,
} from "@shopify/polaris-icons";

// ─────────────────────────────────────────────────────────────────────────────
// Renders plain text with any bare URLs turned into clickable links.
// ─────────────────────────────────────────────────────────────────────────────
const linkifyText = (text) => {
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--p-color-text-brand)", fontWeight: 600, textDecoration: "underline" }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ICONS
// ─────────────────────────────────────────────────────────────────────────────
const ShoppableTagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const VideoMediaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M2 7.25h3.614L9.364 2H6a4 4 0 0 0-4 4v1.25Zm20 0h-6.543l3.641-5.097A4.002 4.002 0 0 1 22 6v1.25ZM2 8.75h20V18a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8.75Zm5.457-1.5L11.207 2h6.157l-3.75 5.25H7.457Zm7.404 7.953a.483.483 0 0 0 0-.837l-3.985-2.3a.483.483 0 0 0-.725.418v4.601c0 .372.403.605.725.419l3.985-2.301Z" />
  </svg>
);

const CarouselMediaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFFFFF" d="M20.453 8.5c.005.392.005.818.005 1.279v3.2c0 1.035 0 1.892-.057 2.591-.06.728-.187 1.403-.511 2.038a5.214 5.214 0 0 1-2.278 2.279c-.636.323-1.31.451-2.038.51-.699.058-1.556.058-2.59.058h-3.2c-.32 0-.624 0-.911-.002H5.395A3.856 3.856 0 0 0 8.485 22h7.724A5.793 5.793 0 0 0 22 16.207V8.483a3.856 3.856 0 0 0-1.548-3.093V8.5Z"/>
    <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M2 5.4A3.4 3.4 0 0 1 5.4 2h10.2A3.4 3.4 0 0 1 19 5.4v5.482l-1.91-1.25a4.037 4.037 0 0 0-4.767.253L7.87 13.528a2.763 2.763 0 0 1-3.262.173L2 11.994V5.4Zm14.392 5.299L19 12.406V15.6a3.4 3.4 0 0 1-3.4 3.4H5.4A3.4 3.4 0 0 1 2 15.6v-2.082l1.91 1.25a4.038 4.038 0 0 0 4.767-.253l4.453-3.643a2.763 2.763 0 0 1 3.262-.173ZM7.525 9.65a2.125 2.125 0 1 0 0-4.25 2.125 2.125 0 0 0 0 4.25Z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// CACHED THEME EMBED & SECTION VERIFIER
// ─────────────────────────────────────────────────────────────────────────────
async function getCachedThemeEmbedStatus(shop, themeId, accessToken, clientId) {
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
        const extUuid = "eeecd3e9-ddb8-f1f8-6e66-ef13a12c0780e5eb934b";
        const appHandle = "instafeed";

        if (settingsData?.asset?.value) {
          try {
            const parsedSettings = JSON.parse(settingsData.asset.value);
            if (parsedSettings.current?.blocks) {
              dynamicAppEmbedEnabled = Object.values(parsedSettings.current.blocks).some(
                (b) =>
                  b.type &&
                  (b.type.includes(clientId) || b.type.includes(extUuid) || b.type.includes(appHandle)) &&
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
                    (sectionObj.type.includes(extUuid) ||
                      sectionObj.type.includes(appHandle) ||
                      sectionObj.type.includes(clientId))
                  ) {
                    if (sectionObj.type.includes("feed-grid")) dynamicSections.grid = true;
                  }

                  if (sectionObj.blocks) {
                    for (const blockObj of Object.values(sectionObj.blocks)) {
                      if (blockObj.disabled) continue;
                      if (
                        blockObj.type &&
                        (blockObj.type.includes(extUuid) ||
                          blockObj.type.includes(appHandle) ||
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

// ─────────────────────────────────────────────────────────────────────────────
// LOADER
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const shop = session?.shop ?? "unknown";

  const isTest = process.env.BILLING_TEST_MODE !== "false";

  const [billingResult, configResult, instaResult, themeRes, productsRes] = await Promise.allSettled([
    billing.check({ plans: ["Pro Monthly"], isTest }),
    withRateLimit(shop, () => fetchShopConfig(admin, shop)),
    fetchShopInstaData(admin, shop),
    admin.graphql(`{ themes(first: 25) { nodes { id name role } } }`),
    admin.graphql(`{
      products(first: 100, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          tags
          featuredImage { url }
          variants(first: 1) {
            nodes {
              id
              price
            }
          }
        }
      }
    }`),
  ]);

  let subscription = null;
  if (billingResult.status === "fulfilled") {
    const billingCheck = billingResult.value;
    if (billingCheck.hasActivePayment) {
      const activeSub = billingCheck.appSubscriptions.find((s) => s.status === "ACTIVE");
      if (activeSub) subscription = activeSub;
    }
  } else {
    console.error("Billing check error:", billingResult.reason?.message);
  }

  const config = configResult.status === "fulfilled" ? configResult.value : null;
  const instaData = instaResult.status === "fulfilled" ? instaResult.value : null;
  if (configResult.status === "rejected") console.error("Config fetch error:", configResult.reason);

  let storeProducts = [];
  if (productsRes.status === "fulfilled") {
    try {
      const prodJson = await productsRes.value.json();
      const nodes = prodJson.data?.products?.nodes || [];
      storeProducts = nodes.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        tags: p.tags || [],
        image: p.featuredImage?.url || "",
        variantId: p.variants?.nodes?.[0]?.id ? String(p.variants.nodes[0].id).split("/").pop() : "default",
        price: p.variants?.nodes?.[0]?.price || "0.00",
      }));
    } catch (e) {
      console.warn("Failed to parse store products", e);
    }
  }

  trackApiResponse(shop, {});

  const requestUrl = new URL(request.url);
  const selectedThemeParam = requestUrl.searchParams.get("selectedThemeId") || requestUrl.searchParams.get("themeId");

  let allThemes = [];
  let themeId = "current";

  if (themeRes.status === "fulfilled") {
    try {
      const themeJson = await themeRes.value.json();
      const nodes = themeJson.data?.themes?.nodes || [];
      allThemes = nodes.map((t) => {
        const numericId = t.id.split("/").pop();
        const isLive = t.role === "MAIN";
        return {
          id: numericId,
          name: t.name || `Theme #${numericId}`,
          role: t.role,
          isLive,
        };
      });
      allThemes.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));

      const mainTheme = allThemes.find((t) => t.isLive);
      const matchedSelected = selectedThemeParam ? allThemes.find((t) => t.id === selectedThemeParam) : null;
      themeId = matchedSelected ? matchedSelected.id : mainTheme ? mainTheme.id : allThemes[0]?.id || "current";
    } catch (err) {
      console.warn("Failed to parse themes JSON", err);
    }
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const { dynamicAppEmbedEnabled, dynamicSections } = await getCachedThemeEmbedStatus(
    session?.shop,
    themeId,
    session?.accessToken,
    clientId
  );

  return {
    config: config ? JSON.stringify(config) : null,
    instaData: instaData ? JSON.stringify(instaData) : null,
    storeProducts,
    subscription,
    shop,
    themeId,
    allThemes,
    selectedThemeId: themeId,
    clientId,
    dynamicAppEmbedEnabled,
    dynamicSections,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop ?? "unknown";
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "submit_review") {
    const rating = formData.get("rating") || "5";
    const reviewText = formData.get("reviewText") || "";
    try {
      await sendSupportEmail({
        from: session?.email || `merchant@${shop}`,
        subject: `[Merchant Review] ${rating}-Star Rating from ${shop}`,
        message: `Merchant has submitted a ${rating}-Star review from the Dashboard:\n\nRating: ${rating} / 5 Stars\nStore: ${shop}\n\nReview Feedback:\n${reviewText || "No feedback text provided."}`,
        shop,
      });
      return { success: true, message: "Thank you for reviewing AI Instafeed!" };
    } catch (e) {
      console.error("[Review Submission Error]:", e.message);
      return { success: true };
    }
  }

  if (intent === "saveConfig") {
    const configData = formData.get("config");
    try {
      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopJson = await shopRes.json();
      const shopId = shopJson.data.shop.id;

      const parsedConfig = JSON.parse(configData);
      const metafields = [
        {
          ownerId: shopId,
          namespace: "ai_instafeed",
          key: "config",
          type: "json",
          value: configData,
        },
      ];

      if (!parsedConfig.instagramHandle) {
        metafields.push({
          ownerId: shopId,
          namespace: "ai_instafeed",
          key: "insta_data",
          type: "json",
          value: "null",
        });
      }

      const saveRes = await admin.graphql(
        `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { message }
          }
        }`,
        { variables: { metafields } }
      );

      const saveJson = await saveRes.json();
      if (saveJson.data?.metafieldsSet?.userErrors?.length > 0) {
        return { error: saveJson.data.metafieldsSet.userErrors[0].message };
      }
      await invalidateResource(shop, "config");
      await invalidateResource(shop, "insta_data");
      return { success: true, message: "Settings updated successfully" };
    } catch (e) {
      return { error: e.message || "Failed to save metafield" };
    }
  }

  const handle = formData.get("handle");

  if (!handle) return { error: "Please enter an Instagram username." };
  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!fbToken) {
    return { error: "Instagram connection isn't configured for this store yet. Please contact support." };
  }

  try {
    const allData = await fetchAllInstagramMedia(handle, shop);
    const shopRes = await admin.graphql(`{ shop { id } }`);
    const shopJson = await shopRes.json();
    const shopId = shopJson.data.shop.id;

    await admin.graphql(
      `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { message }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: "ai_instafeed",
              key: "insta_data",
              type: "json",
              value: JSON.stringify(allData),
            },
          ],
        },
      }
    );
    await invalidateResource(shop, "insta_data");

    return { data: allData };
  } catch (error) {
    return { error: error.message || "Failed to fetch Instagram data" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIG & PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  appliedTemplateId: "grid-profile",
  instagramHandle: "",
  aiCommentModeration: false,
  appSetup: { mainExt: false, sectionExt: false },
  postFeed: {
    header: true,
    metrics: true,
    load: false,
    carousel: false,
    layoutMode: "grid",
    marqueeSpeed: 32,
    autoplay: true,
    modalSound: false,
    modalNavigation: true,
    heading: "Welcome To @account",
    subheading: "Follow our journey · Fresh drops & store updates every week",
    typography: {
      heading: { size: 18, weight: "800", color: "#111827" },
      subheading: { size: 12, weight: "500", color: "#6b7280" },
    },
    alignment: "left",
    desktopColumns: 4,
    mobileColumns: 2,
    desktopLimit: 8,
    mobileLimit: 4,
    gap: 8,
    aspectRatio: "1/1",
    removeWatermark: false,
    showInstagramIcon: true,
    showFollowButton: true,
    followButtonPosition: "header",
    hiddenPostIds: [],
    paddingTop: 16,
    paddingBottom: 16,
    mediaTypeFilter: "all",
    sortBy: "latest",
    shoppablePins: true,
  },
  taggedProducts: {},
  stories: {
    enable: false,
    promoEnable: true,
    promoLabel: "Get 10% Off",
    promoDesc: "Take a screenshot of a product you wish to buy and tag us on Instagram for a 10% discount code!",
    showLabels: false,
    carousel: true,
    autoplay: true,
    alignment: "center",
    showHeader: true,
    heading: "SHOP OUR INSTAGRAM",
    subheading: "Tag us @account to get featured in our gallery!",
    typography: {
      heading: { size: 28, weight: "800", color: "#000" },
      subheading: { size: 14, weight: "400", color: "#666" },
    },
    animateImages: false,
    activeRing: false,
    pulseRing: false,
    ringColor: "#e1306c",
    showNavigation: true,
    paddingTop: 24,
    paddingBottom: 24,
    openPopup: true,
    removeWatermark: false,
    showFollowButton: false,
    mediaTypeFilter: "images",
    sortBy: "latest",
  },
};

const FEED_TYPOGRAPHY_PRESETS = [
  {
    name: "Modern Shoppable",
    desc: "Default bold look with shop instructions.",
    textHeading: "SHOP OUR INSTAGRAM",
    textSubheading: "Click on any post to shop the look instantly.",
    heading: { size: 24, weight: "800", color: "#1a1a1a" },
    subheading: { size: 14, weight: "500", color: "#4b5563" },
  },
  {
    name: "Social Proof",
    desc: "Clean customer showcase and lifestyle focus.",
    textHeading: "AS SEEN ON SOCIAL",
    textSubheading: "See how our community styles their favorite pieces.",
    heading: { size: 24, weight: "800", color: "#111827" },
    subheading: { size: 13, weight: "400", color: "#6b7280" },
  },
  {
    name: "Community Feed",
    desc: "Encouraging tagging and sharing.",
    textHeading: "JOIN THE COMMUNITY",
    textSubheading: "Tag us on Instagram to be featured on our page!",
    heading: { size: 22, weight: "800", color: "#0f172a" },
    subheading: { size: 13, weight: "500", color: "#475569" },
  },
  {
    name: "Minimalist Style",
    desc: "Subtle headings for clean design aesthetics.",
    textHeading: "Insta Gallery",
    textSubheading: "Curated moments from our daily feed.",
    heading: { size: 18, weight: "600", color: "#374151" },
    subheading: { size: 12, weight: "400", color: "#9ca3af" },
  },
  {
    name: "Luxury Lookbook",
    desc: "Sophisticated editorial serif vibe.",
    textHeading: "THE LOOKBOOK",
    textSubheading: "A visual journal of modern luxury and craftsmanship.",
    heading: { size: 28, weight: "800", color: "#000000" },
    subheading: { size: 15, weight: "400", color: "#1f2937" },
  },
  {
    name: "Vibrant Brand",
    desc: "Vivid Instagram-themed pink highlights.",
    textHeading: "FOLLOW US ON INSTAGRAM",
    textSubheading: "Get daily inspiration, updates, and behind-the-scenes access.",
    heading: { size: 24, weight: "800", color: "#e1306c" },
    subheading: { size: 13, weight: "500", color: "#c13584" },
  },
];

const isPresetMatch = (currentConfigSection, preset) => {
  if (!currentConfigSection || !currentConfigSection.typography) return false;
  const typo = currentConfigSection.typography;
  const checkColor = (c1, c2) => String(c1 || "").trim().toLowerCase() === String(c2 || "").trim().toLowerCase();
  return (
    String(currentConfigSection.heading || "").trim() === String(preset.textHeading || "").trim() &&
    String(currentConfigSection.subheading || "").trim() === String(preset.textSubheading || "").trim() &&
    Number(typo.heading.size) === Number(preset.heading.size) &&
    String(typo.heading.weight) === String(preset.heading.weight) &&
    checkColor(typo.heading.color, preset.heading.color) &&
    Number(typo.subheading.size) === Number(preset.subheading.size) &&
    String(typo.subheading.weight) === String(preset.subheading.weight) &&
    checkColor(typo.subheading.color, preset.subheading.color)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// READY-TO-USE DESIGN TEMPLATES LIBRARY
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_THUMBS = [
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1556760544-74068565f05c?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1512290900672-1f48ba635c40?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=300&h=300&fit=crop",
];

const FEED_TEMPLATES = [
  // ── Tier 1: Clean Essentials ───────────────────────────────────────────────
  {
    id: "grid-layout",
    name: "Grid layout",
    desc: "Symmetrical clean grid with uniform rows and columns.",
    type: "grid",
    config: {
      postFeed: {
        layoutMode: "grid",
        carousel: false,
        header: true,
        heading: "Shop Our Instagram",
        subheading: "Click on any photo to instantly shop the look",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 4,
        gap: 8,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: { enable: false },
    },
  },
  {
    id: "slider-layout",
    name: "Slider layout",
    desc: "Smooth sliding carousel with modern navigation arrows.",
    type: "carousel",
    config: {
      postFeed: {
        layoutMode: "carousel",
        carousel: true,
        header: true,
        heading: "Swipe Through Our Feed",
        subheading: "Scroll through our newest community posts & tagged looks",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 6,
        gap: 8,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: { enable: false },
    },
  },
  {
    id: "highlight-eurus",
    name: "Highlight Eurus layout",
    desc: "1 large hero post on the left with 4 square tiles on the right.",
    type: "highlight",
    config: {
      postFeed: {
        layoutMode: "highlight",
        carousel: false,
        header: true,
        heading: "Shop The Highlights",
        subheading: "Hand-picked favorites and top trending styles this week",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 5,
        mobileLimit: 5,
        gap: 6,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: { enable: false },
    },
  },

  // ── Tier 2: Profile Header Designs ─────────────────────────────────────────
  {
    id: "grid-profile",
    name: "Grid with profile layout",
    desc: "Profile header banner paired with a clean symmetrical grid.",
    type: "grid",
    config: {
      postFeed: {
        layoutMode: "grid",
        carousel: false,
        header: true,
        heading: "Welcome To @account",
        subheading: "Follow our journey · Fresh drops & store updates every week",
        alignment: "left",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 4,
        gap: 8,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "header",
      },
      stories: { enable: false },
    },
  },
  {
    id: "slider-profile",
    name: "Slider with profile layout",
    desc: "Profile header banner paired with an auto-sliding carousel.",
    type: "carousel",
    config: {
      postFeed: {
        layoutMode: "carousel",
        carousel: true,
        header: true,
        heading: "Connect With @account",
        subheading: "Join our community · Swipe through our daily moments",
        alignment: "left",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 6,
        gap: 8,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "header",
      },
      stories: { enable: false },
    },
  },
  {
    id: "highlight-profile",
    name: "Highlight with profile layout",
    desc: "Instagram profile header banner with 2x2 highlight grid.",
    type: "highlight",
    config: {
      postFeed: {
        layoutMode: "highlight",
        carousel: false,
        header: true,
        heading: "Follow @account",
        subheading: "Official Instagram · Discover our weekly featured story",
        alignment: "left",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 5,
        mobileLimit: 5,
        gap: 6,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "header",
      },
      stories: { enable: false },
    },
  },

  // ── Tier 3: Full Feature Layouts with Stories ──────────────────────────────
  {
    id: "grid-full",
    name: "Grid layout with full features",
    desc: "Circular story highlights with complete shoppable grid & product tags.",
    type: "grid",
    config: {
      postFeed: {
        layoutMode: "grid",
        carousel: false,
        header: true,
        heading: "As Seen On Social",
        subheading: "Browse our highlights & shop complete customer styles",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 4,
        gap: 8,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: {
        enable: true,
        promoEnable: true,
        promoLabel: "New Drop",
        activeRing: true,
        ringColor: "#833ab4",
        showLabels: false,
      },
    },
  },
  {
    id: "slider-full",
    name: "Slider layout with full features",
    desc: "Story highlights circles on top with horizontal carousel slider below.",
    type: "carousel",
    config: {
      postFeed: {
        layoutMode: "carousel",
        carousel: true,
        header: true,
        heading: "Explore Stories & Looks",
        subheading: "Watch daily highlights and swipe through customer favorites",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 6,
        gap: 8,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "videos",
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: {
        enable: true,
        promoEnable: true,
        promoLabel: "10% Off",
        activeRing: true,
        ringColor: "#e1306c",
        showLabels: false,
      },
    },
  },
  {
    id: "highlight-full",
    name: "Highlight layout with full features",
    desc: "Story highlights bar, 2x2 highlight grid, hover metrics & follow button.",
    type: "highlight",
    config: {
      postFeed: {
        layoutMode: "highlight",
        carousel: false,
        header: true,
        heading: "Featured Stories & Highlights",
        subheading: "Tap highlights above to explore deals, reviews & new arrivals",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 5,
        mobileLimit: 5,
        gap: 6,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "videos",
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: {
        enable: true,
        promoEnable: true,
        promoLabel: "Special Offer",
        activeRing: true,
        ringColor: "#e1306c",
        showLabels: false,
      },
    },
  },

  // ── Tier 4: Trending & Creative Formats ────────────────────────────────────
  {
    id: "reels-wall",
    name: "Reels video wall layout",
    desc: "9:16 vertical video reel showcase with auto-looping clips.",
    type: "reels",
    config: {
      postFeed: {
        layoutMode: "reels",
        carousel: true,
        header: true,
        heading: "Watch Our Reels",
        subheading: "Click any reel to watch with sound and shop featured items",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 4,
        gap: 8,
        aspectRatio: "9/16",
        metrics: true,
        mediaTypeFilter: "videos",
        autoplay: true,
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: { enable: false },
    },
  },
  {
    id: "masonry-lookbook",
    name: "Masonry Lookbook layout",
    desc: "Dynamic Pinterest-style staggered waterfall columns.",
    type: "masonry",
    config: {
      postFeed: {
        layoutMode: "masonry",
        carousel: false,
        header: true,
        heading: "Our Visual Lookbook",
        subheading: "Get inspired by community aesthetics, fit checks & styling ideas",
        alignment: "center",
        desktopColumns: 4,
        mobileColumns: 2,
        desktopLimit: 8,
        mobileLimit: 4,
        gap: 8,
        aspectRatio: "auto",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: true,
        followButtonPosition: "bottom",
      },
      stories: { enable: false },
    },
  },
  {
    id: "marquee-ticker",
    name: "Marquee ticker layout",
    desc: "Continuous infinite auto-scrolling social ticker ribbon.",
    type: "marquee",
    config: {
      postFeed: {
        layoutMode: "marquee",
        carousel: false,
        header: true,
        heading: "Live From Instagram",
        subheading: "Real-time feed streaming directly from our social feed",
        alignment: "center",
        desktopColumns: 6,
        mobileColumns: 3,
        desktopLimit: 12,
        mobileLimit: 6,
        gap: 8,
        marqueeSpeed: 30,
        aspectRatio: "1/1",
        metrics: true,
        mediaTypeFilter: "all",
        showFollowButton: false,
        followButtonPosition: "bottom",
      },
      stories: { enable: false },
    },
  },
];

function TemplateMockupThumbnail({ template }) {
  const t = template;
  const id = t.id;

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        background: "#18181b",
        borderRadius: "6px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
      }}
    >
      <svg
        viewBox="0 0 240 135"
        style={{ width: "100%", height: "100%", display: "block" }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="240" height="135" fill="#18181b" />

        {/* 1. Highlight Eurus: 1:1 Square Hero (90x90) on Left + 4 1:1 Square Tiles (43x43) on Right */}
        {id === "highlight-eurus" && (
          <g>
            <rect x="80" y="6" width="80" height="4" rx="2" fill="#ffffff" />
            {/* Hero Left: Exact 1:1 Square (90x90) */}
            <rect x="16" y="16" width="90" height="90" rx="3" fill="#ffffff" />
            <circle cx="61" cy="61" r="10" fill="rgba(0,0,0,0.15)" />
            {/* 4 Tiles Right: Exact 1:1 Squares (43x43 each, 43+4+43 = 90) */}
            <rect x="110" y="16" width="43" height="43" rx="2.5" fill="#e4e4e7" />
            <rect x="157" y="16" width="43" height="43" rx="2.5" fill="#a1a1aa" />
            <rect x="110" y="63" width="43" height="43" rx="2.5" fill="#ffffff" />
            <rect x="157" y="63" width="43" height="43" rx="2.5" fill="#e4e4e7" />
            {/* Bottom Follow button */}
            <rect x="88" y="117" width="64" height="8" rx="4" fill="#ffffff" />
          </g>
        )}

        {/* 2. Slider layout: 1:1 Square Slider Cards (46x46) + Nav Arrows */}
        {id === "slider-layout" && (
          <g>
            <rect x="85" y="10" width="70" height="4" rx="2" fill="#ffffff" />
            {/* Left Nav Arrow */}
            <circle cx="12" cy="63" r="7" fill="#ffffff" />
            <path d="M14 59L9 63L14 67" stroke="#18181b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            {/* 4 Slider Cards: Exact 1:1 Squares (46x46) */}
            <rect x="23" y="40" width="46" height="46" rx="3" fill="#ffffff" />
            <rect x="74" y="40" width="46" height="46" rx="3" fill="#e4e4e7" />
            <rect x="125" y="40" width="46" height="46" rx="3" fill="#ffffff" />
            <rect x="176" y="40" width="46" height="46" rx="3" fill="#a1a1aa" />
            {/* Right Nav Arrow */}
            <circle cx="228" cy="63" r="7" fill="#ffffff" />
            <path d="M226 59L231 63L226 67" stroke="#18181b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            {/* Bottom Follow button */}
            <rect x="88" y="108" width="64" height="8" rx="4" fill="#ffffff" />
          </g>
        )}

        {/* 3. Grid layout: 4x2 Grid of Exact 1:1 Square Tiles (46x46) */}
        {id === "grid-layout" && (
          <g>
            <rect x="85" y="6" width="70" height="4" rx="2" fill="#ffffff" />
            {/* Row 1: 1:1 Squares (46x46) */}
            <rect x="19" y="16" width="46" height="46" rx="2.5" fill="#ffffff" />
            <rect x="71" y="16" width="46" height="46" rx="2.5" fill="#e4e4e7" />
            <rect x="123" y="16" width="46" height="46" rx="2.5" fill="#ffffff" />
            <rect x="175" y="16" width="46" height="46" rx="2.5" fill="#a1a1aa" />
            {/* Row 2: 1:1 Squares (46x46) */}
            <rect x="19" y="66" width="46" height="46" rx="2.5" fill="#e4e4e7" />
            <rect x="71" y="66" width="46" height="46" rx="2.5" fill="#ffffff" />
            <rect x="123" y="66" width="46" height="46" rx="2.5" fill="#a1a1aa" />
            <rect x="175" y="66" width="46" height="46" rx="2.5" fill="#ffffff" />
            {/* Bottom Follow button */}
            <rect x="88" y="120" width="64" height="8" rx="4" fill="#ffffff" />
          </g>
        )}

        {/* 4. Highlight with profile: Profile Header + 1:1 Square Hero (88x88) + 4 1:1 Square Tiles (42x42) */}
        {id === "highlight-profile" && (
          <g>
            {/* Profile Header */}
            <circle cx="20" cy="15" r="8" fill="#ffffff" />
            <rect x="34" y="10" width="48" height="4" rx="2" fill="#ffffff" />
            <rect x="34" y="17" width="65" height="3" rx="1.5" fill="#a1a1aa" />
            <rect x="176" y="8" width="52" height="14" rx="7" fill="#ffffff" />
            <rect x="188" y="13" width="28" height="4" rx="2" fill="#18181b" />

            {/* Hero Left: Exact 1:1 Square (88x88) */}
            <rect x="16" y="28" width="88" height="88" rx="3" fill="#ffffff" />
            <circle cx="60" cy="72" r="10" fill="rgba(0,0,0,0.15)" />
            {/* 4 Tiles Right: Exact 1:1 Squares (42x42 each, 42+4+42 = 88) */}
            <rect x="108" y="28" width="42" height="42" rx="2.5" fill="#e4e4e7" />
            <rect x="154" y="28" width="42" height="42" rx="2.5" fill="#a1a1aa" />
            <rect x="108" y="74" width="42" height="42" rx="2.5" fill="#ffffff" />
            <rect x="154" y="74" width="42" height="42" rx="2.5" fill="#e4e4e7" />
          </g>
        )}

        {/* 5. Slider with profile: Profile Header + 1:1 Square Carousel Cards (50x50) */}
        {id === "slider-profile" && (
          <g>
            {/* Profile Header */}
            <circle cx="20" cy="15" r="8" fill="#ffffff" />
            <rect x="34" y="10" width="48" height="4" rx="2" fill="#ffffff" />
            <rect x="34" y="17" width="65" height="3" rx="1.5" fill="#a1a1aa" />
            <rect x="176" y="8" width="52" height="14" rx="7" fill="#ffffff" />
            <rect x="188" y="13" width="28" height="4" rx="2" fill="#18181b" />

            {/* Left Nav Arrow */}
            <circle cx="11" cy="71" r="7" fill="#ffffff" />
            <path d="M13 67L8 71L13 75" stroke="#18181b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            {/* 4 Slider Cards: Exact 1:1 Squares (50x50) */}
            <rect x="22" y="46" width="50" height="50" rx="3" fill="#ffffff" />
            <rect x="76" y="46" width="50" height="50" rx="3" fill="#e4e4e7" />
            <rect x="130" y="46" width="50" height="50" rx="3" fill="#ffffff" />
            <rect x="184" y="46" width="50" height="50" rx="3" fill="#a1a1aa" />
            {/* Right Nav Arrow */}
            <circle cx="229" cy="71" r="7" fill="#ffffff" />
            <path d="M227 67L232 71L227 75" stroke="#18181b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* 6. Grid with profile: Profile Header + 4x2 Grid of 1:1 Squares (48x48) */}
        {id === "grid-profile" && (
          <g>
            {/* Profile Header */}
            <circle cx="20" cy="15" r="8" fill="#ffffff" />
            <rect x="34" y="10" width="48" height="4" rx="2" fill="#ffffff" />
            <rect x="34" y="17" width="65" height="3" rx="1.5" fill="#a1a1aa" />
            <rect x="176" y="8" width="52" height="14" rx="7" fill="#ffffff" />
            <rect x="188" y="13" width="28" height="4" rx="2" fill="#18181b" />

            {/* Row 1: 1:1 Squares (48x48) */}
            <rect x="16" y="28" width="48" height="48" rx="2.5" fill="#ffffff" />
            <rect x="70" y="28" width="48" height="48" rx="2.5" fill="#e4e4e7" />
            <rect x="124" y="28" width="48" height="48" rx="2.5" fill="#ffffff" />
            <rect x="178" y="28" width="48" height="48" rx="2.5" fill="#a1a1aa" />
            {/* Row 2: 1:1 Squares (48x48) */}
            <rect x="16" y="80" width="48" height="48" rx="2.5" fill="#e4e4e7" />
            <rect x="70" y="80" width="48" height="48" rx="2.5" fill="#ffffff" />
            <rect x="124" y="80" width="48" height="48" rx="2.5" fill="#a1a1aa" />
            <rect x="178" y="80" width="48" height="48" rx="2.5" fill="#ffffff" />
          </g>
        )}

        {/* 7. Highlight full: Stories bar + 1:1 Square Hero (72x72) + 4 1:1 Square Tiles (34x34) */}
        {id === "highlight-full" && (
          <g>
            <rect x="85" y="4" width="70" height="4" rx="2" fill="#ffffff" />
            {/* 5 Story Bubbles */}
            <circle cx="24" cy="22" r="8.5" stroke="#e1306c" strokeWidth="1.5" fill="none" />
            <circle cx="24" cy="22" r="6" fill="#e1306c" />
            {[68, 112, 156, 200].map((cx, i) => (
              <g key={i}>
                <circle cx={cx} cy="22" r="8.5" stroke="#a1a1aa" strokeWidth="1.25" fill="none" />
                <circle cx={cx} cy="22" r="6" fill="#e4e4e7" />
              </g>
            ))}

            {/* Hero Left: Exact 1:1 Square (72x72) */}
            <rect x="24" y="36" width="72" height="72" rx="3" fill="#ffffff" />
            <circle cx="60" cy="72" r="8" fill="rgba(0,0,0,0.15)" />
            {/* 4 Tiles Right: Exact 1:1 Squares (34x34 each, 34+4+34 = 72) */}
            <rect x="100" y="36" width="34" height="34" rx="2" fill="#e4e4e7" />
            <rect x="138" y="36" width="34" height="34" rx="2" fill="#a1a1aa" />
            <rect x="100" y="74" width="34" height="34" rx="2" fill="#ffffff" />
            <rect x="138" y="74" width="34" height="34" rx="2" fill="#e4e4e7" />

            {/* Bottom Follow button */}
            <rect x="88" y="118" width="64" height="8" rx="4" fill="#ffffff" />
          </g>
        )}

        {/* 8. Slider full: Stories bar + 1:1 Square Carousel Cards (46x46) */}
        {id === "slider-full" && (
          <g>
            <rect x="85" y="4" width="70" height="4" rx="2" fill="#ffffff" />
            {/* 5 Story Bubbles */}
            <circle cx="24" cy="22" r="8.5" stroke="#e1306c" strokeWidth="1.5" fill="none" />
            <circle cx="24" cy="22" r="6" fill="#e1306c" />
            {[68, 112, 156, 200].map((cx, i) => (
              <g key={i}>
                <circle cx={cx} cy="22" r="8.5" stroke="#a1a1aa" strokeWidth="1.25" fill="none" />
                <circle cx={cx} cy="22" r="6" fill="#e4e4e7" />
              </g>
            ))}

            {/* Left Nav Arrow */}
            <circle cx="12" cy="71" r="6.5" fill="#ffffff" />
            <path d="M14 68L10 71L14 74" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
            {/* 4 Slider Cards: Exact 1:1 Squares (46x46) */}
            <rect x="24" y="48" width="46" height="46" rx="2.5" fill="#ffffff" />
            <rect x="74" y="48" width="46" height="46" rx="2.5" fill="#e4e4e7" />
            <rect x="124" y="48" width="46" height="46" rx="2.5" fill="#ffffff" />
            <rect x="174" y="48" width="46" height="46" rx="2.5" fill="#a1a1aa" />
            {/* Right Nav Arrow */}
            <circle cx="228" cy="71" r="6.5" fill="#ffffff" />
            <path d="M226 68L230 71L226 74" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />

            {/* Bottom Follow button */}
            <rect x="88" y="118" width="64" height="8" rx="4" fill="#ffffff" />
          </g>
        )}

        {/* 9. Grid full: Stories bar + 4x2 Grid of 1:1 Squares (38x38) */}
        {id === "grid-full" && (
          <g>
            <rect x="85" y="4" width="70" height="4" rx="2" fill="#ffffff" />
            {/* 5 Story Bubbles */}
            <circle cx="24" cy="22" r="8.5" stroke="#833ab4" strokeWidth="1.5" fill="none" />
            <circle cx="24" cy="22" r="6" fill="#833ab4" />
            {[68, 112, 156, 200].map((cx, i) => (
              <g key={i}>
                <circle cx={cx} cy="22" r="8.5" stroke="#a1a1aa" strokeWidth="1.25" fill="none" />
                <circle cx={cx} cy="22" r="6" fill="#e4e4e7" />
              </g>
            ))}

            {/* Row 1: 1:1 Squares (38x38) */}
            <rect x="28" y="36" width="38" height="38" rx="2.5" fill="#ffffff" />
            <rect x="72" y="36" width="38" height="38" rx="2.5" fill="#e4e4e7" />
            <rect x="116" y="36" width="38" height="38" rx="2.5" fill="#ffffff" />
            <rect x="160" y="36" width="38" height="38" rx="2.5" fill="#a1a1aa" />
            {/* Row 2: 1:1 Squares (38x38) */}
            <rect x="28" y="78" width="38" height="38" rx="2.5" fill="#e4e4e7" />
            <rect x="72" y="78" width="38" height="38" rx="2.5" fill="#ffffff" />
            <rect x="116" y="78" width="38" height="38" rx="2.5" fill="#a1a1aa" />
            <rect x="160" y="78" width="38" height="38" rx="2.5" fill="#ffffff" />

            {/* Bottom Follow button */}
            <rect x="88" y="121" width="64" height="8" rx="4" fill="#ffffff" />
          </g>
        )}

        {/* 10. Reels video wall: 4 vertical 9:16 portrait video cards (45x80 -> 45/80 = 9/16) */}
        {id === "reels-wall" && (
          <g>
            <rect x="75" y="6" width="90" height="4" rx="2" fill="#ffffff" />
            {/* Left Nav Arrow */}
            <circle cx="10" cy="58" r="6" fill="#ffffff" />
            <path d="M12 55L8 58L12 61" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />

            {[
              { x: 22, fill: "#ffffff" },
              { x: 74, fill: "#e4e4e7" },
              { x: 126, fill: "#ffffff" },
              { x: 178, fill: "#a1a1aa" },
            ].map((reel, idx) => (
              <g key={idx}>
                {/* Exact 9:16 vertical card (45x80) */}
                <rect x={reel.x} y="18" width="45" height="80" rx="4" fill={reel.fill} />
                <circle cx={reel.x + 22.5} cy="58" r="8" fill="rgba(24,24,27,0.45)" />
                <polygon
                  points={`${reel.x + 20},53 ${reel.x + 27},58 ${reel.x + 20},63`}
                  fill="#ffffff"
                />
              </g>
            ))}

            {/* Right Nav Arrow */}
            <circle cx="230" cy="58" r="6" fill="#ffffff" />
            <path d="M228 55L232 58L228 61" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />

            {/* Bottom Follow button */}
            <rect x="88" y="116" width="64" height="9" rx="4.5" fill="#ffffff" />
          </g>
        )}

        {/* 11. Marquee ticker: Continuous horizontal strip of 1:1 Squares (46x46) */}
        {id === "marquee-ticker" && (
          <g>
            <rect x="68" y="8" width="104" height="4" rx="2" fill="#ffffff" />
            {/* Continuous Ticker: Exact 1:1 Squares (46x46) */}
            <rect x="4" y="32" width="46" height="46" rx="3" fill="#ffffff" />
            <rect x="54" y="32" width="46" height="46" rx="3" fill="#e4e4e7" />
            <rect x="104" y="32" width="46" height="46" rx="3" fill="#ffffff" />
            <rect x="154" y="32" width="46" height="46" rx="3" fill="#e4e4e7" />
            <rect x="204" y="32" width="46" height="46" rx="3" fill="#a1a1aa" />

            {/* Motion ticker indicators */}
            <path d="M12 108L22 108M26 108L42 108M46 108L66 108" stroke="#a1a1aa" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M174 108L190 108M194 108L210 108M214 108L228 108" stroke="#a1a1aa" strokeWidth="1.75" strokeLinecap="round" />
          </g>
        )}

        {/* 12. Masonry Lookbook: 4 waterfall columns with staggered heights (Pinterest style) */}
        {id === "masonry-lookbook" && (
          <g>
            <rect x="85" y="6" width="70" height="4" rx="2" fill="#ffffff" />
            {/* Col 1 */}
            <rect x="16" y="18" width="46" height="52" rx="2.5" fill="#ffffff" />
            <rect x="16" y="74" width="46" height="34" rx="2.5" fill="#e4e4e7" />

            {/* Col 2 */}
            <rect x="68" y="18" width="46" height="34" rx="2.5" fill="#a1a1aa" />
            <rect x="68" y="56" width="46" height="52" rx="2.5" fill="#ffffff" />

            {/* Col 3 */}
            <rect x="120" y="18" width="46" height="56" rx="2.5" fill="#e4e4e7" />
            <rect x="120" y="78" width="46" height="30" rx="2.5" fill="#ffffff" />

            {/* Col 4 */}
            <rect x="172" y="18" width="46" height="38" rx="2.5" fill="#ffffff" />
            <rect x="172" y="60" width="46" height="48" rx="2.5" fill="#a1a1aa" />

            {/* Bottom Follow button */}
            <rect x="88" y="118" width="64" height="8" rx="4" fill="#ffffff" />
          </g>
        )}
      </svg>
    </div>
  );
}

function TemplateCard({ template, onApply, onPreview }) {
  return (
    <Card padding="300">
      <BlockStack gap="200">
        <TemplateMockupThumbnail template={template} />
        <div style={{ minHeight: "36px" }}>
          <Text variant="bodySm" fontWeight="bold" as="h4">
            {template.name}
          </Text>
        </div>
        <InlineStack align="space-between" blockAlign="center">
          <Button size="slim" onClick={() => onApply(template)}>
            Try it now
          </Button>
          <Button size="slim" variant="plain" onClick={() => onPreview(template)}>
            Preview
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

function LayoutStyleIcon({ type, active }) {
  const primaryColor = active ? "#1e293b" : "#64748b";
  const fillColor = active ? "#3b82f6" : "#cbd5e1";
  const heroFill = active ? "#2563eb" : "#94a3b8";

  switch (type) {
    case "grid":
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="9" height="7" rx="1.5" fill={fillColor} />
          <rect x="13" y="2" width="9" height="7" rx="1.5" fill={fillColor} />
          <rect x="2" y="11" width="9" height="7" rx="1.5" fill={fillColor} />
          <rect x="13" y="11" width="9" height="7" rx="1.5" fill={fillColor} />
        </svg>
      );
    case "carousel":
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 10L4.5 8M2.5 10L4.5 12" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="6" y="2.5" width="5.5" height="15" rx="1.5" fill={fillColor} />
          <rect x="12.5" y="2.5" width="5.5" height="15" rx="1.5" fill={fillColor} />
          <path d="M21.5 10L19.5 8M21.5 10L19.5 12" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "masonry":
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="5.5" height="9" rx="1.5" fill={fillColor} />
          <rect x="2" y="12.5" width="5.5" height="5.5" rx="1.5" fill={fillColor} />
          <rect x="9.25" y="2" width="5.5" height="5" rx="1.5" fill={fillColor} />
          <rect x="9.25" y="8.5" width="5.5" height="9.5" rx="1.5" fill={fillColor} />
          <rect x="16.5" y="2" width="5.5" height="8" rx="1.5" fill={fillColor} />
          <rect x="16.5" y="11.5" width="5.5" height="6.5" rx="1.5" fill={fillColor} />
        </svg>
      );
    case "highlight":
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="13" height="16" rx="2" fill={heroFill} />
          <rect x="16.5" y="2" width="5.5" height="7.2" rx="1.5" fill={fillColor} />
          <rect x="16.5" y="10.8" width="5.5" height="7.2" rx="1.5" fill={fillColor} />
        </svg>
      );
    case "reels":
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="5" height="14" rx="1.5" fill={fillColor} opacity="0.5" />
          <rect x="8.5" y="1.5" width="7" height="17" rx="2" fill={heroFill} />
          <polygon points="11,7.5 14,10 11,12.5" fill="#ffffff" />
          <rect x="17" y="3" width="5" height="14" rx="1.5" fill={fillColor} opacity="0.5" />
        </svg>
      );
    case "marquee":
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1.5 10H3.5" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="5" y="3" width="5.5" height="14" rx="1.5" fill={fillColor} />
          <rect x="12" y="3" width="5.5" height="14" rx="1.5" fill={fillColor} />
          <path d="M19.5 7.5L22 10L19.5 12.5" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED SINGLE-TAB CONFIGURATOR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function UnifiedConfigurator({
  config,
  updateConfig,
  setConfig,
  isPaid,
  isConnected,
  isHideMode,
  setIsHideMode,
  isTagMode,
  setIsTagMode,
  onAutoDetect,
  totalSuggestionsCount,
  onApproveAllHighConfidence,
  showStorySection,
  totalPostsCount,
  shopify,
  navigate,
  onApplyTemplate,
  handleSaveConfig,
  isSaving,
  hasUnsavedChanges,
  setIsSetupModalOpen,
  onCloseEditor,
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCustomizingExpanded, setIsCustomizingExpanded] = useState(false);

  const [isBrandingExpanded, setIsBrandingExpanded] = useState(true);
  const [isStoryExpanded, setIsStoryExpanded] = useState(true);
  const [isLayoutExpanded, setIsLayoutExpanded] = useState(true);
  const [isModerationExpanded, setIsModerationExpanded] = useState(false);

  const categories = [
    { id: "all", label: "All Designs" },
    { id: "grid", label: "Grid" },
    { id: "carousel", label: "Carousel" },
    { id: "highlight", label: "Highlight" },
    { id: "reels", label: "Reels (9:16)" },
    { id: "stories", label: "With Stories" },
    { id: "marquee", label: "Marquee" },
    { id: "masonry", label: "Masonry" },
  ];

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "all") return FEED_TEMPLATES;
    if (selectedCategory === "stories") return FEED_TEMPLATES.filter((t) => t.config.stories?.enable);
    if (selectedCategory === "carousel") return FEED_TEMPLATES.filter((t) => t.type === "carousel" || t.config.postFeed?.carousel);
    return FEED_TEMPLATES.filter((t) => t.type === selectedCategory || t.config.postFeed?.layoutMode === selectedCategory);
  }, [selectedCategory]);

  const isTemplateMatch = (template) => {
    const activeId = config.appliedTemplateId || "grid-profile";
    if (activeId) {
      return activeId === template.id;
    }
    const p = template.config.postFeed;
    const s = template.config.stories;
    const currentMode = config.postFeed?.layoutMode || (config.postFeed?.carousel ? "carousel" : "grid");
    const tplMode = p?.layoutMode || (p?.carousel ? "carousel" : "grid");
    if (currentMode !== tplMode) return false;
    if (Boolean(s?.enable) !== Boolean(config.stories?.enable)) return false;

    // Differentiate profile templates from standard templates
    const isTplProfile = template.id.includes("profile");
    const isConfigProfile =
      config.postFeed?.followButtonPosition === "header" ||
      config.postFeed?.alignment === "left" ||
      config.postFeed?.heading?.toLowerCase().includes("account");
    if (isTplProfile !== isConfigProfile) return false;

    return true;
  };

  return (
    <BlockStack gap="400">
      {/* ── Primary Section: Predefined Feed Designs ── */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingMd" as="h2" fontWeight="bold">
              Choose Design
            </Text>

            <InlineStack gap="200" blockAlign="center">
              {onCloseEditor && (
                <Button size="slim" onClick={onCloseEditor}>
                  Close
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                loading={isSaving}
              >
                Save
              </Button>
            </InlineStack>
          </InlineStack>

          {/* Category Filter Pills using Polaris Buttons */}
          <InlineStack gap="150" wrap>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Button
                  key={cat.id}
                  size="slim"
                  variant={isSelected ? "primary" : "secondary"}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </Button>
              );
            })}
          </InlineStack>

          <Divider />

          {/* Predefined Designs Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "12px" }}>
            {filteredTemplates.map((template) => {
              const isMatching = isTemplateMatch(template);
              return (
                <div
                  key={template.id}
                  onClick={() => onApplyTemplate(template)}
                  style={{
                    border: isMatching ? "2px solid #16a34a" : "1px solid #e1e3e5",
                    background: isMatching ? "#f0fdf4" : "#ffffff",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "10px",
                    boxShadow: isMatching ? "0 0 0 1px #16a34a" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <BlockStack gap="200">
                    <TemplateMockupThumbnail template={template} />
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodySm" fontWeight="bold">
                        {template.name}
                      </Text>
                      {isMatching ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="subdued">{template.type}</Badge>
                      )}
                    </InlineStack>
                  </BlockStack>

                  <Button
                    size="slim"
                    fullWidth
                    variant={isMatching ? "primary" : "secondary"}
                    tone={isMatching ? "success" : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyTemplate(template);
                    }}
                  >
                    {isMatching ? "Active on Preview" : "Apply Design"}
                  </Button>
                </div>
              );
            })}
          </div>
        </BlockStack>
      </Card>

      {/* ── Optional Customization Accordion ── */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <div
              onClick={() => setIsCustomizingExpanded(!isCustomizingExpanded)}
              style={{ cursor: "pointer", flex: 1 }}
            >
              <Text variant="headingSm" as="h3" fontWeight="bold">
                Customize Design
              </Text>
            </div>
            <Button
              variant="plain"
              icon={isCustomizingExpanded ? ChevronUpIcon : ChevronDownIcon}
              onClick={() => setIsCustomizingExpanded(!isCustomizingExpanded)}
              accessibilityLabel="Toggle customizer accordion"
            />
          </InlineStack>

          <Collapsible open={isCustomizingExpanded} id="unified-customizer-collapsible">
            <div style={{ paddingTop: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* ── 1. Heading & Typography Presets ── */}
              <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h3" fontWeight="bold">
              Header & Typography
            </Text>
            <Button
              variant="plain"
              icon={isBrandingExpanded ? ChevronUpIcon : ChevronDownIcon}
              onClick={() => setIsBrandingExpanded(!isBrandingExpanded)}
              accessibilityLabel="Toggle Header Section"
            />
          </InlineStack>

          <Collapsible open={isBrandingExpanded} id="unified-branding-collapsible">
            <BlockStack gap="300">
              <Checkbox
                label="Show Header"
                checked={config.postFeed.header}
                onChange={(val) => updateConfig("postFeed", "header", val)}
              />

              {config.postFeed.header && (
                <>
                  <TextField
                    label="Heading"
                    value={config.postFeed.heading}
                    onChange={(val) => updateConfig("postFeed", "heading", val)}
                    autoComplete="off"
                  />

                  <TextField
                    label="Subtitle"
                    value={config.postFeed.subheading}
                    onChange={(val) => updateConfig("postFeed", "subheading", val)}
                    autoComplete="off"
                  />

                  <Select
                    label="Alignment"
                    options={[
                      { label: "Center", value: "center" },
                      { label: "Left", value: "left" },
                      { label: "Right", value: "right" },
                    ]}
                    value={config.postFeed.alignment}
                    onChange={(val) => {
                      updateConfig("postFeed", "alignment", val);
                      updateConfig("stories", "alignment", val);
                    }}
                  />

                  <Text variant="bodySm" fontWeight="semibold">
                    Presets
                  </Text>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                    {FEED_TYPOGRAPHY_PRESETS.map((preset) => {
                      const isSelected = isPresetMatch(config.postFeed, preset);
                      return (
                        <Box
                          key={preset.name}
                          padding="200"
                          borderWidth="025"
                          borderColor={isSelected ? "border-brand" : "border"}
                          borderRadius="200"
                          background={isSelected ? "bg-surface-brand-active" : "bg-surface-secondary"}
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              postFeed: {
                                ...prev.postFeed,
                                heading: preset.textHeading,
                                subheading: preset.textSubheading,
                                typography: {
                                  heading: { ...preset.heading },
                                  subheading: { ...preset.subheading },
                                },
                              },
                            }));
                          }}
                          style={{ cursor: "pointer", textAlign: "center" }}
                        >
                          <Text variant="bodySm" fontWeight={isSelected ? "bold" : "medium"}>
                            {preset.name}
                          </Text>
                        </Box>
                      );
                    })}
                  </div>
                </>
              )}
            </BlockStack>
          </Collapsible>
        </BlockStack>
      </Card>

              {/* ── 2. Spacing & Post Limits ── */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3" fontWeight="bold">
                      Spacing & Post Limits
                    </Text>
                    <Button
                      variant="plain"
                      icon={isLayoutExpanded ? ChevronUpIcon : ChevronDownIcon}
                      onClick={() => setIsLayoutExpanded(!isLayoutExpanded)}
                      accessibilityLabel="Toggle Spacing & Limits Section"
                    />
                  </InlineStack>

                  <Collapsible open={isLayoutExpanded} id="unified-layout-collapsible">
                    <BlockStack gap="300">
                      <RangeSlider
                        label={`Grid Spacing Gap (${config.postFeed.gap}px)`}
                        value={config.postFeed.gap}
                        min={0}
                        max={40}
                        onChange={(val) => updateConfig("postFeed", "gap", val)}
                      />

                      {config.postFeed.layoutMode === "marquee" && (
                        <RangeSlider
                          label={`Scroll Speed (${config.postFeed.marqueeSpeed || 32}s)`}
                          value={config.postFeed.marqueeSpeed || 32}
                          min={15}
                          max={60}
                          step={1}
                          onChange={(val) => updateConfig("postFeed", "marqueeSpeed", val)}
                        />
                      )}

                      {config.postFeed.layoutMode !== "highlight" ? (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <Select
                              label="Desktop Columns"
                              options={[3, 4, 5, 6].map((n) => ({
                                label: `${n} Columns`,
                                value: String(n),
                              }))}
                              value={String(config.postFeed.desktopColumns || 4)}
                              onChange={(val) => {
                                const cols = parseInt(val);
                                const currentLimit = config.postFeed.desktopLimit || 8;
                                const nextLimit = currentLimit % cols !== 0 ? cols * 2 : currentLimit;
                                setConfig((prev) => ({
                                  ...prev,
                                  postFeed: {
                                    ...prev.postFeed,
                                    desktopColumns: cols,
                                    desktopLimit: nextLimit,
                                  },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                            <Select
                              label="Mobile Columns"
                              options={[1, 2, 3].map((n) => ({
                                label: `${n} Column${n > 1 ? "s" : ""}`,
                                value: String(n),
                              }))}
                              value={String(config.postFeed.mobileColumns || 2)}
                              onChange={(val) => {
                                const cols = parseInt(val);
                                const currentLimit = config.postFeed.mobileLimit || 4;
                                const nextLimit = currentLimit % cols !== 0 ? cols * 2 : currentLimit;
                                setConfig((prev) => ({
                                  ...prev,
                                  postFeed: {
                                    ...prev.postFeed,
                                    mobileColumns: cols,
                                    mobileLimit: nextLimit,
                                  },
                                }));
                                setHasUnsavedChanges(true);
                              }}
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <Select
                              label="Desktop Posts Limit"
                              options={[4, 6, 8, 12, 16, 20, 24].map((n) => ({
                                label: `${n} Posts ${!isPaid && n > 12 ? "(PRO)" : ""}`,
                                value: String(n),
                              }))}
                              value={String(config.postFeed.desktopLimit || 8)}
                              onChange={(val) => {
                                const num = parseInt(val);
                                if (!isPaid && num > 12) {
                                  shopify?.toast?.show("Unlock PRO for more than 12 posts", { isError: true });
                                  navigate("/app/plans");
                                  return;
                                }
                                updateConfig("postFeed", "desktopLimit", num);
                              }}
                            />
                            <Select
                              label="Mobile Posts Limit"
                              options={[3, 4, 6, 8, 12].map((n) => ({
                                label: `${n} Posts`,
                                value: String(n),
                              }))}
                              value={String(config.postFeed.mobileLimit || 4)}
                              onChange={(val) => updateConfig("postFeed", "mobileLimit", parseInt(val))}
                            />
                          </div>
                        </>
                      ) : (
                        <Banner tone="info">
                          Highlight layout uses a fixed 5-post layout (1 featured Hero + 4 square tiles).
                        </Banner>
                      )}

                      {config.postFeed.layoutMode !== "highlight" && config.postFeed.layoutMode !== "reels" && (
                        <Select
                          label="Aspect Ratio"
                          options={[
                            { label: "Original", value: "auto" },
                            { label: "Square (1:1)", value: "1/1" },
                            { label: "Portrait (4:5)", value: "4/5" },
                            { label: "Reel / Story (9:16)", value: "9/16" },
                          ]}
                          value={config.postFeed.aspectRatio || "auto"}
                          onChange={(val) => updateConfig("postFeed", "aspectRatio", val)}
                        />
                      )}

                      <div>
                        <Text variant="bodySm" fontWeight="medium">
                          Media Filter
                        </Text>
                        <Box paddingBlockStart="100">
                          <ButtonGroup variant="segmented">
                            <Button
                              pressed={config.postFeed.mediaTypeFilter === "videos" || !config.postFeed.mediaTypeFilter}
                              onClick={() => updateConfig("postFeed", "mediaTypeFilter", "videos")}
                            >
                              Videos & Reels
                            </Button>
                            <Button
                              pressed={config.postFeed.mediaTypeFilter === "all"}
                              onClick={() => updateConfig("postFeed", "mediaTypeFilter", "all")}
                            >
                              All Media
                            </Button>
                            <Button
                              pressed={config.postFeed.mediaTypeFilter === "images"}
                              onClick={() => updateConfig("postFeed", "mediaTypeFilter", "images")}
                            >
                              Images Only
                            </Button>
                          </ButtonGroup>
                        </Box>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                        <Checkbox
                          label="Show Likes & Comments on Hover"
                          checked={config.postFeed.metrics}
                          onChange={(val) => updateConfig("postFeed", "metrics", val)}
                        />
                        <Checkbox
                          label="Autoplay Videos"
                          checked={config.postFeed.autoplay}
                          onChange={(val) => updateConfig("postFeed", "autoplay", val)}
                        />
                      </div>
                    </BlockStack>
                  </Collapsible>
                </BlockStack>
              </Card>

              {/* ── 3. Story Highlights (Contextual) ── */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="headingSm" as="h3" fontWeight="bold">
                        Story Highlights
                      </Text>
                      <Badge tone={config.stories.enable ? "success" : "subdued"}>
                        {config.stories.enable ? "Active" : "Disabled"}
                      </Badge>
                    </InlineStack>
                    <Button
                      variant="plain"
                      icon={isStoryExpanded ? ChevronUpIcon : ChevronDownIcon}
                      onClick={() => setIsStoryExpanded(!isStoryExpanded)}
                      accessibilityLabel="Toggle Story Section"
                    />
                  </InlineStack>

                  <Collapsible open={isStoryExpanded} id="unified-story-collapsible">
                    <BlockStack gap="300">
                      <Checkbox
                        label="Enable Story Highlights Bar"
                        checked={config.stories.enable}
                        onChange={(val) => updateConfig("stories", "enable", val)}
                      />

                      {totalPostsCount < 6 && config.stories.enable && (
                        <Banner tone="info">
                          Stories appear on your storefront when your account has 6 or more posts.
                        </Banner>
                      )}

                      {config.stories.enable && (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                            <Checkbox
                              label="Rotating Ring"
                              checked={config.stories.activeRing}
                              onChange={(val) => updateConfig("stories", "activeRing", val)}
                            />
                            <Checkbox
                              label="Pulsing Ring"
                              checked={config.stories.pulseRing}
                              onChange={(val) => updateConfig("stories", "pulseRing", val)}
                            />
                            <Checkbox
                              label="Promo Bubble"
                              checked={config.stories.promoEnable}
                              onChange={(val) => updateConfig("stories", "promoEnable", val)}
                            />
                          </div>

                          {config.stories.promoEnable && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <TextField
                                label="Promo Title"
                                value={config.stories.promoLabel}
                                onChange={(val) => updateConfig("stories", "promoLabel", val)}
                                autoComplete="off"
                              />
                              <TextField
                                label="Promo Subtitle"
                                value={config.stories.promoDesc}
                                onChange={(val) => updateConfig("stories", "promoDesc", val)}
                                autoComplete="off"
                              />
                            </div>
                          )}

                          <div>
                            <Text variant="bodySm" fontWeight="medium">
                              Ring Color
                            </Text>
                            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                              {["#e1306c", "#833ab4", "#405de6", "#fd1d1d", "#fcb045", "#10b981", "#000000"].map((c) => (
                                <div
                                  key={c}
                                  onClick={() => updateConfig("stories", "ringColor", c)}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: c,
                                    cursor: "pointer",
                                    border: config.stories.ringColor === c ? "2px solid #000" : "1px solid #ddd",
                                    transform: config.stories.ringColor === c ? "scale(1.2)" : "scale(1)",
                                    transition: "transform 0.15s ease",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </BlockStack>
                  </Collapsible>
                </BlockStack>
              </Card>

              {/* ── 4. Follow Button & Actions ── */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3" fontWeight="bold">
                      Follow Button & Actions
                    </Text>
                    <Button
                      variant="plain"
                      icon={isModerationExpanded ? ChevronUpIcon : ChevronDownIcon}
                      onClick={() => setIsModerationExpanded(!isModerationExpanded)}
                      accessibilityLabel="Toggle Actions Section"
                    />
                  </InlineStack>

                  <Collapsible open={isModerationExpanded} id="unified-moderation-collapsible">
                    <BlockStack gap="300">
                      <Checkbox
                        label="Follow on Instagram Button"
                        checked={config.postFeed.showFollowButton !== false}
                        onChange={(val) => updateConfig("postFeed", "showFollowButton", val)}
                      />

                      {config.postFeed.showFollowButton !== false && (
                        <Select
                          label="Button Placement"
                          options={[
                            { label: "In the header", value: "header" },
                            { label: "At the bottom", value: "bottom" },
                          ]}
                          value={config.postFeed.followButtonPosition || (config.appliedTemplateId?.includes("profile") ? "header" : "bottom")}
                          onChange={(val) => updateConfig("postFeed", "followButtonPosition", val)}
                        />
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                        <Button
                          variant={isTagMode ? "primary" : "secondary"}
                          tone={isTagMode ? "success" : undefined}
                          onClick={() => {
                            if (!isConnected) {
                              shopify?.toast?.show("Please connect your Instagram account first to tag products", { isError: true });
                              if (setIsSetupModalOpen) setIsSetupModalOpen(true);
                              return;
                            }
                            setIsTagMode(!isTagMode);
                            if (!isTagMode) {
                              setIsHideMode(false);
                              shopify?.toast?.show("🏷️ Tag Mode ON — Click any post in the preview to tag products");
                            } else {
                              shopify?.toast?.show("Tag Mode turned off");
                            }
                          }}
                        >
                          {isTagMode ? "Exit Tag Mode" : "Tag Products"}
                        </Button>

                        <Button
                          variant={isHideMode ? "primary" : "secondary"}
                          tone={isHideMode ? "critical" : undefined}
                          onClick={() => {
                            if (!isConnected) {
                              shopify?.toast?.show("Please connect your Instagram account first to hide posts", { isError: true });
                              if (setIsSetupModalOpen) setIsSetupModalOpen(true);
                              return;
                            }
                            setIsHideMode(!isHideMode);
                            if (!isHideMode) {
                              setIsTagMode(false);
                              shopify?.toast?.show("👆 Hide Mode ON — Click any post in the preview to hide it");
                            } else {
                              shopify?.toast?.show("Hide Mode turned off");
                            }
                          }}
                        >
                          {isHideMode ? "Exit Hide Mode" : "Hide Posts"}
                        </Button>
                      </div>

                      {isTagMode && (
                        <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          <BlockStack gap="200">
                            <Text variant="bodyXs" fontWeight="bold">
                              ✨ Smart Product Matching
                            </Text>
                            <Button
                              variant="secondary"
                              onClick={onAutoDetect}
                              fullWidth
                            >
                              ⚡ Auto-Detect Matches {totalSuggestionsCount > 0 ? `(${totalSuggestionsCount} found)` : ""}
                            </Button>
                            {totalSuggestionsCount > 0 && (
                              <Button
                                variant="plain"
                                tone="success"
                                onClick={onApproveAllHighConfidence}
                              >
                                ✓ Approve All High Confidence ({totalSuggestionsCount})
                              </Button>
                            )}
                          </BlockStack>
                        </div>
                      )}
                    </BlockStack>
                  </Collapsible>
                </BlockStack>
              </Card>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "10px" }}>
              {onCloseEditor && (
                <Button onClick={onCloseEditor}>
                  Close
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                loading={isSaving}
              >
                Save
              </Button>
            </div>
          </div>
        </Collapsible>
      </BlockStack>
    </Card>
  </BlockStack>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Index() {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const saveFetcher = useFetcher();
  const loaderData = useLoaderData() || {};
  const shop = loaderData.shop || "";

  const [isHydrated, setIsHydrated] = useState(false);
  const [isAppBridgeReady, setIsAppBridgeReady] = useState(false);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const activeTab = selectedTabIndex === 0 ? "post" : "story";
  const [previewDevice, setPreviewDevice] = useState("desktop");

  const [searchParams, setSearchParams] = useSearchParams();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const reviewFetcher = useFetcher();

  useEffect(() => {
    if (searchParams.get("review") === "true") {
      setIsReviewModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (reviewFetcher.data?.success) {
      setReviewSubmitted(true);
    }
  }, [reviewFetcher.data]);

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("review");
    setSearchParams(newParams, { replace: true });
  };

  const handleSubmitReview = () => {
    reviewFetcher.submit(
      {
        intent: "submit_review",
        rating: String(reviewRating),
        reviewText,
      },
      { method: "post" }
    );
  };

  const isPaid = true;
  const planName = "Free Forever";

  const [instaData, setInstaData] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isInfiniteLoading, setIsInfiniteLoading] = useState(false);
  const [extraLoadCount, setExtraLoadCount] = useState(0);
  const [connectError, setConnectError] = useState(null);

  const PLACEHOLDER_MEDIA = useMemo(() => [
    {
      id: "placeholder_1",
      media_url: "https://picsum.photos/id/1027/800/800",
      thumbnail_url: "https://picsum.photos/id/1027/800/800",
      media_type: "IMAGE",
      caption: "Our signature collection ✨ Designed for effortless day-to-night styling. #shopify #newcollection #lifestyle",
      like_count: 342,
      comments_count: 18,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_2",
      media_url: "https://vjs.zencdn.net/v/oceans.mp4",
      thumbnail_url: "https://vjs.zencdn.net/v/oceans.png",
      media_type: "VIDEO",
      caption: "Behind the scenes look at our summer campaign 🌊 Discover the full collection in store. #reel #video #summer",
      like_count: 812,
      comments_count: 45,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_3",
      media_url: "https://picsum.photos/id/1011/800/800",
      thumbnail_url: "https://picsum.photos/id/1011/800/800",
      media_type: "IMAGE",
      caption: "Minimalist craftsmanship for every occasion. Styled with our handcrafted accessories 🤍 #collection #minimalist",
      like_count: 420,
      comments_count: 24,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_4",
      media_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      thumbnail_url: "https://picsum.photos/id/152/800/800",
      media_type: "VIDEO",
      caption: "Nature-inspired botanicals & fresh organic drop 🌸 Watch the details unfold! #reels #outfitinspo #shopify",
      like_count: 1240,
      comments_count: 89,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_5",
      media_url: "https://picsum.photos/id/1015/800/800",
      thumbnail_url: "https://picsum.photos/id/1015/800/800",
      media_type: "IMAGE",
      caption: "Weekend essentials in crisp neutral tones. Breathable, relaxed, perfected 🌿 #essentials #summercapsule",
      like_count: 518,
      comments_count: 31,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_6",
      media_url: "https://picsum.photos/id/1062/800/800",
      thumbnail_url: "https://picsum.photos/id/1062/800/800",
      media_type: "IMAGE",
      caption: "Monochrome moments. Tap to shop products featured in this photo 🖤 #capsulewardrobe #styleinspo",
      like_count: 673,
      comments_count: 40,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_7",
      media_url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      thumbnail_url: "https://media.w3.org/2010/05/sintel/poster.png",
      media_type: "VIDEO",
      caption: "Cinematic story of our latest release 🎬 Swipe to explore the lookbook! #behindthescenes #production",
      like_count: 940,
      comments_count: 67,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_8",
      media_url: "https://picsum.photos/id/1080/800/800",
      thumbnail_url: "https://picsum.photos/id/1080/800/800",
      media_type: "IMAGE",
      caption: "Curated collection for modern living. Handcrafted pieces available now online ✨ #statementjewelry #lifestyle",
      like_count: 380,
      comments_count: 22,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_9",
      media_url: "https://picsum.photos/id/1043/800/800",
      thumbnail_url: "https://picsum.photos/id/1043/800/800",
      media_type: "IMAGE",
      caption: "Clean lines and timeless materials. Tap to shop our flagship product 🍂 #productdrop #shoponline",
      like_count: 685,
      comments_count: 28,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_10",
      media_url: "https://picsum.photos/id/1060/800/800",
      thumbnail_url: "https://picsum.photos/id/1060/800/800",
      media_type: "IMAGE",
      caption: "Premium essentials for daily routine ☕️ Crafted with precision and sustainable care. #casualchic #cozyvibes",
      like_count: 490,
      comments_count: 17,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_11",
      media_url: "https://vjs.zencdn.net/v/oceans.mp4",
      thumbnail_url: "https://vjs.zencdn.net/v/oceans.png",
      media_type: "VIDEO",
      caption: "Product spotlight & live demonstration 🌊 Watch how it works! #productvideo #demo",
      like_count: 1120,
      comments_count: 75,
      permalink: "https://shopify.com",
    },
    {
      id: "placeholder_12",
      media_url: "https://picsum.photos/id/1069/800/800",
      thumbnail_url: "https://picsum.photos/id/1069/800/800",
      media_type: "IMAGE",
      caption: "Soft tailoring and everyday elegance 🌙 Designed to elevate your storefront seamlessly.",
      like_count: 560,
      comments_count: 32,
      permalink: "https://shopify.com",
    },
  ], []);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const savedConfigRef = useRef(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditingDesign, setIsEditingDesign] = useState(false);
  const [isHideMode, setIsHideMode] = useState(false);
  const [isTagMode, setIsTagMode] = useState(false);
  const [taggingPost, setTaggingPost] = useState(null);
  const [taggingPins, setTaggingPins] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState({});
  const [activePlacementSuggestion, setActivePlacementSuggestion] = useState(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(true);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [applyingTemplateName, setApplyingTemplateName] = useState("");

  const availableProducts = useMemo(() => {
    if (loaderData.storeProducts && loaderData.storeProducts.length > 0) {
      return loaderData.storeProducts;
    }
    return [
      { id: "prod_1", title: "Silk Slip Dress", handle: "silk-slip-dress", tags: ["silk", "dress", "champagne", "silkdress"], price: "89.00", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop", variantId: "1" },
      { id: "prod_2", title: "Linen Shirt", handle: "linen-shirt", tags: ["linen", "shirt", "summercapsule", "linenlove"], price: "55.00", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=400&fit=crop", variantId: "2" },
      { id: "prod_3", title: "Wide-Leg Pant", handle: "wide-leg-pant", tags: ["tailored", "pants", "capsulewardrobe"], price: "78.00", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=400&fit=crop", variantId: "3" },
      { id: "prod_4", title: "Cloud Soft Cardigan", handle: "cloud-soft-cardigan", tags: ["cardigan", "knitwear", "cozy"], price: "95.00", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop", variantId: "4" },
      { id: "prod_5", title: "Antioxidant Glow Duo", handle: "antioxidant-glow-duo", tags: ["skincare", "glow", "duo", "glowingskin"], price: "64.00", image: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=400&h=400&fit=crop", variantId: "5" },
    ];
  }, [loaderData.storeProducts]);

  const totalSuggestionsCount = useMemo(() => {
    return Object.values(suggestedTags).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  }, [suggestedTags]);

  const handleApplyTemplate = useCallback((template) => {
    setIsApplyingTemplate(true);
    setApplyingTemplateName(template.name || "Design");

    setTimeout(() => {
      const templateFollowPos = template.config.postFeed?.followButtonPosition || (template.id.includes("profile") ? "header" : "bottom");
      const isHighlight = template.config.postFeed?.layoutMode === "highlight" || template.type === "highlight";
      const targetDesktopLimit = template.config.postFeed?.desktopLimit || (isHighlight ? 5 : ((template.config.postFeed?.desktopColumns || 4) * 2));
      const targetMobileLimit = template.config.postFeed?.mobileLimit || (isHighlight ? 5 : ((template.config.postFeed?.mobileColumns || 2) * 2));
      setConfig((prev) => ({
        ...prev,
        appliedTemplateId: template.id,
        postFeed: {
          ...prev.postFeed,
          ...(template.config.postFeed || {}),
          desktopLimit: targetDesktopLimit,
          mobileLimit: targetMobileLimit,
          followButtonPosition: templateFollowPos,
          typography: {
            ...prev.postFeed.typography,
            ...(template.config.postFeed?.typography || {}),
          },
        },
        stories: {
          ...prev.stories,
          ...(template.config.stories || {}),
        },
      }));
      shopify?.toast?.show(`Applied "${template.name}" template!`);
      setIsTemplatesModalOpen(false);
      setPreviewingTemplate(null);

      setTimeout(() => {
        setIsApplyingTemplate(false);
        setApplyingTemplateName("");
      }, 350);
    }, 50);
  }, [shopify]);

  const handlePreviewTemplate = useCallback((template) => {
    setPreviewingTemplate(template);
  }, []);

  const isSaving = saveFetcher.state !== "idle";

  const applyChanges = useCallback(() => {
    const fd = new FormData();
    fd.append("intent", "saveConfig");
    fd.append("config", JSON.stringify(config));
    saveFetcher.submit(fd, { method: "post" });
  }, [config, saveFetcher]);

  const handleSaveConfig = useCallback(() => {
    applyChanges();
  }, [applyChanges]);

  const discardChanges = useCallback(() => {
    if (savedConfigRef.current) {
      setConfig(JSON.parse(JSON.stringify(savedConfigRef.current)));
    }
    setHasUnsavedChanges(false);
    shopify?.saveBar?.hide("app-config-save-bar");
    const saveBar = document.getElementById("app-config-save-bar");
    if (saveBar && typeof saveBar.hide === "function") {
      saveBar.hide();
    }
    shopify?.toast?.show("Unsaved changes discarded.");
  }, [shopify]);

  // Reactive dirty tracking: compare current config with savedConfigRef
  useEffect(() => {
    if (!savedConfigRef.current) return;
    const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfigRef.current);
    setHasUnsavedChanges(isDirty);
  }, [config]);

  useEffect(() => {
    if (saveFetcher.data?.success) {
      shopify?.toast?.show("✓ Feed design saved successfully!");
      savedConfigRef.current = JSON.parse(JSON.stringify(config));
      setHasUnsavedChanges(false);
      shopify?.saveBar?.hide("app-config-save-bar");
      const saveBar = document.getElementById("app-config-save-bar");
      if (saveBar && typeof saveBar.hide === "function") {
        saveBar.hide();
      }
      setIsEditingDesign(false);
    } else if (saveFetcher.data?.error) {
      shopify?.toast?.show(saveFetcher.data.error, { isError: true });
    }
  }, [saveFetcher.data, shopify, config]);

  const [isPostModulesExpanded, setIsPostModulesExpanded] = useState(true);
  const [isPostLayoutExpanded, setIsPostLayoutExpanded] = useState(false);
  const [isPostBrandingExpanded, setIsPostBrandingExpanded] = useState(false);
  const [isStoryModulesExpanded, setIsStoryModulesExpanded] = useState(true);
  const [isStoryBrandingExpanded, setIsStoryBrandingExpanded] = useState(false);

  const [errors, setErrors] = useState({});
  const mobileCarouselRef = useRef(null);
  const desktopCarouselRef = useRef(null);

  // ── Sync with Loader Data ──
  useEffect(() => {
    setIsHydrated(true);
    if (shopify) setIsAppBridgeReady(true);

    let loadedConfig = null;
    if (loaderData.config) {
      try {
        loadedConfig = typeof loaderData.config === "string" ? JSON.parse(loaderData.config) : loaderData.config;
      } catch (e) {}
    }

    const merged = {
      ...DEFAULT_CONFIG,
      ...loadedConfig,
      postFeed: {
        ...DEFAULT_CONFIG.postFeed,
        ...(loadedConfig?.postFeed || {}),
        typography: {
          ...DEFAULT_CONFIG.postFeed.typography,
          ...(loadedConfig?.postFeed?.typography || {}),
          heading: {
            ...DEFAULT_CONFIG.postFeed.typography.heading,
            ...(loadedConfig?.postFeed?.typography?.heading || {}),
          },
          subheading: {
            ...DEFAULT_CONFIG.postFeed.typography.subheading,
            ...(loadedConfig?.postFeed?.typography?.subheading || {}),
          },
        },
      },
      stories: {
        ...DEFAULT_CONFIG.stories,
        ...(loadedConfig?.stories || {}),
        typography: {
          ...DEFAULT_CONFIG.stories.typography,
          ...(loadedConfig?.stories?.typography || {}),
          heading: {
            ...DEFAULT_CONFIG.stories.typography.heading,
            ...(loadedConfig?.stories?.typography?.heading || {}),
          },
          subheading: {
            ...DEFAULT_CONFIG.stories.typography.subheading,
            ...(loadedConfig?.stories?.typography?.subheading || {}),
          },
        },
      },
    };

    savedConfigRef.current = JSON.parse(JSON.stringify(merged));
    setConfig(merged);
    setHasUnsavedChanges(false);

    if (loaderData.instaData) {
      try {
        const parsedInsta =
          typeof loaderData.instaData === "string" ? JSON.parse(loaderData.instaData) : loaderData.instaData;
        setInstaData(parsedInsta);
      } catch (e) {}
    }
  }, [loaderData, shopify]);

  const isConnected = useMemo(() => {
    if (!instaData || !config.instagramHandle) return false;
    return config.instagramHandle.trim().toLowerCase() === instaData.username?.toLowerCase();
  }, [instaData, config.instagramHandle]);

  const setupStep1 = isConnected;
  const setupStep2 = !!loaderData.dynamicAppEmbedEnabled;
  const setupStep3 = !!loaderData.dynamicSections?.grid;
  const welcomeCompletedSteps = (setupStep1 ? 1 : 0) + (setupStep2 ? 1 : 0) + (setupStep3 ? 1 : 0);
  const allTasksDone = isConnected && !!loaderData.dynamicAppEmbedEnabled;
  const isAllSetupComplete = allTasksDone;

  const [wizardStep, setWizardStep] = useState(isConnected ? 2 : 1);
  const [isWizardMode, setIsWizardMode] = useState(!isAllSetupComplete);
  const [isWelcomeExpanded, setIsWelcomeExpanded] = useState(!allTasksDone);

  const [isConnectExpanded, setIsConnectExpanded] = useState(!isConnected);
  const [isSetupExpanded, setIsSetupExpanded] = useState(isConnected && !isAllSetupComplete);

  useEffect(() => {
    if (allTasksDone) {
      setIsWelcomeExpanded(false);
    }
  }, [allTasksDone]);

  useEffect(() => {
    if (isConnected && wizardStep === 1) {
      setWizardStep(2);
    }
  }, [isConnected]);

  useEffect(() => {
    setIsConnectExpanded(!isConnected);
    setIsSetupExpanded(isConnected && !isAllSetupComplete);
  }, [isConnected, isAllSetupComplete]);

  // ── Handle Fetcher Responses ──
  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.data) {
      const { username, media, _totalPages } = fetcher.data.data;
      setInstaData(fetcher.data.data);
      setConnectError(null);
      setExtraLoadCount(0);

      const newConfig = {
        ...config,
        instagramHandle: username,
        postFeed: {
          ...config.postFeed,
          subheading: config.postFeed.subheading.replace(/@[\w.]+/g, `@${username}`),
        },
        stories: {
          ...config.stories,
          subheading: config.stories.subheading.replace(/@[\w.]+/g, `@${username}`),
        },
      };

      savedConfigRef.current = JSON.parse(JSON.stringify(newConfig));
      setConfig(newConfig);
      setHasUnsavedChanges(false);

      const fd = new FormData();
      fd.append("intent", "saveConfig");
      fd.append("config", JSON.stringify(newConfig));
      saveFetcher.submit(fd, { method: "post" });

      const totalPosts = media?.data?.length || 0;
      const pages = _totalPages || 1;
      shopify?.toast?.show(
        `✓ Connected @${username} · ${totalPosts} posts synced (${pages} page${pages > 1 ? "s" : ""} crawled)`
      );
    } else if (fetcher.data.error) {
      setConnectError(fetcher.data.error);
      shopify?.toast?.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const handleDisconnect = useCallback(() => {
    setInstaData(null);
    const newConfig = { ...config, instagramHandle: "" };
    savedConfigRef.current = JSON.parse(JSON.stringify(newConfig));
    setConfig(newConfig);
    setHasUnsavedChanges(false);

    const fd = new FormData();
    fd.append("intent", "saveConfig");
    fd.append("config", JSON.stringify(newConfig));
    saveFetcher.submit(fd, { method: "post" });

    shopify?.toast?.show("Instagram account disconnected successfully.");
  }, [config, saveFetcher, shopify]);

  const updateConfig = useCallback((section, key, value) => {
    setConfig((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    if (key === "mobileColumns" || key === "mobileLimit") setPreviewDevice("mobile");
    if (key === "desktopColumns" || key === "desktopLimit") setPreviewDevice("desktop");
    if (section === "stories") setSelectedTabIndex(1);
    if (section === "postFeed") setSelectedTabIndex(0);
  }, []);

  // ── Dirty State & Save Bar ──
  useEffect(() => {
    const saveBar = document.getElementById("app-config-save-bar");
    if (hasUnsavedChanges) {
      shopify?.saveBar?.show("app-config-save-bar");
      if (saveBar && typeof saveBar.show === "function") {
        saveBar.show();
      }
    } else {
      shopify?.saveBar?.hide("app-config-save-bar");
      if (saveBar && typeof saveBar.hide === "function") {
        saveBar.hide();
      }
    }
  }, [hasUnsavedChanges, shopify]);

  useEffect(() => {
    const saveBar = document.getElementById("app-config-save-bar");
    if (saveBar) {
      if (isSaving) {
        saveBar.setAttribute("loading", "true");
      } else {
        saveBar.removeAttribute("loading");
      }
    }
  }, [isSaving]);

  const handleToggleHidePost = useCallback((postId) => {
    setConfig((prev) => {
      const currentHidden = prev.postFeed.hiddenPostIds || [];
      const isCurrentlyHidden = currentHidden.includes(postId);
      const nextHidden = isCurrentlyHidden
        ? currentHidden.filter((id) => id !== postId)
        : [...currentHidden, postId];

      return {
        ...prev,
        postFeed: {
          ...prev.postFeed,
          hiddenPostIds: nextHidden,
        },
      };
    });
  }, []);

  // ── Formatted Data for Preview ──
  const baseMedia = useMemo(() => {
    if (instaData?.media?.data?.length > 0) return instaData.media.data;
    return PLACEHOLDER_MEDIA;
  }, [instaData, PLACEHOLDER_MEDIA]);

  // ── Smart Media Separation & Fallback Logic ──
  // Threshold rule: If less posts are there (< 6), only show feed, no need to display story section
  const totalPostsCount = baseMedia.length;
  const showStorySection = totalPostsCount >= 6 && config.stories?.enable !== false;

  // Story Media: Default to images (with fallback to baseMedia if 0 images)
  const storyMedia = useMemo(() => {
    if (!showStorySection) return [];
    let images = baseMedia.filter((m) => {
      const t = (m.media_type || "").toUpperCase();
      return t === "IMAGE" || t === "CAROUSEL_ALBUM" || t === "ALBUM";
    });
    if (images.length === 0) {
      images = baseMedia;
    }
    return images.slice(0, 10);
  }, [baseMedia, showStorySection]);

  // Feed Media: Default to videos & reels (with fallback to all media if 0 videos)
  const filteredGridMedia = useMemo(() => {
    let list = [...baseMedia];
    const filter = config.postFeed.mediaTypeFilter;
    if (filter === "images") {
      list = list.filter((m) => {
        const t = (m.media_type || "").toUpperCase();
        return t === "IMAGE" || t === "CAROUSEL_ALBUM" || t === "ALBUM";
      });
    } else if (filter === "videos" || !filter || filter === "default") {
      const videos = list.filter((m) => {
        const t = (m.media_type || "").toUpperCase();
        return t === "VIDEO" || t === "REEL" || (m.media_url && m.media_url.toLowerCase().includes(".mp4"));
      });
      // Fallback: If no videos exist in the account, show all media so feed is never blank
      list = videos.length > 0 ? videos : list;
    }
    if (isPaid && config.postFeed.sortBy === "engaging") {
      list.sort((a, b) => ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0)));
    }
    return list;
  }, [baseMedia, config.postFeed.mediaTypeFilter, config.postFeed.sortBy, isPaid]);

  const isCarouselLayout = config.postFeed.layoutMode === "carousel" || config.postFeed.layoutStyle === "carousel" || config.postFeed.carousel === true;

  const simulatedInfiniteMedia = useMemo(() => {
    // Only carousel displays all items for infinite horizontal swipe/scroll; all other layouts show strictly limited posts
    if (isCarouselLayout) {
      return filteredGridMedia;
    }
    if (config.postFeed.layoutMode === "highlight") {
      // Highlight layout: 1 hero (span 2x2) + 4 tiles = 5 posts total (remove trailing 3 posts)
      return filteredGridMedia.slice(0, 5);
    }
    const limit = previewDevice === "mobile" ? (config.postFeed.mobileLimit || 4) : (config.postFeed.desktopLimit || 8);
    return filteredGridMedia.slice(0, limit);
  }, [filteredGridMedia, isCarouselLayout, previewDevice, config.postFeed.mobileLimit, config.postFeed.desktopLimit, config.postFeed.layoutMode]);

  const hasMoreToShow = isCarouselLayout && (simulatedInfiniteMedia.length < filteredGridMedia.length);

  // ── Shoppable Tagging Stats & Filters for Home Page ──
  const taggingStats = useMemo(() => {
    const totalPosts = baseMedia.length || 0;
    const taggedMap = config.taggedProducts || {};
    let taggedPosts = 0;
    let totalPins = 0;

    baseMedia.forEach((item) => {
      const postId = item.id || item.media_url;
      const pins = taggedMap[postId] || [];
      if (pins.length > 0) {
        taggedPosts += 1;
        totalPins += pins.length;
      }
    });

    const untaggedPosts = Math.max(0, totalPosts - taggedPosts);
    const shoppableRate = totalPosts > 0 ? Math.round((taggedPosts / totalPosts) * 100) : 0;

    return {
      totalPosts,
      taggedPosts,
      untaggedPosts,
      totalPins,
      shoppableRate,
    };
  }, [baseMedia, config.taggedProducts]);

  const handleScroll = useCallback(
    (e, orientation = "horizontal") => {
      // Infinite scroll is strictly enabled on carousel horizontally
      if (!isCarouselLayout || orientation !== "horizontal") return;

      const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
      const threshold = 150;
      const nearEnd = scrollWidth - scrollLeft - clientWidth < threshold;

      if (nearEnd && hasMoreToShow && !isInfiniteLoading) {
        setIsInfiniteLoading(true);
        setTimeout(() => {
          setExtraLoadCount((prev) => prev + (previewDevice === "mobile" ? 4 : 8));
          setIsInfiniteLoading(false);
        }, 100);
      }
    },
    [isCarouselLayout, isInfiniteLoading, previewDevice, hasMoreToShow]
  );

  const scrollCarousel = useCallback((ref, direction) => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  const formatDynamicAccountText = (text) => {
    if (!text) return "";
    const handle = instaData?.username || config.instagramHandle || "account";
    return text.replace(/@account/gi, `@${handle}`);
  };

  const handleOpenTagging = (item) => {
    if (!isConnected) {
      shopify?.toast?.show("Please connect your Instagram account first to tag products", { isError: true });
      setIsSetupModalOpen(true);
      return;
    }
    if (!isPaid) {
      shopify?.toast?.show("Shoppable Product Hotspot Pins is a PRO feature", { isError: true });
      navigate("/app/plans");
      return;
    }
    const postId = item.id || item.media_url;
    setTaggingPost(item);
    setTaggingPins(config.taggedProducts?.[postId] || []);
    setActivePlacementSuggestion(null);
  };

  const handleAutoDetect = useCallback(() => {
    const matches = detectProductMatches(baseMedia, availableProducts, config.taggedProducts || {});
    setSuggestedTags(matches);
    const count = Object.values(matches).reduce((acc, curr) => acc + (curr?.length || 0), 0);
    if (count > 0) {
      shopify?.toast?.show(`⚡ Found ${count} product suggestion${count > 1 ? "s" : ""} based on post captions!`);
    } else {
      shopify?.toast?.show("No new product matches found in post captions.");
    }
  }, [baseMedia, availableProducts, config.taggedProducts, shopify]);

  const handleApproveSuggestion = useCallback((postId, suggestion) => {
    const newTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: suggestion.productId,
      variantId: suggestion.variantId,
      title: suggestion.title,
      handle: suggestion.handle,
      price: suggestion.price,
      image: suggestion.image,
    };

    let limitReached = false;
    setConfig((prev) => {
      const currentTags = prev.taggedProducts?.[postId] || [];
      if (currentTags.length >= 5) {
        limitReached = true;
        return prev;
      }
      return {
        ...prev,
        taggedProducts: {
          ...(prev.taggedProducts || {}),
          [postId]: [...currentTags, newTag],
        },
      };
    });

    if (limitReached) {
      shopify?.toast?.show("Maximum 5 products can be tagged per post", { isError: true });
      return;
    }

    if (taggingPost && (taggingPost.id === postId || taggingPost.media_url === postId)) {
      setTaggingPins((prev) => [...prev, newTag]);
    }

    setSuggestedTags((prev) => {
      const remaining = (prev[postId] || []).filter((s) => s.id !== suggestion.id && s.productId !== suggestion.productId);
      const next = { ...prev };
      if (remaining.length > 0) {
        next[postId] = remaining;
      } else {
        delete next[postId];
      }
      return next;
    });

    setHasUnsavedChanges(true);
    shopify?.toast?.show(`✓ Tagged "${suggestion.title}"!`);
  }, [taggingPost, shopify]);

  const handleApproveAllHighConfidence = useCallback(() => {
    let approvedCount = 0;
    setConfig((prev) => {
      const nextTagged = { ...(prev.taggedProducts || {}) };
      Object.entries(suggestedTags).forEach(([postId, list]) => {
        const highConf = list.filter((s) => s.confidence >= 75);
        if (highConf.length > 0) {
          const current = nextTagged[postId] || [];
          const availableSlots = Math.max(0, 5 - current.length);
          const newTags = highConf.slice(0, availableSlots).map((s, idx) => ({
            id: `tag_${Date.now()}_${idx}`,
            productId: s.productId,
            variantId: s.variantId,
            title: s.title,
            handle: s.handle,
            price: s.price,
            image: s.image,
          }));
          if (newTags.length > 0) {
            nextTagged[postId] = [...current, ...newTags];
            approvedCount += newTags.length;
          }
        }
      });
      return { ...prev, taggedProducts: nextTagged };
    });

    setSuggestedTags({});
    setHasUnsavedChanges(true);
    shopify?.toast?.show(`✓ Approved ${approvedCount} product tags across all posts!`);
  }, [suggestedTags, shopify]);

  const handleDismissSuggestion = useCallback((postId, suggestionId) => {
    setSuggestedTags((prev) => {
      const remaining = (prev[postId] || []).filter((s) => s.id !== suggestionId);
      const next = { ...prev };
      if (remaining.length > 0) {
        next[postId] = remaining;
      } else {
        delete next[postId];
      }
      return next;
    });
    shopify?.toast?.show("Suggestion dismissed");
  }, [shopify]);

  const handleTagProduct = async () => {
    if (!taggingPost) return;
    const postId = taggingPost.id || taggingPost.media_url;

    if (taggingPins.length >= 5) {
      shopify?.toast?.show("Maximum 5 products can be tagged per post", { isError: true });
      return;
    }

    try {
      if (shopify?.resourcePicker) {
        const selection = await shopify.resourcePicker({ type: "product", multiple: false });
        if (selection && selection.length > 0) {
          const p = selection[0];
          const variant = p.variants?.[0];
          const newTag = {
            id: `tag_${Date.now()}`,
            productId: p.id,
            variantId: variant?.id ? String(variant.id).split("/").pop() : "default",
            title: p.title,
            handle: p.handle,
            price: variant?.price || "0.00",
            image: p.images?.[0]?.originalSrc || p.featuredImage?.url || "",
          };
          const updatedTags = [...taggingPins, newTag];
          setTaggingPins(updatedTags);
          setConfig((prev) => ({
            ...prev,
            taggedProducts: {
              ...(prev.taggedProducts || {}),
              [postId]: updatedTags,
            },
          }));
          setHasUnsavedChanges(true);
          shopify?.toast?.show(`Tagged "${p.title}"!`);
        }
      } else {
        // Fallback simulation using available products
        const sampleProd = availableProducts[taggingPins.length % availableProducts.length] || availableProducts[0];
        const mockTag = {
          id: `tag_${Date.now()}`,
          productId: sampleProd?.id || `prod_${Date.now()}`,
          variantId: sampleProd?.variantId || `var_${Date.now()}`,
          title: sampleProd?.title || "Shoppable Product",
          handle: sampleProd?.handle || "shoppable-product",
          price: sampleProd?.price || "49.00",
          image: sampleProd?.image || taggingPost.media_url || taggingPost.thumbnail_url,
        };
        const updatedTags = [...taggingPins, mockTag];
        setTaggingPins(updatedTags);
        setConfig((prev) => ({
          ...prev,
          taggedProducts: {
            ...(prev.taggedProducts || {}),
            [postId]: updatedTags,
          },
        }));
        setHasUnsavedChanges(true);
        shopify?.toast?.show(`Tagged "${mockTag.title}"!`);
      }
    } catch (err) {
      console.warn("Tag product error:", err);
    }
  };

  const handleRemovePin = (tagId) => {
    const updatedTags = taggingPins.filter((p) => p.id !== tagId);
    setTaggingPins(updatedTags);
    const postId = taggingPost.id || taggingPost.media_url;
    setConfig((prev) => ({
      ...prev,
      taggedProducts: {
        ...(prev.taggedProducts || {}),
        [postId]: updatedTags,
      },
    }));
    setHasUnsavedChanges(true);
    shopify?.toast?.show("Tag removed");
  };

  const isSyncing = fetcher.state !== "idle";

  if (!isHydrated || !isAppBridgeReady) {
    return (
      <SkeletonPage primaryAction>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={3} />
              </Box>
            </Card>
            <Box paddingBlockStart="400">
              <Card>
                <SkeletonDisplayText size="small" />
                <Box paddingBlockStart="400">
                  <SkeletonBodyText lines={6} />
                </Box>
              </Card>
            </Box>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={2} />
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={6} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MEDIA CARD RENDERER
  // ─────────────────────────────────────────────────────────────────────────
  const renderMediaCard = (item, i, customAspect, customStyle = {}) => {
    const itemIdentifier = item.id || item.media_url;
    const isHidden = config.postFeed.hiddenPostIds?.includes(itemIdentifier);
    const aspect = customAspect || (config.postFeed.aspectRatio === "auto" ? "auto" : config.postFeed.aspectRatio || "1/1");

    const rawType = (item.media_type || "").toUpperCase();
    const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
    const isAlbum = rawType === "CAROUSEL_ALBUM" || rawType === "ALBUM";

    const itemTags = isConnected ? (config.taggedProducts?.[itemIdentifier] || item.taggedProducts || []) : [];
    const itemSuggestions = suggestedTags[itemIdentifier] || [];

    return (
      <div
        key={i}
        className="grid-item"
        onClick={() => {
          if (isHideMode) {
            handleToggleHidePost(itemIdentifier);
          } else if (isTagMode) {
            handleOpenTagging(item);
          } else {
            setSelectedPost(item);
          }
        }}
        style={{
          aspectRatio: aspect,
          background: "#f1f5f9",
          borderRadius: 0,
          border: "1px solid #e2e8f0",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
          cursor: isHideMode || isTagMode ? "pointer" : "default",
          opacity: isHideMode && isHidden ? 0.4 : 1,
          transition: "opacity 0.2s",
          ...customStyle,
        }}
      >
        {isHideMode && isHidden && (
          <div className="hidden-post-overlay">
            <span className="hidden-post-stamp">
              <Icon source={ViewIcon} tone="inherit" /> HIDDEN
            </span>
            <span className="hidden-post-hint">tap to unhide</span>
          </div>
        )}
        {itemTags.length > 0 && (
          <div style={{ position: "absolute", top: "8px", left: "8px", zIndex: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 7px",
                borderRadius: "10px",
                background: "rgba(15, 23, 42, 0.85)",
                backdropFilter: "blur(6px)",
                color: "#ffffff",
                fontSize: "9.5px",
                fontWeight: "700",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
              }}
            >
              🛍️ {itemTags.length}
            </span>
          </div>
        )}
        {isTagMode && itemSuggestions.length > 0 && (
          <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: "700",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              ⚡ {itemSuggestions.length} Suggested
            </span>
          </div>
        )}
        {isVideo && (item.media_url || item.thumbnail_url) ? (
          config.postFeed.autoplay ? (
            <video
              src={item.media_url}
              poster={item.thumbnail_url || "https://picsum.photos/id/1027/800/800"}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.errored) {
                  target.dataset.errored = "1";
                  target.style.display = "none";
                  const fallbackImg = target.parentElement?.querySelector(".video-fallback-img");
                  if (fallbackImg) fallbackImg.style.display = "block";
                }
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : item.thumbnail_url ? (
            <img
              loading="lazy"
              src={item.thumbnail_url}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://picsum.photos/id/1027/800/800";
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt="Shopify post"
            />
          ) : item.media_url ? (
            <video
              src={item.media_url}
              poster={item.thumbnail_url || "https://picsum.photos/id/1027/800/800"}
              muted
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null
        ) : item.media_url ? (
          <img
            loading="lazy"
            src={item.media_url}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://picsum.photos/id/1027/800/800";
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt="Shopify post"
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
              }}
            >
              {isVideo ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", marginTop: "6px" }}>
              Post #{i + 1}
            </span>
          </div>
        )}
        {config.postFeed.metrics && (
          <div className="media-metrics">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon source={HeartIcon} tone="inherit" />
              <span>{item.like_count ?? "0"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon source={ChatIcon} tone="inherit" />
              <span>{item.comments_count ?? "0"}</span>
            </div>
          </div>
        )}
        <div className="hover-card-overlay" />
      </div>
    );
  };

  const renderCarouselCard = (item, i) => (
    <div key={i} className="carousel-item">
      {renderMediaCard(item, i)}
    </div>
  );

  const renderPreviewFeed = (isMobile) => {
    const layout = config.postFeed.layoutMode || (config.postFeed.carousel ? "carousel" : "grid");
    const rawGap = config.postFeed.gap ?? 8;
    // Scale gap proportionally for the preview container (mobile frame is 280px wide)
    const gap = isMobile ? Math.min(Math.max(Math.round(rawGap * 0.5), 3), 6) : Math.min(rawGap, 8);
    const cols = isMobile ? (config.postFeed.mobileColumns || 2) : (config.postFeed.desktopColumns || 4);
    const carouselRef = isMobile ? mobileCarouselRef : desktopCarouselRef;

    if (layout === "carousel") {
      const itemWidth = `calc((100% - ${(cols - 1) * gap}px) / ${cols})`;
      return (
        <div className="carousel-wrapper" style={{ padding: `${Math.round(gap / 2)}px 0`, position: "relative" }}>
          <button
            className="carousel-nav prev"
            onClick={() => scrollCarousel(carouselRef, "prev")}
            style={{ width: isMobile ? "24px" : "32px", height: isMobile ? "24px" : "32px", left: "0px" }}
          >
            <Icon source={ChevronLeftIcon} />
          </button>
          <div
            className="carousel-container"
            ref={carouselRef}
            style={{
              padding: `0 ${gap}px`,
              "--carousel-gap": `${gap}px`,
              "--carousel-item-width": itemWidth,
            }}
          >
            {simulatedInfiniteMedia.map((item, i) => (
              <div key={item.id || i} className="carousel-item">
                {renderMediaCard(item, i)}
              </div>
            ))}
          </div>
          <button
            className="carousel-nav next"
            onClick={() => scrollCarousel(carouselRef, "next")}
            style={{ width: isMobile ? "24px" : "32px", height: isMobile ? "24px" : "32px", right: "0px" }}
          >
            <Icon source={ChevronRightIcon} />
          </button>
        </div>
      );
    }

    if (layout === "masonry") {
      const MASONRY_ASPECTS = ["4/5", "4/3", "4/3", "4/5", "3/4", "16/10", "1/1", "4/5"];
      return (
        <div
          style={{
            columnCount: cols,
            columnGap: `${gap}px`,
            padding: isMobile ? `4px ${gap}px` : "0",
          }}
        >
          {simulatedInfiniteMedia.map((item, i) => {
            const aspect = (config.postFeed.aspectRatio && config.postFeed.aspectRatio !== "auto")
              ? config.postFeed.aspectRatio
              : MASONRY_ASPECTS[i % MASONRY_ASPECTS.length];
            return (
              <div key={item.id || i} style={{ breakInside: "avoid", marginBottom: `${gap}px` }}>
                {renderMediaCard(item, i, aspect)}
              </div>
            );
          })}
        </div>
      );
    }

    if (layout === "highlight") {
      const highlightCols = isMobile ? 2 : 4;
      const highlightMedia = simulatedInfiniteMedia.slice(0, 5);
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${highlightCols}, 1fr)`,
            gridAutoRows: isMobile ? "auto" : "1fr",
            gap: `${gap}px`,
            padding: isMobile ? `4px ${gap}px` : "0",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {highlightMedia.map((item, i) => {
            const isHero = i === 0;
            return (
              <div
                key={item.id || i}
                style={
                  isHero
                    ? {
                        gridColumn: "span 2",
                        gridRow: isMobile ? "span 1" : "span 2",
                        width: "100%",
                        height: "100%",
                      }
                    : { width: "100%", height: "100%" }
                }
              >
                {renderMediaCard(item, i, "1/1", { width: "100%", height: "100%" })}
              </div>
            );
          })}
        </div>
      );
    }

    if (layout === "reels") {
      const reelWidth = isMobile ? `calc((100% - ${gap}px) / 2)` : `calc((100% - ${(cols - 1) * gap}px) / ${cols})`;
      return (
        <div className="carousel-wrapper" style={{ padding: `${Math.round(gap / 2)}px 0`, position: "relative" }}>
          <button
            className="carousel-nav prev"
            onClick={() => scrollCarousel(carouselRef, "prev")}
            style={{ width: isMobile ? "24px" : "32px", height: isMobile ? "24px" : "32px", left: "0px" }}
          >
            <Icon source={ChevronLeftIcon} />
          </button>
          <div
            className="carousel-container"
            ref={carouselRef}
            style={{
              padding: `0 ${gap}px`,
              "--carousel-gap": `${gap}px`,
              "--carousel-item-width": reelWidth,
            }}
          >
            {simulatedInfiniteMedia.map((item, i) => (
              <div key={item.id || i} className="carousel-item" style={{ borderRadius: "12px", overflow: "hidden" }}>
                {renderMediaCard(item, i, "9/16")}
              </div>
            ))}
          </div>
          <button
            className="carousel-nav next"
            onClick={() => scrollCarousel(carouselRef, "next")}
            style={{ width: isMobile ? "24px" : "32px", height: isMobile ? "24px" : "32px", right: "0px" }}
          >
            <Icon source={ChevronRightIcon} />
          </button>
        </div>
      );
    }

    if (layout === "marquee") {
      const itemWidth = isMobile ? "130px" : "160px";
      const speed = config.postFeed.marqueeSpeed || 32;
      return (
        <div
          style={{
            overflow: "hidden",
            width: "100%",
            position: "relative",
            padding: `${Math.round(gap / 2)}px 0`,
          }}
        >
          <style>{`
            @keyframes ai-preview-marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .ai-preview-ticker:hover {
              animation-play-state: paused !important;
            }
          `}</style>
          <div
            className="ai-preview-ticker"
            style={{
              display: "flex",
              width: "max-content",
              gap: `${gap}px`,
              animation: `ai-preview-marquee ${speed}s linear infinite`,
            }}
          >
            {[...simulatedInfiniteMedia, ...simulatedInfiniteMedia].map((item, i) => (
              <div key={`${item.id || i}-${i}`} style={{ width: itemWidth, flexShrink: 0 }}>
                {renderMediaCard(item, i)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default Grid
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gap}px`,
          padding: isMobile ? `4px ${gap}px` : "0",
        }}
      >
        {simulatedInfiniteMedia.map((item, i) => renderMediaCard(item, i))}
      </div>
    );
  };

  const renderPromoStoryItem = () => {
    const s = config.stories;
    const ringColor = s.ringColor || "#e1306c";

    return (
      <div
        key="promo-story"
        className="ai-story-item ai-promo-item"
        onClick={() => setSelectedPost({ isPromo: true })}
        style={{
          flexShrink: 0,
          width: "56px",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <div
          className="ai-story-ring-wrapper"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            padding: "2px",
            border: s.activeRing ? "none" : `2px solid ${ringColor}`,
            background: "white",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {s.activeRing && (
            <svg
              className={`ai-story-ring-svg ${s.pulseRing ? "ai-story-ring-pulse" : ""}`}
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                animation: "rotateRing 5s linear infinite",
                pointerEvents: "none",
              }}
            >
              <circle cx="50" cy="50" r="47.5" fill="none" stroke={ringColor} strokeWidth="5" strokeDasharray="8 4" />
            </svg>
          )}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const renderStoryItem = (item, i) => {
    const s = config.stories;
    const ringColor = s.ringColor || "#e1306c";
    const rawType = (item.media_type || "").toUpperCase();
    const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));

    return (
      <div
        key={item.id || i}
        className="ai-story-item"
        onClick={() => setSelectedPost(item)}
        style={{
          flexShrink: 0,
          width: "56px",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <div
          className="ai-story-ring-wrapper"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            padding: "2px",
            border: s.activeRing ? "none" : `2px solid ${ringColor}`,
            background: "white",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {s.activeRing && (
            <svg
              className={`ai-story-ring-svg ${s.pulseRing ? "ai-story-ring-pulse" : ""}`}
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                animation: "rotateRing 5s linear infinite",
                pointerEvents: "none",
              }}
            >
              <circle cx="50" cy="50" r="47.5" fill="none" stroke={ringColor} strokeWidth="5" strokeDasharray="8 4" />
            </svg>
          )}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              background: "#f1f5f9",
              position: "relative",
              zIndex: 1,
            }}
          >
            {isVideo ? (
              <video
                src={item.media_url}
                poster={item.thumbnail_url || undefined}
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <img
                src={item.media_url || item.thumbnail_url || "https://picsum.photos/id/1027/800/800"}
                alt="Story"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://picsum.photos/id/1027/800/800";
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFollowButton = (inHeader = false) => {
    const handle = (instaData?.username || config.instagramHandle || "").replace("@", "").trim();
    if (!handle) return null;
    return (
      <div style={{ textAlign: inHeader ? config.postFeed.alignment : "center", marginTop: inHeader ? "6px" : "10px", marginBottom: inHeader ? "4px" : "4px" }}>
        <a
          href={`https://instagram.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ai-follow-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: inHeader ? "4px 12px" : "6px 14px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: inHeader ? "10.5px" : "11.5px",
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span>Follow on Instagram</span>
        </a>
      </div>
    );
  };

  return (
    <Page fullWidth>
      <BlockStack gap="400">
        <style>{`
          @media (max-width: 1024px) {
            .instafeed-main-dashboard-grid {
              grid-template-columns: 1fr !important;
            }
            #feed-preview-container {
              position: static !important;
            }
          }
        `}</style>
        {/* ── 1. Top Header Bar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ fontSize: "21px", fontWeight: "700", color: "#111827", margin: 0, letterSpacing: "-0.3px" }}>
              Welcome to AI Instafeed Expert!
            </h1>
            <Badge tone="success">Free Forever</Badge>
          </div>
        </div>

        {/* ── 2. Red Alert Banner (When Unlinked) ── */}
        {!isConnected && (
          <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #fecaca", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <div
              style={{
                background: "#dc2626",
                color: "#ffffff",
                padding: "10px 16px",
                fontWeight: "700",
                fontSize: "13.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "14px" }}>⚠️</span>
              <span>Connect Instagram account</span>
            </div>
            <div
              style={{
                background: "#ffffff",
                padding: "14px 16px",
                fontSize: "13.5px",
                color: "#334155",
              }}
            >
              To continue, you need to connect your Instagram account.
            </div>
          </div>
        )}

        {/* ── 3. Quick Setup Guide Banner (Clean & Modern) ── */}
        <div
          id="welcome-widget-card"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "12px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {!allTasksDone && <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              ⚡
            </div>}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                  {allTasksDone ? "Setup completed" : "Quick Setup Guide"}
                </span>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  · {(isConnected ? 1 : 0) + (loaderData.dynamicAppEmbedEnabled ? 1 : 0)} of 2 steps completed
                </span>
              </div>
            </div>
          </div>

          {!isConnected && (
            <div
              style={{ flex: "1 1 320px", maxWidth: "480px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && config.instagramHandle.trim() && !isSyncing) {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.append("handle", config.instagramHandle);
                  fetcher.submit(fd, { method: "post" });
                }
              }}
            >
              <InlineStack gap="200" wrap={false} blockAlign="center">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Instagram username"
                    labelHidden
                    prefix="@"
                    placeholder="Your Instagram username or profile link"
                    value={config.instagramHandle}
                    autoComplete="off"
                    clearButton
                    onClearButtonClick={() => setConfig((prev) => ({ ...prev, instagramHandle: "" }))}
                    onChange={(val) => {
                      let v = val;
                      if (v.includes("instagram.com/")) {
                        const parts = v.split("instagram.com/")[1].split(/[/?#]/).filter(Boolean);
                        if (parts.length > 0) v = parts[0];
                      }
                      v = v.replace("@", "").split("?")[0].trim();
                      setConfig((prev) => ({ ...prev, instagramHandle: v }));
                      setConnectError(null);
                    }}
                  />
                </div>
                <Button
                  variant="primary"
                  loading={isSyncing}
                  disabled={!config.instagramHandle.trim()}
                  onClick={() => {
                    const fd = new FormData();
                    fd.append("handle", config.instagramHandle);
                    fetcher.submit(fd, { method: "post" });
                  }}
                >
                  Connect
                </Button>
              </InlineStack>
              {connectError && (
                <div style={{ marginTop: "8px" }}>
                  <Banner tone="critical">
                    <Text variant="bodySm">{linkifyText(connectError)}</Text>
                  </Banner>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isConnected && (
              <Button variant="plain" tone="critical" onClick={() => setIsDisconnectConfirmOpen(true)}>
                {`Disconnect @${instaData?.username || config.instagramHandle}`}
              </Button>
            )}
            {!isConnected ? (
              <Button variant="plain" icon={MagicIcon} onClick={() => setIsSetupModalOpen(true)}>
                Setup Your Instagram
              </Button>
            ) : !loaderData.dynamicAppEmbedEnabled ? (
              <Button
                variant="primary"
                icon={ExternalIcon}
                onClick={() => {
                  const url = `https://${loaderData.shop}/admin/themes/${loaderData.themeId}/editor?context=apps&activateAppId=${loaderData.clientId}/app-embed&activateAppEmbed=${loaderData.clientId}/app-embed`;
                  window.open(url, "_blank");
                }}
              >
                Enable in Theme
              </Button>
            ) : (
              <Button
                icon={
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#16a34a",
                      color: "#ffffff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    ✓
                  </span>
                }
                onClick={() => setIsSetupModalOpen(true)}
              >
                Setup Your Instagram
              </Button>
            )}
          </div>
        </div>

        {/* ── Shoppable Tags (Top Bar - Only when Connected) ── */}
        {isConnected && (
          <Card padding="300">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              {/* Left: Title & Live Metric Badges */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <Text variant="headingSm" as="h3" fontWeight="bold">
                  Shoppable Tags
                </Text>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <Badge tone={taggingStats.taggedPosts > 0 ? "success" : "info"}>
                    {`${taggingStats.taggedPosts}/${taggingStats.totalPosts} Tagged (${taggingStats.shoppableRate}%)`}
                  </Badge>
                  {taggingStats.untaggedPosts > 0 && (
                    <Badge tone="attention">
                      {`${taggingStats.untaggedPosts} Untagged`}
                    </Badge>
                  )}
                  <Badge>
                    {`${taggingStats.totalPins} Tags`}
                  </Badge>
                  {totalSuggestionsCount > 0 && (
                    <Badge tone="magic">
                      {`${totalSuggestionsCount} AI Matches`}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right: Functional Action Buttons */}
              <InlineStack gap="200" wrap>
                <Button
                  size="slim"
                  variant="primary"
                  icon={MagicIcon}
                  onClick={handleAutoDetect}
                  loading={isSyncing}
                >
                  AI Auto-Detect
                </Button>
                {totalSuggestionsCount > 0 && (
                  <Button
                    size="slim"
                    tone="success"
                    onClick={handleApproveAllHighConfidence}
                  >
                    {`Approve AI Tags (${totalSuggestionsCount})`}
                  </Button>
                )}
                <Button
                  size="slim"
                  onClick={() => navigate("/app/tagging")}
                >
                  Tag Products
                </Button>
              </InlineStack>
            </div>
          </Card>
        )}

        {/* ── 3. Main Dashboard Layout (Configurator & Live Preview) ── */}
        <div
          style={
            isEditingDesign
              ? {
                  display: "grid",
                  gridTemplateColumns: "minmax(340px, 42%) minmax(480px, 58%)",
                  gap: "24px",
                  alignItems: "flex-start",
                  width: "100%",
                }
              : {
                  width: "100%",
                }
          }
          className={isEditingDesign ? "instafeed-main-dashboard-grid" : ""}
        >
          {/* ── Left Column: Unified Single-Tab Configurator (Only in Edit Mode) ── */}
          {isEditingDesign && (
            <div id="unified-configurator-card" style={{ minWidth: 0 }}>
              <UnifiedConfigurator
                config={config}
                updateConfig={updateConfig}
                setConfig={setConfig}
                isPaid={isPaid}
                isConnected={isConnected}
                isHideMode={isHideMode}
                setIsHideMode={setIsHideMode}
                isTagMode={isTagMode}
                setIsTagMode={setIsTagMode}
                onAutoDetect={handleAutoDetect}
                totalSuggestionsCount={totalSuggestionsCount}
                onApproveAllHighConfidence={handleApproveAllHighConfidence}
                showStorySection={showStorySection}
                totalPostsCount={totalPostsCount}
                shopify={shopify}
                navigate={navigate}
                onApplyTemplate={handleApplyTemplate}
                handleSaveConfig={handleSaveConfig}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                setIsSetupModalOpen={setIsSetupModalOpen}
                onCloseEditor={() => setIsEditingDesign(false)}
              />
            </div>
          )}

          {/* ── Live Storefront Preview (Expanded Width & Sticky when Editing, Full Width when Saved) ── */}
          <div
            id="feed-preview-container"
            style={{
              position: isEditingDesign ? "sticky" : "static",
              top: isEditingDesign ? "20px" : undefined,
              zIndex: 25,
              minWidth: 0,
              width: "100%",
            }}
          >
            <Card>
              <div style={{ position: "relative" }}>
                {isApplyingTemplate && (
                  <div
                    style={{
                      position: "absolute",
                      inset: "-12px",
                      background: "rgba(255, 255, 255, 0.85)",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)",
                      zIndex: 100,
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "14px",
                      pointerEvents: "all",
                      animation: "fadeIn 0.15s ease-out",
                    }}
                  >
                    <div
                      style={{
                        padding: "18px 24px",
                        background: "#ffffff",
                        borderRadius: "14px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                        textAlign: "center",
                        minWidth: "200px",
                      }}
                    >
                      <Spinner accessibilityLabel="Applying design template" size="large" />
                      <div>
                        <Text variant="headingSm" as="h4">
                          Applying Design
                        </Text>
                        {applyingTemplateName && (
                          <div style={{ marginTop: "3px" }}>
                            <Text variant="bodyXs" tone="subdued">
                              {applyingTemplateName}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center" wrap={false}>
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="headingSm" as="h3">
                        {isEditingDesign ? "Live Preview" : "Live Storefront Preview"}
                      </Text>
                      {!isEditingDesign && (
                        <Badge tone="success">Saved & Live</Badge>
                      )}
                      {isEditingDesign && (
                        <Badge tone="info">Editing</Badge>
                      )}
                    </InlineStack>

                    <InlineStack gap="200" blockAlign="center">
                      <ButtonGroup variant="segmented">
                        <Button
                          pressed={previewDevice === "mobile"}
                          icon={MobileIcon}
                          onClick={() => setPreviewDevice("mobile")}
                          accessibilityLabel="Mobile View"
                        />
                        <Button
                          pressed={previewDevice === "desktop"}
                          icon={DesktopIcon}
                          onClick={() => setPreviewDevice("desktop")}
                          accessibilityLabel="Desktop View"
                        />
                      </ButtonGroup>

                      {isEditingDesign ? (
                        <Button
                          size="slim"
                          onClick={() => setIsEditingDesign(false)}
                        >
                          Close Editor
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          icon={EditIcon}
                          onClick={() => setIsEditingDesign(true)}
                        >
                          Edit Design
                        </Button>
                      )}
                    </InlineStack>
                  </InlineStack>

                    {!isConnected && (
                      <Box padding="200" background="bg-surface-secondary" borderRadius="150">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="bodyXs" tone="subdued">
                            ✨ <strong>Sample Lookbook Preview:</strong> Connect your Instagram account to sync your actual posts.
                          </Text>
                          <Button
                            size="micro"
                            variant="plain"
                            onClick={() => {
                              const el = document.getElementById("welcome-widget-card");
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                          >
                            Connect →
                          </Button>
                        </InlineStack>
                      </Box>
                    )}

                    {isHideMode && (
                      <Banner tone="info">
                        <strong>Hide Mode Active:</strong> Click any post in the preview below to toggle hidden status.
                      </Banner>
                    )}

                    {isTagMode && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px 16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px" }}>🏷️</span>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#166534" }}>
                              Tag Mode Active {totalSuggestionsCount > 0 ? `· ⚡ ${totalSuggestionsCount} Matches Detected` : ""}
                            </div>
                            <div style={{ fontSize: "12px", color: "#15803d" }}>
                              Click any post below to review suggestions or drop new pins.
                            </div>
                          </div>
                        </div>
                        <InlineStack gap="200">
                          <Button size="slim" onClick={handleAutoDetect}>
                            ⚡ Auto-Detect Matches
                          </Button>
                          {totalSuggestionsCount > 0 && (
                            <Button size="slim" variant="primary" tone="success" onClick={handleApproveAllHighConfidence}>
                              ✓ Approve All ({totalSuggestionsCount})
                            </Button>
                          )}
                        </InlineStack>
                      </div>
                    )}

                    {/* Frame Simulators */}
                    {(() => {
                      const followButtonPos = config.postFeed.followButtonPosition || (config.appliedTemplateId?.includes("profile") ? "header" : (config.postFeed.heading?.startsWith("@") ? "header" : "bottom"));
                      const showHeaderFollow = config.postFeed.showFollowButton !== false && followButtonPos === "header";
                      const showBottomFollow = config.postFeed.showFollowButton !== false && followButtonPos === "bottom";
                      const isProfileLayout = Boolean(
                        config.appliedTemplateId?.includes("profile") ||
                        (followButtonPos === "header" && (
                          config.postFeed.heading?.startsWith("@") ||
                          config.postFeed.heading?.toLowerCase().includes("@account") ||
                          config.postFeed.heading?.toLowerCase().includes("follow @") ||
                          config.postFeed.heading?.toLowerCase().includes("connect with @") ||
                          config.postFeed.heading?.toLowerCase().includes("welcome to @")
                        ))
                      );
                      const profilePic = instaData?.profile_picture_url || instaData?.user?.profile_picture_url || "";
                      const handle = (instaData?.username || config.instagramHandle || "").replace("@", "").trim();

                      return previewDevice === "mobile" ? (
                        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                          <div
                            style={{
                              width: "280px",
                              height: "560px",
                              background: "white",
                              borderRadius: "36px",
                              border: "10px solid #1e293b",
                              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                              position: "relative",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                height: "36px",
                                padding: "10px 16px 0",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "10px",
                                fontWeight: "700",
                                background: "white",
                              }}
                            >
                              <span>9:41</span>
                              <div>📶 🔋</div>
                            </div>

                            <div
                              style={{ height: "calc(100% - 36px)", overflowY: "auto", paddingBottom: "8px" }}
                            >
                              <div
                                style={{
                                  paddingTop: `${Math.min(config.postFeed.paddingTop || 12, 12)}px`,
                                  paddingBottom: `${Math.min(config.postFeed.paddingBottom || 12, 12)}px`,
                                }}
                              >
                                {/* 1. Header: Title & Description & Contextual Follow Button */}
                                {isProfileLayout ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "4px 8px 6px",
                                      gap: "8px",
                                    }}
                                  >
                                    {/* Left: Avatar + Heading & Subheading */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                                      <div
                                        style={{
                                          width: "34px",
                                          height: "34px",
                                          minWidth: "34px",
                                          minHeight: "34px",
                                          borderRadius: "50%",
                                          overflow: "hidden",
                                          flexShrink: 0,
                                          background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
                                          padding: "2px",
                                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          boxSizing: "border-box",
                                        }}
                                      >
                                        {profilePic ? (
                                          <img
                                            src={profilePic}
                                            alt={handle || "Profile"}
                                            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }}
                                          />
                                        ) : (
                                          <div
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              borderRadius: "50%",
                                              background: "#ffffff",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                          >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#833ab4">
                                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>

                                      <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                                        {config.postFeed.header && config.postFeed.heading?.trim() && (
                                          <h4
                                            style={{
                                              fontSize: `${Math.min(config.postFeed.typography.heading.size, 13)}px`,
                                              fontWeight: config.postFeed.typography.heading.weight || "700",
                                              color: config.postFeed.typography.heading.color,
                                              margin: 0,
                                              lineHeight: 1.25,
                                              wordBreak: "break-word",
                                            }}
                                          >
                                            {formatDynamicAccountText(config.postFeed.heading)}
                                          </h4>
                                        )}
                                        {config.postFeed.header && config.postFeed.subheading?.trim() && (
                                          <p
                                            style={{
                                              fontSize: `${Math.min(config.postFeed.typography.subheading.size, 10.5)}px`,
                                              color: config.postFeed.typography.subheading.color,
                                              margin: "2px 0 0 0",
                                              lineHeight: 1.3,
                                              wordBreak: "break-word",
                                            }}
                                          >
                                            {formatDynamicAccountText(config.postFeed.subheading)}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: Follow Button */}
                                    {showHeaderFollow && (
                                      <div style={{ flexShrink: 0, marginLeft: "auto" }}>
                                        <a
                                          href={`https://instagram.com/${handle}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ai-follow-btn"
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            padding: "4px 9px",
                                            borderRadius: "16px",
                                            background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
                                            color: "#ffffff",
                                            fontWeight: "700",
                                            fontSize: "9.5px",
                                            textDecoration: "none",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                          </svg>
                                          <span>Follow</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  (config.postFeed.header || showHeaderFollow) && (
                                    <div style={{ padding: "4px 8px 0", textAlign: config.postFeed.alignment }}>
                                      {config.postFeed.header && config.postFeed.heading?.trim() && (
                                        <h4
                                          style={{
                                            fontSize: `${config.postFeed.typography.heading.size}px`,
                                            fontWeight: config.postFeed.typography.heading.weight,
                                            color: config.postFeed.typography.heading.color,
                                            margin: "0 0 2px 0",
                                          }}
                                        >
                                          {formatDynamicAccountText(config.postFeed.heading)}
                                        </h4>
                                      )}
                                      {config.postFeed.header && config.postFeed.subheading?.trim() && (
                                        <p
                                          style={{
                                            fontSize: `${config.postFeed.typography.subheading.size}px`,
                                            color: config.postFeed.typography.subheading.color,
                                            margin: 0,
                                          }}
                                        >
                                          {formatDynamicAccountText(config.postFeed.subheading)}
                                        </p>
                                      )}
                                      {showHeaderFollow && renderFollowButton(true)}
                                    </div>
                                  )
                                )}

                                {/* 2. Story Highlights Bar (images by default, threshold >= 6 posts) */}
                                {showStorySection && storyMedia.length > 0 && (
                                  <div style={{ display: "flex", gap: "6px", padding: "4px 6px 4px", overflowX: "auto" }}>
                                    {config.stories.promoEnable !== false && renderPromoStoryItem()}
                                    {storyMedia.slice(0, 8).map((item, i) => renderStoryItem(item, i))}
                                  </div>
                                )}

                                {/* 3. Feed Display (Grid, Carousel, Masonry, Highlight, Reels, Marquee) */}
                                {renderPreviewFeed(true)}

                                {/* 4. Bottom Follow Button (when configured for bottom) */}
                                {showBottomFollow && renderFollowButton(false)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Desktop Frame Simulator */
                        <div
                          style={{
                            width: "100%",
                            background: "white",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            padding: "12px",
                            overflowY: "auto",
                            maxHeight: "560px",
                          }}
                        >
                          <div>
                            {/* 1. Header: Title & Description & Contextual Follow Button */}
                            {isProfileLayout ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "4px 4px 12px",
                                  gap: "14px",
                                  marginBottom: "8px",
                                }}
                              >
                                {/* Left: Avatar + Heading & Subheading */}
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      width: "42px",
                                      height: "42px",
                                      minWidth: "42px",
                                      minHeight: "42px",
                                      borderRadius: "50%",
                                      overflow: "hidden",
                                      flexShrink: 0,
                                      background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
                                      padding: "2px",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    {profilePic ? (
                                      <img
                                        src={profilePic}
                                        alt={handle || "Profile"}
                                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          borderRadius: "50%",
                                          background: "#ffffff",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#833ab4">
                                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                                    {config.postFeed.header && config.postFeed.heading?.trim() && (
                                      <h4
                                        style={{
                                          fontSize: `${config.postFeed.typography.heading.size}px`,
                                          fontWeight: config.postFeed.typography.heading.weight || "700",
                                          color: config.postFeed.typography.heading.color,
                                          margin: "0 0 2px 0",
                                          lineHeight: 1.25,
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        {formatDynamicAccountText(config.postFeed.heading)}
                                      </h4>
                                    )}
                                    {config.postFeed.header && config.postFeed.subheading?.trim() && (
                                      <p
                                        style={{
                                          fontSize: `${config.postFeed.typography.subheading.size}px`,
                                          color: config.postFeed.typography.subheading.color,
                                          margin: 0,
                                          lineHeight: 1.3,
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        {formatDynamicAccountText(config.postFeed.subheading)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Follow Button */}
                                {showHeaderFollow && (
                                  <div style={{ flexShrink: 0, marginLeft: "auto" }}>
                                    <a
                                      href={`https://instagram.com/${handle}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ai-follow-btn"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "5px 14px",
                                        borderRadius: "18px",
                                        background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
                                        color: "#ffffff",
                                        fontWeight: "700",
                                        fontSize: "11px",
                                        textDecoration: "none",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                      </svg>
                                      <span>Follow</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              (config.postFeed.header || showHeaderFollow) && (
                                <div style={{ textAlign: config.postFeed.alignment, marginBottom: "8px" }}>
                                  {config.postFeed.header && config.postFeed.heading?.trim() && (
                                    <h4
                                      style={{
                                        fontSize: `${config.postFeed.typography.heading.size}px`,
                                        fontWeight: config.postFeed.typography.heading.weight,
                                        color: config.postFeed.typography.heading.color,
                                        margin: "0 0 4px 0",
                                      }}
                                    >
                                      {formatDynamicAccountText(config.postFeed.heading)}
                                    </h4>
                                  )}
                                  {config.postFeed.header && config.postFeed.subheading?.trim() && (
                                    <p style={{ fontSize: `${config.postFeed.typography.subheading.size}px`, color: config.postFeed.typography.subheading.color, margin: 0 }}>
                                      {formatDynamicAccountText(config.postFeed.subheading)}
                                    </p>
                                  )}
                                  {showHeaderFollow && renderFollowButton(true)}
                                </div>
                              )
                            )}

                            {/* 2. Story Highlights Bar (images by default, threshold >= 6 posts) */}
                            {showStorySection && storyMedia.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  justifyContent: config.postFeed.alignment === "center" ? "center" : "flex-start",
                                  overflowX: "auto",
                                  padding: "4px 0 8px",
                                }}
                              >
                                {config.stories.promoEnable !== false && renderPromoStoryItem()}
                                {storyMedia.slice(0, 10).map((item, i) => renderStoryItem(item, i))}
                              </div>
                            )}

                            {/* 3. Feed Display (Grid, Carousel, Masonry, Highlight, Reels, Marquee) */}
                            {renderPreviewFeed(false)}

                            {/* 4. Bottom Follow Button (when configured for bottom) */}
                            {showBottomFollow && renderFollowButton(false)}
                          </div>
                        </div>
                      );
                    })()}
                  </BlockStack>
                </div>
              </Card>
          </div>
        </div>

        {/* ── High-Fidelity Instagram Storefront Modal (Identical to Storefront) ── */}
        {selectedPost && (() => {
          const postTags = config.taggedProducts?.[selectedPost.id || selectedPost.media_url] || selectedPost.taggedProducts || [];
          const currentMediaList = simulatedInfiniteMedia || [];
          const currentPostIndex = currentMediaList.findIndex(
            (p) => (p.id && p.id === selectedPost.id) || (p.media_url && p.media_url === selectedPost.media_url)
          );
          const hasPrev = currentPostIndex > 0;
          const hasNext = currentPostIndex >= 0 && currentPostIndex < currentMediaList.length - 1;
          const isVideo =
            (selectedPost.media_type || "").toUpperCase() === "VIDEO" ||
            (selectedPost.media_type || "").toUpperCase() === "REEL" ||
            (selectedPost.media_url &&
              (selectedPost.media_url.toLowerCase().includes(".mp4") || selectedPost.media_url.toLowerCase().includes(".mov")));
          const handle = (instaData?.username || config.instagramHandle || "account").replace("@", "").trim();
          const promoLabel = config.stories?.promoLabel || "Get 10% Off";

          const handlePrevPost = (e) => {
            e.stopPropagation();
            if (hasPrev) setSelectedPost(currentMediaList[currentPostIndex - 1]);
          };
          const handleNextPost = (e) => {
            e.stopPropagation();
            if (hasNext) setSelectedPost(currentMediaList[currentPostIndex + 1]);
          };

          return (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                zIndex: 2147483647,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                boxSizing: "border-box",
                animation: "fadeIn 0.2s ease-out",
              }}
              onClick={() => setSelectedPost(null)}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: "100%",
                  maxWidth: "960px",
                  maxHeight: "85vh",
                  height: "600px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {selectedPost.isPromo ? (
                  /* Special Offer Promo Story Modal */
                  <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%" }}>
                    <div
                      style={{
                        flex: 1,
                        background: "linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%)",
                        color: "white",
                        padding: "40px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: "16px", marginBottom: "16px" }}>
                        <Icon source={StarIcon} tone="inherit" />
                      </div>
                      <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", margin: "0 0 8px" }}>SPECIAL OFFER</h2>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: 0 }}>Exclusive Store Reward</p>
                    </div>
                    <div style={{ flex: 1.2, padding: "36px 40px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPost(null)}
                        style={{
                          position: "absolute",
                          top: "16px",
                          right: "16px",
                          background: "#f1f5f9",
                          border: "none",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#64748b",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        ✕
                      </button>
                      <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px" }}>
                        {config.stories.promoLabel || "Get 10% Off"}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.6", margin: "0 0 24px" }}>
                        {formatDynamicAccountText(
                          config.stories.promoDesc ||
                            "Take a screenshot of a product you wish to buy and tag us on Instagram for a 10% discount coupon code!"
                        )}
                      </p>
                      <a
                        href={`https://instagram.com/${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "linear-gradient(135deg, #e1306c 0%, #f77737 100%)",
                          color: "#ffffff",
                          textDecoration: "none",
                          textAlign: "center",
                          padding: "12px 20px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          fontSize: "14px",
                          boxShadow: "0 4px 12px rgba(225, 48, 108, 0.3)",
                        }}
                      >
                        Open Instagram
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Left Column: Media Pane */}
                    <div
                      style={{
                        flex: 1.3,
                        background: "#000000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {isVideo ? (
                        <video
                          src={selectedPost.media_url}
                          poster={selectedPost.thumbnail_url || undefined}
                          autoPlay
                          loop
                          controls
                          playsInline
                          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                        />
                      ) : (
                        <img
                          src={selectedPost.media_url}
                          alt="Instagram post"
                          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                        />
                      )}

                      {/* Previous Post Nav Button */}
                      {hasPrev && (
                        <button
                          type="button"
                          onClick={handlePrevPost}
                          style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.3)",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 20,
                            transition: "background 0.15s ease",
                          }}
                          aria-label="Previous post"
                        >
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M13 16l-5-5 5-5" />
                          </svg>
                        </button>
                      )}

                      {/* Next Post Nav Button */}
                      {hasNext && (
                        <button
                          type="button"
                          onClick={handleNextPost}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.3)",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 20,
                            transition: "background 0.15s ease",
                          }}
                          aria-label="Next post"
                        >
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 16l5-5-5-5" />
                          </svg>
                        </button>
                      )}

                      {/* Counter Badge */}
                      {currentMediaList.length > 1 && currentPostIndex >= 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "14px",
                            left: "14px",
                            background: "rgba(0,0,0,0.55)",
                            backdropFilter: "blur(6px)",
                            color: "rgba(255,255,255,0.9)",
                            fontSize: "12px",
                            fontWeight: "700",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            border: "1px solid rgba(255,255,255,0.15)",
                            whiteSpace: "nowrap",
                            zIndex: 15,
                          }}
                        >
                          {currentPostIndex + 1} / {currentMediaList.length}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Info Pane */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        background: "#ffffff",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "16px 20px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            @{handle}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Instagram Feed</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPost(null)}
                          style={{
                            background: "#f1f5f9",
                            border: "none",
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "#64748b",
                          }}
                          aria-label="Close modal"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Body */}
                      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                        {/* Tagged Products in this photo */}
                        {postTags.length > 0 && (
                          <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                                  <line x1="3" y1="6" x2="21" y2="6"/>
                                  <path d="M16 10a4 4 0 0 1-8 0"/>
                                </svg>
                                <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155" }}>
                                  Shop The Look
                                </span>
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
                                {postTags.length} {postTags.length === 1 ? "item" : "items"}
                              </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {postTags.map((pin, idx) => (
                                <div
                                  key={pin.id || idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 12px",
                                    background: "#ffffff",
                                    borderRadius: "10px",
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                                    gap: "12px",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", minWidth: 0, flex: 1 }}>
                                    {pin.image ? (
                                      <img
                                        src={pin.image}
                                        alt={pin.title}
                                        style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0, border: "1px solid #f1f5f9" }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: "44px",
                                          height: "44px",
                                          borderRadius: "8px",
                                          background: "#f8fafc",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          flexShrink: 0,
                                          border: "1px solid #e2e8f0",
                                        }}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                                      </div>
                                    )}
                                    <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                        {pin.title}
                                      </div>
                                      <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                                        ${pin.price}
                                      </div>
                                    </div>
                                  </div>

                                  <a
                                    href={pin.handle ? `https://${shop}/products/${pin.handle}` : `https://${shop}/collections/all`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: "#0f172a",
                                      color: "#ffffff",
                                      textDecoration: "none",
                                      border: "none",
                                      borderRadius: "6px",
                                      padding: "6px 13px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      transition: "background 0.15s ease",
                                    }}
                                  >
                                    <span>View</span>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p style={{ fontSize: "14px", lineHeight: "1.5", color: "#334155", margin: 0 }}>
                          <strong style={{ fontWeight: "700", color: "#0f172a", marginRight: "6px" }}>@{handle}</strong>
                          <span>{selectedPost.caption || "Shop our featured Instagram style!"}</span>
                        </p>
                      </div>

                      {/* Footer */}
                      <div style={{ padding: "16px 20px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            {/* Heart Icon */}
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="#e1306c" stroke="#e1306c" strokeWidth="2" style={{ cursor: "pointer" }}>
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {/* Comment Icon */}
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#262626" strokeWidth="2" style={{ cursor: "pointer" }}>
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            {/* Share Icon */}
                            <button
                              type="button"
                              onClick={() => {
                                const url =
                                  selectedPost.permalink ||
                                  `https://instagram.com/${handle}`;
                                if (navigator.clipboard?.writeText) {
                                  navigator.clipboard.writeText(url);
                                  shopify?.toast?.show("Post link copied to clipboard!");
                                }
                              }}
                              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                              title="Share Post"
                            >
                              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                              </svg>
                            </button>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Button
                              size="micro"
                              icon={ShoppableTagIcon}
                              onClick={() => {
                                const current = selectedPost;
                                setSelectedPost(null);
                                handleOpenTagging(current);
                              }}
                            >
                              Tag Products
                            </Button>
                          </div>
                        </div>

                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                          {selectedPost.like_count || 128} likes
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
                          {selectedPost.timestamp
                            ? new Date(selectedPost.timestamp).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
                            : "Recently"}
                        </div>

                        {/* Promo / Action Button */}
                        <a
                          href={selectedPost.permalink || `https://instagram.com/${handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "10px 16px",
                            background: "linear-gradient(135deg, #e1306c 0%, #f77737 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "700",
                            textDecoration: "none",
                            boxShadow: "0 4px 12px rgba(225, 48, 108, 0.3)",
                            boxSizing: "border-box",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 12 20 22 4 22 4 12" />
                            <rect x="2" y="7" width="20" height="5" />
                            <line x1="12" y1="22" x2="12" y2="7" />
                            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                          </svg>
                          <span>{promoLabel}</span>
                        </a>

                        {/* Watermark */}
                        <div style={{ textAlign: "center", padding: "10px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                          Powered by BOOST STAR Experts
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Shopify Polaris Tagging Studio Modal ── */}
        {taggingPost && (() => {
          const postId = taggingPost.id || taggingPost.media_url;
          const postSuggestions = suggestedTags[postId] || [];

          return (
            <Modal
              open={Boolean(taggingPost)}
              onClose={() => setTaggingPost(null)}
              title="Tag Products on Instagram Post"
              size="large"
              primaryAction={{
                content: "Done",
                onAction: () => {
                  setTaggingPost(null);
                  shopify?.toast?.show("Product tags saved! Click Save in the top bar to publish.");
                },
              }}
            >
              <Modal.Section flush>
                <div style={{ display: "flex", flexDirection: "row", minHeight: "480px", background: "#f8fafc" }}>
                  {/* Left Column: Post Preview & Caption */}
                  <div
                    style={{
                      flex: 1.1,
                      background: "#0f172a",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      position: "relative",
                      padding: "20px",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        maxWidth: "100%",
                        maxHeight: "360px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                      }}
                    >
                      <img
                        src={taggingPost.media_url || taggingPost.thumbnail_url}
                        alt="Post Preview"
                        style={{ display: "block", maxWidth: "100%", maxHeight: "360px", objectFit: "contain" }}
                      />
                    </div>

                    <div
                      style={{
                        width: "100%",
                        marginTop: "16px",
                        background: "rgba(255, 255, 255, 0.08)",
                        backdropFilter: "blur(6px)",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        color: "white",
                        fontSize: "12px",
                        lineHeight: "1.4",
                        maxHeight: "80px",
                        overflowY: "auto",
                      }}
                    >
                      <strong style={{ color: "#93c5fd" }}>Caption:</strong> {taggingPost.caption || "No caption"}
                    </div>
                  </div>

                  {/* Right Column: Tagged Products & AI Match Suggestions */}
                  <div
                    style={{
                      flex: 1.3,
                      background: "white",
                      borderLeft: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: "540px",
                    }}
                  >
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text variant="headingSm" as="h3" fontWeight="bold">
                        Tagged Products ({taggingPins.length})
                      </Text>
                      <Button
                        size="slim"
                        variant="primary"
                        icon={PlusIcon}
                        onClick={handleTagProduct}
                      >
                        + Add Product
                      </Button>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                      <BlockStack gap="400">
                        {/* 1. Pending Detected Suggestions */}
                        {postSuggestions.length > 0 && (
                          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px" }}>
                            <BlockStack gap="250">
                              <InlineStack align="space-between" blockAlign="center">
                                <Text variant="bodySm" fontWeight="bold">
                                  AI Match Suggestions ({postSuggestions.length})
                                </Text>
                                <Button
                                  size="micro"
                                  variant="plain"
                                  tone="success"
                                  onClick={() => {
                                    postSuggestions.forEach((s) => handleApproveSuggestion(postId, s));
                                  }}
                                >
                                  Approve All
                                </Button>
                              </InlineStack>

                              <BlockStack gap="200">
                                {postSuggestions.map((sug) => (
                                  <div
                                    key={sug.id}
                                    style={{
                                      background: "#ffffff",
                                      border: "1px solid #fde68a",
                                      borderRadius: "8px",
                                      padding: "10px 12px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "10px",
                                    }}
                                  >
                                    <InlineStack gap="200" blockAlign="center">
                                      {sug.image ? (
                                        <img
                                          src={sug.image}
                                          alt={sug.title}
                                          style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                                        />
                                      ) : (
                                        <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#f1f5f9" }} />
                                      )}
                                      <div style={{ minWidth: 0, maxWidth: "180px" }}>
                                        <Text variant="bodySm" fontWeight="bold" truncate>
                                          {sug.title}
                                        </Text>
                                        <Text variant="bodyXs" tone="subdued">
                                          ${sug.price}
                                        </Text>
                                      </div>
                                    </InlineStack>

                                    <InlineStack gap="100">
                                      <Button
                                        size="micro"
                                        variant="plain"
                                        tone="critical"
                                        onClick={() => handleDismissSuggestion(postId, sug.id)}
                                      >
                                        Dismiss
                                      </Button>
                                      <Button
                                        size="micro"
                                        variant="primary"
                                        tone="success"
                                        onClick={() => handleApproveSuggestion(postId, sug)}
                                      >
                                        Add Tag
                                      </Button>
                                    </InlineStack>
                                  </div>
                                ))}
                              </BlockStack>
                            </BlockStack>
                          </div>
                        )}

                        {/* 2. Active Tagged Products List */}
                        <div>
                          {taggingPins.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "32px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                              <Text variant="bodySm" fontWeight="semibold">No products tagged on this post yet</Text>
                              <div style={{ marginTop: "4px" }}>
                                <Text variant="bodyXs" tone="subdued">Click "+ Add Product" to search and tag catalog products.</Text>
                              </div>
                            </div>
                          ) : (
                            <BlockStack gap="200">
                              {taggingPins.map((pin, idx) => (
                                <Box key={pin.id || idx} padding="250" background="bg-surface-secondary" borderRadius="200">
                                  <InlineStack align="space-between" blockAlign="center">
                                    <InlineStack gap="200" blockAlign="center">
                                      {pin.image ? (
                                        <img
                                          src={pin.image}
                                          alt={pin.title}
                                          style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
                                        />
                                      ) : (
                                        <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#e2e8f0", flexShrink: 0 }} />
                                      )}
                                      <div style={{ overflow: "hidden", maxWidth: "220px" }}>
                                        <Text variant="bodySm" fontWeight="bold" truncate>
                                          {pin.title}
                                        </Text>
                                        <Text variant="bodyXs" tone="subdued">
                                          ${pin.price}
                                        </Text>
                                      </div>
                                    </InlineStack>
                                    <Button
                                      icon={XIcon}
                                      variant="plain"
                                      tone="critical"
                                      size="micro"
                                      onClick={() => handleRemovePin(pin.id)}
                                      accessibilityLabel="Remove tagged product"
                                    />
                                  </InlineStack>
                                </Box>
                              ))}
                            </BlockStack>
                          )}
                        </div>
                      </BlockStack>
                    </div>
                  </div>
                </div>
              </Modal.Section>
            </Modal>
          );
        })()}

        {/* ── Templates Library Modal ── */}
        <Modal
          open={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          title="Instagram Feed Design Templates"
          size="large"
          primaryAction={{
            content: "Close",
            onAction: () => setIsTemplatesModalOpen(false),
          }}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center" wrap>
                <Text variant="bodyMd" tone="subdued">
                  Select any pre-designed template to immediately apply it to your feed. You can fine-tune all settings anytime.
                </Text>
                <ButtonGroup variant="segmented">
                  <Button
                    pressed={templateFilter === "all"}
                    onClick={() => setTemplateFilter("all")}
                  >
                    All ({FEED_TEMPLATES.length})
                  </Button>
                  <Button
                    pressed={templateFilter === "grid"}
                    onClick={() => setTemplateFilter("grid")}
                  >
                    Grids
                  </Button>
                  <Button
                    pressed={templateFilter === "carousel"}
                    onClick={() => setTemplateFilter("carousel")}
                  >
                    Sliders
                  </Button>
                  <Button
                    pressed={templateFilter === "highlight"}
                    onClick={() => setTemplateFilter("highlight")}
                  >
                    Highlight
                  </Button>
                  <Button
                    pressed={templateFilter === "reels"}
                    onClick={() => setTemplateFilter("reels")}
                  >
                    Reels & Marquee
                  </Button>
                </ButtonGroup>
              </InlineStack>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
                  gap: "14px",
                }}
              >
                {FEED_TEMPLATES.filter((t) => {
                  if (templateFilter === "all") return true;
                  if (templateFilter === "highlight") return t.type === "highlight";
                  if (templateFilter === "carousel") return t.type === "carousel";
                  if (templateFilter === "grid") return t.type === "grid";
                  if (templateFilter === "reels") return t.type === "reels" || t.type === "marquee";
                  return true;
                }).map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onApply={handleApplyTemplate}
                    onPreview={handlePreviewTemplate}
                  />
                ))}
              </div>
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* ── Disconnect Confirmation Modal ── */}
        <Modal
          open={isDisconnectConfirmOpen}
          onClose={() => setIsDisconnectConfirmOpen(false)}
          title="Disconnect your Instagram account?"
          primaryAction={{
            content: "Yes, disconnect",
            destructive: true,
            onAction: () => {
              handleDisconnect();
              setIsDisconnectConfirmOpen(false);
            },
          }}
          secondaryActions={[{ content: "Cancel", onAction: () => setIsDisconnectConfirmOpen(false) }]}
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Text variant="bodyMd">
                You are about to disconnect <strong>@{instaData?.username || config.instagramHandle}</strong>.
              </Text>
              <Banner tone="warning">
                <BlockStack gap="100">
                  <Text variant="bodySm">• Your real Instagram posts will stop showing on your store.</Text>
                  <Text variant="bodySm">• Sample posts will be shown until you connect again.</Text>
                  <Text variant="bodySm">• Your widget design and settings stay saved.</Text>
                </BlockStack>
              </Banner>
              <Text variant="bodySm" tone="subdued">
                You can reconnect anytime by entering your username again.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* ── Welcome Onboarding Setup Guide Modal ── */}
        <Modal
          open={isSetupModalOpen}
          onClose={() => {
            setIsSetupModalOpen(false);
            if (typeof window !== "undefined") localStorage.setItem("setup_modal_dismissed", "1");
          }}
          title="⚡ Quick Setup Guide"
          primaryAction={{
            content: "Done",
            onAction: () => {
              setIsSetupModalOpen(false);
              if (typeof window !== "undefined") localStorage.setItem("setup_modal_dismissed", "1");
            },
          }}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text variant="bodyMd" tone="subdued">
                Complete these 2 simple steps to get your Instagram feed live on your store.
              </Text>

              {/* Step 1: Connect Instagram */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3" fontWeight="bold">
                      1. Connect Instagram Account
                    </Text>
                    <Badge tone={isConnected ? "success" : "attention"}>
                      {isConnected ? "Connected" : "Action Needed"}
                    </Badge>
                  </InlineStack>

                  {isConnected ? (
                    <BlockStack gap="200">
                      <Banner tone="success">
                        <Text variant="bodySm">
                          Connected to <strong>@{instaData?.username || config.instagramHandle}</strong> ({instaData?.media?.data?.length || 0} posts synced).
                        </Text>
                      </Banner>
                      <InlineStack gap="200">
                        <Button
                          size="slim"
                          loading={isSyncing}
                          onClick={() => {
                            const fd = new FormData();
                            fd.append("handle", config.instagramHandle);
                            fetcher.submit(fd, { method: "post" });
                          }}
                        >
                          Re-sync Posts
                        </Button>
                        <Button size="slim" tone="critical" onClick={() => setIsDisconnectConfirmOpen(true)}>
                          Disconnect
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="300">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="100">
                          <Text variant="bodySm" fontWeight="semibold">Where do I find my username?</Text>
                          <Text variant="bodySm" tone="subdued">
                            Open the Instagram app → tap your profile picture (bottom right) → your username is shown at the top.
                            You can also paste your full profile link — we'll pick the username out of it.
                          </Text>
                        </BlockStack>
                      </Box>
                      <div
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && config.instagramHandle.trim() && !isSyncing) {
                            e.preventDefault();
                            const fd = new FormData();
                            fd.append("handle", config.instagramHandle);
                            fetcher.submit(fd, { method: "post" });
                          }
                        }}
                      >
                      <InlineStack gap="200" wrap={false} blockAlign="end">
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="Instagram username"
                            prefix="@"
                            placeholder="yourbrand"
                            helpText={
                              config.instagramHandle
                                ? `We'll connect: instagram.com/${config.instagramHandle}`
                                : "Type your username or paste a link like https://instagram.com/yourbrand"
                            }
                            clearButton
                            onClearButtonClick={() => setConfig((prev) => ({ ...prev, instagramHandle: "" }))}
                            value={config.instagramHandle}
                            autoComplete="off"
                            onChange={(val) => {
                              let v = val;
                              if (v.includes("instagram.com/")) {
                                try {
                                  const url = new URL(v.startsWith("http") ? v : `https://${v}`);
                                  const parts = url.pathname.split("/").filter(Boolean);
                                  if (parts.length > 0) v = parts[0];
                                } catch {
                                  const parts = v.replace(/\/$/, "").split("/");
                                  v = parts[parts.length - 1].split("?")[0];
                                }
                              }
                              v = v.replace("@", "").split("?")[0].trim();
                              setConfig((prev) => ({ ...prev, instagramHandle: v }));
                              setConnectError(null);
                            }}
                          />
                        </div>
                        <Button
                          variant="primary"
                          loading={isSyncing}
                          onClick={() => {
                            if (!config.instagramHandle.trim()) {
                              shopify?.toast?.show("Please enter an Instagram handle", { isError: true });
                              return;
                            }
                            const fd = new FormData();
                            fd.append("handle", config.instagramHandle);
                            fetcher.submit(fd, { method: "post" });
                          }}
                        >
                          Connect
                        </Button>
                      </InlineStack>
                      </div>
                      {connectError && (
                        <Banner tone="critical">
                          <Text variant="bodySm">{linkifyText(connectError)}</Text>
                        </Banner>
                      )}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* Step 2: Enable in Theme */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3" fontWeight="bold">
                      2. Enable in Shopify Theme
                    </Text>
                    <Badge tone={loaderData.dynamicAppEmbedEnabled ? "success" : "attention"}>
                      {loaderData.dynamicAppEmbedEnabled ? "Active in Theme" : "Action Needed"}
                    </Badge>
                  </InlineStack>

                  <Text variant="bodySm" tone="subdued">
                    {loaderData.dynamicAppEmbedEnabled
                      ? "App Embed is active and displaying feeds on your storefront."
                      : "Activate the AI Instafeed App Embed in your Shopify Theme Editor."}
                  </Text>

                  {!loaderData.dynamicAppEmbedEnabled && (
                    <div>
                      <Button
                        variant="primary"
                        icon={ExternalIcon}
                        onClick={() => {
                          const url = `https://${loaderData.shop}/admin/themes/${loaderData.themeId}/editor?context=apps&activateAppId=${loaderData.clientId}/app-embed&activateAppEmbed=${loaderData.clientId}/app-embed`;
                          window.open(url, "_blank");
                        }}
                      >
                        Enable in Theme Editor
                      </Button>
                    </div>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* ── Single Template Preview Modal ── */}
        {previewingTemplate && (
          <Modal
            open={Boolean(previewingTemplate)}
            onClose={() => setPreviewingTemplate(null)}
            title={`Preview: ${previewingTemplate.name}`}
            size="large"
            primaryAction={{
              content: "Try It Now",
              onAction: () => handleApplyTemplate(previewingTemplate),
            }}
            secondaryActions={[
              {
                content: "Back to Templates",
                onAction: () => setPreviewingTemplate(null),
              },
            ]}
          >
            <Modal.Section>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <div>
                    <Text variant="headingSm" as="h3" fontWeight="bold">
                      {previewingTemplate.name}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      {previewingTemplate.desc}
                    </Text>
                  </div>
                  <Badge tone="info">
                    Layout: {previewingTemplate.type.toUpperCase()}
                  </Badge>
                </InlineStack>

                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="300"
                  borderWidth="025"
                  borderColor="border"
                >
                  <div style={{ maxWidth: "560px", margin: "0 auto" }}>
                    <TemplateMockupThumbnail template={previewingTemplate} />
                  </div>
                </Box>

                <Banner tone="info">
                  Clicking <strong>Try It Now</strong> will immediately configure this layout and update your live preview. You can customize colors, headers, and product tags anytime afterwards.
                </Banner>
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}

        {/* ── Merchant Review Modal (Triggered via ?review=true from Monthly Report) ── */}
        <Modal
          open={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          title="Rate & Review AI Instafeed"
          primaryAction={{
            content: reviewSubmitted ? "Done" : "Submit Review",
            onAction: reviewSubmitted ? handleCloseReviewModal : handleSubmitReview,
            loading: reviewFetcher.state === "submitting",
          }}
          secondaryActions={[
            {
              content: "Maybe Later",
              onAction: handleCloseReviewModal,
            },
          ]}
        >
          <Modal.Section>
            {reviewSubmitted ? (
              <BlockStack gap="400" align="center" inlineAlign="center">
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                  <Text variant="headingMd" as="h3" alignment="center">
                    Thank you for your feedback!
                  </Text>
                  <Box paddingBlockStart="200">
                    <Text variant="bodyMd" tone="subdued" alignment="center">
                      Your review means a lot to our team and helps us keep improving AI Instafeed for your store.
                    </Text>
                  </Box>
                  <Box paddingBlockStart="400">
                    <Button
                      variant="primary"
                      url="https://apps.shopify.com/ai-instafeed#modal-show=ReviewListingModal"
                      target="_blank"
                    >
                      Post on Shopify App Store ↗
                    </Button>
                  </Box>
                </div>
              </BlockStack>
            ) : (
              <BlockStack gap="400">
                <Banner tone="info">
                  We'd love to hear your thoughts! Your feedback helps independent developers build better features for merchants like you.
                </Banner>

                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold">
                    How would you rate your experience?
                  </Text>
                  <InlineStack gap="100">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          fontSize: "28px",
                          color: star <= reviewRating ? "#f59e0b" : "#d1d5db",
                          transition: "transform 0.15s ease",
                        }}
                      >
                        ★
                      </button>
                    ))}
                    <Box paddingInlineStart="200" paddingBlockStart="100">
                      <Text variant="bodySm" tone="subdued">
                        {reviewRating === 5 ? "⭐⭐⭐⭐⭐ Excellent!" : `${reviewRating} / 5 Stars`}
                      </Text>
                    </Box>
                  </InlineStack>
                </BlockStack>

                <TextField
                  label="Your Feedback / Review"
                  value={reviewText}
                  onChange={setReviewText}
                  multiline={4}
                  placeholder="What do you love most about AI Instafeed? How has it helped your store conversions?"
                  autoComplete="off"
                />

                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyXs" tone="subdued">
                    Your feedback will be sent directly to our development team.
                  </Text>
                  <Button
                    variant="plain"
                    url="https://apps.shopify.com/ai-instafeed#modal-show=ReviewListingModal"
                    target="_blank"
                  >
                    Review directly on App Store ↗
                  </Button>
                </InlineStack>
              </BlockStack>
            )}
          </Modal.Section>
        </Modal>

        {/* ── Footer ── */}
        <Box paddingBlock="600">
          <BlockStack gap="200" align="center" inlineAlign="center">
            <Text variant="bodySm" tone="subdued">
              © 2026 AI Instafeed by{" "}
              <a
                href="https://apps.shopify.com/partners/boost-star"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                BOOST STAR Experts
              </a>
            </Text>
            <InlineStack gap="200" align="center">
              <Text variant="bodySm" tone="subdued">
                Terms of Service
              </Text>
              <Text variant="bodySm" tone="subdued">
                •
              </Text>
              <Text variant="bodySm" tone="subdued">
                Privacy Policy
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>

        {/* Native Save Bar */}
        <ui-save-bar id="app-config-save-bar">
          <button
            variant="primary"
            onClick={applyChanges}
            id="save-button"
            loading={isSaving ? "" : undefined}
          >
            Save
          </button>
          <button
            onClick={discardChanges}
            id="discard-button"
            disabled={isSaving ? "" : undefined}
          >
            Discard
          </button>
        </ui-save-bar>
      </BlockStack>
    </Page>
  );
}
