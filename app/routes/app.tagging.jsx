import { useState, useMemo, useEffect, useCallback } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { fetchShopConfig, fetchShopInstaData } from "../instagramApi.server";
import { withRateLimit, trackApiResponse } from "../rateLimiter.server";
import { invalidateResource } from "../cache.server";
import { detectProductMatches } from "../utils/productMatcher";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Divider,
  TextField,
  EmptyState,
  Banner,
  Modal,
  Icon,
} from "@shopify/polaris";
import {
  SearchIcon,
  PlusIcon,
  DeleteIcon,
  CheckCircleIcon,
  MagicIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop ?? "unknown";

  const [configResult, instaResult, productsRes] = await Promise.allSettled([
    withRateLimit(shop, () => fetchShopConfig(admin, shop)),
    fetchShopInstaData(admin, shop),
    admin.graphql(`{
      products(first: 250, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          tags
          featuredImage { url }
          variants(first: 20) {
            nodes {
              id
              title
              price
            }
          }
        }
      }
    }`),
  ]);

  const config = configResult.status === "fulfilled" ? configResult.value : null;
  const instaData = instaResult.status === "fulfilled" ? instaResult.value : null;

  let storeProducts = [];
  if (productsRes.status === "fulfilled") {
    try {
      const prodJson = await productsRes.value.json();
      const nodes = prodJson.data?.products?.nodes || [];
      storeProducts = nodes.map((p) => {
        const variants = p.variants?.nodes || [];
        const firstVariant = variants[0] || {};
        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          tags: p.tags || [],
          image: p.featuredImage?.url || "",
          variantId: firstVariant.id ? String(firstVariant.id).split("/").pop() : "default",
          price: firstVariant.price || "0.00",
          variants: variants.map((v) => ({
            id: String(v.id).split("/").pop(),
            title: v.title,
            price: v.price || "0.00",
          })),
        };
      });
    } catch (e) {
      console.warn("[app.tagging] Failed to parse store products", e);
    }
  }

  trackApiResponse(shop, {});

  return {
    shop,
    config: config || {},
    instaData: instaData || null,
    storeProducts,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session?.shop ?? "unknown";
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "saveTaggedProducts") {
    try {
      const taggedProductsData = formData.get("taggedProducts");
      const parsedTagged = JSON.parse(taggedProductsData || "{}");

      const currentConfig = (await fetchShopConfig(admin, shop)) || {};
      const updatedConfig = {
        ...currentConfig,
        taggedProducts: parsedTagged,
      };

      const configJsonString = JSON.stringify(updatedConfig);

      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopJson = await shopRes.json();
      const shopId = shopJson.data?.shop?.id;

      if (!shopId) {
        return { error: "Failed to locate Shopify store ID" };
      }

      const metafields = [
        {
          ownerId: shopId,
          namespace: "ai_instafeed",
          key: "config",
          type: "json",
          value: configJsonString,
        },
      ];

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
      return { success: true, message: "Tagged products saved successfully" };
    } catch (e) {
      return { error: e.message || "Failed to save tagged products" };
    }
  }

  return { error: "Invalid intent" };
};

