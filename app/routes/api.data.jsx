/**
 * api.data.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * App-Proxy endpoint consumed by the storefront Theme Extension (instafeed-front.js).
 *
 * Response shape: { config: object|null, instaData: object|null }
 *
 * Performance notes
 * ─────────────────
 * • Config AND Instagram data are served from cache on every hit.
 * • If cache is cold the live data is fetched, stored, and returned.
 * • Instagram fetch uses stale-while-revalidate so the browser always gets
 *   a fast response even when the cache is refreshing in the background.
 * • Shopify API call costs are tracked via rateLimiter so we never exceed
 *   the bucket limit.
 * • If stored Instagram data is >6 hours old, we trigger a background refresh
 *   via fetchAllInstagramMedia and re-save to metafield automatically.
 */

import { authenticate, unauthenticated } from "../shopify.server.js";
import {
  fetchShopInstaData,
  fetchShopConfig,
  checkProPlan,
  fetchAllInstagramMedia,
} from "../instagramApi.server.js";
import { trackApiResponse, withRateLimit } from "../rateLimiter.server.js";
import { invalidateResource } from "../cache.server.js";

// ── How old (ms) instaData can be before we trigger a background refresh ──
const REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

export const loader = async ({ request }) => {
  // ── 1. Authenticate as app-proxy ─────────────────────────────────────────
  let { admin, session } = await authenticate.public.appProxy(request);

  if (!session) {
    // HMAC is valid but offline token is missing (expired token or DB reset).
    // Fall back to unauthenticated.admin using the shop param Shopify provides.
    const shopParam = new URL(request.url).searchParams.get("shop");
    if (!shopParam) {
      return Response.json({ error: "Unauthorized: No session." }, { status: 401 });
    }
    try {
      const fallback = await unauthenticated.admin(shopParam);
      admin = fallback.admin;
      session = fallback.session;
    } catch {
      return Response.json({ config: null, instaData: null }, { status: 200 });
    }
  }

  const shop = session.shop;

  try {
    // ── 2. Concurrent Fetch: Plan + Config + Instagram Data (cached) ────────
    const [isPro, rawConfig, rawInstaData] = await Promise.all([
      checkProPlan(admin, shop),
      withRateLimit(shop, () => fetchShopConfig(admin, shop)),
      withRateLimit(shop, () => fetchShopInstaData(admin, shop)),
    ]);
    trackApiResponse(shop, {});

    let config = rawConfig;
    let instaData = rawInstaData;

    // ── 3. Fallback to default if no config exists ───────────────────────────
    if (!config) {
      config = {
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
          autoplay: true,
          heading: "Welcome To @account",
          subheading: "Follow our journey · Fresh drops & store updates every week",
          typography: {
            heading: { size: 18, weight: "800", color: "#0f172a" },
            subheading: { size: 12, weight: "500", color: "#64748b" },
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
          mediaTypeFilter: "all",
          sortBy: "latest",
        },
        stories: {
          enable: false,
          promoEnable: true,
          promoLabel: "Get 10% Off",
          promoCode: "WELCOME10",
          promoDesc: "Take a screenshot of a product you wish to buy and tag @gpmbazaar and we will send you a 10% Off Discount Coupon Code!",
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
          openPopup: true,
          ringColor: "#6366f1",
          showNavigation: true,
          mediaTypeFilter: "all",
          sortBy: "latest",
        },
      };
    }

    // ── 4. Enforce Restrictions for Starter Plan ─────────────────────────────
    if (!isPro) {
      config.aiCommentModeration = false; // Force AI Sentiment Moderation off on Starter plan
      if (config.postFeed) {
        config.postFeed.removeWatermark = false; // Force watermark
        config.postFeed.load = false;           // Force no infinite scroll
        config.postFeed.sortBy = "latest";       // Force latest
        if (config.postFeed.desktopColumns > 4) config.postFeed.desktopColumns = 4;
        if (config.postFeed.desktopLimit > 12)  config.postFeed.desktopLimit = 12;
      }
      if (config.stories) {
        config.stories.sortBy = "latest";       // Force latest
      }
    }

    // ── 5. Auto-refresh stale Instagram data in the background (Non-blocking) ─
    if (instaData && config.instagramHandle) {
      const crawledAt = instaData._crawledAt ? new Date(instaData._crawledAt).getTime() : 0;
      const ageMs = Date.now() - crawledAt;

      const hasCarouselAlbums = instaData.media?.data?.some(item => item.media_type === "CAROUSEL_ALBUM");
      const hasChildrenField = instaData.media?.data?.some(item => item.children?.data?.length > 0);
      const needsUpgradeToChildren = hasCarouselAlbums && !hasChildrenField;

      if (ageMs > REFRESH_THRESHOLD_MS || needsUpgradeToChildren) {
        // Fire-and-forget background refresh (never blocks the customer response)
        (async () => {
          try {
            const freshData = await fetchAllInstagramMedia(config.instagramHandle, shop);
            if (!freshData) return;

            const shopRes = await admin.graphql(`{ shop { id } }`);
            const shopJson = await shopRes.json();
            const shopId = shopJson.data?.shop?.id;
            if (!shopId) return;

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
                      value: JSON.stringify(freshData),
                    },
                  ],
                },
              }
            );

            // Bust cache so subsequent requests get fresh data
            await invalidateResource(shop, "insta_data");
            console.info(`[api.data] Background refresh complete for ${shop}.`);
          } catch (e) {
            console.warn(`[api.data] Background refresh failed for ${shop}:`, e.message);
          }
        })();
      }
    } else if (!instaData && config.instagramHandle) {
      // Background populate if no data exists yet
      (async () => {
        try {
          const freshData = await fetchAllInstagramMedia(config.instagramHandle, shop);
          if (freshData) {
            const shopRes = await admin.graphql(`{ shop { id } }`);
            const shopJson = await shopRes.json();
            const shopId = shopJson.data?.shop?.id;
            if (shopId) {
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
                        value: JSON.stringify(freshData),
                      },
                    ],
                  },
                }
              );
              await invalidateResource(shop, "insta_data");
            }
          }
        } catch (e) {
          console.warn(`[api.data] Background initial fetch failed for ${shop}:`, e.message);
        }
      })();
    }

    // ── 6. Minify payload and return response with Edge / CDN Cache Headers ──
    const DEFAULT_SHOPIFY_MEDIA = [
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
    ];

    const hasLiveData = instaData && (instaData.media?.data?.length || 0) > 0;
    const minifiedData = hasLiveData ? {
      id: instaData.id,
      username: instaData.username,
      profile_picture_url: instaData.profile_picture_url,
      biography: instaData.biography,
      followers_count: instaData.followers_count,
      media_count: instaData.media_count,
      _crawledAt: instaData._crawledAt,
      media: {
        data: (instaData.media?.data || []).map((item) => ({
          id: item.id,
          media_type: item.media_type,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url || undefined,
          permalink: item.permalink,
          caption: item.caption ? item.caption.slice(0, 300) : undefined,
          like_count: item.like_count || 0,
          comments_count: item.comments_count || 0,
          timestamp: item.timestamp,
          children: item.children?.data ? {
            data: item.children.data.map((child) => ({
              id: child.id,
              media_type: child.media_type,
              media_url: child.media_url,
              thumbnail_url: child.thumbnail_url || undefined,
            })),
          } : undefined,
        })),
      },
    } : {
      id: "placeholder_shop",
      username: "shopify",
      profile_picture_url: "https://picsum.photos/id/1027/800/800",
      biography: "Welcome to our store! Follow our official journey and shop our curated products.",
      followers_count: 1250,
      media_count: DEFAULT_SHOPIFY_MEDIA.length,
      media: {
        data: DEFAULT_SHOPIFY_MEDIA,
      },
    };

    return Response.json(
      { config, instaData: minifiedData },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );

  } catch (error) {
    console.error("[api.data] Fatal error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
};
