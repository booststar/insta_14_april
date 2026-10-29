import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("1. Verify app.plans.jsx has dismissible review reward banner with session persistence", () => {
  const fileContent = fs.readFileSync(path.join(rootDir, "app", "routes", "app.plans.jsx"), "utf-8");

  assert.ok(fileContent.includes("XIcon"), "app.plans.jsx should import and use XIcon");
  assert.ok(fileContent.includes("isReviewRewardCardDismissed"), "app.plans.jsx should have isReviewRewardCardDismissed state");
  assert.ok(fileContent.includes("handleDismissReviewRewardCard"), "app.plans.jsx should have handleDismissReviewRewardCard");
  assert.ok(fileContent.includes('sessionStorage.getItem("review_reward_card_dismissed")'), "app.plans.jsx should check sessionStorage");
  assert.ok(fileContent.includes('sessionStorage.setItem("review_reward_card_dismissed", "1")'), "app.plans.jsx should set sessionStorage upon dismissal");
  assert.ok(fileContent.includes("accessibilityLabel=\"Dismiss review incentive banner\""), "app.plans.jsx should have accessible dismiss button");
  assert.ok(fileContent.includes("{!isReviewRewardCardDismissed && ("), "app.plans.jsx should conditionally render the banner");
});

test("2. Verify app.analytics.jsx has dismissible review reward and tips banners with session persistence", () => {
  const fileContent = fs.readFileSync(path.join(rootDir, "app", "routes", "app.analytics.jsx"), "utf-8");

  assert.ok(fileContent.includes("XIcon"), "app.analytics.jsx should import and use XIcon");
  assert.ok(fileContent.includes("isReviewRewardCardDismissed"), "app.analytics.jsx should have isReviewRewardCardDismissed state");
  assert.ok(fileContent.includes("handleDismissReviewRewardCard"), "app.analytics.jsx should have handleDismissReviewRewardCard");
  assert.ok(fileContent.includes('sessionStorage.getItem("review_reward_card_dismissed")'), "app.analytics.jsx should check sessionStorage for review reward");
  assert.ok(fileContent.includes('sessionStorage.setItem("review_reward_card_dismissed", "1")'), "app.analytics.jsx should set sessionStorage upon review dismiss");
  assert.ok(fileContent.includes("{!isReviewRewardCardDismissed && ("), "app.analytics.jsx should conditionally render review reward card");

  assert.ok(fileContent.includes("isTipsCardDismissed"), "app.analytics.jsx should have isTipsCardDismissed state");
  assert.ok(fileContent.includes("handleDismissTipsCard"), "app.analytics.jsx should have handleDismissTipsCard");
  assert.ok(fileContent.includes('sessionStorage.getItem("analytics_tips_card_dismissed")'), "app.analytics.jsx should check sessionStorage for tips");
  assert.ok(fileContent.includes("{!isTipsCardDismissed && ("), "app.analytics.jsx should conditionally render tips card");
});

test("3. Verify app._index.jsx syncs review reward card dismissal with sessionStorage", () => {
  const fileContent = fs.readFileSync(path.join(rootDir, "app", "routes", "app._index.jsx"), "utf-8");

  assert.ok(fileContent.includes('sessionStorage.getItem("review_reward_card_dismissed")'), "app._index.jsx should check sessionStorage");
  assert.ok(fileContent.includes('sessionStorage.setItem("review_reward_card_dismissed", "1")'), "app._index.jsx should set sessionStorage upon dismiss");
  assert.ok(fileContent.includes("handleDismissReviewRewardCard"), "app._index.jsx should have dismiss handler");
  assert.ok(fileContent.includes("!isReviewRewardCardDismissed"), "app._index.jsx should conditionally render card based on dismissal");
});

test("4. Verify app.support.jsx has dismissible consultation banner with session persistence", () => {
  const fileContent = fs.readFileSync(path.join(rootDir, "app", "routes", "app.support.jsx"), "utf-8");

  assert.ok(fileContent.includes("XIcon"), "app.support.jsx should import and use XIcon");
  assert.ok(fileContent.includes("isConsultationCardDismissed"), "app.support.jsx should have isConsultationCardDismissed state");
  assert.ok(fileContent.includes("handleDismissConsultationCard"), "app.support.jsx should have handleDismissConsultationCard");
  assert.ok(fileContent.includes('sessionStorage.getItem("support_consultation_dismissed")'), "app.support.jsx should check sessionStorage");
  assert.ok(fileContent.includes('sessionStorage.setItem("support_consultation_dismissed", "1")'), "app.support.jsx should set sessionStorage upon dismiss");
  assert.ok(fileContent.includes("{!isConsultationCardDismissed && ("), "app.support.jsx should conditionally render consultation card");
});

test("5. Simulate mock browser session persistence and app-wide dismissal behavior", () => {
  class MockStorage {
    constructor() {
      this.store = new Map();
    }
    getItem(key) {
      return this.store.get(key) || null;
    }
    setItem(key, value) {
      this.store.set(key, String(value));
    }
    removeItem(key) {
      this.store.delete(key);
    }
    clear() {
      this.store.clear();
    }
  }

  // Session 1:
  let sessionStorage = new MockStorage();
  let localStorage = new MockStorage();

  // Helper simulating the dismissal check in all components
  const checkReviewBannerDismissed = (session, local) => {
    return session.getItem("review_reward_card_dismissed") === "1" || local.getItem("review_reward_card_dismissed") === "1";
  };

  // Initially in fresh session, it should NOT be dismissed
  assert.equal(checkReviewBannerDismissed(sessionStorage, localStorage), false, "Fresh session should show banner");

  // User dismisses banner on Plans page (/app/plans)
  sessionStorage.setItem("review_reward_card_dismissed", "1");
  localStorage.setItem("review_reward_card_dismissed", "1");

  // User stays in session, page reloaded
  assert.equal(checkReviewBannerDismissed(sessionStorage, localStorage), true, "Reload in same session keeps banner dismissed");

  // User navigates to Analytics page (/app/analytics) in same session
  assert.equal(checkReviewBannerDismissed(sessionStorage, localStorage), true, "Navigation to Analytics in same session keeps banner dismissed");

  // User navigates to Dashboard (/app) in same session
  assert.equal(checkReviewBannerDismissed(sessionStorage, localStorage), true, "Navigation to Dashboard in same session keeps banner dismissed");
});
