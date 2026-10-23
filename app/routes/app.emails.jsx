import { useState, useMemo } from "react";
import { useLoaderData, useFetcher, useRouteError } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Banner,
  Button,
  TextField,
  Select,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  EmptyState,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import { sendSetupReminderEmail } from "../utils/email.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "";

  let rawLogs = [];
  let totalCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let openedCount = 0;
  let clickedCount = 0;

  try {
    if (prisma?.emailLog) {
      rawLogs = await prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      totalCount = await prisma.emailLog.count();
      sentCount = await prisma.emailLog.count({ where: { status: "SENT" } });
      failedCount = await prisma.emailLog.count({ where: { status: "FAILED" } });
      skippedCount = await prisma.emailLog.count({ where: { status: "SKIPPED" } });
      openedCount = await prisma.emailLog.count({ where: { openCount: { gt: 0 } } });
      clickedCount = await prisma.emailLog.count({ where: { clickCount: { gt: 0 } } });
    } else {
      const rows = await prisma.$queryRawUnsafe(
        'SELECT * FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 200'
      );
      rawLogs = rows || [];
      totalCount = rawLogs.length;
      sentCount = rawLogs.filter((l) => l.status === "SENT").length;
      failedCount = rawLogs.filter((l) => l.status === "FAILED").length;
      skippedCount = rawLogs.filter((l) => l.status === "SKIPPED").length;
      openedCount = rawLogs.filter((l) => Number(l.openCount || 0) > 0).length;
      clickedCount = rawLogs.filter((l) => Number(l.clickCount || 0) > 0).length;
    }
  } catch (err) {
    console.warn("[EmailLog Loader Warning]:", err.message);
  }

  // Calculate App-Wide Rates
  const deliveryRate = totalCount > 0 ? ((sentCount / totalCount) * 100).toFixed(1) : "0.0";
  const openRate = sentCount > 0 ? ((openedCount / sentCount) * 100).toFixed(1) : "0.0";
  const clickRate = openedCount > 0 ? ((clickedCount / openedCount) * 100).toFixed(1) : sentCount > 0 ? ((clickedCount / sentCount) * 100).toFixed(1) : "0.0";

  // Calculate campaign breakdowns
  const campaignStats = {};
  for (const log of rawLogs) {
    const type = log.emailType || "other";
    if (!campaignStats[type]) {
      campaignStats[type] = { total: 0, sent: 0, opened: 0, clicked: 0 };
    }
    campaignStats[type].total += 1;
    if (log.status === "SENT") campaignStats[type].sent += 1;
    if (Number(log.openCount || 0) > 0) campaignStats[type].opened += 1;
    if (Number(log.clickCount || 0) > 0) campaignStats[type].clicked += 1;
  }

  const hasSmtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(.{3})(.*)(@.*)/, "$1***$3") : "";

  return {
    logs: rawLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt || new Date().toISOString()),
      openedAt: log.openedAt ? (log.openedAt instanceof Date ? log.openedAt.toISOString() : String(log.openedAt)) : null,
      clickedAt: log.clickedAt ? (log.clickedAt instanceof Date ? log.clickedAt.toISOString() : String(log.clickedAt)) : null,
    })),
    stats: {
      total: totalCount,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      opened: openedCount,
      clicked: clickedCount,
      deliveryRate,
      openRate,
      clickRate,
    },
    campaignStats,
    smtp: {
      configured: hasSmtpConfigured,
      user: smtpUser,
    },
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "";

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sendTestEmail") {
    const toEmail = formData.get("toEmail");
    const shop = session.shop;

    if (!toEmail) {
      return { success: false, error: "Please provide a valid recipient email." };
    }

    try {
      const result = await sendSetupReminderEmail({
        to: toEmail,
        shop,
        shopName: "Admin Test Store",
        myshopifyDomain: shop,
        isConnected: false,
        isEmbedActive: false,
        isSectionActive: false,
        instagramHandle: "test_handle",
      });

      return {
        testEmailSent: true,
        success: result.success,
        message: result.success
          ? `Test email sent to ${toEmail}!`
          : result.error || "Email sending skipped (SMTP not configured).",
      };
    } catch (e) {
      return { testEmailSent: true, success: false, error: e.message };
    }
  }

  return { success: false };
}