export default function ProductTaggingPage() {
  const { config: initialConfig, instaData, storeProducts } = useLoaderData();
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";

  // Active Tagged Products Dictionary: { [postId]: [ { productId, title, price, image, x, y, variantId } ] }
  const [taggedProducts, setTaggedProducts] = useState(initialConfig.taggedProducts || {});
  const [initialSavedJson, setInitialSavedJson] = useState(
    JSON.stringify(initialConfig.taggedProducts || {})
  );

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'tagged' | 'untagged' | 'suggested'
  const [showSuggestionsPreview, setShowSuggestionsPreview] = useState(false);

  // Modal State for Tagging a Post
  const [selectedPost, setSelectedPost] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Instagram Media List
  const mediaList = useMemo(() => {
    return instaData?.media?.data || [];
  }, [instaData]);

  // Compute Smart Product Caption Match Suggestions
  const smartMatches = useMemo(() => {
    return detectProductMatches(mediaList, storeProducts, taggedProducts);
  }, [mediaList, storeProducts, taggedProducts]);

  const totalSmartMatchesCount = useMemo(() => {
    return Object.values(smartMatches).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  }, [smartMatches]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(taggedProducts) !== initialSavedJson;
  }, [taggedProducts, initialSavedJson]);

  // Handle action result
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        setInitialSavedJson(JSON.stringify(taggedProducts));
        if (window.shopify?.toast) {
          window.shopify.toast.show("Product tags saved successfully!");
        }
      } else if (fetcher.data.error) {
        if (window.shopify?.toast) {
          window.shopify.toast.show(fetcher.data.error, { isError: true });
        }
      }
    }
  }, [fetcher.data, taggedProducts]);

  // Save changes to backend
  const handleSaveAll = useCallback(() => {
    fetcher.submit(
      {
        intent: "saveTaggedProducts",
        taggedProducts: JSON.stringify(taggedProducts),
      },
      { method: "post" }
    );
  }, [fetcher, taggedProducts]);

  // Discard changes
  const handleDiscard = useCallback(() => {
    try {
      setTaggedProducts(JSON.parse(initialSavedJson));
      if (window.shopify?.toast) {
        window.shopify.toast.show("Unsaved tagging changes discarded.");
      }
    } catch (e) {}
  }, [initialSavedJson]);

  // Sync App Bridge save bar
  useEffect(() => {
    const saveBar = document.getElementById("product-tagging-save-bar");
    if (hasUnsavedChanges) {
      saveBar?.show?.();
    } else {
      saveBar?.hide?.();
    }
  }, [hasUnsavedChanges]);

  // Approve a smart match recommendation for a post
  const handleApproveMatch = useCallback((postId, suggestedPin) => {
    let limitReached = false;
    setTaggedProducts((prev) => {
      const existing = prev[postId] || [];
      if (existing.some((p) => p.productId === suggestedPin.productId || p.title === suggestedPin.title)) {
        return prev;
      }
      if (existing.length >= 5) {
        limitReached = true;
        return prev;
      }
      return {
        ...prev,
        [postId]: [...existing, suggestedPin],
      };
    });
    if (limitReached) {
      window.shopify?.toast?.show("Maximum 5 products can be tagged per post", { isError: true });
    } else if (window.shopify?.toast) {
      window.shopify.toast.show(`Added "${suggestedPin.title}" tag to post!`);
    }
  }, []);

  // Approve all smart suggestions in 1-click
  const handleApproveAllMatches = useCallback(() => {
    let count = 0;
    setTaggedProducts((prev) => {
      const updated = { ...prev };
      Object.entries(smartMatches).forEach(([postId, suggestions]) => {
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          const current = updated[postId] || [];
          const availableSlots = Math.max(0, 5 - current.length);
          const toAdd = suggestions
            .filter((s) => !current.some((c) => c.productId === s.productId || c.title === s.title))
            .slice(0, availableSlots);
          if (toAdd.length > 0) {
            updated[postId] = [...current, ...toAdd];
            count += toAdd.length;
          }
        }
      });
      return updated;
    });
    if (window.shopify?.toast) {
      window.shopify.toast.show(`Approved and tagged ${count} smart product matches!`);
    }
  }, [smartMatches]);

  // Filtered Media
  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) => {
      const postId = item.id || item.media_url;
      const tags = taggedProducts[postId] || [];
      const hasTags = tags.length > 0;
      const suggestions = smartMatches[postId] || [];
      const hasSuggestions = suggestions.length > 0;

      if (activeFilter === "tagged" && !hasTags) return false;
      if (activeFilter === "untagged" && hasTags) return false;
      if (activeFilter === "suggested" && !hasSuggestions) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const captionMatch = (item.caption || "").toLowerCase().includes(q);
        const tagMatch = tags.some((t) => (t.title || "").toLowerCase().includes(q));
        if (!captionMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [mediaList, taggedProducts, smartMatches, activeFilter, searchQuery]);

  // Open tagging modal for a specific post
  const handleOpenTaggingModal = (post) => {
    setSelectedPost(post);
    setShowProductPicker(false);
    setProductSearchQuery("");
  };

  // Close tagging modal
  const handleCloseModal = () => {
    setSelectedPost(null);
    setShowProductPicker(false);
  };

  // Add a product tag to the currently edited post
  const handleAddProductPin = (product, variant = null) => {
    if (!selectedPost) return;
    const postId = selectedPost.id || selectedPost.media_url;
    const currentPins = taggedProducts[postId] || [];

    if (currentPins.length >= 5) {
      if (window.shopify?.toast) {
        window.shopify.toast.show("Maximum 5 products can be tagged per post", { isError: true });
      }
      return;
    }

    if (currentPins.some((p) => p.productId === product.id || p.title === product.title)) {
      if (window.shopify?.toast) {
        window.shopify.toast.show(`"${product.title}" is already tagged`);
      }
      return;
    }

    const selectedVariant = variant || product.variants?.[0] || {};
    const newTag = {
      id: "tag_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      productId: product.id,
      title: product.title,
      price: selectedVariant.price || product.price || "0.00",
      image: product.image || "",
      handle: product.handle || "",
      variantId: selectedVariant.id || product.variantId || "default",
    };

    setTaggedProducts((prev) => ({
      ...prev,
      [postId]: [...currentPins, newTag],
    }));

    setShowProductPicker(false);
    setProductSearchQuery("");
  };

  // Remove a pin from current post
  const handleRemovePin = (pinIndex) => {
    if (!selectedPost) return;
    const postId = selectedPost.id || selectedPost.media_url;
    const currentPins = taggedProducts[postId] || [];
    const nextPins = currentPins.filter((_, idx) => idx !== pinIndex);

    setTaggedProducts((prev) => ({
      ...prev,
      [postId]: nextPins,
    }));
  };

  // Filter products for the picker modal
  const filteredPickerProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return storeProducts.slice(0, 30);
    const q = productSearchQuery.toLowerCase();
    return storeProducts
      .filter((p) => (p.title || "").toLowerCase().includes(q) || (p.handle || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [storeProducts, productSearchQuery]);

  const totalPostsCount = mediaList.length;
  const taggedPostsCount = Object.entries(taggedProducts).filter(
    ([_, pins]) => Array.isArray(pins) && pins.length > 0
  ).length;
  const untaggedPostsCount = Math.max(0, totalPostsCount - taggedPostsCount);

  return (
    <Page
      title="Product Tagging & Shoppable Feed"
      subtitle="Tag Shopify catalog products on your Instagram posts to enable seamless 1-click cart addition in your storefront popup."
      fullWidth
      primaryAction={{
        content: isSaving ? "Saving..." : "Save Changes",
        onAction: handleSaveAll,
        loading: isSaving,
        disabled: !hasUnsavedChanges || isSaving,
      }}
      secondaryActions={[
        {
          content: "View Home Feed",
          url: "/app",
        },
      ]}
    >
      <BlockStack gap="500">
        {hasUnsavedChanges && (
          <Banner
            title="Unsaved tagging changes"
            tone="warning"
            action={{
              content: isSaving ? "Saving..." : "Save Changes Now",
              onAction: handleSaveAll,
              loading: isSaving,
            }}
          >
            <p>You have updated product tags. Click "Save Changes" to publish your changes live to your storefront.</p>
          </Banner>
        )}

        {/* Overview Metric Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">
                  Total Instagram Posts
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="heading2xl" as="h3" fontWeight="bold">
                    {totalPostsCount}
                  </Text>
                  <Badge tone="info">Live Feed</Badge>
                </InlineStack>
                <Text variant="bodyXs" tone="subdued">
                  Posts loaded from connected Instagram account
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">
                  Shoppable Tagged Posts
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="heading2xl" as="h3" fontWeight="bold" tone="success">
                    {taggedPostsCount}
                  </Text>
                  <Badge tone="success">
                    {totalPostsCount > 0 ? `${Math.round((taggedPostsCount / totalPostsCount) * 100)}%` : "0%"} Tagged
                  </Badge>
                </InlineStack>
                <Text variant="bodyXs" tone="subdued">
                  Posts with 1 or more attached products
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="headingSm" tone="subdued">
                  Smart AI Suggestions
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <Text
                    variant="heading2xl"
                    as="h3"
                    fontWeight="bold"
                    tone={totalSmartMatchesCount > 0 ? "magic" : "subdued"}
                  >
                    {totalSmartMatchesCount}
                  </Text>
                  {totalSmartMatchesCount > 0 ? (
                    <Badge tone="magic-subdued">Auto-Detected</Badge>
                  ) : (
                    <Badge tone="subdued">Up to date</Badge>
                  )}
                </InlineStack>
                <Text variant="bodyXs" tone="subdued">
                  Products matched with caption keywords & tags
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Compact Smart Match Suggestions Callout */}
        {totalSmartMatchesCount > 0 && (
          <Card padding="300">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center" gap="300" wrap>
                <InlineStack gap="300" blockAlign="center">
                  <Badge tone="magic" size="large">
                    ✨ AI Suggestions
                  </Badge>
                  <BlockStack gap="050">
                    <Text variant="headingSm" as="h3" fontWeight="bold">
                      {`Smart Product Match Suggestions (${totalSmartMatchesCount})`}
                    </Text>
                    <Text variant="bodyXs" tone="subdued">
                      Detected product names in Instagram captions with ≥75% confidence.
                    </Text>
                  </BlockStack>
                </InlineStack>

                <InlineStack gap="200" blockAlign="center">
                  <Button
                    size="slim"
                    variant="plain"
                    onClick={() => setShowSuggestionsPreview((prev) => !prev)}
                  >
                    {showSuggestionsPreview ? "Hide Preview" : "Preview Matches"}
                  </Button>
                  <Button
                    size="slim"
                    variant="primary"
                    tone="success"
                    icon={CheckCircleIcon}
                    onClick={handleApproveAllMatches}
                  >
                    {`Approve All (${totalSmartMatchesCount})`}
                  </Button>
                </InlineStack>
              </InlineStack>

              {/* Optional Collapsible Compact Horizontal Scroll Strip */}
              {showSuggestionsPreview && (
                <div style={{ paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      overflowX: "auto",
                      paddingBottom: "6px",
                    }}
                  >
                    {Object.entries(smartMatches).map(([postId, suggestions]) => {
                      const post = mediaList.find((m) => (m.id || m.media_url) === postId);
                      if (!post || !suggestions || suggestions.length === 0) return null;
                      const suggestion = suggestions[0];

                      return (
                        <div
                          key={postId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 10px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            flexShrink: 0,
                            fontSize: "12px",
                          }}
                        >
                          <img
                            src={post.thumbnail_url || post.media_url}
                            alt="Post"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "4px",
                              objectFit: "cover",
                            }}
                          />
                          <div style={{ maxWidth: "160px" }}>
                            <div style={{ fontWeight: "600", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {suggestion.title}
                            </div>
                            <div style={{ color: "#7c3aed", fontSize: "11px", fontWeight: "600" }}>
                              ${suggestion.price} · {suggestion.confidence}% match
                            </div>
                          </div>
                          <Button
                            size="micro"
                            variant="primary"
                            onClick={() => handleApproveMatch(postId, suggestion)}
                          >
                            Approve
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </BlockStack>
          </Card>
        )}

        {/* Filter Toolbar & Grid */}
        <Card padding="400">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center" gap="400">
              <ButtonGroup variant="segmented">
                <Button
                  pressed={activeFilter === "all"}
                  onClick={() => setActiveFilter("all")}
                >
                  All Posts ({totalPostsCount})
                </Button>
                <Button
                  pressed={activeFilter === "tagged"}
                  onClick={() => setActiveFilter("tagged")}
                >
                  Tagged ({taggedPostsCount})
                </Button>
                <Button
                  pressed={activeFilter === "untagged"}
                  onClick={() => setActiveFilter("untagged")}
                >
                  Untagged ({untaggedPostsCount})
                </Button>
                {totalSmartMatchesCount > 0 && (
                  <Button
                    pressed={activeFilter === "suggested"}
                    onClick={() => setActiveFilter("suggested")}
                  >
                    Suggested ({totalSmartMatchesCount})
                  </Button>
                )}
              </ButtonGroup>

              <div style={{ width: "300px" }}>
                <TextField
                  placeholder="Search caption or tagged product..."
                  value={searchQuery}
                  onChange={(v) => setSearchQuery(v)}
                  prefix={<Icon source={SearchIcon} />}
                  clearButton
                  onClearButtonClick={() => setSearchQuery("")}
                  autoComplete="off"
                />
              </div>
            </InlineStack>

            <Divider />

            {/* Compact Shopify-style List View for Instagram Posts */}
            {filteredMedia.length === 0 ? (
              <EmptyState
                heading="No posts found matching filter"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Try clearing your search or switching to another filter tab.</p>
              </EmptyState>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                {/* List Table Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px minmax(200px, 1.8fr) minmax(220px, 2fr) 140px",
                    gap: "16px",
                    padding: "10px 16px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    alignItems: "center",
                  }}
                >
                  <div>Media</div>
                  <div>Post Caption</div>
                  <div>Tagged Products / Match</div>
                  <div style={{ textAlign: "right" }}>Actions</div>
                </div>

                {/* List Rows */}
                {filteredMedia.map((post, index) => {
                  const postId = post.id || post.media_url;
                  const tags = taggedProducts[postId] || [];
                  const suggestions = smartMatches[postId] || [];
                  const rawType = (post.media_type || "").toUpperCase();
                  const isVideo =
                    rawType === "VIDEO" ||
                    rawType === "REEL" ||
                    (post.media_url && post.media_url.toLowerCase().includes(".mp4"));

                  return (
                    <div
                      key={postId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "64px minmax(200px, 1.8fr) minmax(220px, 2fr) 140px",
                        gap: "16px",
                        padding: "10px 16px",
                        borderBottom: index < filteredMedia.length - 1 ? "1px solid #f1f5f9" : "none",
                        alignItems: "center",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Media Thumbnail */}
                      <div
                        style={{
                          position: "relative",
                          width: "52px",
                          height: "52px",
                          borderRadius: "8px",
                          overflow: "hidden",
                          background: "#0f172a",
                          cursor: "pointer",
                          flexShrink: 0,
                          border: "1px solid #e2e8f0",
                        }}
                        onClick={() => handleOpenTaggingModal(post)}
                      >
                        <img
                          src={post.thumbnail_url || post.media_url}
                          alt="Post"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        {isVideo && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "2px",
                              right: "2px",
                              background: "rgba(0,0,0,0.75)",
                              color: "#fff",
                              fontSize: "8px",
                              fontWeight: "700",
                              padding: "1px 4px",
                              borderRadius: "4px",
                            }}
                          >
                            VIDEO
                          </div>
                        )}
                      </div>

                      {/* Caption */}
                      <div
                        style={{ minWidth: 0, cursor: "pointer" }}
                        onClick={() => handleOpenTaggingModal(post)}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            lineHeight: "1.4",
                            color: "#1e293b",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                          }}
                        >
                          {post.caption || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No caption</span>}
                        </p>
                      </div>

                      {/* Tagged Products Status */}
                      <div style={{ minWidth: 0 }}>
                        {tags.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                            <Badge tone="success">
                              {`${tags.length}/5 Tagged`}
                            </Badge>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                                alignItems: "center",
                              }}
                            >
                              {tags.slice(0, 2).map((pin, pIdx) => (
                                <span
                                  key={pIdx}
                                  style={{
                                    fontSize: "11px",
                                    background: "#f1f5f9",
                                    color: "#334155",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    border: "1px solid #e2e8f0",
                                    maxWidth: "140px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  🏷️ {pin.title}
                                </span>
                              ))}
                              {tags.length > 2 && (
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                                  +{tags.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : suggestions.length > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <Badge tone="magic">
                              {`AI Match (${suggestions[0].confidence}%)`}
                            </Badge>
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#6b21a8",
                                fontWeight: "600",
                                maxWidth: "160px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={suggestions[0].title}
                            >
                              ✨ {suggestions[0].title}
                            </span>
                          </div>
                        ) : (
                          <Badge tone="subdued">Untagged</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        {tags.length === 0 && suggestions.length > 0 ? (
                          <ButtonGroup>
                            <Button
                              size="micro"
                              variant="primary"
                              onClick={() => handleApproveMatch(postId, suggestions[0])}
                            >
                              Approve
                            </Button>
                            <Button
                              size="micro"
                              onClick={() => handleOpenTaggingModal(post)}
                            >
                              Tag
                            </Button>
                          </ButtonGroup>
                        ) : (
                          <Button
                            size="slim"
                            variant={tags.length > 0 ? "secondary" : "primary"}
                            onClick={() => handleOpenTaggingModal(post)}
                          >
                            {tags.length > 0 ? "Edit Tags" : "Tag Products"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </BlockStack>
        </Card>
      </BlockStack>

      {/* Clean Tagging Modal */}
      {selectedPost && (
        <Modal
          open={Boolean(selectedPost)}
          onClose={handleCloseModal}
          title="Tag Products on Instagram Post"
          size="large"
          primaryAction={{
            content: "Done",
            onAction: handleCloseModal,
          }}
        >
          <Modal.Section>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr",
                gap: "24px",
                minHeight: "480px",
              }}
            >
              {/* Left Column: Post Preview & Caption */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    background: "#0f172a",
                    borderRadius: "12px",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  }}
                >
                  <img
                    src={selectedPost.thumbnail_url || selectedPost.media_url}
                    alt="Post Detail"
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "400px",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <Text variant="headingXs" tone="subdued">
                    Post Caption:
                  </Text>
                  <div style={{ marginTop: "4px" }}>
                    <Text variant="bodyXs" tone="subdued">
                      {selectedPost.caption || "No caption available for this post."}
                    </Text>
                  </div>
                </div>
              </div>

              {/* Right Column: Tagged Products & Product Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Header & Add Button */}
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingSm" fontWeight="bold">
                    Tagged Products (
                    {(taggedProducts[selectedPost.id || selectedPost.media_url] || []).length})
                  </Text>
                  <Button
                    size="slim"
                    variant="primary"
                    icon={PlusIcon}
                    onClick={() => setShowProductPicker(true)}
                  >
                    Add Product
                  </Button>
                </InlineStack>

                {/* Smart Match Suggestion for this specific post */}
                {(smartMatches[selectedPost.id || selectedPost.media_url] || []).length > 0 && (
                  <div
                    style={{
                      background: "#f3e8ff",
                      border: "1px solid #d8b4fe",
                      borderRadius: "8px",
                      padding: "10px 12px",
                    }}
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text variant="bodyXs" fontWeight="bold" tone="magic">
                          ✨ AI Caption Match:
                        </Text>
                        <Text variant="bodySm" fontWeight="bold" truncate>
                          {smartMatches[selectedPost.id || selectedPost.media_url][0].title} ($
                          {smartMatches[selectedPost.id || selectedPost.media_url][0].price})
                        </Text>
                      </div>
                      <Button
                        size="micro"
                        tone="success"
                        variant="primary"
                        onClick={() =>
                          handleApproveMatch(
                            selectedPost.id || selectedPost.media_url,
                            smartMatches[selectedPost.id || selectedPost.media_url][0]
                          )
                        }
                      >
                        Add Tag
                      </Button>
                    </InlineStack>
                  </div>
                )}

                {/* Product Picker Search Interface */}
                {showProductPicker ? (
                  <div
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      padding: "12px",
                      background: "#f8fafc",
                    }}
                  >
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="headingSm">Select a Product</Text>
                        <Button size="micro" onClick={() => setShowProductPicker(false)}>
                          Cancel
                        </Button>
                      </InlineStack>
                      <TextField
                        placeholder="Search product title..."
                        value={productSearchQuery}
                        onChange={(v) => setProductSearchQuery(v)}
                        prefix={<Icon source={SearchIcon} />}
                        autoFocus
                        autoComplete="off"
                      />

                      <div
                        style={{
                          maxHeight: "220px",
                          overflowY: "auto",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {filteredPickerProducts.length === 0 ? (
                          <div style={{ padding: "12px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                            No products found matching "{productSearchQuery}"
                          </div>
                        ) : (
                          filteredPickerProducts.map((p) => {
                            const currentPostPins = selectedPost ? (taggedProducts[selectedPost.id || selectedPost.media_url] || []) : [];
                            const isAlreadyTagged = currentPostPins.some((pin) => pin.productId === p.id || pin.title === p.title);

                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  if (!isAlreadyTagged) handleAddProductPin(p);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px",
                                  background: isAlreadyTagged ? "#f8fafc" : "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "6px",
                                  cursor: isAlreadyTagged ? "not-allowed" : "pointer",
                                  opacity: isAlreadyTagged ? 0.7 : 1,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  {p.image ? (
                                    <img
                                      src={p.image}
                                      alt={p.title}
                                      style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <div style={{ width: "32px", height: "32px", borderRadius: "4px", background: "#e2e8f0" }} />
                                  )}
                                  <div>
                                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{p.title}</div>
                                    <div style={{ fontSize: "11px", color: "#64748b" }}>${p.price}</div>
                                  </div>
                                </div>
                                {isAlreadyTagged ? (
                                  <Badge tone="success">Tagged</Badge>
                                ) : (
                                  <Button size="micro" variant="primary">
                                    Select
                                  </Button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </BlockStack>
                  </div>
                ) : null}

                {/* List of current tagged products */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "280px",
                    overflowY: "auto",
                  }}
                >
                  {(taggedProducts[selectedPost.id || selectedPost.media_url] || []).length === 0 ? (
                    <div
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "8px",
                      }}
                    >
                      <Text variant="bodySm" tone="subdued">
                        No products tagged on this post yet. Click "Add Product" to select from your store catalog.
                      </Text>
                    </div>
                  ) : (
                    (taggedProducts[selectedPost.id || selectedPost.media_url] || []).map((pin, idx) => (
                      <div
                        key={pin.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                          {pin.image ? (
                            <img
                              src={pin.image}
                              alt={pin.title}
                              style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#e2e8f0", flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {pin.title}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              ${pin.price}
                            </div>
                          </div>
                        </div>

                        <Button
                          size="micro"
                          tone="critical"
                          icon={DeleteIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePin(idx);
                          }}
                          accessibilityLabel="Remove tag"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Modal.Section>
        </Modal>
      )}

      {/* Native Shopify App Bridge Save Bar */}
      <ui-save-bar id="product-tagging-save-bar">
        <button
          variant="primary"
          onClick={handleSaveAll}
          id="tagging-save-button"
          loading={isSaving ? "" : undefined}
        >
          Save
        </button>
        <button
          onClick={handleDiscard}
          id="tagging-discard-button"
          disabled={isSaving ? "" : undefined}
        >
          Discard
        </button>
      </ui-save-bar>
    </Page>
  );
}
