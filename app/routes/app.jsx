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

  // Hidden company shortcut: Ctrl + Shift + E (or Cmd + Shift + E) opens internal Email Analytics
  useEffect(() => {
    if (!isAppAdmin) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        navigate("/app/emails");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAppAdmin, navigate]);

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
        </s-app-nav>
        <Outlet context={{ isAppAdmin }} />
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
