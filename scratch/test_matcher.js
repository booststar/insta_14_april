import { detectProductMatches, extractCaptionTokens, normalizeText } from "../app/utils/productMatcher.js";

const mockPosts = [
  {
    id: "post_1",
    caption: "Our signature Silk Slip Dress in Champagne Gold ✨ Designed for effortless day-to-night styling. #silkdress",
    media_url: "https://example.com/img1.jpg"
  },
  {
    id: "post_2",
    caption: "Weekend essentials: Oversized Linen Shirt in crisp white. #linenlove #summercapsule",
    media_url: "https://example.com/img2.jpg"
  },
  {
    id: "post_3",
    caption: "Morning skincare rituals with our antioxidant glow duo 🍊 Watch the texture melt in. #glowingskin",
    media_url: "https://example.com/img3.jpg"
  },
  {
    id: "post_4",
    caption: "Random post with no matching products here ☕️ Cozy vibes.",
    media_url: "https://example.com/img4.jpg"
  }
];

const mockProducts = [
  {
    id: "prod_1",
    title: "Silk Slip Dress",
    handle: "silk-slip-dress",
    tags: ["silk", "dress", "silkdress"],
    price: "89.00",
    image: "https://example.com/p1.jpg",
    variantId: "v1"
  },
  {
    id: "prod_2",
    title: "Linen Shirt",
    handle: "linen-shirt",
    tags: ["linen", "shirt", "linenlove"],
    price: "55.00",
    image: "https://example.com/p2.jpg",
    variantId: "v2"
  },
  {
    id: "prod_3",
    title: "Antioxidant Glow Duo",
    handle: "antioxidant-glow-duo",
    tags: ["skincare", "glow", "glowingskin"],
    price: "64.00",
    image: "https://example.com/p3.jpg",
    variantId: "v3"
  }
];

console.log("Testing detectProductMatches...");
const matches = detectProductMatches(mockPosts, mockProducts, {});
console.log("Matched results count:", Object.keys(matches).length);
console.log(JSON.stringify(matches, null, 2));

if (matches.post_1 && matches.post_1[0].title === "Silk Slip Dress") {
  console.log("✓ Post 1 match test passed!");
} else {
  console.error("✗ Post 1 match failed");
}

if (matches.post_2 && matches.post_2[0].title === "Linen Shirt") {
  console.log("✓ Post 2 match test passed!");
} else {
  console.error("✗ Post 2 match failed");
}

if (matches.post_3 && matches.post_3[0].title === "Antioxidant Glow Duo") {
  console.log("✓ Post 3 match test passed!");
} else {
  console.error("✗ Post 3 match failed");
}

if (!matches.post_4) {
  console.log("✓ Post 4 non-match test passed!");
} else {
  console.error("✗ Post 4 should not have matches");
}
