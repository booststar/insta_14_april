import "dotenv/config";
import nodemailer from "nodemailer";
import prisma from "../db.server.js";

/**
 * Application base URL for public tracking pixels & redirects
 */
export function getAppBaseUrl() {
  return (
    process.env.SHOPIFY_APP_URL ||
    process.env.APP_URL ||
    process.env.HOST ||
    "https://insta14april-production.up.railway.app"
  ).replace(/\/$/, "");
}

/**
 * Generate unique tracking ID for an email dispatch
 */
export function generateEmailLogId() {
  return "em_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * Wrap a target URL with click tracking redirect
 */
export function trackLink(url, logId) {
  if (!logId || !url) return url;
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/api/email/track/click?id=${encodeURIComponent(logId)}&url=${encodeURIComponent(url)}`;
}

/**
 * Inject a 1x1 transparent open-tracking pixel before </body>
 */
export function injectTrackingPixel(html, logId) {
  if (!logId || !html) return html;
  const baseUrl = getAppBaseUrl();
  const pixel = `<img src="${baseUrl}/api/email/track/open?id=${encodeURIComponent(logId)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;max-height:0px;overflow:hidden;mso-hide:all;" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Persist an email dispatch event to the database for admin tracking
 */
export async function logEmailEvent({ id, shop, emailType, recipient, subject, status, messageId = null, error = null }) {
  try {
    if (prisma?.emailLog) {
      return await prisma.emailLog.create({
        data: {
          id: id || undefined,
          shop: shop || "unknown",
          emailType,
          recipient: recipient || "",
          subject: subject || "",
          status, // "SENT", "FAILED", "SKIPPED"
          messageId: messageId || null,
          error: error ? String(error).slice(0, 500) : null,
        },
      });
    } else {
      const logId = id || "cmv_" + Math.random().toString(36).substring(2, 12);
      return await prisma.$executeRawUnsafe(
        'INSERT INTO "EmailLog" ("id", "shop", "emailType", "recipient", "subject", "status", "messageId", "error", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
        logId,
        shop || "unknown",
        emailType,
        recipient || "",
        subject || "",
        status,
        messageId || null,
        error ? String(error).slice(0, 500) : null
      );
    }
  } catch (err) {
    console.error("[EmailLog] Failed to record email log:", err.message);
  }
}

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    pool: true,
    auth: { user, pass },
  });
}

// ── Contact & Support URLs ──────────────────────────────────────────────────
const CALENDAR_URL = "https://calendar.app.google/gwUVdD1FrqMc5R5KA";
const WHATSAPP_URL = "https://wa.me/+917000587074";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "contact@booststar.in";

// ── 100% Authentic Instagram Color Palette & Gradients ─────────────────────
// Signature Instagram 5-stop diagonal gradient
const IG_GRADIENT_MAIN = "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";
// Instagram Horizontal Bar
const IG_GRADIENT_BAR = "linear-gradient(90deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";
// Instagram Button Gradient
const IG_GRADIENT_BTN = "linear-gradient(135deg, #e1306c 0%, #c13584 50%, #833ab4 100%)";

/**
 * Shared Contact Options Component for Email Templates
 */
