import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [
  { rel: "preload", href: polarisStyles, as: "style" },
  { rel: "stylesheet", href: polarisStyles },
];

import { isAppAdminShop } from "../utils/admin.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || "";
  const isAppAdmin = isAppAdminShop(shop);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    isAppAdmin,
  };
};

import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function App() {
  const { apiKey, isAppAdmin } = useLoaderData();
  const navigate = useNavigate();

  // Hidden shortcut: Ctrl + Shift + E (or Cmd + Shift + E) opens internal Email Analytics for anyone who knows it
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        navigate("/app/emails");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations}>
        <s-app-nav>
          <s-link href="/app" rel="home">Home</s-link>
          <s-link href="/app/tagging">Product Tagging</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
          <s-link href="/app/plans">Plans</s-link>
          <s-link href="/app/guide">Guide & Setup</s-link>
          <s-link href="/app/support">Contact Support</s-link>
          {isAppAdmin && <s-link href="/app/emails">Email Tracker</s-link>}
        </s-app-nav>
        <Outlet />

        {/* ── Secret Hidden Trigger: Bottom-Right Corner ── */}
        <a
          href="/app/emails"
          title=""
          style={{
            position: "fixed",
            bottom: "6px",
            right: "6px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            zIndex: 99999,
            cursor: "default",
            opacity: 0.12,
            transition: "opacity 0.2s ease, transform 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.75";
            e.currentTarget.style.transform = "scale(1.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.12";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: "#94a3b8",
              display: "block",
            }}
          />
        </a>

        {/* ── Secret Hidden Trigger: Top-Right Corner ── */}
        <a
          href="/app/emails"
          title=""
          style={{
            position: "fixed",
            top: "6px",
            right: "6px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            zIndex: 99999,
            cursor: "default",
            opacity: 0.12,
            transition: "opacity 0.2s ease, transform 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.75";
            e.currentTarget.style.transform = "scale(1.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.12";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: "#94a3b8",
              display: "block",
            }}
          />
        </a>
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
