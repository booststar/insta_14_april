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

/**
 * Sends support message to the app team from merchants
 */
export async function sendSupportEmail({ from, subject, message, shop, attachments = [] }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[Email] SMTP credentials not configured in .env. Skipping support email.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const cleanShop = (shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const supportEmail = process.env.SUPPORT_EMAIL || "contact@booststar.in";

  const mailOptions = {
    from: `"AI Instafeed Support" <${process.env.SMTP_USER}>`,
    to: supportEmail,
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
            <td style="padding: 24px 32px; background: #0f172a; color: #ffffff;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; font-weight: 600; margin-bottom: 6px;">AI Instafeed Support</div>
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

              <div style="background: #fdf2f8; border-left: 4px solid #e1306c; border-radius: 6px; padding: 18px 20px; margin: 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                ${(message || "").replace(/\n/g, "<br>")}
              </div>

              <div style="margin-top: 24px;">
                <a href="https://${cleanShop}/admin/apps/ai-instafeed" style="display: inline-block; background: #e1306c; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">Open Store Dashboard</a>
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

/**
 * Sends automated welcome onboarding email to merchants with dynamic links & store info
 */
export async function sendWelcomeEmail({ to, shop, shopName, myshopifyDomain }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP credentials not configured in .env. Skipping welcome email.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const cleanDomain = (myshopifyDomain || shop || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const displayName = shopName || cleanDomain.replace(/\.myshopify\.com$/, "");
  const supportEmail = process.env.SUPPORT_EMAIL || "contact@booststar.in";

  // Deep links to Shopify admin
  const dashboardUrl = `https://${cleanDomain}/admin/apps/ai-instafeed`;
  const themeEditorUrl = `https://${cleanDomain}/admin/themes/current/editor?context=apps`;

  // Transactional Subject for high Primary Inbox delivery
  const subject = `AI Instafeed setup instructions for ${displayName}`;

  // Plain-text version for maximum Primary inbox deliverability
  const textContent = `
Hello,

AI Instafeed is now successfully connected to your Shopify store: ${displayName} (${cleanDomain}).

Here is your direct access link to open the app dashboard:
${dashboardUrl}

3 Quick Steps to get your Instagram feed live:

1. Connect Your Instagram Account
Open your dashboard and enter your Instagram username to automatically sync your posts, reels, and stories.
Dashboard: ${dashboardUrl}

2. Tag Products (Shoppable Feed)
Interlink your store products with Instagram posts so customers can discover and buy directly from your feed.

3. Enable the Widget in Theme Editor
Activate the "Instafeed" app embed in your Shopify Theme Editor to render your feed on your storefront:
${themeEditorUrl}

Need assistance? Reply directly to this email or contact support at ${supportEmail}.

Best regards,
The AI Instafeed Team
`.trim();

  // Premium, Responsive HTML Template
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);">

    <!-- Top Gradient Brand Bar -->
    <tr>
      <td style="background: linear-gradient(135deg, #e1306c 0%, #fd1d1d 50%, #f77737 100%); padding: 32px 36px; text-align: left;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="background: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">SHOPIFY APP ACTIVATION</span>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Welcome to AI Instafeed</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Setup guide for <strong>${displayName}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content Body -->
    <tr>
      <td style="padding: 36px 36px 28px 36px;">

        <!-- Intro -->
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #334155;">
          Hello,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 1.65;">
          <strong>AI Instafeed</strong> has been successfully installed on your store. You can now showcase your Instagram posts, reels, and stories with clickable product tags on your Shopify storefront.
        </p>

        <!-- Store Info Pill -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 4px 0; width: 110px;">Connected Store:</td>
                  <td style="color: #0f172a; font-weight: 700; padding: 4px 0;">${displayName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Store Domain:</td>
                  <td style="color: #0f172a; padding: 4px 0; font-family: monospace; font-size: 12px;">${cleanDomain}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Status:</td>
                  <td style="padding: 4px 0;">
                    <span style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;">Ready to configure</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Primary Action Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" target="_blank" style="background: linear-gradient(135deg, #e1306c 0%, #c13584 100%); color: #ffffff; text-decoration: none; padding: 15px 36px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(225, 48, 108, 0.35); letter-spacing: 0.01em;">
            Open App Dashboard &rarr;
          </a>
          <div style="margin-top: 10px; font-size: 12px; color: #94a3b8;">
            Direct link: <a href="${dashboardUrl}" style="color: #e1306c; text-decoration: underline;">${dashboardUrl}</a>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <!-- 3 Setup Steps -->
        <h3 style="margin: 0 0 18px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
          3 Simple Steps to Get Your Feed Live:
        </h3>

        <!-- Step 1 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td valign="top" style="width: 32px; padding-top: 2px;">
              <div style="width: 24px; height: 24px; background: #e1306c; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">1</div>
            </td>
            <td valign="top" style="padding-left: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Connect Your Instagram Handle</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 3px;">
                Enter your Instagram profile username in the dashboard to automatically sync and display your latest posts, reels, and stories.
              </div>
            </td>
          </tr>
        </table>

        <!-- Step 2 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td valign="top" style="width: 32px; padding-top: 2px;">
              <div style="width: 24px; height: 24px; background: #e1306c; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">2</div>
            </td>
            <td valign="top" style="padding-left: 12px;">
              <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Tag Store Products on Posts</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 3px;">
                Use the Product Tagging page to link catalog products to your feed items, allowing shoppers to view and purchase directly.
              </div>
            </td>
          </tr>
        </table>

        <!-- Step 3 -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td valign="top" style="width: 32px; padding-top: 2px;">
              <div style="width: 24px; height: 24px; background: #e1306c; color: #ffffff; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">3</div>
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

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">
          Need assistance or custom design help?
        </p>
        <p style="margin: 0; font-size: 13px; color: #0f172a;">
          Reply directly to this email or write to <a href="mailto:${supportEmail}" style="color: #e1306c; font-weight: 600; text-decoration: none;">${supportEmail}</a>
        </p>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8;">
          Sent automatically by AI Instafeed for ${cleanDomain}
        </p>
      </td>
    </tr>

  </table>

</body>
</html>
  `.trim();

  const mailOptions = {
    from: `"AI Instafeed" <${process.env.SMTP_USER}>`,
    to: to,
    replyTo: supportEmail,
    subject: subject,
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
