// ── Contact & Support URLs ──────────────────────────────────────────────────
export const CALENDAR_URL = "https://calendar.app.google/gwUVdD1FrqMc5R5KA";
export const WHATSAPP_URL = "https://wa.me/+917000587074";
export const SUPPORT_EMAIL = "contact@booststar.in";

// ── 100% Authentic Instagram Color Palette & Gradients ─────────────────────
export const IG_GRADIENT_MAIN = "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";
export const IG_GRADIENT_BAR = "linear-gradient(90deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";
export const IG_GRADIENT_BTN = "linear-gradient(135deg, #e1306c 0%, #c13584 50%, #833ab4 100%)";

export function renderContactBlock(calUrl = CALENDAR_URL, waUrl = WHATSAPP_URL) {
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

export function renderReviewRewardBlock(cleanDomain, reviewUrl = "https://apps.shopify.com/ai-instafeed#modal-show=WriteReviewModal") {
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

export function renderFooter(cleanDomain) {
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
