import "dotenv/config";
import nodemailer from "nodemailer";

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
function renderContactBlock() {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 10px 0; background: #fff5f8; border: 1px solid #fce4ec; border-radius: 12px; padding: 20px;">
      <tr>
        <td>
          <div style="font-size: 14px; font-weight: 700; color: #833ab4; margin-bottom: 6px; letter-spacing: 0.02em;">
            ⚡ Need Instant 1-on-1 Assistance?
          </div>
          <div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 16px;">
            Our integration team is available to help you configure feeds, optimize layouts, or answer any questions free of charge:
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0;">
                <a href="${CALENDAR_URL}" target="_blank" style="display: inline-block; background: #1a73e8; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-right: 8px; margin-bottom: 6px;">
                  📅 Book Google Calendar Slot &rarr;
                </a>
                <a href="${WHATSAPP_URL}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
                  💬 Chat on WhatsApp (+91 70005 87074) &rarr;
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
 * Shared Email Footer Component
 */
function renderFooter(cleanDomain) {
  return `
    <tr>
      <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
        <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
          <strong>AI Instafeed for Shopify</strong> &bull; Official Merchant Notification
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
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured in .env. Skipping welcome email.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");

  const dashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const themeEditorUrl = `https://${cleanDomain}/admin/themes/current/editor?context=apps`;

  const subject = `AI Instafeed setup instructions for ${displayName}`;

  const textContent = `
Hello,

AI Instafeed is now successfully connected to your Shopify store: ${displayName} (${cleanDomain}).

Direct App Dashboard link:
${dashboardUrl}

3 Quick Steps to get your Instagram feed live:
1. Connect Your Instagram Account: Enter your handle in dashboard to sync posts, reels, and stories automatically.
2. Tag Store Products on Posts: Interlink products with feed posts to boost storefront conversions.
3. Activate in Theme Editor: Turn on "Instafeed" in your Shopify Theme App Embeds:
${themeEditorUrl}

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
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">SHOPIFY APP ACTIVATION</span>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Welcome to AI Instafeed!</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">Setup guide for <strong>${displayName}</strong></p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hello,</p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          <strong>AI Instafeed</strong> has been successfully installed on your store. You can now showcase your Instagram posts, reels, and stories with clickable product tags on your storefront.
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
                  <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Status:</td>
                  <td style="padding: 4px 0;">
                    <span style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;">Active &amp; Ready</span>
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

        <!-- Direct Contact Channels -->
        ${renderContactBlock()}

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
    html: htmlContent,
    headers: {
      "X-Entity-Ref-ID": `welcome-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Welcome email sent successfully to %s: %s", to, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending welcome email:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UNINSTALL EMAIL (Polite follow-up & 1-Click Reinstall Invitation)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendUninstallEmail({ to, shop, shopName }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured. Skipping uninstall email.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const cleanDomain = (shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");
  const shopHandle = cleanDomain.replace(/\.myshopify\.com$/, "");

  // Direct Reinstall URL inside Shopify Admin
  const reinstallUrl = `https://admin.shopify.com/store/${shopHandle}/apps/ai-instafeed`;

  const subject = `We're sorry to see you go from AI Instafeed – Can we help ${displayName}?`;

  const textContent = `
Hello ${displayName},

We noticed that you recently uninstalled AI Instafeed from your store (${cleanDomain}).

We understand that finding the right app is essential. If you faced any issues with feed loading, theme styling, product tagging, or mobile layout, our developer team is ready to fix it for you 100% free of charge!

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
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">WE VALUE YOUR FEEDBACK</span>
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
          If you experienced any difficulty with theme compatibility, feed alignment, speed, or product tagging, <strong>our engineering team will personally customize and set it up for your store 100% free of cost!</strong>
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

        <!-- Direct Contact Channels -->
        ${renderContactBlock()}

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
    html: htmlContent,
    headers: {
      "X-Entity-Ref-ID": `uninstall-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Uninstall follow-up email sent to %s: %s", to, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending uninstall email:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REINSTALL EMAIL (Welcome Back when app is installed again)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendReinstallEmail({ to, shop, shopName, myshopifyDomain }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured. Skipping reinstall email.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");
  const dashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;

  const subject = `Welcome back to AI Instafeed, ${displayName}! 🎉`;

  const textContent = `
Hello ${displayName},

Thank you so much for reinstalling AI Instafeed on ${cleanDomain}! We are absolutely thrilled to welcome you back.

Open Your Dashboard:
${dashboardUrl}

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
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">WELCOME BACK</span>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Thanks for Reinstalling! 🎉</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">We're so glad to have <strong>${displayName}</strong> back!</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Welcome back,</p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          Thank you for choosing to reinstall <strong>AI Instafeed</strong> on your store, <strong>${displayName}</strong>. We truly appreciate your trust and are dedicated to making your storefront look stunning.
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

        <!-- VIP Support Highlight -->
        <div style="background: #fdf2f8; border-left: 4px solid #e1306c; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
          <div style="font-weight: 700; font-size: 14px; color: #9d174d; margin-bottom: 4px;">
            🌟 Complimentary Setup Service
          </div>
          <div style="font-size: 13px; color: #831843; line-height: 1.5;">
            Since you're back with us, our senior integration team is offering complimentary feed customization and theme matching for your store!
          </div>
        </div>

        <!-- Direct Contact Channels -->
        ${renderContactBlock()}

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
    html: htmlContent,
    headers: {
      "X-Entity-Ref-ID": `reinstall-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Reinstall welcome-back email sent to %s: %s", to, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending reinstall email:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPPORT REQUEST EMAIL (Received by team from merchant)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendSupportEmail({ from, subject, message, shop, attachments = [] }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[Email] SMTP credentials not configured in .env. Skipping support email.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const cleanShop = (shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const mailOptions = {
    from: `"AI Instafeed Support" <${process.env.SMTP_USER}>`,
    to: SUPPORT_EMAIL,
    replyTo: from,
    subject: `Support Request: ${subject || "General Inquiry"} (${cleanShop})`,
    attachments,
    headers: {
      "X-Entity-Ref-ID": `support-${cleanShop}-${Date.now()}`,
    },
    text: `Support Request from ${cleanShop}\nMerchant Email: ${from}\nSubject: ${subject}\n\nMessage:\n${message}\n\nDashboard: https://${cleanShop}/admin/apps/ai-instafeed`,
    html: `
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
                <a href="https://${cleanShop}/admin/apps/ai-instafeed" style="display: inline-block; background: ${IG_GRADIENT_BTN}; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">Open Store Dashboard</a>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Support email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending support email:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MONTHLY ANALYTICS REPORT EMAIL (With In-App Review Deep Link)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendMonthlyReportEmail({ to, shop, shopName, myshopifyDomain, metrics = [] }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured. Skipping monthly report email.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");

  // Aggregate past 30 days metrics
  const totalViews = metrics.reduce((sum, m) => sum + (Number(m.views) || 0), 0);
  const totalClicks = metrics.reduce((sum, m) => sum + (Number(m.clicks) || 0), 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const activeDays = metrics.filter((m) => (Number(m.views) || 0) > 0 || (Number(m.clicks) || 0) > 0).length;

  const currentMonthYear = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  const dashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const reviewUrl = `https://${cleanDomain}/admin/apps/ai-instafeed?review=true`;

  const subject = `📊 ${currentMonthYear} Instagram Feed Performance Report for ${displayName}`;

  const textContent = `
Hello ${displayName},

Here is your monthly Instagram storefront feed performance report for ${currentMonthYear} on ${cleanDomain}:

MONTHLY PERFORMANCE SUMMARY:
- Total Feed Impressions: ${totalViews.toLocaleString()}
- Total Product / Post Clicks: ${totalClicks.toLocaleString()}
- Click-Through Rate (CTR): ${ctr}%
- Active Engagement Days: ${activeDays} / 30 Days

View Detailed Analytics in Dashboard:
${dashboardUrl}

⭐ ENJOYING AI INSTAFEED?
Your feedback helps independent developers improve AI Instafeed for merchants worldwide!
Click here to rate us and leave a review:
${reviewUrl}

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
        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">MONTHLY PERFORMANCE REPORT</span>
        <h1 style="margin: 0; font-size: 25px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${currentMonthYear} Analytics</h1>
        <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.95); font-size: 14px;">Storefront Instagram Feed metrics for <strong>${displayName}</strong></p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 24px 36px;">
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          Here is how your storefront Instagram feed performed over the past 30 days on <strong>${displayName}</strong> (${cleanDomain}).
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

        <!-- 🌟 REVIEW INVITATION HERO SPOTLIGHT -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #faf5ff; border: 2px solid #e9d5ff; border-radius: 14px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 26px 24px; text-align: center;">
              <div style="font-size: 24px; color: #f59e0b; margin-bottom: 8px; letter-spacing: 4px;">
                &#9733;&#9733;&#9733;&#9733;&#9733;
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #581c87; margin-bottom: 8px;">
                How is AI Instafeed working for ${displayName}?
              </div>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b21a8; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto;">
                We are a dedicated team constantly building new features for Shopify stores. Your review helps us tremendously! Please take 30 seconds to rate us.
              </p>
              <a href="${reviewUrl}" target="_blank" style="background: ${IG_GRADIENT_BTN}; color: #ffffff; text-decoration: none; padding: 15px 36px; font-size: 15px; font-weight: 800; border-radius: 8px; display: inline-block; box-shadow: 0 6px 18px rgba(193, 53, 132, 0.4); letter-spacing: 0.01em;">
                ⭐ Rate AI Instafeed &amp; Leave a Review &rarr;
              </a>
              <div style="margin-top: 10px; font-size: 12px; color: #9333ea;">
                Clicking opens the review form directly in your app dashboard
              </div>
            </td>
          </tr>
        </table>

        <!-- Direct Contact Channels -->
        ${renderContactBlock()}

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
    html: htmlContent,
    headers: {
      "X-Entity-Ref-ID": `monthly-report-${cleanDomain}-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Monthly report email sent to %s: %s", to, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Error sending monthly report email:", error);
    return { success: false, error: error.message };
  }
}
