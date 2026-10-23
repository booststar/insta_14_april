import "dotenv/config";

/**
 * Checks whether the given shop domain is authorized as an App Developer / Super-Admin.
 * Only these designated stores can access the app-wide email engagement and analytics portal.
 * Store owners/regular merchants will NEVER be granted admin access.
 */
export function isAppAdminShop(shop) {
  if (!shop || typeof shop !== "string") return false;

  const cleanShop = shop
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!cleanShop) return false;

  const defaultAdmins = [
    "skywaytradingenterprise.myshopify.com",
    "skywaytrading.myshopify.com",
    "booststar.myshopify.com",
  ];

  const envAdmins = (process.env.ADMIN_SHOPS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);

  const allowedAdmins = new Set([...defaultAdmins, ...envAdmins]);

  for (const adminDomain of allowedAdmins) {
    if (!adminDomain) continue;

    // Exact domain match (e.g. skywaytrading.myshopify.com)
    if (cleanShop === adminDomain) return true;

    // Handle match without .myshopify.com suffix
    const adminHandle = adminDomain.replace(/\.myshopify\.com$/, "");
    const shopHandle = cleanShop.replace(/\.myshopify\.com$/, "");
    if (adminHandle && adminHandle === shopHandle) return true;
  }

  return false;
}
