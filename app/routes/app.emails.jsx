import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLoaderData, useFetcher, useRouteError } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Banner,
  Button,
  ButtonGroup,
  TextField,
  Select,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  EmptyState,
  ProgressBar,
  Modal,
  Tabs,
  Tooltip,
} from "@shopify/polaris";
import {
  RefreshIcon,
  SendIcon,
  ExportIcon,
  ViewIcon,
  ClipboardIcon,
  CheckIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import {
  sendWelcomeEmail,
  sendSetupReminderEmail,
  sendMonthlyReportEmail,
  sendReinstallEmail,
  sendUninstallEmail,
  sendCustomEmail,
  resendEmailById,
  getAppBaseUrl,
} from "../utils/email.server";
import { getEmailPreviewHtml } from "../utils/emailTemplates";

// ─────────────────────────────────────────────────────────────────────────────
// LOADER: Load all email logs, aggregate multi-store stats, and shop list
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  await authenticate.admin(request);

  let rawLogs = [];
  let totalCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let openedCount = 0;
  let clickedCount = 0;
  let totalOpens = 0;
  let totalClicks = 0;
  let allShops = [];

  try {
    if (prisma?.emailLog) {
      rawLogs = await prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      totalCount = await prisma.emailLog.count();
      sentCount = await prisma.emailLog.count({ where: { status: "SENT" } });
      failedCount = await prisma.emailLog.count({ where: { status: "FAILED" } });
      skippedCount = await prisma.emailLog.count({ where: { status: "SKIPPED" } });
      openedCount = await prisma.emailLog.count({ where: { openCount: { gt: 0 } } });
      clickedCount = await prisma.emailLog.count({ where: { clickCount: { gt: 0 } } });

      const opensAgg = await prisma.emailLog.aggregate({
        _sum: { openCount: true, clickCount: true },
      });
      totalOpens = opensAgg._sum?.openCount || 0;
      totalClicks = opensAgg._sum?.clickCount || 0;

      // Collect distinct shops from EmailLog
      const distinctLogShops = await prisma.emailLog.findMany({
        distinct: ["shop"],
        select: { shop: true },
      });
      const logShopSet = new Set(distinctLogShops.map((s) => s.shop).filter(Boolean));

      // Also collect shops from Session table
      if (prisma?.session) {
        const sessionShops = await prisma.session.findMany({
          distinct: ["shop"],
          select: { shop: true },
        });
        sessionShops.forEach((s) => {
          if (s.shop) logShopSet.add(s.shop);
        });
      }

      allShops = Array.from(logShopSet).sort();
    } else {
      const rows = await prisma.$queryRawUnsafe(
        'SELECT * FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 500'
      );
      rawLogs = rows || [];
      totalCount = rawLogs.length;
      sentCount = rawLogs.filter((l) => l.status === "SENT").length;
      failedCount = rawLogs.filter((l) => l.status === "FAILED").length;
      skippedCount = rawLogs.filter((l) => l.status === "SKIPPED").length;
      openedCount = rawLogs.filter((l) => Number(l.openCount || 0) > 0).length;
      clickedCount = rawLogs.filter((l) => Number(l.clickCount || 0) > 0).length;
      totalOpens = rawLogs.reduce((acc, l) => acc + (Number(l.openCount) || 0), 0);
      totalClicks = rawLogs.reduce((acc, l) => acc + (Number(l.clickCount) || 0), 0);

      const shopSet = new Set(rawLogs.map((l) => l.shop).filter(Boolean));
      allShops = Array.from(shopSet).sort();
    }
  } catch (err) {
    console.warn("[EmailLog Loader Warning]:", err.message);
  }

  // App-Wide Aggregate Rates
  const deliveryRate = totalCount > 0 ? ((sentCount / totalCount) * 100).toFixed(1) : "0.0";
  const openRate = sentCount > 0 ? ((openedCount / sentCount) * 100).toFixed(1) : "0.0";
  const clickRate = openedCount > 0 ? ((clickedCount / openedCount) * 100).toFixed(1) : sentCount > 0 ? ((clickedCount / sentCount) * 100).toFixed(1) : "0.0";

  // Aggregate stats by Campaign Type
  const campaignStats = {};
  for (const log of rawLogs) {
    const type = log.emailType || "other";
    if (!campaignStats[type]) {
      campaignStats[type] = { total: 0, sent: 0, opened: 0, clicked: 0, totalOpens: 0, totalClicks: 0 };
    }
    campaignStats[type].total += 1;
    if (log.status === "SENT") campaignStats[type].sent += 1;
    if (Number(log.openCount || 0) > 0) campaignStats[type].opened += 1;
    if (Number(log.clickCount || 0) > 0) campaignStats[type].clicked += 1;
    campaignStats[type].totalOpens += Number(log.openCount || 0);
    campaignStats[type].totalClicks += Number(log.clickCount || 0);
  }

  // Aggregate stats by Project / Store Domain
  const projectStats = {};
  for (const log of rawLogs) {
    const shopDomain = log.shop || "unknown";
    if (!projectStats[shopDomain]) {
      projectStats[shopDomain] = {
        shop: shopDomain,
        total: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        opened: 0,
        clicked: 0,
        lastSentAt: log.createdAt,
      };
    }
    projectStats[shopDomain].total += 1;
    if (log.status === "SENT") projectStats[shopDomain].sent += 1;
    if (log.status === "FAILED") projectStats[shopDomain].failed += 1;
    if (log.status === "SKIPPED") projectStats[shopDomain].skipped += 1;
    if (Number(log.openCount || 0) > 0) projectStats[shopDomain].opened += 1;
    if (Number(log.clickCount || 0) > 0) projectStats[shopDomain].clicked += 1;
  }

  const hasSmtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  const smtpUser = process.env.SMTP_USER
    ? process.env.SMTP_USER.replace(/(.{3})(.*)(@.*)/, "$1***$3")
    : "";

  const baseUrl = getAppBaseUrl();

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
      totalOpens,
      totalClicks,
      deliveryRate,
      openRate,
      clickRate,
      totalStores: allShops.length,
    },
    campaignStats,
    projectStats: Object.values(projectStats).sort((a, b) => b.total - a.total),
    allShops,
    smtp: {
      configured: hasSmtpConfigured,
      user: smtpUser,
    },
    baseUrl,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: Send Live Email or Resend Email
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // 1. Resend an existing email by log ID
  if (intent === "resendEmail") {
    const logId = formData.get("logId");
    const targetEmail = formData.get("targetEmail") || null;

    if (!logId) {
      return { success: false, error: "Missing log ID to resend" };
    }

    try {
      const result = await resendEmailById({ logId, targetEmail });
      return {
        actionType: "resend",
        success: result.success,
        message: result.success
          ? `Email successfully resent!`
          : result.error || "Email sending skipped (SMTP not configured).",
      };
    } catch (e) {
      return { actionType: "resend", success: false, error: e.message };
    }
  }

  // 2. Send a Live Email (Any Campaign Type)
  if (intent === "sendLiveEmail" || intent === "sendTestEmail") {
    const toEmail = (formData.get("toEmail") || "").trim();
    const targetShop = (formData.get("targetShop") || session.shop || "unknown").trim();
    const emailType = formData.get("emailType") || "setup_reminder";
    const customSubject = (formData.get("customSubject") || "").trim();
    const customMessage = (formData.get("customMessage") || "").trim();

    if (!toEmail) {
      return { success: false, error: "Please enter a valid recipient email address." };
    }

    try {
      let result;
      switch (emailType) {
        case "welcome":
          result = await sendWelcomeEmail({
            to: toEmail,
            shop: targetShop,
            shopName: targetShop.replace(/\.myshopify\.com$/, ""),
            myshopifyDomain: targetShop,
          });
          break;

        case "setup_reminder":
          result = await sendSetupReminderEmail({
            to: toEmail,
            shop: targetShop,
            shopName: targetShop.replace(/\.myshopify\.com$/, ""),
            myshopifyDomain: targetShop,
            isConnected: false,
            isEmbedActive: false,
            isSectionActive: false,
            instagramHandle: "demo_handle",
          });
          break;

        case "monthly_report":
          result = await sendMonthlyReportEmail({
            to: toEmail,
            shop: targetShop,
            shopName: targetShop.replace(/\.myshopify\.com$/, ""),
            myshopifyDomain: targetShop,
            metrics: [
              { views: 2450, clicks: 310 },
              { views: 1890, clicks: 220 },
            ],
          });
          break;

        case "reinstall":
          result = await sendReinstallEmail({
            to: toEmail,
            shop: targetShop,
            shopName: targetShop.replace(/\.myshopify\.com$/, ""),
            myshopifyDomain: targetShop,
          });
          break;

        case "uninstall":
          result = await sendUninstallEmail({
            to: toEmail,
            shop: targetShop,
            shopName: targetShop.replace(/\.myshopify\.com$/, ""),
          });
          break;

        case "custom":
        default:
          result = await sendCustomEmail({
            to: toEmail,
            shop: targetShop,
            subject: customSubject || `AI Instafeed Update for ${targetShop}`,
            message: customMessage || "This is a direct live notification dispatch from the AI Instafeed control center.",
            emailType: "custom",
          });
          break;
      }

      return {
        actionType: "liveSend",
        success: result.success,
        message: result.success
          ? `Live ${emailType} email dispatched successfully to ${toEmail}!`
          : result.error || "Email logged as SKIPPED (SMTP credentials not configured in .env).",
      };
    } catch (e) {
      return { actionType: "liveSend", success: false, error: e.message };
    }
  }

  return { success: false };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: App-Wide Email Tracker, Live Feed & Send Inspector
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminEmailsPage() {
  const initialData = useLoaderData();
  const liveFetcher = useFetcher();
  const actionFetcher = useFetcher();

  // Active data: uses latest poll data if available, else initial data
  const data = liveFetcher.data || initialData;
  const { logs, stats, campaignStats, projectStats, allShops, smtp, baseUrl } = data;

  // View & Filter States
  const [activeTab, setActiveTab] = useState(0); // 0: Live Feed, 1: Projects/Stores, 2: Campaigns
  const [shopFilter, setShopFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState("all"); // all, opened, clicked, unopened
  const [searchQuery, setSearchQuery] = useState("");

  // Live Auto-Polling (default ON: polls every 8s)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const timerRef = useRef(null);

  // Detail & Preview Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalTab, setModalTab] = useState(0); // 0: Event Timeline, 1: HTML Preview
  const [resendEmailInput, setResendEmailInput] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Live Dispatcher Form State
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [dispatchType, setDispatchType] = useState("setup_reminder");
  const [dispatchShop, setDispatchShop] = useState(allShops[0] || "demo.myshopify.com");
  const [dispatchEmail, setDispatchEmail] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  // Auto-Polling Effect: Refreshes data silently in background
  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      liveFetcher.load(window.location.pathname);
      setLastRefreshedAt(new Date());
    }, 8000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, liveFetcher]);

  // Manual Instant Refresh
  const handleManualRefresh = useCallback(() => {
    liveFetcher.load(window.location.pathname);
    setLastRefreshedAt(new Date());
  }, [liveFetcher]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (shopFilter !== "all" && log.shop !== shopFilter) return false;
      if (typeFilter !== "all" && log.emailType !== typeFilter) return false;
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (engagementFilter === "opened" && Number(log.openCount || 0) === 0) return false;
      if (engagementFilter === "clicked" && Number(log.clickCount || 0) === 0) return false;
      if (engagementFilter === "unopened" && Number(log.openCount || 0) > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchShop = log.shop?.toLowerCase().includes(q);
        const matchRecipient = log.recipient?.toLowerCase().includes(q);
        const matchSubject = log.subject?.toLowerCase().includes(q);
        const matchId = log.id?.toLowerCase().includes(q);
        if (!matchShop && !matchRecipient && !matchSubject && !matchId) return false;
      }
      return true;
    });
  }, [logs, shopFilter, typeFilter, statusFilter, engagementFilter, searchQuery]);

  // Helper Badge Renderers
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
      case "custom":
        return <Badge tone="new">Custom Dispatch</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "SENT":
        return <Badge tone="success">Sent / Delivered</Badge>;
      case "FAILED":
        return <Badge tone="critical">Failed</Badge>;
      case "SKIPPED":
        return <Badge tone="warning">Skipped (No SMTP)</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Dispatch Live Email Handler
  const handleSendLiveEmail = () => {
    if (!dispatchEmail.trim()) return;
    const fd = new FormData();
    fd.append("intent", "sendLiveEmail");
    fd.append("toEmail", dispatchEmail.trim());
    fd.append("targetShop", dispatchShop);
    fd.append("emailType", dispatchType);
    if (dispatchType === "custom") {
      fd.append("customSubject", customSubject);
      fd.append("customMessage", customMessage);
    }
    actionFetcher.submit(fd, { method: "post" });
  };

  // Resend Email Handler
  const handleResend = (log) => {
    if (!log?.id) return;
    const fd = new FormData();
    fd.append("intent", "resendEmail");
    fd.append("logId", log.id);
    if (resendEmailInput.trim()) {
      fd.append("targetEmail", resendEmailInput.trim());
    }
    actionFetcher.submit(fd, { method: "post" });
  };

  // Export Filtered Logs to CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Timestamp",
      "Store Domain",
      "Email Type",
      "Recipient",
      "Subject",
      "Status",
      "Message ID",
      "Open Count",
      "First Opened At",
      "Click Count",
      "Last Clicked At",
      "Last Clicked URL",
      "Error",
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.createdAt}"`,
      `"${l.shop}"`,
      `"${l.emailType}"`,
      `"${l.recipient || ""}"`,
      `"${(l.subject || "").replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.messageId || ""}"`,
      l.openCount || 0,
      `"${l.openedAt || ""}"`,
      l.clickCount || 0,
      `"${l.clickedAt || ""}"`,
      `"${(l.lastClickedUrl || "").replace(/"/g, '""')}"`,
      `"${(l.error || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `instafeed_email_tracker_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "—";
    const sec = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (sec < 60) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Tabs Definition
  const tabs = [
    { id: "feed", content: `Live Activity Feed (${filteredLogs.length})` },
    { id: "projects", content: `Stores & Projects (${projectStats.length})` },
    { id: "campaigns", content: "Campaign Performance" },
  ];

  return (
    <Page
      backAction={{ content: "Dashboard", url: "/app" }}
      title="Global Email Tracking & Live Engagement Center"
      subtitle="Real-time live dispatch tracking, open rate & CTR engagement, and store analytics across all projects."
      primaryAction={{
        content: showDispatchForm ? "Close Dispatcher" : "Send Live Email",
        icon: SendIcon,
        onAction: () => setShowDispatchForm((prev) => !prev),
      }}
      secondaryActions={[
        {
          content: "Export CSV",
          icon: ExportIcon,
          onAction: handleExportCSV,
          disabled: filteredLogs.length === 0,
        },
        {
          content: autoRefresh ? "Pause Live Feed" : "Resume Live Feed",
          onAction: () => setAutoRefresh((prev) => !prev),
        },
      ]}
    >
      <BlockStack gap="500">
        {/* ── Live Status Bar & SMTP Indicator ── */}
        <Card padding="300">
          <InlineStack align="space-between" blockAlign="center" wrap>
            <InlineStack gap="300" blockAlign="center">
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: autoRefresh ? "#10b981" : "#94a3b8",
                  boxShadow: autoRefresh ? "0 0 10px #10b981" : "none",
                }}
              />
              <Text variant="bodyMd" fontWeight="semibold">
                {autoRefresh ? "LIVE TRACKING ACTIVE" : "LIVE FEED PAUSED"}
              </Text>
              <Text variant="caption" tone="subdued">
                {`Updated ${timeAgo(lastRefreshedAt)} (${stats.total} total emails tracked across ${stats.totalStores} stores)`}
              </Text>
            </InlineStack>

            <InlineStack gap="200" blockAlign="center">
              {smtp.configured ? (
                <Badge tone="success">{`SMTP Mailer Active (${smtp.user})`}</Badge>
              ) : (
                <Tooltip content="Set SMTP_USER and SMTP_PASS in .env to deliver live emails. Currently logged as SKIPPED.">
                  <Badge tone="warning">SMTP Not Configured (Logging in Dev Mode)</Badge>
                </Tooltip>
              )}
              <Button
                variant="plain"
                icon={RefreshIcon}
                loading={liveFetcher.state === "loading"}
                onClick={handleManualRefresh}
                accessibilityLabel="Refresh now"
              >
                Refresh Now
              </Button>
            </InlineStack>
          </InlineStack>
        </Card>

        {/* ── Action Feedback Banner ── */}
        {actionFetcher.data && (
          <Banner
            tone={actionFetcher.data.success ? "success" : "attention"}
            onDismiss={() => {}}
          >
            <p>{actionFetcher.data.message || actionFetcher.data.error}</p>
          </Banner>
        )}

        {/* ── Live Email Dispatcher Tool ── */}
        {showDispatchForm && (
          <Card padding="500">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <div>
                  <Text variant="headingMd" as="h3">
                    Direct Live Email Dispatcher
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Dispatch any campaign or custom live email to test delivery, open tracking, and click tracking in real-time.
                  </Text>
                </div>
                <Button variant="plain" onClick={() => setShowDispatchForm(false)}>
                  Close
                </Button>
              </InlineStack>

              <Divider />

              <Layout>
                <Layout.Section variant="oneThird">
                  <Select
                    label="Campaign Type"
                    options={[
                      { label: "Setup Incomplete Reminder", value: "setup_reminder" },
                      { label: "Welcome Email (First Install)", value: "welcome" },
                      { label: "Monthly Performance Report", value: "monthly_report" },
                      { label: "Re-install Welcome Back", value: "reinstall" },
                      { label: "Uninstall Recovery Offer", value: "uninstall" },
                      { label: "Custom Direct Notification", value: "custom" },
                    ]}
                    value={dispatchType}
                    onChange={setDispatchType}
                  />
                </Layout.Section>

                <Layout.Section variant="oneThird">
                  <Select
                    label="Target Store / Project"
                    options={[
                      ...allShops.map((s) => ({ label: s, value: s })),
                      { label: "Custom / New Store...", value: "custom_shop" },
                    ]}
                    value={dispatchShop}
                    onChange={setDispatchShop}
                  />
                </Layout.Section>

                <Layout.Section variant="oneThird">
                  <TextField
                    label="Recipient Email Address"
                    value={dispatchEmail}
                    onChange={setDispatchEmail}
                    placeholder="merchant@example.com"
                    autoComplete="email"
                  />
                </Layout.Section>
              </Layout>

              {dispatchType === "custom" && (
                <BlockStack gap="300">
                  <TextField
                    label="Custom Subject"
                    value={customSubject}
                    onChange={setCustomSubject}
                    placeholder="Important update for your Instagram feed"
                  />
                  <TextField
                    label="Custom Message Body"
                    value={customMessage}
                    onChange={setCustomMessage}
                    multiline={3}
                    placeholder="Enter your email message here..."
                  />
                </BlockStack>
              )}

              <InlineStack align="end" gap="300">
                <Button
                  variant="primary"
                  icon={SendIcon}
                  loading={actionFetcher.state !== "idle"}
                  onClick={handleSendLiveEmail}
                  disabled={!dispatchEmail.trim()}
                >
                  Dispatch Live Email Now
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {/* ── Top 4 App-Wide Engagement KPI Cards ── */}
        <Layout>
          {/* 1. Total Sent & Delivery Rate */}
          <Layout.Section variant="oneThird">
            <Card padding="400">
              <BlockStack gap="150">
                <Text variant="bodySm" tone="subdued">Total Dispatched / Delivery Rate</Text>
                <InlineStack align="space-between" blockAlign="baseline">
                  <Text variant="headingXl" as="p" fontWeight="bold" tone="success">
                    {stats.sent}
                  </Text>
                  <Badge tone={Number(stats.deliveryRate) >= 90 ? "success" : "attention"}>
                    {`${stats.deliveryRate}% Delivered`}
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
                <Text variant="bodySm" tone="subdued">Unique Opens / Open Rate</Text>
                <InlineStack align="space-between" blockAlign="baseline">
                  <Text variant="headingXl" as="p" fontWeight="bold" tone="magic">
                    {stats.opened}
                  </Text>
                  <Badge tone={Number(stats.openRate) >= 30 ? "success" : Number(stats.openRate) > 0 ? "info" : "subdued"}>
                    {`${stats.openRate}% Open Rate`}
                  </Badge>
                </InlineStack>
                <Text variant="caption" tone="subdued">
                  {`${stats.totalOpens} total views tracked via 1x1 transparent pixel`}
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
                  {`${stats.totalClicks} clicks on dashboard, theme editor & review links`}
                </Text>
                <Box paddingBlockStart="100">
                  <ProgressBar progress={Math.min(100, Number(stats.clickRate))} size="small" tone="highlight" />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* ── Main View Tabs ── */}
        <Card padding="0">
          <Tabs tabs={tabs} selected={activeTab} onSelect={setActiveTab}>
            {/* ════════════════════════════════════════════════════════════════
                TAB 0: LIVE ACTIVITY FEED (Track all email sends)
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === 0 && (
              <Box padding="400">
                <BlockStack gap="400">
                  {/* Filter Toolbar */}
                  <InlineStack gap="300" align="space-between" blockAlign="center" wrap>
                    <div style={{ flex: 1, minWidth: "260px", maxWidth: "340px" }}>
                      <TextField
                        placeholder="Search store, recipient, subject, ID..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        clearButton
                        onClearButtonClick={() => setSearchQuery("")}
                        autoComplete="off"
                      />
                    </div>

                    <InlineStack gap="300" wrap>
                      {/* Project / Store Dropdown */}
                      <Select
                        label="Store / Project"
                        labelInline
                        options={[
                          { label: `All Stores (${allShops.length})`, value: "all" },
                          ...allShops.map((s) => ({ label: s, value: s })),
                        ]}
                        value={shopFilter}
                        onChange={setShopFilter}
                      />

                      {/* Campaign Dropdown */}
                      <Select
                        label="Campaign"
                        labelInline
                        options={[
                          { label: "All Campaigns", value: "all" },
                          { label: "Setup Reminder", value: "setup_reminder" },
                          { label: "Welcome", value: "welcome" },
                          { label: "Monthly Report", value: "monthly_report" },
                          { label: "Support Ticket", value: "support" },
                          { label: "Re-install", value: "reinstall" },
                          { label: "Uninstall", value: "uninstall" },
                          { label: "Custom Dispatch", value: "custom" },
                        ]}
                        value={typeFilter}
                        onChange={setTypeFilter}
                      />

                      {/* Status Dropdown */}
                      <Select
                        label="Status"
                        labelInline
                        options={[
                          { label: "All Statuses", value: "all" },
                          { label: "Sent / Delivered", value: "SENT" },
                          { label: "Skipped (No SMTP)", value: "SKIPPED" },
                          { label: "Failed", value: "FAILED" },
                        ]}
                        value={statusFilter}
                        onChange={setStatusFilter}
                      />

                      {/* Engagement Dropdown */}
                      <Select
                        label="Engagement"
                        labelInline
                        options={[
                          { label: "All Engagement", value: "all" },
                          { label: "Opened Only", value: "opened" },
                          { label: "Clicked Only", value: "clicked" },
                          { label: "Unopened Only", value: "unopened" },
                        ]}
                        value={engagementFilter}
                        onChange={setEngagementFilter}
                      />
                    </InlineStack>
                  </InlineStack>

                  <Divider />

                  {/* Logs Table */}
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
                            <th style={{ padding: "10px 12px" }}>Store / Project</th>
                            <th style={{ padding: "10px 12px" }}>Campaign</th>
                            <th style={{ padding: "10px 12px" }}>Recipient</th>
                            <th style={{ padding: "10px 12px" }}>Delivery Status</th>
                            <th style={{ padding: "10px 12px" }}>Opens</th>
                            <th style={{ padding: "10px 12px" }}>Clicks</th>
                            <th style={{ padding: "10px 12px", textAlign: "right" }}>Inspect</th>
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
                                {/* Timestamp */}
                                <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                                  <div style={{ color: "#0f172a", fontWeight: "600", fontSize: "12.5px" }}>
                                    {timeAgo(log.createdAt)}
                                  </div>
                                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>{formattedDate}</div>
                                </td>

                                {/* Store Domain */}
                                <td style={{ padding: "12px", fontWeight: "600", color: "#0f172a" }}>
                                  <div style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {log.shop}
                                  </div>
                                </td>

                                {/* Campaign Badge */}
                                <td style={{ padding: "12px" }}>{getTypeBadge(log.emailType)}</td>

                                {/* Recipient & Subject preview */}
                                <td style={{ padding: "12px", maxWidth: "220px" }}>
                                  <div style={{ fontWeight: "600", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {log.recipient || "—"}
                                  </div>
                                  <div style={{ color: "#64748b", fontSize: "11.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {log.subject}
                                  </div>
                                </td>

                                {/* Status */}
                                <td style={{ padding: "12px" }}>{getStatusBadge(log.status)}</td>

                                {/* Opens */}
                                <td style={{ padding: "12px" }}>
                                  {openNum > 0 ? (
                                    <Tooltip content={`First opened ${timeAgo(log.openedAt)} (${new Date(log.openedAt).toLocaleTimeString()})`}>
                                      <Badge tone="success">{`👁 ${openNum} open${openNum > 1 ? "s" : ""}`}</Badge>
                                    </Tooltip>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>—</span>
                                  )}
                                </td>

                                {/* Clicks */}
                                <td style={{ padding: "12px" }}>
                                  {clickNum > 0 ? (
                                    <Tooltip content={`Target link clicked: ${log.lastClickedUrl || "—"}`}>
                                      <Badge tone="magic">{`🖱 ${clickNum} click${clickNum > 1 ? "s" : ""}`}</Badge>
                                    </Tooltip>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>—</span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                                  <ButtonGroup>
                                    <Button
                                      size="micro"
                                      icon={ViewIcon}
                                      onClick={() => {
                                        setSelectedLog(log);
                                        setModalTab(0);
                                        setResendEmailInput(log.recipient || "");
                                      }}
                                    >
                                      Inspect
                                    </Button>
                                    <Button
                                      size="micro"
                                      variant="plain"
                                      onClick={() => handleResend(log)}
                                    >
                                      Resend
                                    </Button>
                                  </ButtonGroup>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </BlockStack>
              </Box>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 1: PERFORMANCE BY STORE / PROJECT
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === 1 && (
              <Box padding="400">
                <BlockStack gap="300">
                  <Text variant="headingSm" as="h3">
                    Storefront Email Performance across All Connected Projects
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Compare email engagement, delivery rates, and conversion across individual stores.
                  </Text>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                          <th style={{ padding: "10px 12px" }}>Store Domain</th>
                          <th style={{ padding: "10px 12px" }}>Total Triggered</th>
                          <th style={{ padding: "10px 12px" }}>Delivered (Sent)</th>
                          <th style={{ padding: "10px 12px" }}>Unique Opens</th>
                          <th style={{ padding: "10px 12px" }}>Open Rate</th>
                          <th style={{ padding: "10px 12px" }}>Link Clicks</th>
                          <th style={{ padding: "10px 12px" }}>CTR</th>
                          <th style={{ padding: "10px 12px" }}>Last Activity</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Quick Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectStats.map((p) => {
                          const pOpenRate = p.sent > 0 ? ((p.opened / p.sent) * 100).toFixed(1) : "0.0";
                          const pClickRate = p.opened > 0 ? ((p.clicked / p.opened) * 100).toFixed(1) : "0.0";

                          return (
                            <tr key={p.shop} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "12px", fontWeight: "600", color: "#0f172a" }}>
                                {p.shop}
                              </td>
                              <td style={{ padding: "12px", fontWeight: "600" }}>{p.total}</td>
                              <td style={{ padding: "12px", color: "#16a34a", fontWeight: "600" }}>{p.sent}</td>
                              <td style={{ padding: "12px" }}>{p.opened}</td>
                              <td style={{ padding: "12px" }}>
                                <span style={{ fontWeight: "700", color: Number(pOpenRate) > 0 ? "#833ab4" : "#94a3b8" }}>
                                  {pOpenRate}%
                                </span>
                              </td>
                              <td style={{ padding: "12px" }}>{p.clicked}</td>
                              <td style={{ padding: "12px" }}>
                                <span style={{ fontWeight: "700", color: Number(pClickRate) > 0 ? "#0284c7" : "#94a3b8" }}>
                                  {pClickRate}%
                                </span>
                              </td>
                              <td style={{ padding: "12px", color: "#64748b", fontSize: "12px" }}>
                                {timeAgo(p.lastSentAt)}
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                <Button
                                  size="micro"
                                  onClick={() => {
                                    setDispatchShop(p.shop);
                                    setShowDispatchForm(true);
                                  }}
                                >
                                  Send Email
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </BlockStack>
              </Box>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 2: PERFORMANCE BY CAMPAIGN
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === 2 && (
              <Box padding="400">
                <BlockStack gap="300">
                  <Text variant="headingSm" as="h3">
                    Aggregated Metrics by Email Campaign Type
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Identify high-converting campaigns and spot drop-offs across automated merchant touchpoints.
                  </Text>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                          <th style={{ padding: "10px 12px" }}>Campaign</th>
                          <th style={{ padding: "10px 12px" }}>Total Triggered</th>
                          <th style={{ padding: "10px 12px" }}>Delivered (Sent)</th>
                          <th style={{ padding: "10px 12px" }}>Unique Opens</th>
                          <th style={{ padding: "10px 12px" }}>Total Opens</th>
                          <th style={{ padding: "10px 12px" }}>Open Rate</th>
                          <th style={{ padding: "10px 12px" }}>Link Clicks</th>
                          <th style={{ padding: "10px 12px" }}>CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {["setup_reminder", "welcome", "monthly_report", "uninstall", "reinstall", "support", "custom"].map(
                          (cType) => {
                            const c = campaignStats[cType] || {
                              total: 0,
                              sent: 0,
                              opened: 0,
                              clicked: 0,
                              totalOpens: 0,
                              totalClicks: 0,
                            };
                            const cOpenRate = c.sent > 0 ? ((c.opened / c.sent) * 100).toFixed(1) : "0.0";
                            const cClickRate = c.opened > 0 ? ((c.clicked / c.opened) * 100).toFixed(1) : "0.0";

                            return (
                              <tr key={cType} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "12px" }}>{getTypeBadge(cType)}</td>
                                <td style={{ padding: "12px", fontWeight: "600" }}>{c.total}</td>
                                <td style={{ padding: "12px", color: "#16a34a", fontWeight: "600" }}>{c.sent}</td>
                                <td style={{ padding: "12px", fontWeight: "600" }}>{c.opened}</td>
                                <td style={{ padding: "12px", color: "#64748b" }}>{c.totalOpens}</td>
                                <td style={{ padding: "12px" }}>
                                  <span style={{ fontWeight: "700", color: Number(cOpenRate) > 0 ? "#833ab4" : "#94a3b8" }}>
                                    {cOpenRate}%
                                  </span>
                                </td>
                                <td style={{ padding: "12px", fontWeight: "600" }}>{c.clicked}</td>
                                <td style={{ padding: "12px" }}>
                                  <span style={{ fontWeight: "700", color: Number(cClickRate) > 0 ? "#0284c7" : "#94a3b8" }}>
                                    {cClickRate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </BlockStack>
              </Box>
            )}
          </Tabs>
        </Card>

        {/* ════════════════════════════════════════════════════════════════
            MODAL: Detailed Email Inspection & Live Template Preview
           ════════════════════════════════════════════════════════════════ */}
        {selectedLog && (
          <Modal
            size="large"
            open={!!selectedLog}
            onClose={() => setSelectedLog(null)}
            title={`Inspect Email Dispatch: ${selectedLog.subject || selectedLog.id}`}
            primaryAction={{
              content: "Close",
              onAction: () => setSelectedLog(null),
            }}
          >
            <Modal.Section>
              <BlockStack gap="400">
                {/* Modal Subtabs */}
                <Tabs
                  tabs={[
                    { id: "timeline", content: "Event Timeline & Metadata" },
                    { id: "preview", content: "Rendered Email HTML Preview" },
                  ]}
                  selected={modalTab}
                  onSelect={setModalTab}
                />

                {/* Subtab 0: Event Timeline & Detailed Metadata */}
                {modalTab === 0 && (
                  <BlockStack gap="400">
                    {/* Header Badges */}
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200">
                        {getTypeBadge(selectedLog.emailType)}
                        {getStatusBadge(selectedLog.status)}
                      </InlineStack>
                      <Button
                        variant="plain"
                        icon={copiedId ? CheckIcon : ClipboardIcon}
                        onClick={() => handleCopy(selectedLog.id)}
                      >
                        {copiedId ? "Copied ID!" : "Copy Tracking ID"}
                      </Button>
                    </InlineStack>

                    {/* Metadata Grid */}
                    <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <table style={{ width: "100%", fontSize: "13px" }}>
                        <tbody>
                          <tr>
                            <td style={{ color: "#64748b", padding: "4px 0", width: "140px", fontWeight: "600" }}>Log ID:</td>
                            <td style={{ fontFamily: "monospace", color: "#0f172a" }}>{selectedLog.id}</td>
                          </tr>
                          <tr>
                            <td style={{ color: "#64748b", padding: "4px 0", fontWeight: "600" }}>Store Domain:</td>
                            <td style={{ fontWeight: "700", color: "#0f172a" }}>{selectedLog.shop}</td>
                          </tr>
                          <tr>
                            <td style={{ color: "#64748b", padding: "4px 0", fontWeight: "600" }}>Recipient:</td>
                            <td style={{ fontWeight: "600", color: "#0284c7" }}>{selectedLog.recipient}</td>
                          </tr>
                          <tr>
                            <td style={{ color: "#64748b", padding: "4px 0", fontWeight: "600" }}>Subject:</td>
                            <td style={{ color: "#0f172a" }}>{selectedLog.subject}</td>
                          </tr>
                          <tr>
                            <td style={{ color: "#64748b", padding: "4px 0", fontWeight: "600" }}>Dispatched At:</td>
                            <td style={{ color: "#0f172a" }}>
                              {new Date(selectedLog.createdAt).toLocaleString()} ({timeAgo(selectedLog.createdAt)})
                            </td>
                          </tr>
                          {selectedLog.messageId && (
                            <tr>
                              <td style={{ color: "#64748b", padding: "4px 0", fontWeight: "600" }}>SMTP Message-ID:</td>
                              <td style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>{selectedLog.messageId}</td>
                            </tr>
                          )}
                          {selectedLog.error && (
                            <tr>
                              <td style={{ color: "#dc2626", padding: "4px 0", fontWeight: "600" }}>Failure Detail:</td>
                              <td style={{ color: "#dc2626" }}>{selectedLog.error}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Engagement Timeline Cards */}
                    <Layout>
                      {/* Open Tracking */}
                      <Layout.Section variant="oneHalf">
                        <Card padding="300">
                          <BlockStack gap="150">
                            <Text variant="bodySm" tone="subdued">Open Tracking</Text>
                            <InlineStack align="space-between">
                              <Text variant="headingMd" as="p">
                                {Number(selectedLog.openCount || 0) > 0 ? `Opened ${selectedLog.openCount}x` : "Unopened"}
                              </Text>
                              <Badge tone={Number(selectedLog.openCount || 0) > 0 ? "success" : "subdued"}>
                                {Number(selectedLog.openCount || 0) > 0 ? "Read" : "Unread"}
                              </Badge>
                            </InlineStack>
                            <Text variant="caption" tone="subdued">
                              {selectedLog.openedAt
                                ? `First opened ${new Date(selectedLog.openedAt).toLocaleString()} (${timeAgo(selectedLog.openedAt)})`
                                : "No open signal recorded yet"}
                            </Text>
                            <Box paddingBlockStart="100">
                              <a
                                href={`${baseUrl}/api/email/track/open?id=${selectedLog.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: "11px", color: "#0284c7", textDecoration: "underline" }}
                              >
                                Test Open Tracking Pixel URL ↗
                              </a>
                            </Box>
                          </BlockStack>
                        </Card>
                      </Layout.Section>

                      {/* Click Tracking */}
                      <Layout.Section variant="oneHalf">
                        <Card padding="300">
                          <BlockStack gap="150">
                            <Text variant="bodySm" tone="subdued">Click Tracking</Text>
                            <InlineStack align="space-between">
                              <Text variant="headingMd" as="p">
                                {Number(selectedLog.clickCount || 0) > 0 ? `Clicked ${selectedLog.clickCount}x` : "No Clicks"}
                              </Text>
                              <Badge tone={Number(selectedLog.clickCount || 0) > 0 ? "magic" : "subdued"}>
                                {Number(selectedLog.clickCount || 0) > 0 ? "Clicked" : "Unclicked"}
                              </Badge>
                            </InlineStack>
                            <Text variant="caption" tone="subdued">
                              {selectedLog.lastClickedUrl
                                ? `Last clicked: ${selectedLog.lastClickedUrl.replace(/^https?:\/\//, "").slice(0, 40)}...`
                                : "No link clicks recorded yet"}
                            </Text>
                            <Box paddingBlockStart="100">
                              <a
                                href={`${baseUrl}/api/email/track/click?id=${selectedLog.id}&url=${encodeURIComponent("https://apps.shopify.com/ai-instafeed")}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: "11px", color: "#833ab4", textDecoration: "underline" }}
                              >
                                Test Click Redirect URL ↗
                              </a>
                            </Box>
                          </BlockStack>
                        </Card>
                      </Layout.Section>
                    </Layout>

                    {/* Resend Action Form */}
                    <Card padding="300">
                      <BlockStack gap="200">
                        <Text variant="headingSm" as="h4">
                          Resend This Email
                        </Text>
                        <InlineStack gap="300" blockAlign="end">
                          <div style={{ flex: 1 }}>
                            <TextField
                              label="Recipient (Defaults to original)"
                              value={resendEmailInput}
                              onChange={setResendEmailInput}
                              placeholder={selectedLog.recipient}
                              autoComplete="email"
                            />
                          </div>
                          <Button
                            variant="primary"
                            icon={SendIcon}
                            loading={actionFetcher.state !== "idle"}
                            onClick={() => handleResend(selectedLog)}
                          >
                            Resend Now
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  </BlockStack>
                )}

                {/* Subtab 1: Interactive HTML Email Preview */}
                {modalTab === 1 && (
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodySm" tone="subdued">
                        Exact HTML template dispatched to {selectedLog.recipient}:
                      </Text>
                      <Button
                        size="micro"
                        icon={ExternalIcon}
                        onClick={() => {
                          const w = window.open("", "_blank");
                          w.document.write(
                            getEmailPreviewHtml({
                              emailType: selectedLog.emailType,
                              shop: selectedLog.shop,
                              recipient: selectedLog.recipient,
                              subject: selectedLog.subject,
                            })
                          );
                          w.document.close();
                        }}
                      >
                        Open in New Window
                      </Button>
                    </InlineStack>

                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: "#f1f5f9",
                        height: "500px",
                      }}
                    >
                      <iframe
                        title="Email Preview"
                        style={{ width: "100%", height: "100%", border: "none" }}
                        srcDoc={getEmailPreviewHtml({
                          emailType: selectedLog.emailType,
                          shop: selectedLog.shop,
                          recipient: selectedLog.recipient,
                          subject: selectedLog.subject,
                        })}
                      />
                    </div>
                  </BlockStack>
                )}
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = error?.status || 500;
  const statusText = error?.statusText || "Internal Server Error";

  return (
    <Page title={`${status} - ${statusText}`}>
      <Card padding="500">
        <EmptyState
          heading={`${status} - Something went wrong`}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text as="p" tone="subdued">
            {error?.data || error?.message || "An error occurred while loading email logs."}
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

export const headers = () => {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };
};
