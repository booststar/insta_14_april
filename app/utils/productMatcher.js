/**
 * productMatcher.js
 * Smart Match & Approval Tagging Helper
 * Advanced NLP Matching between Instagram captions/hashtags and Shopify catalog.
 */

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "in", "on", "at", "of", "for", "with", "by", "from",
  "to", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "our", "your", "my", "their", "its", "this", "that", "these", "those",
  "new", "set", "pack", "collection", "edition", "piece", "pieces", "size",
  "color", "best", "love", "shop", "get", "now", "off", "sale", "daily",
  "pure", "original", "premium", "classic", "style", "signature", "look",
  "item", "items", "product", "products", "favorite", "all", "here", "just"
]);

/**
 * Clean & normalize text
 */
export function normalizeText(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s#]/g, " ")       // keep alphanumeric and hashtags
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Basic English stemmer for singular/plural/tense matching
 */
export function stemWord(w) {
  if (!w || w.length <= 3) return w;
  let s = String(w).toLowerCase();
  if (s.endsWith("ies") && s.length > 4) return s.slice(0, -3) + "y";
  if (s.endsWith("es") && s.length > 4) return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss") && s.length > 3) return s.slice(0, -1);
  if (s.endsWith("ing") && s.length > 5) return s.slice(0, -3);
  if (s.endsWith("ed") && s.length > 4) return s.slice(0, -2);
  return s;
}

/**
 * Extract words and hashtags from caption
 */
export function extractCaptionTokens(caption) {
  if (!caption) return { words: [], stemmedWords: new Set(), hashtags: [], raw: "", normalized: "", compact: "" };
  const raw = String(caption);
  const normalized = normalizeText(raw);
  const compact = normalized.replace(/[^a-z0-9]/g, "");

  const words = normalized.split(" ").filter((w) => w.length >= 2 && !w.startsWith("#"));
  const hashtags = (raw.match(/#[\w-]+/g) || []).map((h) => h.slice(1).toLowerCase().replace(/[^a-z0-9]/g, ""));
  
  const stemmedWords = new Set(words.map((w) => stemWord(w)));
  // Add hashtags to stemmed words as well
  hashtags.forEach((h) => {
    stemmedWords.add(h);
    stemmedWords.add(stemWord(h));
  });

  return { words, stemmedWords, hashtags, raw, normalized, compact };
}

/**
 * Detect matching products for a list of Instagram posts against a catalog of Shopify products.
 * @param {Array} posts - Array of Instagram post objects { id, caption, media_url, ... }
 * @param {Array} products - Array of Shopify products { id, title, handle, tags, price, image, variantId, ... }
 * @param {Object} existingTaggedProducts - Already approved tags { [postId]: [pin, ...] }
 * @param {number} minConfidenceThreshold - Minimum confidence score (0-100) to include as suggestion (default: 75)
 * @returns {Object} { [postId]: [ suggestedPin, ... ] }
 */
/**
 * Detect matching products for a list of Instagram posts against a catalog of Shopify products.
 * @param {Array} posts - Array of Instagram post objects { id, caption, media_url, ... }
 * @param {Array} products - Array of Shopify products { id, title, handle, tags, price, image, variantId, ... }
 * @param {Object} existingTaggedProducts - Already approved tags { [postId]: [pin, ...] }
 * @param {number} minConfidenceThreshold - Minimum confidence score (0-100) to include as suggestion (default: 75)
 * @param {number} maxSuggestions - Maximum suggestions to return per post (default: 5)
 * @returns {Object} { [postId]: [ suggestedPin, ... ] }
 */
export function detectProductMatches(
  posts = [],
  products = [],
  existingTaggedProducts = {},
  minConfidenceThreshold = 75,
  maxSuggestions = 5
) {
  const suggestionsByPost = {};
  if (!Array.isArray(posts) || !Array.isArray(products) || products.length === 0) {
    return suggestionsByPost;
  }

  // Pre-process products
  const processedProducts = products.map((p) => {
    const rawTitle = String(p.title || "");
    const normalizedTitle = normalizeText(rawTitle);
    const compactTitle = normalizedTitle.replace(/[^a-z0-9]/g, "");
    const titleWords = normalizedTitle.split(" ").filter((w) => w.length >= 2);
    
    // Extract significant keywords excluding stopwords
    const coreKeywords = titleWords.filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    const stemmedCoreKeywords = coreKeywords.map((w) => stemWord(w));

    const normalizedHandle = String(p.handle || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
    const compactHandle = (p.handle || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const handleWords = normalizedHandle.split(" ").filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

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
      compactTitle,
      coreKeywords,
      stemmedCoreKeywords,
      compactHandle,
      handleWords,
      tags,
    };
  });

  posts.forEach((post) => {
    const postId = post.id || post.media_url;
    if (!postId || !post.caption) return;

    const alreadyTaggedPins = existingTaggedProducts[postId] || [];
    const alreadyTaggedIds = new Set(
      alreadyTaggedPins.map((pin) => String(pin.productId || pin.title))
    );

    // If post already has reached max 5 tagged products, skip generating more suggestions
    const remainingSlots = Math.max(0, maxSuggestions - alreadyTaggedPins.length);
    if (remainingSlots <= 0) return;

    const { words, stemmedWords, hashtags, normalized, compact } = extractCaptionTokens(post.caption);
    const detectedForPost = [];

    processedProducts.forEach((prod) => {
      // Skip if already tagged
      if (alreadyTaggedIds.has(String(prod.id)) || alreadyTaggedIds.has(String(prod.title))) {
        return;
      }

      let confidence = 0;
      let matchReason = "";
      let matchedTerm = "";

      // 1. Exact phrase or compact title in caption (98% confidence)
      if (prod.compactTitle.length >= 4 && compact.includes(prod.compactTitle)) {
        confidence = 98;
        matchReason = `Exact product title matched in caption`;
        matchedTerm = prod.title;
      }
      // 2. Compact Handle match (e.g. #blowoutbabethermalbrush or in text) (94% confidence)
      else if (prod.compactHandle.length >= 5 && (compact.includes(prod.compactHandle) || hashtags.includes(prod.compactHandle))) {
        confidence = 94;
        matchReason = `Product handle matched`;
        matchedTerm = prod.handle;
      }
      // 3. Core Keywords Match
      else if (prod.coreKeywords.length > 0) {
        const matchedKeywords = prod.coreKeywords.filter((kw, idx) => {
          const stemmed = prod.stemmedCoreKeywords[idx];
          return (
            normalized.includes(kw) ||
            compact.includes(kw) ||
            stemmedWords.has(kw) ||
            stemmedWords.has(stemmed) ||
            hashtags.some((h) => h.includes(kw) || h.includes(stemmed))
          );
        });

        const matchRatio = matchedKeywords.length / prod.coreKeywords.length;

        if (matchRatio === 1.0) {
          confidence = 92;
          matchReason = `All product keywords matched: ${matchedKeywords.join(", ")}`;
          matchedTerm = matchedKeywords.join(" ");
        } else if (matchedKeywords.length >= 2 && matchRatio >= 0.6) {
          confidence = Math.min(90, Math.round(75 + (matchRatio * 15)));
          matchReason = `Key terms matched: ${matchedKeywords.join(", ")}`;
          matchedTerm = matchedKeywords.join(" ");
        } else if (prod.coreKeywords.length === 1 && matchedKeywords.length === 1 && prod.coreKeywords[0].length >= 4) {
          confidence = prod.coreKeywords[0].length >= 5 ? 80 : 75;
          matchReason = `Matched keyword "${matchedKeywords[0]}"`;
          matchedTerm = matchedKeywords[0];
        }
      }

      // 4. Tag / Category Match (only high confidence if tag matches hashtag or normalized caption)
      if (confidence < 75 && prod.tags.length > 0) {
        const matchedTag = prod.tags.find((t) => {
          const normTag = normalizeText(t);
          const compactTag = normTag.replace(/[^a-z0-9]/g, "");
          return (
            compactTag.length >= 4 &&
            (hashtags.includes(compactTag) || normalized.includes(normTag) || compact.includes(compactTag))
          );
        });

        if (matchedTag) {
          const tagConfidence = 75;
          if (tagConfidence > confidence) {
            confidence = tagConfidence;
            matchReason = `Product tag '#${matchedTag}' matched`;
            matchedTerm = matchedTag;
          }
        }
      }

      // 5. Handle terms match (only if all handle words match)
      if (confidence < 75 && prod.handleWords.length >= 2) {
        const matchedHandleWords = prod.handleWords.filter((hw) => normalized.includes(hw) || compact.includes(hw));
        if (matchedHandleWords.length === prod.handleWords.length) {
          confidence = 78;
          matchReason = `Handle keywords matched: ${matchedHandleWords.join(", ")}`;
          matchedTerm = matchedHandleWords.join(" ");
        }
      }

      // STRICT THRESHOLD: Only include suggestions >= minConfidenceThreshold (75%)
      if (confidence >= minConfidenceThreshold) {
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
      // Sort by highest confidence first and take ONLY top max matched products (max 5)
      detectedForPost.sort((a, b) => b.confidence - a.confidence);
      suggestionsByPost[postId] = detectedForPost.slice(0, remainingSlots);
    }
  });

  return suggestionsByPost;
}
