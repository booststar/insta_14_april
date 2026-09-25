import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigation, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";
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
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  CollectionIcon,
  MegaphoneIcon,
  ColorIcon,
  MagicIcon,
} from "@shopify/polaris-icons";

// ─────────────────────────────────────────────────────────────────────────────
// FAQ ITEM COMPONENT (Polaris Accordion)
// ─────────────────────────────────────────────────────────────────────────────
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Box paddingBlock="200">
      <BlockStack gap="200">
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
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
// LOADER - Check current subscription status
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const isTest = process.env.BILLING_TEST_MODE !== "false";
  try {
    const billingCheck = await billing.check({
      plans: ["Pro Monthly"],
      isTest,
    });

    const activeSub = billingCheck.hasActivePayment
      ? billingCheck.appSubscriptions.find((s) => s.status === "ACTIVE")
      : null;

    return {
      subscription: activeSub,
      apiKey: process.env.SHOPIFY_API_KEY,
    };
  } catch (e) {
    return { subscription: null, apiKey: process.env.SHOPIFY_API_KEY };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION - Subscription management
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { billing, admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planName = formData.get("planName");
  const isTest = process.env.BILLING_TEST_MODE !== "false";

  if (planName === "Starter" || planName === "Free") {
    const billingCheck = await billing.check({
      plans: ["Pro Monthly"],
      isTest,
    });

    if (billingCheck.hasActivePayment) {
      const activeSub = billingCheck.appSubscriptions.find((s) => s.status === "ACTIVE");
      if (activeSub) {
        await billing.cancel({
          subscriptionId: activeSub.id,
          isTest,
          prorate: true,
        });
      }
    }
    return { success: true };
  }

  if (!["Pro Monthly"].includes(planName)) {
    return { error: "Plan not found" };
  }

  const appUrl = (process.env.SHOPIFY_APP_URL || process.env.HOST || new URL(request.url).origin).replace(/\/$/, "");
  const shopName = session.shop.replace(".myshopify.com", "");
  const host = Buffer.from(`admin.shopify.com/store/${shopName}`).toString("base64url");
  const returnUrl = `${appUrl}?shop=${session.shop}&host=${host}`;

  try {
    const response = await admin.graphql(
      `#graphql
      mutation AppSubscriptionCreate(
        $name: String!
        $returnUrl: URL!
        $test: Boolean
        $trialDays: Int
        $replacementBehavior: AppSubscriptionReplacementBehavior
        $lineItems: [AppSubscriptionLineItemInput!]!
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          trialDays: $trialDays
          replacementBehavior: $replacementBehavior
          lineItems: $lineItems
        ) {
          appSubscription { id name status }
          confirmationUrl
          userErrors { field message }
        }
      }`,
      {
        variables: {
          name: planName,
          returnUrl,
          test: isTest,
          trialDays: 3,
          replacementBehavior: "APPLY_IMMEDIATELY",
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  interval: "EVERY_30_DAYS",
                  price: { amount: 4.99, currencyCode: "USD" },
                },
              },
            },
          ],
        },
      }
    );

    const { data, errors } = await response.json();

    if (errors?.length) {
      console.error("[Billing] GraphQL errors:", errors);
      return { error: "Could not initiate subscription. Please try again." };
    }

    const { confirmationUrl, userErrors } = data.appSubscriptionCreate;

    if (userErrors?.length) {
      console.error("[Billing] userErrors:", userErrors);
      return { error: userErrors[0]?.message || "Billing setup error occurred." };
    }

    return { confirmationUrl };
  } catch (err) {
    console.error("[Billing] Error:", err?.message ?? err);
    return { error: "Could not initiate subscription. Please try again." };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Plans() {
  const { subscription } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isPageLoading = navigation.state === "loading" || (fetcher.state === "submitting" && fetcher.formData?.get("planName"));

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      open(fetcher.data.confirmationUrl, "_top");
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (fetcher.data?.error) {
      shopify?.toast?.show(fetcher.data.error, { isError: true });
    } else if (fetcher.data?.success) {
      shopify?.toast?.show("Plan updated successfully");
    }
  }, [fetcher.data, shopify]);

  if (!isHydrated || isPageLoading) {
    return (
      <SkeletonPage title="Plans & Pricing" backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}>
        <Layout>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={6} />
              </Box>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={8} />
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const featureCategories = [
    {
      title: "Feed Layouts & Story Highlights",
      icon: CollectionIcon,
      items: [
        { name: "Grid & Story Layouts", desc: "Showcase classic Instagram feeds or circular story highlights." },
        { name: "Smart Carousel Swiper", desc: "Smooth touch-optimized auto-scrolling with prev/next navigation." },
        { name: "Responsive Column Control", desc: "Customize 1–6 columns on desktop and 1–3 columns on mobile." },
        { name: "Aspect Ratio Flexibility", desc: "Choose Auto, Square (1:1), Portrait (3:4), or Story (9:16) sizing." },
      ],
    },
    {
      title: "Conversion & Social Proof",
      icon: MegaphoneIcon,
      items: [
        { name: "Engagement Metrics Hub", desc: "Display live like and comment counts on post hover." },
        { name: "Promo Offer & Discount Popup", desc: "Incentivize shoppers with custom discount banners and coupon rewards." },
        { name: "Interactive Video Lightbox", desc: "High-resolution fullscreen video & image popups with sharing links." },
        { name: "Follow @Account CTA", desc: "Drive shoppers directly to your social profile with follow buttons." },
      ],
    },
    {
      title: "Design & Storefront Branding",
      icon: ColorIcon,
      items: [
        { name: "Curated Typography Presets", desc: "Modern Shoppable, Luxury Lookbook, Minimalist, and more." },
        { name: "Full Color & Spacing Customization", desc: "Match your store theme with pixel-level padding, gap, and color controls." },
        { name: "Custom Profile Header", desc: "Display store bio, handle, and avatar directly above the feed." },
        { name: "Custom Story Highlight Rings", desc: "Custom ring colors, active highlights, and animated pulse rings." },
      ],
    },
    {
      title: "Automation, Speed & 24/7 Support",
      icon: MagicIcon,
      items: [
        { name: "Automated Instagram Sync", desc: "Auto-crawls and syncs all posts into Shopify metafields." },
        { name: "Blazing Fast Storefront Load", desc: "0 API calls per visitor; async scripts that never slow down checkout." },
        { name: "Manual Post Moderation", desc: "Easily hide or feature specific posts directly from the live preview." },
        { name: "24/7 Dedicated Support", desc: "Priority assistance for theme installation and widget custom styling." },
      ],
    },
  ];

  const faqs = [
    {
      q: "Is AI Instafeed really 100% Free?",
      a: "Yes! AI Instafeed is 100% free forever with access to all core and advanced features including story highlights, grid feeds, custom styling, and promo discount offers with no hidden fees.",
    },
    {
      q: "Is AI Instafeed really hands-free?",
      a: "Yes! Once set up, the app automatically syncs your latest Instagram posts directly to your store without manual re-crawling.",
    },
    {
      q: "Will this slow down my store?",
      a: "No. Our storefront scripts are loaded asynchronously and optimized for blazing fast performance with 0 extra API calls per storefront visitor.",
    },
    {
      q: "Do you offer customer support?",
      a: "Yes, we provide 24/7 priority support to help you with store setup and theme customization anytime.",
    },
  ];

  return (
    <Page
      title="Plans & Pricing"
      subtitle="Choose the plan that fits your business needs. 100% free with all features included."
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
    >
      <BlockStack gap="500">
        {/* Main Plan Overview Card */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center" wrap>
              <InlineStack gap="200" blockAlign="center">
                <Text variant="headingXl" as="h2">
                  Free Forever Plan
                </Text>
                <Badge tone="success" progress="complete">
                  ACTIVE PLAN
                </Badge>
              </InlineStack>

              <InlineStack gap="100" blockAlign="baseline">
                <Text variant="heading2xl" as="span">
                  $0
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  / month (All Features Included)
                </Text>
              </InlineStack>
            </InlineStack>

            <Text variant="bodyMd" tone="subdued">
              Empower your store with complete access to shoppable Instagram feeds, high-converting story highlights, interactive popups, and advanced design customizations.
            </Text>

            <Button variant="primary" disabled fullWidth>
              ✓ Currently Active on Your Store
            </Button>
          </BlockStack>
        </Card>

        {/* Free Forever Guarantee & Review Reward Card */}
        <Card padding="400">
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center" wrap>
              <Badge tone="magic">⭐ 100% Free Forever</Badge>
              <Badge tone="success">🎁 Bonus App Credits & AI Perks</Badge>
            </InlineStack>

            <BlockStack gap="100">
              <Text variant="headingMd" as="h3" fontWeight="bold">
                Enjoying the app? Leave a review & claim AI perks!
              </Text>
              <Text variant="bodySm" tone="subdued">
                AI Instafeed is <strong>100% Free Forever</strong>. Leave a quick 5-star review and we'll send free <strong>App Credits</strong> + unlock VIP <strong>AI Smart Tagging & Auto-Detection</strong>!
              </Text>
            </BlockStack>

            <div>
              <Button
                variant="primary"
                icon={StarIcon}
                url="https://apps.shopify.com/ai-instafeed#modal-show=WriteReviewModal"
                target="_blank"
              >
                Write a 5-Star Review & Claim Perks ⭐⭐⭐⭐⭐
              </Button>
            </div>
          </BlockStack>
        </Card>

        {/* Categorized Features Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingLg" as="h2">
                Included Features & Capabilities
              </Text>
              <Badge tone="info">ALL UNLOCKED</Badge>
            </InlineStack>
            <Text variant="bodySm" tone="subdued">
              Every tool and optimization you need to boost social proof, build trust, and drive storefront conversions.
            </Text>

            <Divider />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              {featureCategories.map((cat, idx) => (
                <Box key={idx} padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={cat.icon} tone="base" />
                      <Text variant="headingSm" as="h3">
                        {cat.title}
                      </Text>
                    </InlineStack>

                    <BlockStack gap="200">
                      {cat.items.map((item, itemIdx) => (
                        <InlineStack key={itemIdx} gap="200" blockAlign="start" wrap={false}>
                          <div style={{ flexShrink: 0, marginTop: "2px" }}>
                            <Icon source={CheckIcon} tone="success" />
                          </div>
                          <div>
                            <Text variant="bodyMd" fontWeight="semibold">
                              {item.name}
                            </Text>
                            <Text variant="bodySm" tone="subdued">
                              {item.desc}
                            </Text>
                          </div>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </BlockStack>
                </Box>
              ))}
            </div>
          </BlockStack>
        </Card>

        {/* FAQ Card */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">
              Frequently Asked Questions
            </Text>
            <Text variant="bodySm" tone="subdued">
              Everything you need to know about the plans, store performance, and features.
            </Text>

            <Box paddingBlockStart="200">
              {faqs.map((faq, i) => (
                <FAQItem key={i} question={faq.q} answer={faq.a} />
              ))}
            </Box>
          </BlockStack>
        </Card>

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
