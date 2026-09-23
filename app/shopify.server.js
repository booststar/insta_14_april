import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { sendWelcomeEmail } from "./utils/email.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  webhooks: {
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/customers/data_request",
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/customers/redact",
    },
    SHOP_REDACT: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/shop/redact",
    },
  },

  billing: {
    "Pro Monthly": {
      lineItems: [
        {
          planType: "RECURRING",
          amount: 4.99,
          currencyCode: "USD",
          interval: "EVERY_30_DAYS",
          trialDays: 3,
        },
      ],
      replacementBehavior: "APPLY_IMMEDIATELY",
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  hooks: {
    afterAuth: async ({ admin, session }) => {
      try {
        // Fetch shop details to get the registered email and store info
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
        
        const shopEmail = data?.shop?.email;
        const shopName = data?.shop?.name || session.shop;
        const myshopifyDomain = data?.shop?.myshopifyDomain || session.shop;

        if (shopEmail) {
          await sendWelcomeEmail({
            to: shopEmail,
            shop: session.shop,
            shopName,
            myshopifyDomain,
          });
          console.log(`[Email] Welcome email sent to ${shopEmail} for ${session.shop}`);
        }
      } catch (error) {
        console.error("Failed to send welcome email in afterAuth:", error);
      }
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
