import "dotenv/config";

/**
 * Checks whether the given shop domain is authorized as an App Developer / Super-Admin.
 * Only these designated stores can access the app-wide email engagement and analytics portal.
 * Store owners/regular merchants will NEVER be granted admin access.
 */
export function isAppAdminShop(shop) {
  if (!shop) return false;

  const adminShops = (
    process.env.ADMIN_SHOPS ||
    "skywaytradingenterprise.myshopify.com,skywaytrading.myshopify.com,booststar"
  )
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const cleanShop = shop.toLowerCase().trim();
  return adminShops.some((adminDomain) => cleanShop.includes(adminDomain));
}
