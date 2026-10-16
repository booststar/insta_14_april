import { useState, useEffect } from "react";
import whiteLogo from "../image/boost-star-white.png";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Collapsible,
  SkeletonPage,
  SkeletonDisplayText,
  SkeletonBodyText,
  Icon,
} from "@shopify/polaris";
import {
  EmailIcon,
  ChatIcon,
  QuestionCircleIcon,
  PersonIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";

// ─────────────────────────────────────────────────────────────────────────────
// FAQ ACCORDION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Box paddingBlock="200">
      <BlockStack gap="200">
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Text variant="bodyMd" fontWeight="semibold">
            {question}
          </Text>
          <Button
            variant="plain"
            icon={isOpen ? ChevronUpIcon : ChevronDownIcon}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            accessibilityLabel="Toggle FAQ"
          />
        </div>
        <Collapsible open={isOpen} id={`faq-${question.replace(/\s+/g, "-")}`}>
          <Box paddingBlockStart="100" paddingBlockEnd="200">
            <Text variant="bodyMd" tone="subdued">
              {answer}
            </Text>
          </Box>
        </Collapsible>
        <Divider />
      </BlockStack>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LOADER - Fetch shop info
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  let merchantEmail = "";
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
          email
        }
      }`
    );
    const { data } = await response.json();
    merchantEmail = data?.shop?.email || "";
  } catch (e) {}

  return {
    shop: session.shop,
    merchantEmail,
    supportEmail: process.env.SUPPORT_EMAIL || "contact@booststar.in",
    whatsappNumber: "+917000587074",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Support() {
  const { supportEmail, whatsappNumber } = useLoaderData();
  const navigate = useNavigate();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <SkeletonPage title="Support & Help Center" backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={8} />
              </Box>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={6} />
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const faqs = [
    {
      q: "How do I connect my Instagram account?",
      a: "Simply enter your public Instagram @handle on the dashboard. Our automated discovery fetches your latest media without requiring password sharing or complex API credentials.",
    },
    {
      q: "How do I display the Instagram feed on my Shopify store?",
      a: "Go to Shopify Admin > Online Store > Themes > Customize. Click 'Add Section' on any page, search for 'Instagram Feed' or 'Instagram Stories', position it in your layout, and click Save.",
    },
    {
      q: "How often does my Instagram feed automatically update?",
      a: "The app automatically syncs new posts in the background. You can also trigger an instant refresh anytime by saving your feed settings on the app dashboard.",
    },
    {
      q: "Does the app support Instagram Reels and Video posts?",
      a: "Yes! Instagram Reels, MP4 videos, and Carousel Album posts are fully supported with autoplay, video badges, cover thumbnail posters, and high-resolution fullscreen lightbox view.",
    },
    {
      q: "Can I hide specific posts from showing on my store?",
      a: "Yes! Toggle on 'Manual Hide Mode' in the app dashboard, then click on any post thumbnail in the live preview to instantly hide or unhide it from your storefront.",
    },
    {
      q: "Will this app slow down my website or affect page speed?",
      a: "No. AI Instafeed is built with native Web Components, lazy-loaded media assets, and cached metafields, guaranteeing 0 extra API calls per storefront visitor and 0ms impact on checkout speeds.",
    },
    {
      q: "How do I customize the layout for Mobile vs Desktop?",
      a: "In the Feed Grid settings, you can customize column counts independently for desktop (up to 6 columns) and mobile (1 to 3 columns), as well as adjust image gaps, aspect ratios, titles, and typography.",
    },
    {
      q: "Is the app free to use for my store?",
      a: "Yes! AI Instafeed is 100% Free Forever with unlimited posts, story highlights, custom layout configurations, and discount promo offers included out of the box.",
    },
    {
      q: "Why is a video thumbnail showing a blank frame?",
      a: "Video posts use Instagram's generated cover poster. If a browser blocks video autoplay (e.g. in Low Power Mode), our built-in video fallback automatically extracts and displays the video's first frame.",
    },
    {
      q: "Do I need an Instagram Business or Professional account?",
      a: "The app works directly with any public Instagram Business or Creator account. Having a public business profile connected ensures maximum stability and access to engagement metrics.",
    },
  ];

  return (
    <Page
      title="Support & Help Center"
      subtitle="Get dedicated assistance from Shopify integration experts or browse frequently asked questions"
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
    >
      <BlockStack gap="500">
        {/* Expert Consultation Banner Card */}
        <Card>
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <InlineStack align="space-between" blockAlign="center" gap="300" wrap>
              <InlineStack gap="300" blockAlign="center" wrap={false}>
                <div
                  style={{
                    padding: "10px",
                    background: "#2563eb",
                    borderRadius: "10px",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon source={PersonIcon} tone="inherit" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text variant="headingMd" as="h3">
                    Need a Design Consultation?
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Speak directly with our certified Shopify designers to match your Instagram gallery perfectly with your store's branding.
                  </Text>
                </div>
              </InlineStack>
              <Button
                variant="primary"
                icon={ExternalIcon}
                onClick={() => window.open("https://calendar.app.google/gwUVdD1FrqMc5R5KA", "_blank")}
              >
                Book 1-on-1 Consultation
              </Button>
            </InlineStack>
          </Box>
        </Card>

        <Layout>
          {/* Left Column: FAQ Section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingLg" as="h2">
                  Frequently Asked Questions
                </Text>
                <Text variant="bodySm" tone="subdued">
                  Everything you need to know about setting up, styling, and optimizing AI Instafeed.
                </Text>

                <Divider />

                <Box paddingBlockStart="200">
                  {faqs.map((faq, i) => (
                    <FAQItem key={i} question={faq.q} answer={faq.a} />
                  ))}
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Right Column: Direct Support Channels & Partner Info */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">
                    Direct Support Channels
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Reach our 24/7 dedicated support team through your preferred channel.
                  </Text>

                  <Divider />

                  {/* Email Support */}
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    borderWidth="025"
                    borderColor="border"
                    onClick={() => window.open(`mailto:${supportEmail}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <InlineStack gap="300" blockAlign="center">
                      <div
                        style={{
                          background: "#eff6ff",
                          padding: "8px",
                          borderRadius: "8px",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon source={EmailIcon} tone="inherit" />
                      </div>
                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">
                          Email Support
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          {supportEmail}
                        </Text>
                      </div>
                    </InlineStack>
                  </Box>

                  {/* WhatsApp Support */}
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    borderWidth="025"
                    borderColor="border"
                    onClick={() => window.open(`https://wa.me/${whatsappNumber.replace("+", "")}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <InlineStack gap="300" blockAlign="center">
                      <div
                        style={{
                          background: "#f0fdf4",
                          padding: "8px",
                          borderRadius: "8px",
                          color: "#16a34a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon source={ChatIcon} tone="inherit" />
                      </div>
                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">
                          WhatsApp Priority Chat
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          Instant live chat assistance
                        </Text>
                      </div>
                    </InlineStack>
                  </Box>

                  {/* Help Guide */}
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    borderWidth="025"
                    borderColor="border"
                    onClick={() => navigate("/app/guide")}
                    style={{ cursor: "pointer" }}
                  >
                    <InlineStack gap="300" blockAlign="center">
                      <div
                        style={{
                          background: "#fff7ed",
                          padding: "8px",
                          borderRadius: "8px",
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon source={QuestionCircleIcon} tone="inherit" />
                      </div>
                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">
                          Setup Guide & Tutorial
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          Interactive 4-step walkthrough
                        </Text>
                      </div>
                    </InlineStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Developer / Partner Card */}
              <Card>
                <BlockStack gap="300" align="center" inlineAlign="center">
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img src={whiteLogo} alt="BOOST STAR Logo" style={{ width: "28px", height: "auto" }} />
                  </div>
                  <Text variant="headingMd" as="h3" alignment="center">
                    BOOST STAR Experts
                  </Text>
                  <Text variant="bodySm" tone="subdued" alignment="center">
                    Certified Shopify Partner specialized in storefront conversions, social proof widgets, and custom theme engineering.
                  </Text>
                  <Badge tone="success">Verified Expert Team</Badge>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Footer */}
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
      </BlockStack>
    </Page>
  );
}
