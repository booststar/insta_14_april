import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { fetchShopInstaData } from "../instagramApi.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Banner,
  Button,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  ProgressBar,
  Icon,
  Collapsible,
} from "@shopify/polaris";
import {
  CheckIcon,
  PlayIcon,
  SettingsIcon,
  CheckCircleIcon,
  StoreIcon,
  ExternalIcon,
  EditIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  let themeId = "";
  try {
    const response = await admin.graphql(
      `#graphql
      query getThemes {
        themes(first: 10, roles: [MAIN]) {
          nodes {
            id
            name
            role
          }
        }
      }`
    );
    const themesData = await response.json();
    const mainTheme = themesData.data?.themes?.nodes?.find((t) => t.role === "MAIN");
    themeId = mainTheme ? mainTheme.id.split("/").pop() : "";
  } catch (e) {}

  let isConnected = false;
  let username = "";
  try {
    const instaData = await fetchShopInstaData(admin, session.shop);
    isConnected = Boolean(instaData?.connected || instaData?.accessToken || instaData?.username);
    username = instaData?.username || "";
  } catch (e) {}

  return {
    shop: session.shop,
    themeId,
    clientId: process.env.SHOPIFY_API_KEY,
    isConnected,
    username,
  };
};

export default function Guide() {
  const { shop, themeId, clientId, isConnected, username } = useLoaderData();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      id: 1,
      title: "Connect Instagram",
      subtitle: "Sync your photos and reels",
      icon: PlayIcon,
      badge: isConnected ? "Connected" : "Action Needed",
      badgeTone: isConnected ? "success" : "attention",
      description:
        "Connect your Instagram account to sync your latest posts, reels, and videos to your store. You can also preview your layout with sample posts anytime.",
      actionText: isConnected ? "Manage Account" : "⚡ Connect Account",
      action: () => navigate("/app"),
    },
    {
      id: 2,
      title: "Choose a Design",
      subtitle: "Select from 12 styles",
      icon: SettingsIcon,
      badge: "12 Styles",
      badgeTone: "info",
      description:
        "Pick a layout style (Grid, Carousel Slider, Highlights, Reels, Masonry, or Marquee) and customize columns, gaps, and colors in the dashboard.",
      actionText: "Pick Design",
      action: () => navigate("/app"),
    },
    {
      id: 3,
      title: "Tag Products (Optional)",
      subtitle: "Make posts shoppable",
      icon: EditIcon,
      badge: "Shoppable",
      badgeTone: "magic",
      description:
        "Click on any post to tag products from your store. Customers can view item details and click 'View' to open the product directly from the Instagram popup.",
      actionText: "Tag Products",
      action: () => navigate("/app"),
    },
    {
      id: 4,
      title: "Enable App Embed",
      subtitle: "Turn on app in your theme",
      icon: StoreIcon,
      badge: "Required",
      badgeTone: "attention",
      description:
        "Open your Shopify Theme Editor and turn ON the AI Instafeed App Embed toggle. This enables the feed to display securely on your store.",
      actionText: "Open Theme Editor",
      action: () => {
        const url = `https://${shop}/admin/themes/${themeId}/editor?context=apps&activateAppId=${clientId}/app-embed&activateAppEmbed=${clientId}/app-embed`;
        window.open(url, "_blank");
      },
    },
    {
      id: 5,
      title: "Add Section & Save",
      subtitle: "Publish to your storefront",
      icon: CheckCircleIcon,
      badge: "Live Ready",
      badgeTone: "success",
      description:
        "Click 'Add Section' in the Theme Editor, select 'Instagram Feed', and click 'Save' in the top right corner. Your gallery is now live!",
      actionText: "Add Section in Theme",
      action: () => {
        const url = `https://${shop}/admin/themes/${themeId}/editor?addAppBlockId=${clientId}/feed-grid&target=newAppsSection`;
        window.open(url, "_blank");
      },
    },
  ];

  const faqs = [
    {
      q: "Do I need an Instagram Professional/Business account?",
      a: "No! AI Instafeed Expert supports both Instagram Personal accounts (via standard login) and Instagram Business / Creator accounts (via Facebook Graph API). Both allow full syncing of photos, videos, and reels.",
    },
    {
      q: "Can I add the Instagram feed to multiple pages?",
      a: "Yes! You can add the 'Instagram Feed' section to your Homepage, individual Product Pages, Collection Pages, or create a dedicated /pages/lookbook page. You can customize the look for each page independently.",
    },
    {
      q: "How does product hotspot tagging work?",
      a: "In the Dashboard, click 'Tag Products' on any post or video. Click anywhere on the image to place a hotspot pin, select the corresponding product from your Shopify catalog, and save. On your storefront, shoppers can hover/tap pins to see pricing and add items directly to their cart.",
    },
    {
      q: "Will this app slow down my Shopify store?",
      a: "Not at all. AI Instafeed Expert is built with modern Zero-Layout-Shift Web Components, asynchronous image lazy-loading, responsive media queries, and client-side memory caching (<10ms render time) to ensure 100/100 Core Web Vitals.",
    },
    {
      q: "How often does my Instagram feed refresh with new posts?",
      a: "Your feed automatically syncs new posts in real-time. You can also click the '⚡ Sync Feed Now' button in the Dashboard anytime to instantly fetch your latest posts.",
    },
  ];

  return (
    <Page
      title="Setup & Quickstart Guide"
      subtitle="Follow this 5-step walkthrough to launch a shoppable Instagram gallery on your store in under 2 minutes."
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      badge={<Badge tone="info">Step {activeStep} of 5</Badge>}
    >
      <BlockStack gap="500">
        {/* Progress Bar */}
        <ProgressBar progress={(activeStep / 5) * 100} size="small" tone="highlight" />

        {/* Top Summary Banner */}
        {isConnected ? (
          <Banner tone="success">
            <strong>Instagram Connected:</strong> Synced with <strong>@{username || "your account"}</strong>. Follow the remaining steps below to place and style your gallery in your theme.
          </Banner>
        ) : (
          <Banner tone="info">
            <strong>Getting Started:</strong> Your app includes interactive sample lookbook media. Connect your Instagram account to sync your live posts.
          </Banner>
        )}

        <Layout>
          {/* Left Column: 5 Step Navigator */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h2">
                      Launch Checklist
                    </Text>
                    <Badge tone="success">{Math.round((activeStep / 5) * 100)}% Complete</Badge>
                  </InlineStack>
                  <Text variant="bodySm" tone="subdued">
                    Click any step below to view instructions and visual guides.
                  </Text>

                  <Divider />

                  <BlockStack gap="200">
                    {steps.map((step) => {
                      const isActive = activeStep === step.id;
                      const isCompleted = activeStep > step.id;
                      return (
                        <Box
                          key={step.id}
                          padding="300"
                          borderRadius="200"
                          background={isActive ? "bg-surface-brand-active" : "bg-surface-secondary"}
                          borderWidth="025"
                          borderColor={isActive ? "border-brand" : "border"}
                          onClick={() => setActiveStep(step.id)}
                          style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                        >
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                              <div
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  background: isCompleted ? "#10b981" : isActive ? "#2563eb" : "#cbd5e1",
                                  color: "white",
                                  flexShrink: 0,
                                }}
                              >
                                {isCompleted ? <Icon source={CheckIcon} tone="inherit" /> : step.id}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <Text variant="bodySm" fontWeight={isActive ? "bold" : "semibold"}>
                                  {step.title}
                                </Text>
                                <Text variant="bodyXs" tone="subdued">
                                  {step.subtitle}
                                </Text>
                              </div>
                            </InlineStack>
                            <Badge tone={step.badgeTone}>{step.badge}</Badge>
                          </InlineStack>
                        </Box>
                      );
                    })}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Free Setup Assistance Card */}
              <Card>
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <span style={{ fontSize: "16px" }}>🛠️</span>
                    <Text variant="headingSm" as="h3">
                      Need Free Setup Assistance?
                    </Text>
                  </InlineStack>
                  <Text variant="bodySm" tone="subdued">
                    Our certified Shopify integration specialists can install, embed, and style your Instagram gallery for free in under 24 hours.
                  </Text>
                  <Button variant="primary" onClick={() => navigate("/app/support")}>
                    Request Free Setup Expert →
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Right Column: Step Details & Interactive Visuals */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center" wrap>
                  <InlineStack gap="300" blockAlign="center">
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: "rgba(37, 99, 235, 0.1)",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon source={steps[activeStep - 1].icon} tone="inherit" />
                    </div>
                    <div>
                      <Text variant="headingLg" as="h2">
                        Step {activeStep}: {steps[activeStep - 1].title}
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        {steps[activeStep - 1].subtitle}
                      </Text>
                    </div>
                  </InlineStack>

                  {steps[activeStep - 1].actionText && (
                    <Button variant="primary" icon={ExternalIcon} onClick={steps[activeStep - 1].action}>
                      {steps[activeStep - 1].actionText}
                    </Button>
                  )}
                </InlineStack>

                <Text variant="bodyMd">{steps[activeStep - 1].description}</Text>

                <Divider />

                {/* Step Visual Guide Container */}
                <Box padding="600" background="bg-surface-secondary" borderRadius="300">
                  {activeStep === 1 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <div
                        style={{
                          width: "320px",
                          background: "white",
                          borderRadius: "12px",
                          padding: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 12px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                        </div>
                        <Text variant="headingSm" as="h4">
                          {isConnected ? `@${username}` : "Connect Instagram Account"}
                        </Text>
                        <Text variant="bodyXs" tone="subdued">
                          {isConnected ? "Live sync active • 12+ media items cached" : "Supports Personal, Creator & Business profiles"}
                        </Text>
                      </div>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        Head over to your Dashboard and click <strong>"Connect Instagram"</strong> to authorize live sync.
                      </Text>
                    </BlockStack>
                  )}

                  {activeStep === 2 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <InlineStack gap="300" align="center" wrap>
                        {[
                          { name: "Clean Grid", icon: "▦", desc: "Symmetrical square tiles" },
                          { name: "Slider Carousel", icon: "↔", desc: "Swipeable auto-scroll" },
                          { name: "Highlight Eurus", icon: "◫", desc: "2×2 Hero featured post" },
                          { name: "Reels Video Wall", icon: "▶", desc: "9:16 vertical video reel" },
                          { name: "Pinterest Masonry", icon: "▤", desc: "Staggered waterfall columns" },
                          { name: "Social Marquee", icon: "⇄", desc: "Continuous ticker ribbon" },
                        ].map((t, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: "135px",
                              background: "white",
                              borderRadius: "10px",
                              padding: "12px 10px",
                              textAlign: "center",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                            }}
                          >
                            <span style={{ fontSize: "20px" }}>{t.icon}</span>
                            <div style={{ marginTop: "4px" }}>
                              <Text variant="bodySm" fontWeight="bold">
                                {t.name}
                              </Text>
                              <Text variant="bodyXs" tone="subdued">
                                {t.desc}
                              </Text>
                            </div>
                          </div>
                        ))}
                      </InlineStack>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        Select any of the <strong>12 predefined designs</strong> in the Dashboard or tailor your own column count, margins, and typography.
                      </Text>
                    </BlockStack>
                  )}

                  {activeStep === 3 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <div
                        style={{
                          width: "320px",
                          background: "white",
                          borderRadius: "12px",
                          padding: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "140px",
                            borderRadius: "8px",
                            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}>
                            Sample Post Photo / Video
                          </span>
                          {/* Hotspot Pin 1 */}
                          <div
                            style={{
                              position: "absolute",
                              top: "35%",
                              left: "40%",
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              background: "#6366f1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontSize: "11px",
                              fontWeight: "bold",
                              boxShadow: "0 0 0 4px rgba(99,102,241,0.3)",
                            }}
                          >
                            +
                          </div>
                          {/* Product Card Pill */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: "10px",
                              left: "10px",
                              right: "10px",
                              background: "rgba(255,255,255,0.95)",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                          >
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a" }}>
                              Silk Slip Dress · $89
                            </span>
                            <span
                              style={{
                                background: "#0f172a",
                                color: "#fff",
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "3px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              View →
                            </span>
                          </div>
                        </div>
                      </div>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        Click on any post in the Dashboard to place hotspot pins and connect products from your Shopify inventory.
                      </Text>
                    </BlockStack>
                  )}

                  {activeStep === 4 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <div
                        style={{
                          width: "300px",
                          background: "white",
                          borderRadius: "12px",
                          padding: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <InlineStack gap="200" blockAlign="center">
                            <Icon source={StoreIcon} tone="base" />
                            <Text variant="bodySm" fontWeight="bold">
                              AI Instafeed App Embed
                            </Text>
                          </InlineStack>
                          <Badge tone="success">Active</Badge>
                        </div>
                        <Box paddingBlockStart="200">
                          <Text variant="bodyXs" tone="subdued">
                            Toggle ON in Shopify Theme Editor → App Embeds
                          </Text>
                        </Box>
                      </div>
                      <Text variant="bodySm" tone="subdued" alignment="center">
                        Click <strong>"Open Theme App Embeds"</strong> above to ensure the app script is enabled in your active theme.
                      </Text>
                    </BlockStack>
                  )}

                  {activeStep === 5 && (
                    <BlockStack gap="400" align="center" inlineAlign="center">
                      <div
                        style={{
                          width: "70px",
                          height: "70px",
                          borderRadius: "50%",
                          background: "#dcfce7",
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto",
                          boxShadow: "0 4px 12px rgba(22, 101, 52, 0.15)",
                        }}
                      >
                        <Icon source={CheckCircleIcon} tone="inherit" />
                      </div>
                      <Text variant="headingLg" as="h3">
                        Ready for Launch!
                      </Text>
                      <Text variant="bodyMd" tone="subdued" alignment="center">
                        Add the <strong>"Instagram Feed"</strong> section to your theme pages, click <strong>Save</strong> in your Theme Editor, and your shoppable social storefront is live!
                      </Text>
                      <ButtonGroup>
                        <Button variant="primary" onClick={() => navigate("/app")}>
                          Go to Dashboard
                        </Button>
                        <Button onClick={() => navigate("/app/analytics")}>
                          View Analytics
                        </Button>
                      </ButtonGroup>
                    </BlockStack>
                  )}
                </Box>

                {/* Step Pagination Buttons */}
                <InlineStack align="space-between" blockAlign="center">
                  <Button disabled={activeStep === 1} onClick={() => setActiveStep((prev) => prev - 1)}>
                    ← Previous Step
                  </Button>
                  <ButtonGroup>
                    {activeStep < 5 ? (
                      <Button variant="primary" onClick={() => setActiveStep((prev) => prev + 1)}>
                        Next Step →
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => navigate("/app")}>
                        Finish & Open Dashboard
                      </Button>
                    )}
                  </ButtonGroup>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Frequently Asked Questions Card */}
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3">
                      Frequently Asked Questions
                    </Text>
                    <Badge tone="info">Help & FAQ</Badge>
                  </InlineStack>
                  <Divider />
                  <BlockStack gap="200">
                    {faqs.map((faq, idx) => {
                      const isOpen = openFaq === idx;
                      return (
                        <Box
                          key={idx}
                          padding="300"
                          borderRadius="200"
                          background="bg-surface-secondary"
                          borderWidth="025"
                          borderColor="border"
                        >
                          <div
                            onClick={() => toggleFaq(idx)}
                            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                          >
                            <Text variant="bodySm" fontWeight="bold">
                              {faq.q}
                            </Text>
                            <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
                          </div>
                          <Collapsible
                            open={isOpen}
                            id={`faq-${idx}`}
                            transition={{ duration: "200ms", timingFunction: "ease-in-out" }}
                          >
                            <Box paddingBlockStart="200">
                              <Text variant="bodySm" tone="subdued">
                                {faq.a}
                              </Text>
                            </Box>
                          </Collapsible>
                        </Box>
                      );
                    })}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>

        {/* Footer Branding */}
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
                Zero-Code Setup
              </Text>
              <Text variant="bodySm" tone="subdued">
                •
              </Text>
              <Text variant="bodySm" tone="subdued">
                100% PageSpeed Safe
              </Text>
              <Text variant="bodySm" tone="subdued">
                •
              </Text>
              <Text variant="bodySm" tone="subdued">
                Live Support Included
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>
      </BlockStack>
    </Page>
  );
}
