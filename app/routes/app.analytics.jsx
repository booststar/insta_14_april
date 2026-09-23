import { useState, useMemo } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import { sendMonthlyReportEmail } from "../utils/email.server";
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
  Box,
  Divider,
  DataTable,
  Select,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import {
  ExternalIcon,
  ViewIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
          name
          email
          myshopifyDomain
        }
      }`
    );
    const { data } = await response.json();
    const shopEmail = data?.shop?.email || session.email;
    const shopName = data?.shop?.name || shop;
    const myshopifyDomain = data?.shop?.myshopifyDomain || shop;

    const metrics = await prisma.feedMetric.findMany({
      where: { shop },
      orderBy: { date: "desc" },
      take: 30,
    });

    if (shopEmail) {
      const res = await sendMonthlyReportEmail({
        to: shopEmail,
        shop,
        shopName,
        myshopifyDomain,
        metrics,
      });

      if (res.success) {
        return { success: true, message: `Monthly performance report sent to ${shopEmail}!` };
      }
    }
    return { success: false, message: "Could not send report email. Please check your SMTP settings." };
  } catch (error) {
    console.error("[app.analytics action error]:", error);
    return { success: false, message: error.message };
  }
};

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  let rawMetrics = [];
  try {
    const metrics = await prisma.feedMetric.findMany({
      where: { shop },
      orderBy: { date: "desc" },
      take: 365,
    });
    rawMetrics = metrics.map((m) => ({
      date: m.date,
      views: m.views || 0,
      clicks: m.clicks || 0,
    }));
  } catch (e) {
    console.error("[app.analytics] Failed to load storefront metrics:", e.message);
  }

  // Fetch shop config for tagged posts count and Instagram account
  let config = null;
  let taggedCount = 0;
  let instagramHandle = "";
  try {
    const feedConfig = await prisma.feedConfig.findUnique({ where: { shop } });
    if (feedConfig?.config) {
      config = JSON.parse(feedConfig.config);
      if (config?.postTags && typeof config.postTags === "object") {
        taggedCount = Object.values(config.postTags).filter(
          (pins) => Array.isArray(pins) && pins.length > 0
        ).length;
      } else if (config?.taggedProducts && typeof config.taggedProducts === "object") {
        taggedCount = Object.keys(config.taggedProducts).length;
      }
      instagramHandle = config?.instagramHandle || "";
    }
  } catch (e) {
    console.warn("[app.analytics] Failed to load feedConfig:", e.message);
  }

  // Get active theme ID for quick customizer link
  let themeId = "";
  try {
    const response = await admin.graphql(
      `#graphql
      query getThemes {
        themes(first: 5, roles: [MAIN]) {
          nodes {
            id
          }
        }
      }`
    );
    const themesData = await response.json();
    const mainTheme = themesData.data?.themes?.nodes?.[0];
    themeId = mainTheme ? mainTheme.id.split("/").pop() : "";
  } catch (e) {}

  return {
    shop,
    themeId,
    rawMetrics,
    taggedCount,
    instagramHandle,
    clientId: process.env.SHOPIFY_API_KEY || "",
  };
};

export default function AnalyticsPage() {
  const { shop, themeId, rawMetrics, taggedCount, instagramHandle, clientId } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [timeRange, setTimeRange] = useState("30");

  const rangeOptions = [
    { label: "Last 7 Days", value: "7" },
    { label: "Last 30 Days", value: "30" },
    { label: "Last 90 Days", value: "90" },
    { label: "Past Year (365 Days)", value: "365" },
    { label: "All Time", value: "all" },
  ];

  // Filter raw metrics according to the selected time range
  const filteredData = useMemo(() => {
    if (timeRange === "all") {
      return rawMetrics;
    }
    const days = parseInt(timeRange, 10) || 30;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    return rawMetrics.filter((m) => m.date >= cutoffDate);
  }, [rawMetrics, timeRange]);

  // Aggregate totals
  const totals = useMemo(() => {
    let views = 0;
    let clicks = 0;
    for (const m of filteredData) {
      views += m.views;
      clicks += m.clicks;
    }
    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";
    return { views, clicks, ctr };
  }, [filteredData]);

  // Format table rows
  const tableRows = useMemo(() => {
    return filteredData.map((item) => {
      const itemCtr = item.views > 0 ? ((item.clicks / item.views) * 100).toFixed(1) : "0.0";
      return [
        item.date,
        item.views.toLocaleString(),
        item.clicks.toLocaleString(),
        `${itemCtr}%`,
      ];
    });
  }, [filteredData]);

  const deepLinkUrl = themeId && clientId
    ? `https://${shop}/admin/themes/${themeId}/editor?context=apps&activateAppId=${clientId}/instafeed-app-embed`
    : `https://${shop}/admin/themes/current/editor`;

  return (
    <Page
      title="Feed Analytics"
      subtitle="Track storefront impressions, product clicks, and customer engagement across your store."
      primaryAction={{
        content: "Customize Feed",
        onAction: () => navigate("/app"),
      }}
      secondaryActions={[
        {
          content: fetcher.state === "submitting" ? "Sending Report..." : "Email Monthly Report",
          onAction: () => fetcher.submit({}, { method: "post" }),
          loading: fetcher.state === "submitting",
        },
        {
          content: "Theme Editor",
          icon: ExternalIcon,
          url: deepLinkUrl,
          external: true,
        },
      ]}
    >
      <BlockStack gap="500">
        {fetcher.data?.message && (
          <Banner
            tone={fetcher.data.success ? "success" : "critical"}
            onDismiss={() => {}}
          >
            {fetcher.data.message}
          </Banner>
        )}

        {/* Timeframe & Filter Bar */}
        <Card>
          <InlineStack align="space-between" blockAlign="center" wrap>
            <BlockStack gap="100">
              <Text variant="headingSm" as="h3">
                Performance Overview
              </Text>
              <Text variant="bodyXs" tone="subdued">
                Real-time metrics tracked on storefront visits and shoppable product hotspots.
              </Text>
            </BlockStack>
            <div style={{ minWidth: "180px" }}>
              <Select
                label="Timeframe"
                labelHidden
                options={rangeOptions}
                value={timeRange}
                onChange={(val) => setTimeRange(val)}
              />
            </div>
          </InlineStack>
        </Card>

        {/* 4 Core KPI Stat Tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Tile 1: Storefront Views */}
          <Card padding="400">
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodySm" tone="subdued" fontWeight="medium">
                  Storefront Views
                </Text>
                <span style={{ fontSize: "16px" }}>👀</span>
              </InlineStack>
              <Text variant="headingXl" as="p" fontWeight="bold">
                {totals.views.toLocaleString()}
              </Text>
              <Text variant="bodyXs" tone="subdued">
                Total feed impressions rendered
              </Text>
            </BlockStack>
          </Card>

          {/* Tile 2: Product Clicks */}
          <Card padding="400">
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodySm" tone="subdued" fontWeight="medium">
                  Product Clicks
                </Text>
                <Badge tone={Number(totals.ctr) > 0 ? "success" : "subdued"}>
                  {totals.ctr}% CTR
                </Badge>
              </InlineStack>
              <Text variant="headingXl" as="p" fontWeight="bold">
                {totals.clicks.toLocaleString()}
              </Text>
              <Text variant="bodyXs" tone="subdued">
                Shoppable tag & product taps
              </Text>
            </BlockStack>
          </Card>

          {/* Tile 3: Shoppable Posts */}
          <Card padding="400">
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodySm" tone="subdued" fontWeight="medium">
                  Shoppable Posts
                </Text>
                <Badge tone={taggedCount > 0 ? "info" : "subdued"}>
                  {taggedCount > 0 ? `${taggedCount} Tagged` : "0 Tagged"}
                </Badge>
              </InlineStack>
              <Text variant="headingXl" as="p" fontWeight="bold">
                {taggedCount}
              </Text>
              <Text variant="bodyXs" tone="subdued">
                Posts with tagged checkout links
              </Text>
            </BlockStack>
          </Card>

          {/* Tile 4: Synced Profile */}
          <Card padding="400">
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodySm" tone="subdued" fontWeight="medium">
                  Social Connection
                </Text>
                <Badge tone={instagramHandle ? "success" : "attention"}>
                  {instagramHandle ? "Connected" : "Not Linked"}
                </Badge>
              </InlineStack>
              <Text variant="headingMd" as="p" fontWeight="bold">
                {instagramHandle ? `@${instagramHandle.replace("@", "")}` : "No Account"}
              </Text>
              <Text variant="bodyXs" tone="subdued">
                Active Instagram sync source
              </Text>
            </BlockStack>
          </Card>
        </div>

        {/* Daily Breakdown Table */}
        <Card padding="0">
          <Box padding="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text variant="headingSm" as="h3">
                  Daily Performance Breakdown
                </Text>
                <Text variant="bodyXs" tone="subdued">
                  Showing recorded impressions and product clicks grouped by date.
                </Text>
              </BlockStack>
              <Badge tone="info">
                {filteredData.length} {filteredData.length === 1 ? "day" : "days"} with data
              </Badge>
            </InlineStack>
          </Box>
          <Divider />

          {tableRows.length > 0 ? (
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric"]}
              headings={["Date", "Storefront Views", "Product Clicks", "CTR (%)"]}
              rows={tableRows}
              hoverable
            />
          ) : (
            <Box padding="600">
              <EmptyState
                heading="No analytics recorded yet for this period"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  As customers browse your store and click on your Instagram feed posts, live impressions and product hotspot clicks will automatically populate here.
                </p>
              </EmptyState>
            </Box>
          )}
        </Card>

        {/* Quick Tips for Higher Engagement */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">
              Tips to Increase Conversions & CTR
            </Text>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text variant="bodySm" fontWeight="bold">
                    🏷️ Tag More Products
                  </Text>
                  <Text variant="bodyXs" tone="subdued">
                    Feeds with tagged product hotspots experience up to 3x higher click-through rates compared to regular image galleries.
                  </Text>
                  <Box paddingBlockStart="100">
                    <Button size="micro" variant="plain" onClick={() => navigate("/app")}>
                      Tag Products Now →
                    </Button>
                  </Box>
                </BlockStack>
              </Box>

              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text variant="bodySm" fontWeight="bold">
                    📱 Activate Reels & Videos
                  </Text>
                  <Text variant="bodyXs" tone="subdued">
                    Video content captures visitor attention immediately. Enable the Reels video wall layout to showcase auto-looping clips.
                  </Text>
                  <Box paddingBlockStart="100">
                    <Button size="micro" variant="plain" onClick={() => navigate("/app")}>
                      Explore Layouts →
                    </Button>
                  </Box>
                </BlockStack>
              </Box>

              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text variant="bodySm" fontWeight="bold">
                    ⭐ Enable Story Highlights
                  </Text>
                  <Text variant="bodyXs" tone="subdued">
                    Circular story highlights at the top give customers instant access to promo discounts and new drop announcements.
                  </Text>
                  <Box paddingBlockStart="100">
                    <Button size="micro" variant="plain" onClick={() => navigate("/app")}>
                      Configure Stories →
                    </Button>
                  </Box>
                </BlockStack>
              </Box>
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