export default function AdminEmailsPage() {
  const { logs, stats, campaignStats, smtp } = useLoaderData();
  const testFetcher = useFetcher();

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [showTestForm, setShowTestForm] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (typeFilter !== "all" && log.emailType !== typeFilter) return false;
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchShop = log.shop?.toLowerCase().includes(q);
        const matchRecipient = log.recipient?.toLowerCase().includes(q);
        const matchSubject = log.subject?.toLowerCase().includes(q);
        if (!matchShop && !matchRecipient && !matchSubject) return false;
      }
      return true;
    });
  }, [logs, typeFilter, statusFilter, searchQuery]);

  const getTypeBadge = (type) => {
    switch (type) {
      case "welcome":
        return <Badge tone="info">Welcome</Badge>;
      case "setup_reminder":
        return <Badge tone="attention">Setup Reminder</Badge>;
      case "monthly_report":
        return <Badge tone="magic">Monthly Report</Badge>;
      case "support":
        return <Badge tone="success">Support Ticket</Badge>;
      case "reinstall":
        return <Badge tone="info">Re-install</Badge>;
      case "uninstall":
        return <Badge tone="critical">Uninstall</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "SENT":
        return <Badge tone="success">Sent</Badge>;
      case "FAILED":
        return <Badge tone="critical">Failed</Badge>;
      case "SKIPPED":
        return <Badge tone="warning">Skipped (No SMTP)</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleSendTest = () => {
    if (!testEmailAddress.trim()) return;
    const fd = new FormData();
    fd.append("intent", "sendTestEmail");
    fd.append("toEmail", testEmailAddress.trim());
    testFetcher.submit(fd, { method: "post" });
  };

  return (
    <Page
      backAction={{ content: "Dashboard", url: "/app" }}
      title="App-Wide Email Engagement & Analytics"
      subtitle="Super-Admin view: Track email delivery, open rates, click-through rates (CTR), and conversion across all stores."
      primaryAction={{
        content: showTestForm ? "Close Test Tool" : "Send Test Email",
        onAction: () => setShowTestForm((prev) => !prev),
      }}
    >
      <BlockStack gap="500">
        {/* ── SMTP Status Banner ── */}
        {smtp.configured ? (
          <Banner tone="success" title="SMTP Mailer Active">
            <p>
              Emails are being delivered live via Gmail/SMTP server (configured as <strong>{smtp.user}</strong>).
            </p>
          </Banner>
        ) : (
          <Banner tone="warning" title="SMTP Not Configured">
            <p>
              <code>SMTP_USER</code> and <code>SMTP_PASS</code> are currently empty in <code>.env</code>.
              Emails are safely logged as <strong>SKIPPED</strong> so stores function without interruptions. Fill SMTP credentials to deliver live emails.
            </p>
          </Banner>
        )}

        {/* ── Test Email Trigger Tool ── */}
        {showTestForm && (
          <Card padding="400">
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                Send a Live Test Setup Reminder Email
              </Text>
              <Text variant="bodySm" tone="subdued">
                Test your email delivery and verify open/click tracking in real-time.
              </Text>
              <InlineStack gap="300" blockAlign="end">
                <div style={{ flex: 1, maxWidth: "400px" }}>
                  <TextField
                    label="Recipient Email Address"
                    value={testEmailAddress}
                    onChange={setTestEmailAddress}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <Button
                  variant="primary"
                  loading={testFetcher.state !== "idle"}
                  onClick={handleSendTest}
                  disabled={!testEmailAddress.trim()}
                >
                  Send Test Now
                </Button>
              </InlineStack>
              {testFetcher.data && (
                <Box paddingBlockStart="200">
                  <Badge tone={testFetcher.data.success ? "success" : "attention"}>
                    {testFetcher.data.message || testFetcher.data.error}
                  </Badge>
                </Box>
              )}
            </BlockStack>
          </Card>
        )}

        {/* ── Top 4 Engagement KPI Cards ── */}
        <Layout>
          {/* 1. Total Sent & Success Rate */}
          <Layout.Section variant="oneThird">
            <Card padding="400">
              <BlockStack gap="150">
                <Text variant="bodySm" tone="subdued">Sent / Delivery Rate</Text>
                <InlineStack align="space-between" blockAlign="baseline">
                  <Text variant="headingXl" as="p" fontWeight="bold" tone="success">
                    {stats.sent}
                  </Text>
                  <Badge tone={Number(stats.deliveryRate) >= 90 ? "success" : "attention"}>
                    {`${stats.deliveryRate}% Delivery`}
                  </Badge>
                </InlineStack>
                <Text variant="caption" tone="subdued">
                  {stats.total} total triggered ({stats.skipped} skipped, {stats.failed} failed)
                </Text>
                <Box paddingBlockStart="100">
                  <ProgressBar progress={Math.min(100, Number(stats.deliveryRate))} size="small" tone="success" />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* 2. Open Rate */}
          <Layout.Section variant="oneThird">
            <Card padding="400">
              <BlockStack gap="150">
                <Text variant="bodySm" tone="subdued">Emails Opened / Open Rate</Text>
                <InlineStack align="space-between" blockAlign="baseline">
                  <Text variant="headingXl" as="p" fontWeight="bold" tone="magic">
                    {stats.opened}
                  </Text>
                  <Badge tone={Number(stats.openRate) >= 30 ? "success" : Number(stats.openRate) > 0 ? "info" : "subdued"}>
                    {`${stats.openRate}% Open Rate`}
                  </Badge>
                </InlineStack>
                <Text variant="caption" tone="subdued">
                  Unique email opens tracked via 1x1 pixel
                </Text>
                <Box paddingBlockStart="100">
                  <ProgressBar progress={Math.min(100, Number(stats.openRate))} size="small" tone="primary" />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* 3. Click Rate / CTR */}
          <Layout.Section variant="oneThird">
            <Card padding="400">
              <BlockStack gap="150">
                <Text variant="bodySm" tone="subdued">Link Clicks / CTR</Text>
                <InlineStack align="space-between" blockAlign="baseline">
                  <Text variant="headingXl" as="p" fontWeight="bold" tone="info">
                    {stats.clicked}
                  </Text>
                  <Badge tone={Number(stats.clickRate) >= 15 ? "success" : Number(stats.clickRate) > 0 ? "info" : "subdued"}>
                    {`${stats.clickRate}% CTR`}
                  </Badge>
                </InlineStack>
                <Text variant="caption" tone="subdued">
                  Merchants clicking setup & theme links
                </Text>
                <Box paddingBlockStart="100">
                  <ProgressBar progress={Math.min(100, Number(stats.clickRate))} size="small" tone="highlight" />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* ── Campaign Breakdown Table ── */}
        <Card padding="400">
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">
              Performance by Email Campaign
            </Text>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "8px 12px" }}>Campaign</th>
                    <th style={{ padding: "8px 12px" }}>Total Triggered</th>
                    <th style={{ padding: "8px 12px" }}>Sent (Delivered)</th>
                    <th style={{ padding: "8px 12px" }}>Unique Opens</th>
                    <th style={{ padding: "8px 12px" }}>Open Rate</th>
                    <th style={{ padding: "8px 12px" }}>Link Clicks</th>
                    <th style={{ padding: "8px 12px" }}>Click Rate (CTR)</th>
                  </tr>
                </thead>
                <tbody>
                  {["welcome", "setup_reminder", "monthly_report", "uninstall", "reinstall"].map((campaignType) => {
                    const cStat = campaignStats[campaignType] || { total: 0, sent: 0, opened: 0, clicked: 0 };
                    const cOpenRate = cStat.sent > 0 ? ((cStat.opened / cStat.sent) * 100).toFixed(1) : "0.0";
                    const cClickRate = cStat.opened > 0 ? ((cStat.clicked / cStat.opened) * 100).toFixed(1) : "0.0";

                    return (
                      <tr key={campaignType} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px" }}>{getTypeBadge(campaignType)}</td>
                        <td style={{ padding: "10px 12px", fontWeight: "600" }}>{cStat.total}</td>
                        <td style={{ padding: "10px 12px", color: "#16a34a" }}>{cStat.sent}</td>
                        <td style={{ padding: "10px 12px", fontWeight: "600" }}>{cStat.opened}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontWeight: "700", color: Number(cOpenRate) > 0 ? "#833ab4" : "#94a3b8" }}>
                            {cOpenRate}%
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: "600" }}>{cStat.clicked}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontWeight: "700", color: Number(cClickRate) > 0 ? "#0284c7" : "#94a3b8" }}>
                            {cClickRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </BlockStack>
        </Card>

        {/* ── Real-Time Activity Log Table & Filters ── */}
        <Card padding="400">
          <BlockStack gap="400">
            {/* Filter Bar */}
            <InlineStack gap="300" align="space-between" blockAlign="center" wrap>
              <div style={{ flex: 1, minWidth: "260px", maxWidth: "400px" }}>
                <TextField
                  placeholder="Search by store, email, or subject..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  clearButton
                  onClearButtonClick={() => setSearchQuery("")}
                  autoComplete="off"
                />
              </div>

              <InlineStack gap="300" wrap>
                <Select
                  label="Campaign"
                  labelInline
                  options={[
                    { label: "All Campaigns", value: "all" },
                    { label: "Welcome", value: "welcome" },
                    { label: "Setup Reminder", value: "setup_reminder" },
                    { label: "Monthly Report", value: "monthly_report" },
                    { label: "Support Ticket", value: "support" },
                    { label: "Re-install", value: "reinstall" },
                    { label: "Uninstall", value: "uninstall" },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />

                <Select
                  label="Status"
                  labelInline
                  options={[
                    { label: "All Statuses", value: "all" },
                    { label: "Sent", value: "SENT" },
                    { label: "Skipped", value: "SKIPPED" },
                    { label: "Failed", value: "FAILED" },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </InlineStack>
            </InlineStack>

            <Divider />

            {/* Logs List */}
            {filteredLogs.length === 0 ? (
              <Box padding="600">
                <EmptyState
                  heading="No email logs found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>No emails match the selected filters or search query.</p>
                </EmptyState>
              </Box>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                      <th style={{ padding: "10px 12px" }}>Time</th>
                      <th style={{ padding: "10px 12px" }}>Campaign</th>
                      <th style={{ padding: "10px 12px" }}>Store</th>
                      <th style={{ padding: "10px 12px" }}>Recipient</th>
                      <th style={{ padding: "10px 12px" }}>Delivery</th>
                      <th style={{ padding: "10px 12px" }}>Opens</th>
                      <th style={{ padding: "10px 12px" }}>Clicks</th>
                      <th style={{ padding: "10px 12px" }}>Last Clicked Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const dateObj = new Date(log.createdAt);
                      const formattedDate = dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const openNum = Number(log.openCount || 0);
                      const clickNum = Number(log.clickCount || 0);

                      return (
                        <tr
                          key={log.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "12px", whiteSpace: "nowrap", color: "#64748b", fontSize: "12px" }}>
                            {formattedDate}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {getTypeBadge(log.emailType)}
                          </td>
                          <td style={{ padding: "12px", fontWeight: "600", color: "#0f172a" }}>
                            {log.shop}
                          </td>
                          <td style={{ padding: "12px", color: "#334155" }}>
                            {log.recipient || "—"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {getStatusBadge(log.status)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {openNum > 0 ? (
                              <Badge tone="success">{`👁 ${openNum} open${openNum > 1 ? "s" : ""}`}</Badge>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {clickNum > 0 ? (
                              <Badge tone="magic">{`🖱 ${clickNum} click${clickNum > 1 ? "s" : ""}`}</Badge>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px", color: "#64748b" }}>
                            {log.lastClickedUrl ? (
                              <a href={log.lastClickedUrl} target="_blank" rel="noreferrer" style={{ color: "#0284c7", textDecoration: "underline" }}>
                                {log.lastClickedUrl.replace(/^https?:\/\//, "")}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = error?.status || 403;
  const statusText = error?.statusText || "Access Denied";

  return (
    <Page title={`${status} - ${statusText}`}>
      <Card padding="500">
        <EmptyState
          heading="403 - Access Denied"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text as="p" tone="subdued">
            This internal portal is restricted to app developers and company administrators.
            Store owners do not have permission to access this page.
          </Text>
          <div style={{ marginTop: "16px" }}>
            <Button url="/app" variant="primary">
              Back to Dashboard
            </Button>
          </div>
        </EmptyState>
      </Card>
    </Page>
  );
}

export const headers = (headersArgs) => {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };
};