function renderContactBlock(logId = null) {
  const calUrl = logId ? trackLink(CALENDAR_URL, logId) : CALENDAR_URL;
  const waUrl = logId ? trackLink(WHATSAPP_URL, logId) : WHATSAPP_URL;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 10px 0; background: #fff5f8; border: 1px solid #fce4ec; border-radius: 12px; padding: 20px;">
      <tr>
        <td>
          <div style="font-size: 14px; font-weight: 700; color: #833ab4; margin-bottom: 6px; letter-spacing: 0.02em;">
            Need Instant 1-on-1 Assistance?
          </div>
          <div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 16px;">
            Our integration team is available to help you configure feeds, optimize layouts, or answer any questions free of charge:
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0;">
                <a href="${calUrl}" target="_blank" style="display: inline-block; background: #1a73e8; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-right: 8px; margin-bottom: 6px;">
                  Book Google Calendar Slot &rarr;
                </a>
                <a href="${waUrl}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                  Chat on WhatsApp (+91 70005 87074) &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Shared "Free Forever" & Review Incentive Reward Component for Email Templates
 */
function renderReviewRewardBlock(cleanDomain, logId = null) {
  const rawReviewUrl = "https://apps.shopify.com/ai-instafeed#modal-show=WriteReviewModal";
  const reviewUrl = logId ? trackLink(rawReviewUrl, logId) : rawReviewUrl;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 26px 0 16px 0; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #fde68a; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);">
      <tr>
        <td style="padding: 24px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="display: inline-block; background: #16a34a; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 20px; margin-bottom: 10px;">
                  100% FREE FOREVER APP
                </div>
                <div style="font-size: 17px; font-weight: 800; color: #78350f; margin-bottom: 8px; line-height: 1.3;">
                  Leave a Review &amp; Get Free App Credits + Unlocked AI Features!
                </div>
                <div style="font-size: 13.5px; color: #92400e; line-height: 1.6; margin-bottom: 16px;">
                  AI Instafeed is completely <strong>Free Forever</strong> with no hidden costs or subscriptions. If you love using the app, please take 30 seconds to drop us a quick 5-star review. As a special thank you, <strong>we will send you free app credits and enable premium AI Auto-Tagging &amp; Smart Product Matching features</strong> for your store!
                </div>
                <div>
                  <a href="${reviewUrl}" target="_blank" style="display: inline-block; background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-size: 13.5px; font-weight: 800; box-shadow: 0 4px 12px rgba(225, 48, 108, 0.35);">
                    Write a Review &amp; Unlock AI Rewards &rarr;
                  </a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function getReviewRewardText(cleanDomain) {
  const reviewUrl = "https://apps.shopify.com/ai-instafeed#modal-show=WriteReviewModal";
  return `
100% FREE FOREVER APP
AI Instafeed is completely free forever with no hidden subscriptions or surprise fees.

WRITE A REVIEW & CLAIM BONUS AI REWARDS:
Enjoying AI Instafeed? Please take 30 seconds to rate us and leave a 5-star review!
As a special thank you, our team will send you free app credits and enable premium AI Auto-Detection & Smart Product Tagging features for your store:
${reviewUrl}
`.trim();
}

/**
 * Shared Email Footer Component
 */
function renderFooter(cleanDomain) {
  return `
    <tr>
      <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
        <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
          <strong>AI Instafeed for Shopify</strong> &bull; Free Forever &bull; Official Merchant Notification
        </div>
        <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
          Support Email: <a href="mailto:${SUPPORT_EMAIL}" style="color: #e1306c; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a> &bull; 
          WhatsApp: <a href="${WHATSAPP_URL}" style="color: #25D366; text-decoration: none; font-weight: 600;">+91 70005 87074</a>
        </div>
        <div style="margin-top: 14px; font-size: 11px; color: #cbd5e1;">
          Automated notification for ${cleanDomain}. To reply, simply reply to this email.
        </div>
      </td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. WELCOME EMAIL (First Time Install)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendWelcomeEmail({ to, shop, shopName, myshopifyDomain }) {
  const logId = generateEmailLogId();
  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");

  const rawDashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const rawThemeEditorUrl = `https://${cleanDomain}/admin/themes/current/editor?context=apps`;

  const dashboardUrl = trackLink(rawDashboardUrl, logId);
  const themeEditorUrl = trackLink(rawThemeEditorUrl, logId);

  const subject = `AI Instafeed setup instructions for ${displayName}`;

  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured in .env. Skipping welcome email.");
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "welcome",
      recipient: to,
      subject,
      status: "SKIPPED",
      error: "SMTP credentials not configured in .env",
    });
    return { success: false, error: "SMTP credentials not configured" };
  }

  const textContent = `
Hello,

AI Instafeed is now successfully connected to your Shopify store: ${displayName} (${cleanDomain}).
Great news: AI Instafeed is 100% Free Forever with no hidden subscription fees!

Direct App Dashboard link:
${dashboardUrl}

3 Quick Steps to get your Instagram feed live:
1. Connect Your Instagram Account: Enter your handle in dashboard to sync posts, reels, and stories automatically.
2. Tag Store Products on Posts: Interlink products with feed posts to boost storefront conversions.
3. Activate in Theme Editor: Turn on "Instafeed" in your Shopify Theme App Embeds:
${themeEditorUrl}

${getReviewRewardText(cleanDomain)}

Need 1-on-1 Assistance?
- Book a slot in our calendar: ${CALENDAR_URL}
- WhatsApp support: ${WHATSAPP_URL}
- Email support: ${SUPPORT_EMAIL}

Best regards,
The AI Instafeed Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">

    <!-- Instagram Signature Header -->
    <tr>
      <td style="background: ${IG_GRADIENT_MAIN}; padding: 36px 36px 32px 36px; text-align: left;">
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">SHOPIFY APP ACTIVATION &bull; 100% FREE FOREVER</span>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Welcome to AI Instafeed!</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">Setup guide for <strong>${displayName}</strong></p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hello,</p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          <strong>AI Instafeed</strong> has been successfully installed on your store. Enjoy unlimited Instagram posts, reels, and stories with clickable shoppable product tags on your storefront — <strong>100% Free Forever</strong>.
        </p>

        <!-- Store Info Pill -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 4px 0; width: 120px;">Connected Store:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 4px 0;">${displayName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Domain:</td>
                  <td style="color: #0f172a; padding: 4px 0; font-family: monospace; font-size: 12px;">${cleanDomain}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Plan Status:</td>
                  <td style="padding: 4px 0;">
                    <span style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;">Free Forever &bull; Active</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Main CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" target="_blank" style="background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 48, 108, 0.4);">
            Open App Dashboard &rarr;
          </a>
          <div style="margin-top: 10px; font-size: 12px; color: #94a3b8;">
            Direct link: <a href="${dashboardUrl}" style="color: #e1306c; text-decoration: underline;">${dashboardUrl}</a>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />

        <!-- 3 Setup Steps -->
        <h3 style="margin: 0 0 18px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
          3 Quick Steps to Get Your Feed Live:
        </h3>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td valign="top" style="width: 32px; padding-top: 2px;">
              <div style="width: 24px; height: 24px; background: ${IG_GRADIENT_BTN}; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">1</div>
            </td>
            <td valign="top" style="padding-left: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Connect Your Instagram Handle</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 3px;">
                Enter your Instagram profile username in the dashboard to automatically sync and display your latest posts, reels, and stories.
              </div>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td valign="top" style="width: 32px; padding-top: 2px;">
              <div style="width: 24px; height: 24px; background: ${IG_GRADIENT_BTN}; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">2</div>
            </td>
            <td valign="top" style="padding-left: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Tag Store Products on Posts</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 3px;">
                Use the Product Tagging tool to link catalog items with feed media, allowing shoppers to view and purchase directly.
              </div>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td valign="top" style="width: 32px; padding-top: 2px;">
              <div style="width: 24px; height: 24px; background: ${IG_GRADIENT_BTN}; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">3</div>
            </td>
            <td valign="top" style="padding-left: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Activate in Theme Customizer</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 3px;">
                Open your Shopify Theme Editor, navigate to App Embeds, and switch on <strong>Instafeed</strong>.
              </div>
              <div style="margin-top: 8px;">
                <a href="${themeEditorUrl}" target="_blank" style="color: #e1306c; font-size: 13px; font-weight: 600; text-decoration: none;">
                  Open Theme Editor &rarr;
                </a>
              </div>
            </td>
          </tr>
        </table>

        <!-- Free Forever & Review Incentive Reward Block -->
        ${renderReviewRewardBlock(cleanDomain, logId)}

        <!-- Direct Contact Channels -->
        ${renderContactBlock(logId)}

      </td>
    </tr>

    <!-- Footer -->
    ${renderFooter(cleanDomain)}

  </table>
</body>
</html>
  `.trim();

  const mailOptions = {
    from: `"AI Instafeed" <${process.env.SMTP_USER}>`,
    to,
    replyTo: SUPPORT_EMAIL,
    subject,
    text: textContent,
    html: injectTrackingPixel(htmlContent, logId),
    headers: {
      "X-Entity-Ref-ID": `welcome-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Welcome email sent successfully to %s: %s", to, info.messageId);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "welcome",
      recipient: to,
      subject,
      status: "SENT",
      messageId: info.messageId,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending welcome email:", error);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "welcome",
      recipient: to,
      subject,
      status: "FAILED",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UNINSTALL EMAIL (Polite follow-up & 1-Click Reinstall Invitation)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendUninstallEmail({ to, shop, shopName }) {
  const logId = generateEmailLogId();
  const cleanDomain = (shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");
  const shopHandle = cleanDomain.replace(/\.myshopify\.com$/, "");

  // Direct Reinstall URL inside Shopify Admin (with click tracking)
  const rawReinstallUrl = `https://admin.shopify.com/store/${shopHandle}/apps/ai-instafeed`;
  const reinstallUrl = trackLink(rawReinstallUrl, logId);

  const subject = `AI Instafeed is 100% Free Forever – Can we help ${displayName}?`;

  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured. Skipping uninstall email.");
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "uninstall",
      recipient: to,
      subject,
      status: "SKIPPED",
      error: "SMTP credentials not configured in .env",
    });
    return { success: false, error: "SMTP credentials not configured" };
  }

  const textContent = `
Hello ${displayName},

We noticed that you recently uninstalled AI Instafeed from your store (${cleanDomain}).

Remember: AI Instafeed is 100% Free Forever for your store with zero subscription fees. If you faced any issues with feed loading, theme styling, product tagging, or mobile layout, our developer team is ready to personally fix and optimize it for you completely free of charge!

Plus, if you write us a review, we will happily unlock premium Pro AI Auto-Detection features and add bonus app credits to your account!

Reinstall AI Instafeed in 1-Click:
${reinstallUrl}

Let us set it up for you:
- Book a free Google Calendar slot with our team: ${CALENDAR_URL}
- Chat with us instantly on WhatsApp: ${WHATSAPP_URL}
- Email support: ${SUPPORT_EMAIL}

If there is anything we could improve, simply reply to this email with your feedback. We read and respond to every message.

Warm regards,
The AI Instafeed Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">

    <!-- Instagram Signature Header -->
    <tr>
      <td style="background: ${IG_GRADIENT_MAIN}; padding: 36px 36px 32px 36px; text-align: left;">
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">WE VALUE YOUR FEEDBACK &bull; 100% FREE FOREVER</span>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">We're Sorry to See You Go</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">Did something not work for <strong>${displayName}</strong>?</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hi there,</p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          We noticed you recently uninstalled <strong>AI Instafeed</strong> from <strong>${displayName}</strong>.
        </p>

        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          Just a reminder that <strong>AI Instafeed is 100% Free Forever</strong>. If you experienced any difficulty with theme compatibility, feed alignment, speed, or product tagging, <strong>our engineering team will personally customize and set it up for your store 100% free of cost!</strong>
        </p>

        <!-- Reinstall Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #faf5ff; border: 1px solid #f3e8ff; border-radius: 12px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <div style="font-size: 16px; font-weight: 700; color: #581c87; margin-bottom: 8px;">
                Want to give it another try?
              </div>
              <div style="font-size: 13px; color: #6b21a8; margin-bottom: 20px;">
                Your previous configuration and tagged posts can be restored instantly with 1-click:
              </div>
              <a href="${reinstallUrl}" target="_blank" style="background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(193, 53, 132, 0.35);">
                Reinstall AI Instafeed in 1-Click &rarr;
              </a>
            </td>
          </tr>
        </table>

        <!-- Free Forever & Review Incentive Reward Block -->
        ${renderReviewRewardBlock(cleanDomain, logId)}

        <!-- Direct Contact Channels -->
        ${renderContactBlock(logId)}

        <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.6;">
          Your feedback matters greatly to us. Just reply directly to this email and let us know what we could improve. We appreciate your time!
        </p>
      </td>
    </tr>

    <!-- Footer -->
    ${renderFooter(cleanDomain)}

  </table>
</body>
</html>
  `.trim();

  const mailOptions = {
    from: `"AI Instafeed" <${process.env.SMTP_USER}>`,
    to,
    replyTo: SUPPORT_EMAIL,
    subject,
    text: textContent,
    html: injectTrackingPixel(htmlContent, logId),
    headers: {
      "X-Entity-Ref-ID": `uninstall-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Uninstall follow-up email sent to %s: %s", to, info.messageId);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "uninstall",
      recipient: to,
      subject,
      status: "SENT",
      messageId: info.messageId,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending uninstall email:", error);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "uninstall",
      recipient: to,
      subject,
      status: "FAILED",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REINSTALL EMAIL (Welcome Back when app is installed again)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendReinstallEmail({ to, shop, shopName, myshopifyDomain }) {
  const logId = generateEmailLogId();
  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");
  const rawDashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const dashboardUrl = trackLink(rawDashboardUrl, logId);

  const subject = `Welcome back to AI Instafeed, ${displayName}! (100% Free Forever)`;

  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured. Skipping reinstall email.");
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "reinstall",
      recipient: to,
      subject,
      status: "SKIPPED",
      error: "SMTP credentials not configured in .env",
    });
    return { success: false, error: "SMTP credentials not configured" };
  }

  const textContent = `
Hello ${displayName},

Thank you so much for reinstalling AI Instafeed on ${cleanDomain}! We are absolutely thrilled to welcome you back.
Remember: AI Instafeed is 100% Free Forever for your store.

Open Your Dashboard:
${dashboardUrl}

${getReviewRewardText(cleanDomain)}

If you need any personalized setup, custom theme adjustments, or have any questions:
- Book a slot in our calendar: ${CALENDAR_URL}
- WhatsApp support: ${WHATSAPP_URL}
- Email support: ${SUPPORT_EMAIL}

Let's boost your store conversions together!

Warm regards,
The AI Instafeed Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">

    <!-- Instagram Signature Header -->
    <tr>
      <td style="background: ${IG_GRADIENT_MAIN}; padding: 36px 36px 32px 36px; text-align: left;">
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">WELCOME BACK &bull; 100% FREE FOREVER</span>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Thanks for Reinstalling! </h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">We're so glad to have <strong>${displayName}</strong> back!</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Welcome back,</p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          Thank you for choosing to reinstall <strong>AI Instafeed</strong> on your store, <strong>${displayName}</strong>. Your app remains <strong>100% Free Forever</strong>. We truly appreciate your trust and are dedicated to making your storefront look stunning.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" target="_blank" style="background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 48, 108, 0.4);">
            Launch App Dashboard &rarr;
          </a>
          <div style="margin-top: 10px; font-size: 12px; color: #94a3b8;">
            Direct link: <a href="${dashboardUrl}" style="color: #e1306c; text-decoration: underline;">${dashboardUrl}</a>
          </div>
        </div>

        <!-- Free Forever & Review Incentive Reward Block -->
        ${renderReviewRewardBlock(cleanDomain, logId)}

        <!-- VIP Support Highlight -->
        <div style="background: #fdf2f8; border-left: 4px solid #e1306c; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
          <div style="font-weight: 700; font-size: 14px; color: #9d174d; margin-bottom: 4px;">
            Complimentary Setup Service
          </div>
          <div style="font-size: 13px; color: #831843; line-height: 1.5;">
            Since you're back with us, our senior integration team is offering complimentary feed customization and theme matching for your store!
          </div>
        </div>

        <!-- Direct Contact Channels -->
        ${renderContactBlock(logId)}

      </td>
    </tr>

    <!-- Footer -->
    ${renderFooter(cleanDomain)}

  </table>
</body>
</html>
  `.trim();

  const mailOptions = {
    from: `"AI Instafeed" <${process.env.SMTP_USER}>`,
    to,
    replyTo: SUPPORT_EMAIL,
    subject,
    text: textContent,
    html: injectTrackingPixel(htmlContent, logId),
    headers: {
      "X-Entity-Ref-ID": `reinstall-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Reinstall welcome-back email sent to %s: %s", to, info.messageId);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "reinstall",
      recipient: to,
      subject,
      status: "SENT",
      messageId: info.messageId,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending reinstall email:", error);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "reinstall",
      recipient: to,
      subject,
      status: "FAILED",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPPORT REQUEST EMAIL (Received by team from merchant)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendSupportEmail({ from, subject, message, shop, attachments = [] }) {
  const logId = generateEmailLogId();
  const cleanShop = (shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const emailSubject = `Support Request: ${subject || "General Inquiry"} (${cleanShop})`;

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[Email] SMTP credentials not configured in .env. Skipping support email.");
    await logEmailEvent({
      id: logId,
      shop: cleanShop,
      emailType: "support",
      recipient: SUPPORT_EMAIL,
      subject: emailSubject,
      status: "SKIPPED",
      error: "SMTP credentials not configured in .env",
    });
    return { success: false, error: "SMTP credentials not configured" };
  }

  const rawDashboardUrl = `https://${cleanShop}/admin/apps/ai-instafeed`;
  const dashboardUrl = trackLink(rawDashboardUrl, logId);

  const rawHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Message</title>
      </head>
      <body style="margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 24px 32px; background: ${IG_GRADIENT_MAIN}; color: #ffffff;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.85); font-weight: 700; margin-bottom: 6px;">AI INSTAFEED SUPPORT</div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">New Merchant Ticket</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 110px; font-weight: 600;">Store:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${cleanShop}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Sender:</td>
                  <td style="padding: 6px 0; color: #0f172a;"><a href="mailto:${from}" style="color: #e1306c; text-decoration: none;">${from}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject:</td>
                  <td style="padding: 6px 0; color: #0f172a;">${subject}</td>
                </tr>
              </table>

              <div style="background: #fff5f8; border-left: 4px solid #e1306c; border-radius: 6px; padding: 18px 20px; margin: 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                ${(message || "").replace(/\n/g, "<br>")}
              </div>

              <div style="margin-top: 24px;">
                <a href="${dashboardUrl}" style="display: inline-block; background: ${IG_GRADIENT_BTN}; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">Open Store Dashboard</a>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
  `;

  const mailOptions = {
    from: `"AI Instafeed Support" <${process.env.SMTP_USER}>`,
    to: SUPPORT_EMAIL,
    replyTo: from,
    subject: emailSubject,
    attachments,
    headers: {
      "X-Entity-Ref-ID": `support-${cleanShop}-${Date.now()}`,
    },
    text: `Support Request from ${cleanShop}\nMerchant Email: ${from}\nSubject: ${subject}\n\nMessage:\n${message}\n\nDashboard: ${dashboardUrl}`,
    html: injectTrackingPixel(rawHtml, logId),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Support email sent: %s", info.messageId);
    await logEmailEvent({
      id: logId,
      shop: cleanShop,
      emailType: "support",
      recipient: SUPPORT_EMAIL,
      subject: emailSubject,
      status: "SENT",
      messageId: info.messageId,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending support email:", error);
    await logEmailEvent({
      id: logId,
      shop: cleanShop,
      emailType: "support",
      recipient: SUPPORT_EMAIL,
      subject: emailSubject,
      status: "FAILED",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MONTHLY ANALYTICS REPORT EMAIL (With In-App Review Deep Link)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendMonthlyReportEmail({ to, shop, shopName, myshopifyDomain, metrics = [] }) {
  const logId = generateEmailLogId();
  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");

  // Aggregate past 30 days metrics
  const totalViews = metrics.reduce((sum, m) => sum + (Number(m.views) || 0), 0);
  const totalClicks = metrics.reduce((sum, m) => sum + (Number(m.clicks) || 0), 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const activeDays = metrics.filter((m) => (Number(m.views) || 0) > 0 || (Number(m.clicks) || 0) > 0).length;

  const currentMonthYear = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const rawDashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const dashboardUrl = trackLink(rawDashboardUrl, logId);

  const subject = `${currentMonthYear} Instagram Feed Performance Report for ${displayName} (100% Free Forever)`;

  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured. Skipping monthly report email.");
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "monthly_report",
      recipient: to,
      subject,
      status: "SKIPPED",
      error: "SMTP credentials not configured in .env",
    });
    return { success: false, error: "SMTP credentials not configured" };
  }

  const textContent = `
Hello ${displayName},

Here is your monthly Instagram storefront feed performance report for ${currentMonthYear} on ${cleanDomain}:
Reminder: AI Instafeed is 100% Free Forever on your store!

MONTHLY PERFORMANCE SUMMARY:
- Total Feed Impressions: ${totalViews.toLocaleString()}
- Total Product / Post Clicks: ${totalClicks.toLocaleString()}
- Click-Through Rate (CTR): ${ctr}%
- Active Engagement Days: ${activeDays} / 30 Days

View Detailed Analytics in Dashboard:
${dashboardUrl}

${getReviewRewardText(cleanDomain)}

Need assistance or custom design adjustments?
- Book a Google Calendar slot: ${CALENDAR_URL}
- Chat on WhatsApp: ${WHATSAPP_URL}
- Email Support: ${SUPPORT_EMAIL}

Best regards,
The AI Instafeed Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">

    <!-- Instagram Signature Header -->
    <tr>
      <td style="background: ${IG_GRADIENT_MAIN}; padding: 36px 36px 32px 36px; text-align: left;">
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">MONTHLY REPORT &bull; 100% FREE FOREVER</span>
        <h1 style="margin: 0; font-size: 25px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${currentMonthYear} Analytics</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">Storefront Instagram Feed metrics for <strong>${displayName}</strong></p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          Here is how your storefront Instagram feed performed over the past 30 days on <strong>${displayName}</strong> (${cleanDomain}). Your app is <strong>100% Free Forever</strong>!
        </p>

        <!-- KPI Grid (2x2) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td width="48%" style="padding: 18px; background: #fff5f8; border: 1px solid #fce4ec; border-radius: 12px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #833ab4; letter-spacing: 0.05em; margin-bottom: 6px;">Total Impressions</div>
              <div style="font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1;">${totalViews.toLocaleString()}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Feed views by shoppers</div>
            </td>
            <td width="4%"></td>
            <td width="48%" style="padding: 18px; background: #fdf2f8; border: 1px solid #fce7f3; border-radius: 12px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #e1306c; letter-spacing: 0.05em; margin-bottom: 6px;">Product / Post Clicks</div>
              <div style="font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1;">${totalClicks.toLocaleString()}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Interactions on feed items</div>
            </td>
          </tr>
          <tr><td height="12" colspan="3"></td></tr>
          <tr>
            <td width="48%" style="padding: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; letter-spacing: 0.05em; margin-bottom: 6px;">Click-Through Rate</div>
              <div style="font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1;">${ctr}%</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Shopper engagement rate</div>
            </td>
            <td width="4%"></td>
            <td width="48%" style="padding: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #16a34a; letter-spacing: 0.05em; margin-bottom: 6px;">Active Days</div>
              <div style="font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1;">${activeDays} <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ 30 Days</span></div>
              <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Days with customer traffic</div>
            </td>
          </tr>
        </table>

        <!-- Direct Dashboard Button -->
        <div style="text-align: center; margin: 24px 0 32px 0;">
          <a href="${dashboardUrl}" target="_blank" style="background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 48, 108, 0.35);">
            View Real-Time Analytics Dashboard &rarr;
          </a>
        </div>

        <!-- Free Forever & Review Incentive Reward Block -->
        ${renderReviewRewardBlock(cleanDomain, logId)}

        <!-- Direct Contact Channels -->
        ${renderContactBlock(logId)}

      </td>
    </tr>

    <!-- Footer -->
    ${renderFooter(cleanDomain)}

  </table>
</body>
</html>
  `.trim();

  const mailOptions = {
    from: `"AI Instafeed" <${process.env.SMTP_USER}>`,
    to,
    replyTo: SUPPORT_EMAIL,
    subject,
    text: textContent,
    html: injectTrackingPixel(htmlContent, logId),
    headers: {
      "X-Entity-Ref-ID": `monthly-report-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Monthly report email sent to %s: %s", to, info.messageId);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "monthly_report",
      recipient: to,
      subject,
      status: "SENT",
      messageId: info.messageId,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending monthly report email:", error);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "monthly_report",
      recipient: to,
      subject,
      status: "FAILED",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SETUP INCOMPLETE / THEME EMBED INACTIVE REMINDER EMAIL
// ─────────────────────────────────────────────────────────────────────────────
export async function sendSetupReminderEmail({
  to,
  shop,
  shopName,
  myshopifyDomain,
  isConnected = false,
  isEmbedActive = false,
  isSectionActive = false,
  instagramHandle = "",
  themeId = "current",
}) {
  const logId = generateEmailLogId();
  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");
  const activeThemeId = themeId && themeId !== "current" ? themeId : "current";

  const extUuid = "eeecd3e9-ddb8-f1f8-6e66-ef13a12c0780e5eb934b";
  const rawThemeActivateEmbedUrl = `https://${cleanDomain}/admin/themes/${activeThemeId}/editor?context=apps&activateAppId=${extUuid}/app-embed`;
  const rawThemeAddSectionUrl = `https://${cleanDomain}/admin/themes/${activeThemeId}/editor?template=index&addAppBlockId=${extUuid}/feed-grid&target=mainSection`;
  const rawDashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;

  const themeActivateEmbedUrl = trackLink(rawThemeActivateEmbedUrl, logId);
  const themeAddSectionUrl = trackLink(rawThemeAddSectionUrl, logId);
  const dashboardUrl = trackLink(rawDashboardUrl, logId);

  const subject = !isEmbedActive
    ? `Action Required: Turn ON App Embed to activate Instagram Feed for ${displayName}`
    : !isConnected
    ? `Finish setting up AI Instafeed for ${displayName} (Takes 60 seconds)`
    : `Finish publishing your Instagram Feed on ${displayName}`;

  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured in .env. Skipping setup reminder email.");
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "setup_reminder",
      recipient: to,
      subject,
      status: "SKIPPED",
      error: "SMTP credentials not configured in .env",
    });
    return { success: false, error: "SMTP credentials not configured" };
  }

  const primaryActionUrl = !isEmbedActive ? themeActivateEmbedUrl : !isConnected ? dashboardUrl : themeAddSectionUrl;
  const primaryActionText = !isEmbedActive ? "Turn ON App Embed in Theme ↗" : !isConnected ? "Connect Instagram Handle ↗" : "Add Section in Theme ↗";

  const textContent = `
Hello,

We noticed that AI Instafeed is installed on your Shopify store (${displayName} - ${cleanDomain}), but your Instagram feed is NOT yet visible to visitors on your live store.

Current Setup Status:
1. Instagram Account: ${isConnected ? `Connected (@${instagramHandle || "account"})` : "Action Needed - Not connected yet"}
2. Theme App Embed: ${isEmbedActive ? "Active" : "Action Needed - Turned OFF in Theme Editor"}
3. Feed Grid Section: ${isSectionActive ? "Added to theme" : "Pending - Needs to be placed on your storefront"}

Primary Action Required:
${primaryActionText}:
${primaryActionUrl}

Direct App Dashboard Link:
${dashboardUrl}

Need 1-on-1 Assistance? Our team will gladly configure and verify your feed free of charge:
- Book a free Google Calendar slot: ${CALENDAR_URL}
- WhatsApp support: ${WHATSAPP_URL}
- Email support: ${SUPPORT_EMAIL}

Best regards,
The AI Instafeed Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">

    <!-- Header -->
    <tr>
      <td style="background: ${IG_GRADIENT_MAIN}; padding: 36px 36px 32px 36px; text-align: left;">
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">ACTION REQUIRED &bull; 1-MINUTE SETUP</span>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Your Feed is Not Live Yet</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">Setup alert for <strong>${displayName}</strong></p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hello,</p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          We noticed that you installed <strong>AI Instafeed</strong> on <strong>${displayName}</strong>, but your Instagram feed is <strong>not yet displaying to your store's shoppers</strong>. It only takes about 60 seconds to complete setup and start driving conversions!
        </p>

        <!-- Alert Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 16px 20px;">
              <div style="font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
                ${!isEmbedActive ? "⚠️ Theme App Embed is Turned OFF" : !isConnected ? "⚠️ Instagram Account Not Linked" : "⚠️ Section Needs to be Placed"}
              </div>
              <div style="font-size: 13px; color: #b45309; line-height: 1.5;">
                ${!isEmbedActive
                  ? "In Shopify Online Store 2.0, the app embed script must be turned ON in your Theme Editor for the feed to render. Click the 1-click button below to activate it."
                  : !isConnected
                  ? "Enter your Instagram username in your app dashboard to sync posts, reels, and stories automatically."
                  : "Add the Feed Grid block to your homepage to show posts to your visitors."}
              </div>
            </td>
          </tr>
        </table>

        <!-- Checklist Table -->
        <h3 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
          Live Storefront Checklist:
        </h3>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="30" valign="top">
                    ${isConnected ? '<span style="font-size: 18px;">✅</span>' : '<span style="font-size: 18px;">⚠️</span>'}
                  </td>
                  <td>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">1. Connect Instagram Account</div>
                    <div style="font-size: 12.5px; color: #64748b;">${isConnected ? `Connected as @${instagramHandle}` : "Pending: Enter username in dashboard"}</div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: ${isConnected ? "#dcfce7; color: #16a34a;" : "#fef3c7; color: #b45309;"}">
                      ${isConnected ? "Done" : "Action Needed"}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="30" valign="top">
                    ${isEmbedActive ? '<span style="font-size: 18px;">✅</span>' : '<span style="font-size: 18px;">❌</span>'}
                  </td>
                  <td>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">2. Enable Theme App Embed</div>
                    <div style="font-size: 12.5px; color: #64748b;">${isEmbedActive ? "Active on live theme" : "Turn ON toggle in Shopify Theme Editor"}</div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: ${isEmbedActive ? "#dcfce7; color: #16a34a;" : "#fee2e2; color: #dc2626;"}">
                      ${isEmbedActive ? "Active" : "Turn ON ↗"}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="30" valign="top">
                    ${isSectionActive ? '<span style="font-size: 18px;">✅</span>' : '<span style="font-size: 18px;">⚠️</span>'}
                  </td>
                  <td>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">3. Add Feed Section to Theme</div>
                    <div style="font-size: 12.5px; color: #64748b;">${isSectionActive ? "Feed grid section active on theme" : "Add feed section to Homepage/Product page"}</div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: ${isSectionActive ? "#dcfce7; color: #16a34a;" : "#fef3c7; color: #b45309;"}">
                      ${isSectionActive ? "Done" : "Pending"}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Primary CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${primaryActionUrl}" target="_blank" style="background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 48, 108, 0.4);">
            ${primaryActionText}
          </a>
          <div style="margin-top: 12px; font-size: 12px; color: #64748b;">
            Or open: <a href="${dashboardUrl}" style="color: #e1306c; font-weight: 600; text-decoration: underline;">App Dashboard</a>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />

        <!-- 1-on-1 Assistance -->
        ${renderContactBlock(logId)}

        <!-- Free Forever & Review Block -->
        ${renderReviewRewardBlock(cleanDomain, logId)}

      </td>
    </tr>

    <!-- Footer -->
    ${renderFooter(cleanDomain)}

  </table>
</body>
</html>
  `.trim();

  const mailOptions = {
    from: `"AI Instafeed" <${process.env.SMTP_USER}>`,
    to,
    replyTo: SUPPORT_EMAIL,
    subject,
    text: textContent,
    html: injectTrackingPixel(htmlContent, logId),
    headers: {
      "X-Entity-Ref-ID": `setup-reminder-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Setup reminder email sent to %s: %s", to, info.messageId);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "setup_reminder",
      recipient: to,
      subject,
      status: "SENT",
      messageId: info.messageId,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending setup reminder email:", error);
    await logEmailEvent({
      id: logId,
      shop,
      emailType: "setup_reminder",
      recipient: to,
      subject,
      status: "FAILED",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CUSTOM LIVE EMAIL DISPATCH (Super-Admin Direct Dispatch)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCustomEmail({
  to,
  shop,
  subject,
  message,
  htmlMessage = null,
  emailType = "custom",
}) {
  const logId = generateEmailLogId();
  const cleanDomain = (shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = cleanDomain.replace(/\.myshopify\.com$/, "");
  const emailSubject = subject || `AI Instafeed update for ${displayName}`;

  const rawDashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const dashboardUrl = trackLink(rawDashboardUrl, logId);

  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured. Skipping custom email.");
    await logEmailEvent({
      id: logId,
      shop: cleanDomain,
      emailType,
      recipient: to,
      subject: emailSubject,
      status: "SKIPPED",
      error: "SMTP credentials not configured in .env",
    });
    return { success: false, error: "SMTP credentials not configured in .env", logId };
  }

  const bodyContent = htmlMessage || `
    <div style="font-size: 15px; color: #334155; line-height: 1.65; white-space: pre-wrap; margin-bottom: 24px;">
      ${(message || "").replace(/\n/g, "<br>")}
    </div>
  `;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="background: ${IG_GRADIENT_MAIN}; padding: 36px 36px 32px 36px; text-align: left;">
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">DIRECT NOTIFICATION</span>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${emailSubject}</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">Store domain: <strong>${displayName}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        ${bodyContent}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${dashboardUrl}" target="_blank" style="background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 14px 34px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 48, 108, 0.4);">
            Open App Dashboard &rarr;
          </a>
        </div>
        ${renderReviewRewardBlock(cleanDomain, logId)}
        ${renderContactBlock(logId)}
      </td>
    </tr>
    ${renderFooter(cleanDomain)}
  </table>
</body>
</html>
  `.trim();

  const mailOptions = {
    from: `"AI Instafeed" <${process.env.SMTP_USER}>`,
    to,
    replyTo: SUPPORT_EMAIL,
    subject: emailSubject,
    text: message || emailSubject,
    html: injectTrackingPixel(htmlContent, logId),
    headers: {
      "X-Entity-Ref-ID": `custom-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Custom live email sent to %s: %s", to, info.messageId);
    await logEmailEvent({
      id: logId,
      shop: cleanDomain,
      emailType,
      recipient: to,
      subject: emailSubject,
      status: "SENT",
      messageId: info.messageId,
    });
    return { success: true, messageId: info.messageId, logId };
  } catch (error) {
    console.error("[Email] Error sending custom live email:", error);
    await logEmailEvent({
      id: logId,
      shop: cleanDomain,
      emailType,
      recipient: to,
      subject: emailSubject,
      status: "FAILED",
      error: error.message,
    });
    return { success: false, error: error.message, logId };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. RESEND EMAIL BY LOG ID
// ─────────────────────────────────────────────────────────────────────────────
export async function resendEmailById({ logId, targetEmail = null }) {
  if (!logId) return { success: false, error: "Missing email log ID" };

  let log = null;
  if (prisma?.emailLog) {
    log = await prisma.emailLog.findUnique({ where: { id: logId } });
  } else {
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "EmailLog" WHERE "id" = $1 LIMIT 1', logId);
    log = rows?.[0] || null;
  }

  if (!log) {
    return { success: false, error: "Email log not found" };
  }

  const recipient = targetEmail || log.recipient;
  if (!recipient) {
    return { success: false, error: "No recipient address specified" };
  }

  switch (log.emailType) {
    case "welcome":
      return await sendWelcomeEmail({
        to: recipient,
        shop: log.shop,
        shopName: log.shop.replace(/\.myshopify\.com$/, ""),
        myshopifyDomain: log.shop,
      });

    case "setup_reminder":
      return await sendSetupReminderEmail({
        to: recipient,
        shop: log.shop,
        shopName: log.shop.replace(/\.myshopify\.com$/, ""),
        myshopifyDomain: log.shop,
        isConnected: false,
        isEmbedActive: false,
        isSectionActive: false,
      });

    case "monthly_report":
      return await sendMonthlyReportEmail({
        to: recipient,
        shop: log.shop,
        shopName: log.shop.replace(/\.myshopify\.com$/, ""),
        myshopifyDomain: log.shop,
        metrics: [
          { views: 1250, clicks: 184 },
          { views: 890, clicks: 112 },
        ],
      });

    case "uninstall":
      return await sendUninstallEmail({
        to: recipient,
        shop: log.shop,
        shopName: log.shop.replace(/\.myshopify\.com$/, ""),
      });

    case "reinstall":
      return await sendReinstallEmail({
        to: recipient,
        shop: log.shop,
        shopName: log.shop.replace(/\.myshopify\.com$/, ""),
        myshopifyDomain: log.shop,
      });

    case "support":
    case "custom":
    default:
      return await sendCustomEmail({
        to: recipient,
        shop: log.shop,
        subject: log.subject.startsWith("[Resent]") ? log.subject : `[Resent] ${log.subject}`,
        message: `This is a re-sent copy of email log ${log.id}.\n\nOriginal Subject: ${log.subject}\nOriginal Date: ${log.createdAt}`,
        emailType: log.emailType || "custom",
      });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. RENDER EMAIL HTML PREVIEW (For In-App Modal / Inspector)
// ─────────────────────────────────────────────────────────────────────────────
export function getEmailPreviewHtml({
  emailType,
  shop = "demo-store.myshopify.com",
  recipient = "merchant@example.com",
  subject = "",
}) {
  const cleanDomain = (shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = cleanDomain.replace(/\.myshopify\.com$/, "");
  const dashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const themeEditorUrl = `https://${cleanDomain}/admin/themes/current/editor?context=apps`;

  switch (emailType) {
    case "welcome":
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>body { margin:0; padding:20px; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; background:#f1f5f9; }</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
    <tr>
      <td style="background:${IG_GRADIENT_MAIN}; padding:32px; color:#ffffff;">
        <span style="background:rgba(255,255,255,0.22); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:10px;">WELCOME TO AI INSTAFEED</span>
        <h1 style="margin:0; font-size:24px; font-weight:800; color:#fff;">Welcome to AI Instafeed!</h1>
        <p style="margin:4px 0 0 0; color:rgba(255,255,255,0.9); font-size:13px;">Setup guide for <strong>${displayName}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <p style="color:#334155; font-size:15px;">Hello,</p>
        <p style="color:#334155; font-size:14px; line-height:1.6;">
          <strong>AI Instafeed</strong> has been successfully installed on your store. Enjoy unlimited Instagram posts, reels, and stories with clickable shoppable product tags on your storefront — <strong>100% Free Forever</strong>.
        </p>
        <div style="text-align:center; margin:24px 0;">
          <a href="${dashboardUrl}" target="_blank" style="background:${IG_GRADIENT_BTN}; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; display:inline-block;">Open App Dashboard &rarr;</a>
        </div>
        ${renderReviewRewardBlock(cleanDomain)}
        ${renderContactBlock()}
      </td>
    </tr>
    ${renderFooter(cleanDomain)}
  </table>
</body>
</html>
      `.trim();

    case "setup_reminder":
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>body { margin:0; padding:20px; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; background:#f1f5f9; }</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
    <tr>
      <td style="background:${IG_GRADIENT_MAIN}; padding:32px; color:#ffffff;">
        <span style="background:rgba(255,255,255,0.22); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:10px;">ACTION REQUIRED &bull; 1-MINUTE SETUP</span>
        <h1 style="margin:0; font-size:24px; font-weight:800; color:#fff;">Your Feed is Not Live Yet</h1>
        <p style="margin:4px 0 0 0; color:rgba(255,255,255,0.9); font-size:13px;">Setup alert for <strong>${displayName}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <div style="background:#fffbeb; border-left:4px solid #f59e0b; padding:14px; border-radius:6px; margin-bottom:20px;">
          <strong style="color:#92400e;">⚠️ Theme App Embed is Turned OFF</strong>
          <p style="margin:4px 0 0 0; color:#b45309; font-size:13px;">In Shopify OS 2.0, the app embed must be enabled in Theme Customizer for your Instagram feed to show up.</p>
        </div>
        <div style="text-align:center; margin:24px 0;">
          <a href="${themeEditorUrl}" target="_blank" style="background:${IG_GRADIENT_BTN}; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; display:inline-block;">Turn ON App Embed in Theme &rarr;</a>
        </div>
        ${renderReviewRewardBlock(cleanDomain)}
        ${renderContactBlock()}
      </td>
    </tr>
    ${renderFooter(cleanDomain)}
  </table>
</body>
</html>
      `.trim();

    case "monthly_report":
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>body { margin:0; padding:20px; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; background:#f1f5f9; }</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
    <tr>
      <td style="background:${IG_GRADIENT_MAIN}; padding:32px; color:#ffffff;">
        <span style="background:rgba(255,255,255,0.22); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:10px;">MONTHLY PERFORMANCE</span>
        <h1 style="margin:0; font-size:24px; font-weight:800; color:#fff;">Storefront Feed Analytics</h1>
        <p style="margin:4px 0 0 0; color:rgba(255,255,255,0.9); font-size:13px;">Past 30 days metrics for <strong>${displayName}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          <tr>
            <td width="48%" style="padding:14px; background:#fff5f8; border:1px solid #fce4ec; border-radius:10px;">
              <div style="font-size:11px; font-weight:700; color:#833ab4;">IMPRESSIONS</div>
              <div style="font-size:24px; font-weight:800; color:#0f172a; margin-top:4px;">14,820</div>
            </td>
            <td width="4%"></td>
            <td width="48%" style="padding:14px; background:#fdf2f8; border:1px solid #fce7f3; border-radius:10px;">
              <div style="font-size:11px; font-weight:700; color:#e1306c;">CLICKS</div>
              <div style="font-size:24px; font-weight:800; color:#0f172a; margin-top:4px;">1,240</div>
            </td>
          </tr>
        </table>
        ${renderReviewRewardBlock(cleanDomain)}
        ${renderContactBlock()}
      </td>
    </tr>
    ${renderFooter(cleanDomain)}
  </table>
</body>
</html>
      `.trim();

    case "uninstall":
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>body { margin:0; padding:20px; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; background:#f1f5f9; }</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
    <tr>
      <td style="background:${IG_GRADIENT_MAIN}; padding:32px; color:#ffffff;">
        <span style="background:rgba(255,255,255,0.22); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:10px;">WE VALUE YOUR FEEDBACK</span>
        <h1 style="margin:0; font-size:24px; font-weight:800; color:#fff;">We're Sorry to See You Go</h1>
        <p style="margin:4px 0 0 0; color:rgba(255,255,255,0.9); font-size:13px;">Follow-up for <strong>${displayName}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <p style="color:#334155; font-size:14px; line-height:1.6;">
          We noticed you recently uninstalled <strong>AI Instafeed</strong>. Remember that our app is <strong>100% Free Forever</strong>. If you faced any layout or setup issues, our senior integration team will gladly configure it for you completely free of charge!
        </p>
        <div style="text-align:center; margin:24px 0;">
          <a href="https://apps.shopify.com/ai-instafeed" target="_blank" style="background:${IG_GRADIENT_BTN}; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; display:inline-block;">Reinstall in 1-Click &rarr;</a>
        </div>
        ${renderContactBlock()}
      </td>
    </tr>
    ${renderFooter(cleanDomain)}
  </table>
</body>
</html>
      `.trim();

    case "reinstall":
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>body { margin:0; padding:20px; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; background:#f1f5f9; }</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
    <tr>
      <td style="background:${IG_GRADIENT_MAIN}; padding:32px; color:#ffffff;">
        <span style="background:rgba(255,255,255,0.22); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:10px;">WELCOME BACK &bull; 100% FREE FOREVER</span>
        <h1 style="margin:0; font-size:24px; font-weight:800; color:#fff;">Thanks for Reinstalling! 🎉</h1>
        <p style="margin:4px 0 0 0; color:rgba(255,255,255,0.9); font-size:13px;">Welcome back <strong>${displayName}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <p style="color:#334155; font-size:14px; line-height:1.6;">
          Thank you for reinstalling AI Instafeed on your store! We are delighted to have you back.
        </p>
        <div style="text-align:center; margin:24px 0;">
          <a href="${dashboardUrl}" target="_blank" style="background:${IG_GRADIENT_BTN}; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; display:inline-block;">Launch App Dashboard &rarr;</a>
        </div>
        ${renderReviewRewardBlock(cleanDomain)}
        ${renderContactBlock()}
      </td>
    </tr>
    ${renderFooter(cleanDomain)}
  </table>
</body>
</html>
      `.trim();

    case "support":
    default:
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>body { margin:0; padding:20px; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; background:#f1f5f9; }</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
    <tr>
      <td style="background:${IG_GRADIENT_MAIN}; padding:28px 32px; color:#ffffff;">
        <span style="background:rgba(255,255,255,0.22); color:#ffffff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:8px;">AI INSTAFEED DISPATCH</span>
        <h1 style="margin:0; font-size:22px; font-weight:800; color:#fff;">${subject || "Email Notification"}</h1>
        <p style="margin:4px 0 0 0; color:rgba(255,255,255,0.9); font-size:13px;">Recipient: <strong>${recipient}</strong> &bull; Store: <strong>${displayName}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:18px; font-size:14px; color:#334155; line-height:1.6;">
          This email was dispatched to <strong>${recipient}</strong> for store <strong>${cleanDomain}</strong>.
        </div>
        ${renderContactBlock()}
      </td>
    </tr>
    ${renderFooter(cleanDomain)}
  </table>
</body>
</html>
      `.trim();
  }
}


