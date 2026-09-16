/**
 * productMatcher.js
 * Smart Match & Approval Tagging Helper
 * Matches Instagram post captions against Shopify product details (titles, handles, tags, SKUs).
 */

/**
 * Clean & normalize text for fuzzy comparison
 */
export function normalizeText(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s#]/g, " ")       // keep words and hashtags, replace punctuation with spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract words and hashtags from caption
 */
export function extractCaptionTokens(caption) {
  if (!caption) return { words: [], hashtags: [], raw: "" };
  const raw = String(caption);
  const normalized = normalizeText(raw);
  const words = normalized.split(" ").filter((w) => w.length > 2 && !w.startsWith("#"));
  const hashtags = (raw.match(/#[\w-]+/g) || []).map((h) => h.slice(1).toLowerCase().replace(/-/g, " "));
  return { words, hashtags, raw, normalized };
}

/**
 * Detect matching products for a list of Instagram posts against a catalog of Shopify products.
 * @param {Array} posts - Array of Instagram post objects { id, caption, media_url, ... }
 * @param {Array} products - Array of Shopify products { id, title, handle, tags, price, image, variantId, ... }
 * @param {Object} existingTaggedProducts - Already approved tags { [postId]: [pin, ...] }
 * @returns {Object} { [postId]: [ suggestedPin, ... ] }
 */
export function detectProductMatches(posts = [], products = [], existingTaggedProducts = {}) {
  const suggestionsByPost = {};
  if (!Array.isArray(posts) || !Array.isArray(products) || products.length === 0) {
    return suggestionsByPost;
  }

  // Pre-process products for efficient lookup
  const processedProducts = products.map((p) => {
    const rawTitle = String(p.title || "");
    const normalizedTitle = normalizeText(rawTitle);
    const titleWords = normalizedTitle.split(" ").filter((w) => w.length > 2);
    const normalizedHandle = String(p.handle || "").toLowerCase().replace(/-/g, " ");
    const tags = Array.isArray(p.tags)
      ? p.tags.map((t) => normalizeText(t))
      : String(p.tags || "")
          .split(",")
          .map((t) => normalizeText(t))
          .filter(Boolean);

    return {
      raw: p,
      id: p.id,
      variantId: p.variantId ? String(p.variantId).split("/").pop() : "default",
      title: rawTitle,
      handle: p.handle || "",
      price: p.price || "0.00",
      image: p.image || p.featuredImage?.url || p.images?.[0]?.originalSrc || "",
      normalizedTitle,
      titleWords,
      normalizedHandle,
      tags,
    };
  });

  posts.forEach((post) => {
    const postId = post.id || post.media_url;
    if (!postId || !post.caption) return;

    const alreadyTaggedIds = new Set(
      (existingTaggedProducts[postId] || []).map((pin) => pin.productId || pin.title)
    );

    const { raw, normalized, hashtags } = extractCaptionTokens(post.caption);
    const detectedForPost = [];

    processedProducts.forEach((prod) => {
      // Skip if product is already tagged on this post
      if (alreadyTaggedIds.has(prod.id) || alreadyTaggedIds.has(prod.title)) {
        return;
      }

      let confidence = 0;
      let matchReason = "";
      let matchedTerm = "";

      // 1. Exact Full Title Match (e.g. "Silk Slip Dress" in caption)
      if (prod.normalizedTitle.length >= 4 && normalized.includes(prod.normalizedTitle)) {
        confidence = 96;
        matchReason = `Exact product title matched in caption`;
        matchedTerm = prod.title;
      }
      // 2. Handle Match (e.g. "silk slip dress" from handle in caption or hashtags)
      else if (prod.normalizedHandle.length >= 4 && (normalized.includes(prod.normalizedHandle) || hashtags.includes(prod.normalizedHandle))) {
        confidence = 90;
        matchReason = `Product handle matched in caption/hashtag`;
        matchedTerm = prod.handle;
      }
      // 3. Significant Title Words Overlap (all title words present if 2+ words)
      else if (prod.titleWords.length >= 2 && prod.titleWords.every((w) => normalized.includes(w))) {
        confidence = 85;
        matchReason = `Key title terms (${prod.titleWords.join(", ")}) found in caption`;
        matchedTerm = prod.title;
      }
      // 4. Hashtag Match with Product Tags or Unique Title Word
      else {
        const matchingTag = prod.tags.find((t) => t.length >= 4 && (hashtags.includes(t) || normalized.includes(t)));
        if (matchingTag) {
          confidence = 75;
          matchReason = `Product tag '#${matchingTag}' matched`;
          matchedTerm = matchingTag;
        }
      }

      if (confidence >= 70) {
        detectedForPost.push({
          id: `suggest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productId: prod.id,
          variantId: prod.variantId,
          title: prod.title,
          handle: prod.handle,
          price: prod.price,
          image: prod.image,
          x: 50,
          y: 50,
          confidence,
          matchReason,
          matchedTerm,
        });
      }
    });

    if (detectedForPost.length > 0) {
      // Sort by confidence descending
      detectedForPost.sort((a, b) => b.confidence - a.confidence);
      suggestionsByPost[postId] = detectedForPost;
    }
  });

  return suggestionsByPost;
}
