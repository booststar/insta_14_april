import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendUninstallEmail } from "../utils/email.server";

export const action = async ({ request }) => {
  const { shop, session, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const merchantEmail = payload?.email || session?.email;
    const shopName = payload?.name || shop;

    // 1. Record that this shop uninstalled (used to detect re-installations in afterAuth)
    const webhookId = `uninstall-${shop}-${Date.now()}`;
    await db.webhookEvent.upsert({
      where: { webhookId },
      update: {},
      create: {
        webhookId,
        topic: "app/uninstalled",
        shop,
      },
    }).catch(err => {
      console.warn(`[Uninstall] WebhookEvent record error for ${shop}:`, err.message);
    });

    // 2. Send polite recovery / reinstall invitation email with Calendar & WhatsApp links
    if (merchantEmail) {
      await sendUninstallEmail({
        to: merchantEmail,
        shop,
        shopName,
      });
      console.log(`[Uninstall] Recovery email sent to ${merchantEmail} for ${shop}`);
    }

    // 3. Clean up sessions for the uninstalled shop
    await db.session.deleteMany({ where: { shop } });
  } catch (error) {
    console.error(`[Webhook Error] Failed processing uninstall for ${shop}:`, error);
  }

  return new Response(null, { status: 200 });
};
