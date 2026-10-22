import { env } from "@/lib/validation/env";

/**
 * Base email layout wrapper with RASA Sampoorna artisanal aesthetic:
 * Cream background (#f7f4ee), deep charcoal (#2c2621), terracotta accents (#802a2a),
 * elegant serif typography, clean borders (#e8dfd5), and zero clutter/emojis.
 */
function wrapInBaseLayout(options: {
  title: string;
  preheader?: string;
  contentHtml: string;
  isMarketing?: boolean;
  unsubscribeUrl?: string;
}): string {
  const appUrl = env.NEXT_PUBLIC_APP_URL || "https://rasasampoorna.com";
  const preferencesUrl = `${appUrl}/account`;
  const unsubscribeLink = options.unsubscribeUrl || `${appUrl}/api/v1/notifications/unsubscribe`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f7f4ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2c2621; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; }
    a { color: #8c7355; text-decoration: underline; text-underline-offset: 3px; }
    .btn-dark { display: inline-block; padding: 12px 28px; background-color: #2e3830; color: #f7f4ee !important; text-decoration: none !important; border-radius: 6px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; }
    .card { background-color: #ffffff; border: 1px solid #e8dfd5; border-radius: 12px; padding: 36px 32px; }
    .serif-title { font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.25; color: #2c2621; margin: 0 0 16px 0; font-weight: 600; }
    .item-row { border-bottom: 1px solid #f2ebe3; padding: 12px 0; }
    @media only screen and (max-width: 600px) {
      .card { padding: 24px 18px !important; }
      .serif-title { font-size: 22px !important; }
    }
  </style>
</head>
<body style="background-color: #f7f4ee; margin: 0; padding: 32px 12px;">
  ${options.preheader ? `<span style="display:none;font-size:1px;color:#f7f4ee;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${options.preheader}</span>` : ""}
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 600px;" cellpadding="0" cellspacing="0" border="0">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #8c7355; font-weight: 600; display: block; margin-bottom: 4px;">
                RASA Sampoorna (By Hrdyasara)
              </span>
              <a href="${appUrl}" style="text-decoration: none; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; color: #2c2621; letter-spacing: 0.08em; font-weight: 600;">
                RASA
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td class="card" style="background-color: #ffffff; border: 1px solid #e8dfd5; border-radius: 12px; padding: 36px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              ${options.contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 28px; text-align: center; font-size: 11px; color: #8c7d70; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                <strong>RASA Sampoorna Atelier</strong><br>
                Indiranagar 100ft Road, Bengaluru, Karnataka 560038, India
              </p>
              <p style="margin: 0 0 12px 0;">
                Assistance: <a href="mailto:orders@rasasampoorna.com" style="color: #8c7355;">orders@rasasampoorna.com</a> • Handcrafted with Social Purpose
              </p>
              ${
                options.isMarketing
                  ? `<p style="margin: 0; font-size: 11px; color: #a39587;">
                      You received this email because you opted into updates from RASA Sampoorna.<br>
                      <a href="${unsubscribeLink}" style="color: #8c7355; text-decoration: underline;">Unsubscribe from marketing emails</a> • <a href="${preferencesUrl}" style="color: #8c7355;">Manage Preferences</a>
                    </p>`
                  : `<p style="margin: 0; font-size: 11px; color: #a39587;">
                      This is an essential transactional notification concerning your account or order.<br>
                      <a href="${preferencesUrl}" style="color: #8c7355;">Notification Settings</a>
                    </p>`
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// -------------------------------------------------------------
// 1. ACCOUNT LIFECYCLE TEMPLATES
// -------------------------------------------------------------

export function renderVerifyEmailTemplate(data: {
  customerName: string;
  verifyUrl: string;
  expiryHours?: number;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const hours = data.expiryHours || 24;

  const contentHtml = `
    <h1 class="serif-title">Verify Your Email Address</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 24px 0;">
      Thank you for registering with RASA Sampoorna. Please confirm your email address to activate your patron profile and access your orders.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${data.verifyUrl}" class="btn-dark" style="color: #f7f4ee;">
        Confirm Email Address
      </a>
    </div>
    <p style="font-size: 12px; color: #8c7d70; line-height: 1.5; margin: 24px 0 0 0; border-top: 1px solid #f2ebe3; padding-top: 16px;">
      This verification link is valid for ${hours} hours. If you did not create an account with RASA Sampoorna, please disregard this message.
    </p>
  `;

  return {
    subject: "Verify your email address — RASA Sampoorna",
    html: wrapInBaseLayout({
      title: "Verify your email address",
      preheader: "Confirm your email to complete your RASA Sampoorna patron registration",
      contentHtml,
    }),
    text: `Dear ${name},\n\nPlease confirm your email address with RASA Sampoorna by clicking this link:\n${data.verifyUrl}\n\nThis link is valid for ${hours} hours.\n\nRASA Sampoorna Atelier`,
  };
}

export function renderPasswordResetTemplate(data: {
  customerName: string;
  resetUrl: string;
  expiryHours?: number;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const hours = data.expiryHours || 1;

  const contentHtml = `
    <h1 class="serif-title">Password Reset Request</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 24px 0;">
      We received a request to reset the password for your RASA Sampoorna account. Click below to establish a new password:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${data.resetUrl}" class="btn-dark" style="color: #f7f4ee;">
        Reset Account Password
      </a>
    </div>
    <p style="font-size: 12px; color: #8c7d70; line-height: 1.5; margin: 24px 0 0 0; border-top: 1px solid #f2ebe3; padding-top: 16px;">
      For your security, this single-use link expires in ${hours} hour. If you did not request a password reset, no action is required; your account credentials remain secure.
    </p>
  `;

  return {
    subject: "Reset your password — RASA Sampoorna",
    html: wrapInBaseLayout({
      title: "Reset your password",
      preheader: "Secure link to reset your RASA Sampoorna account password",
      contentHtml,
    }),
    text: `Dear ${name},\n\nWe received a request to reset your password. Use the secure link below to update your password:\n${data.resetUrl}\n\nThis link expires in ${hours} hour.\n\nRASA Sampoorna`,
  };
}

export function renderWelcomeTemplate(data: {
  customerName: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const appUrl = env.NEXT_PUBLIC_APP_URL || "https://rasasampoorna.com";

  const contentHtml = `
    <h1 class="serif-title">Welcome to RASA Sampoorna</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      We are delighted to welcome you to our community. At RASA Sampoorna (By Hrdyasara), each saree, canvas painting, and botanical hamper is crafted by master artisans and neurodiverse creators across India.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 24px 0;">
      Your patron account enables streamlined checkout, real-time consignment tracking, and access to curated seasonal releases.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${appUrl}/shop" class="btn-dark" style="color: #f7f4ee;">
        Explore Handcrafted Collection
      </a>
    </div>
  `;

  return {
    subject: "Welcome to RASA Sampoorna",
    html: wrapInBaseLayout({
      title: "Welcome to RASA Sampoorna",
      preheader: "Handcrafted heritage sarees and purposeful artisanal creations",
      contentHtml,
    }),
    text: `Dear ${name},\n\nWelcome to RASA Sampoorna. Each creation is handcrafted by our artisan collective.\n\nExplore our collection at: ${appUrl}/shop`,
  };
}

export function renderSecurityAlertTemplate(data: {
  customerName: string;
  eventDescription: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const appUrl = env.NEXT_PUBLIC_APP_URL || "https://rasasampoorna.com";

  const contentHtml = `
    <h1 class="serif-title" style="color: #802a2a;">Account Security Notice</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      This security alert confirms that the following change was made to your RASA Sampoorna account:
    </p>
    <div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #2c2621; line-height: 1.6;">
      <strong>Event:</strong> ${data.eventDescription}<br>
      <strong>Time:</strong> ${data.timestamp}<br>
      ${data.ipAddress ? `<strong>Approximate IP:</strong> ${data.ipAddress}<br>` : ""}
      ${data.userAgent ? `<strong>Device/Browser:</strong> ${data.userAgent}` : ""}
    </div>
    <p style="font-size: 13px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      If you performed this action, no further steps are needed. If you did not make this change, please reset your password immediately and contact our care team.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${appUrl}/forgot-password" class="btn-dark" style="color: #f7f4ee;">
        Secure My Account
      </a>
    </div>
  `;

  return {
    subject: "Security Alert: Account Activity — RASA Sampoorna",
    html: wrapInBaseLayout({
      title: "Security Alert",
      preheader: `Security alert regarding your account: ${data.eventDescription}`,
      contentHtml,
    }),
    text: `Security Alert: ${data.eventDescription} occurred on your RASA Sampoorna account at ${data.timestamp}. If unrecognized, please reset your password immediately at ${appUrl}/forgot-password.`,
  };
}

// -------------------------------------------------------------
// 2. ORDER & FULFILLMENT LIFECYCLE TEMPLATES
// -------------------------------------------------------------

export function renderOrderConfirmationTemplate(data: {
  orderNumber: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalRupees: number;
  shippingAddressText?: string;
  trackingUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr class="item-row">
        <td style="padding: 10px 0; font-size: 13px; color: #2c2621;">
          <strong>${item.name}</strong> × ${item.quantity}
        </td>
        <td align="right" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #2c2621;">
          ₹${(item.price * item.quantity).toLocaleString("en-IN")}
        </td>
      </tr>
    `
    )
    .join("");

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7355; font-weight: 600;">Order Placed</span>
    <h1 class="serif-title" style="margin-top: 4px;">Thank you for your order</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      We have received your order <strong>#${data.orderNumber}</strong>. Our artisans will carefully hand-inspect, gift-box, and prepare your pieces for transit.
    </p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; border-top: 1px solid #e8dfd5; border-bottom: 1px solid #e8dfd5;">
      ${itemsHtml}
      <tr>
        <td style="padding: 14px 0; font-size: 14px; font-weight: 600; color: #2c2621;">Total (incl. GST)</td>
        <td align="right" style="padding: 14px 0; font-size: 16px; font-weight: 700; color: #802a2a;">₹${data.totalRupees.toLocaleString("en-IN")}</td>
      </tr>
    </table>

    ${
      data.shippingAddressText
        ? `<div style="font-size: 12px; color: #5a4e42; line-height: 1.6; margin-bottom: 24px; background: #faf8f5; padding: 14px; border-radius: 6px; border: 1px solid #f0e8de;">
            <strong>Delivery Destination:</strong><br>${data.shippingAddressText}
           </div>`
        : ""
    }

    ${
      data.trackingUrl
        ? `<div style="text-align: center; margin: 24px 0;">
            <a href="${data.trackingUrl}" class="btn-dark" style="color: #f7f4ee;">
              Track Order Status
            </a>
          </div>`
        : ""
    }
  `;

  return {
    subject: `Order Confirmed: #${data.orderNumber} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: `Order Confirmation #${data.orderNumber}`,
      preheader: `Thank you for your order #${data.orderNumber} of ₹${data.totalRupees.toLocaleString("en-IN")}`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nThank you for your order #${data.orderNumber} totaling ₹${data.totalRupees.toLocaleString("en-IN")}.\n\nItems:\n${data.items.map((i) => `- ${i.name} × ${i.quantity}: ₹${(i.price * i.quantity).toLocaleString("en-IN")}`).join("\n")}\n\nRASA Sampoorna`,
  };
}

export function renderPaymentConfirmedTemplate(data: {
  orderNumber: string;
  customerName: string;
  paymentId: string;
  amountRupees: number;
  date?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #15803d; font-weight: 600;">Payment Verified</span>
    <h1 class="serif-title" style="margin-top: 4px;">Payment Received Successfully</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      Your payment for order <strong>#${data.orderNumber}</strong> has been successfully authorized and captured.
    </p>
    <div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #2c2621; line-height: 1.6;">
      <strong>Payment Gateway Reference:</strong> <code style="background:#eee;padding:1px 4px;">${data.paymentId}</code><br>
      <strong>Amount Credited:</strong> ₹${data.amountRupees.toLocaleString("en-IN")}<br>
      <strong>Date & Time:</strong> ${data.date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
    </div>
    <p style="font-size: 13px; color: #5a4e42; line-height: 1.5; margin: 0;">
      Your consignment has moved to our packaging atelier. We will notify you once courier dispatch takes place.
    </p>
  `;

  return {
    subject: `Payment Verified: #${data.orderNumber} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Payment Verified",
      preheader: `Payment of ₹${data.amountRupees.toLocaleString("en-IN")} received for order #${data.orderNumber}`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nPayment of ₹${data.amountRupees.toLocaleString("en-IN")} received for order #${data.orderNumber}. Ref: ${data.paymentId}.\n\nRASA Sampoorna`,
  };
}

export function renderPaymentFailedTemplate(data: {
  orderNumber: string;
  customerName: string;
  retryPaymentUrl: string;
  failureReason?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #b91c1c; font-weight: 600;">Payment Incomplete</span>
    <h1 class="serif-title" style="margin-top: 4px;">Action Required on Your Order</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      The payment attempt for order <strong>#${data.orderNumber}</strong> was not completed by the issuing bank${data.failureReason ? ` (${data.failureReason})` : ""}.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 24px 0;">
      No funds were charged. Your artisanal selections remain temporarily reserved. You can retry payment seamlessly using UPI, Netbanking, or another card:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${data.retryPaymentUrl}" class="btn-dark" style="color: #f7f4ee;">
        Complete Order Payment
      </a>
    </div>
  `;

  return {
    subject: `Payment Incomplete for Order #${data.orderNumber} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Payment Incomplete",
      preheader: `Payment could not be completed for order #${data.orderNumber}. Retry your transaction.`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nPayment could not be completed for order #${data.orderNumber}. Please retry payment at:\n${data.retryPaymentUrl}\n\nRASA Sampoorna`,
  };
}

export function renderShipmentDispatchedTemplate(data: {
  orderNumber: string;
  customerName: string;
  courier: string;
  trackingNumber: string;
  trackingUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7355; font-weight: 600;">Consignment Dispatched</span>
    <h1 class="serif-title" style="margin-top: 4px;">Your saree creation is on its way</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      Your order <strong>#${data.orderNumber}</strong> has completed artisanal quality inspection, sealed in archival packaging, and handed over to our courier partner.
    </p>
    <div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #2c2621; line-height: 1.6;">
      <strong>Courier Partner:</strong> ${data.courier}<br>
      <strong>Waybill / Tracking No (AWB):</strong> <code style="background:#eee;padding:1px 4px;">${data.trackingNumber}</code>
    </div>
    ${
      data.trackingUrl
        ? `<div style="text-align: center; margin: 24px 0;">
            <a href="${data.trackingUrl}" class="btn-dark" style="color: #f7f4ee;">
              Live Courier Tracking
            </a>
          </div>`
        : ""
    }
    <p style="font-size: 12px; color: #8c7d70; margin-top: 20px; line-height: 1.5;">
      Standard domestic transit takes 2–4 business days for metro locations. An OTP or physical signature may be required upon doorstep delivery.
    </p>
  `;

  return {
    subject: `Dispatched: Order #${data.orderNumber} is on its way — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Consignment Dispatched",
      preheader: `Your order #${data.orderNumber} has been dispatched via ${data.courier}. AWB: ${data.trackingNumber}`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nYour order #${data.orderNumber} is dispatched via ${data.courier}. AWB: ${data.trackingNumber}.\n${data.trackingUrl ? `Track: ${data.trackingUrl}\n` : ""}RASA Sampoorna`,
  };
}

export function renderDeliveryConfirmedTemplate(data: {
  orderNumber: string;
  customerName: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const appUrl = env.NEXT_PUBLIC_APP_URL || "https://rasasampoorna.com";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #15803d; font-weight: 600;">Delivered</span>
    <h1 class="serif-title" style="margin-top: 4px;">Parcel Delivered Successfully</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      Our delivery partner confirms that order <strong>#${data.orderNumber}</strong> has been delivered to your doorstep. We hope this piece brings grace and joy to your wardrobe.
    </p>
    <div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 12px; color: #5a4e42; line-height: 1.6;">
      <strong>Artisanal Saree Care Reminder:</strong><br>
      Pure handloom silks with authentic zari should be dry cleaned only and stored in breathable cotton muslin bags away from direct sunlight.
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${appUrl}/orders/${data.orderNumber}" class="btn-dark" style="color: #f7f4ee;">
        View Order & Invoice
      </a>
    </div>
  `;

  return {
    subject: `Delivered: Order #${data.orderNumber} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Parcel Delivered",
      preheader: `Your order #${data.orderNumber} has been delivered. Thank you for supporting our artisan community.`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nOrder #${data.orderNumber} has been delivered. Thank you for your patronage.\n\nRASA Sampoorna`,
  };
}

export function renderOrderCancelledTemplate(data: {
  orderNumber: string;
  customerName: string;
  reason?: string;
  refundNote?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7355; font-weight: 600;">Order Update</span>
    <h1 class="serif-title" style="margin-top: 4px;">Order Cancellation Confirmation</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      This email confirms that order <strong>#${data.orderNumber}</strong> has been cancelled${data.reason ? ` (${data.reason})` : ""}.
    </p>
    ${
      data.refundNote
        ? `<div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #2c2621; line-height: 1.6;">
            <strong>Refund Processing:</strong><br>${data.refundNote}
           </div>`
        : ""
    }
    <p style="font-size: 13px; color: #5a4e42; line-height: 1.5; margin: 0;">
      If you did not initiate or expect this cancellation, please contact our support team at <a href="mailto:orders@rasasampoorna.com" style="color: #8c7355;">orders@rasasampoorna.com</a>.
    </p>
  `;

  return {
    subject: `Order Cancelled: #${data.orderNumber} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Order Cancelled",
      preheader: `Confirmation of cancellation for order #${data.orderNumber}`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nOrder #${data.orderNumber} has been cancelled. ${data.refundNote || ""}\n\nRASA Sampoorna`,
  };
}

export function renderReturnStatusTemplate(data: {
  orderNumber: string;
  customerName: string;
  returnStatus: string;
  reverseAwb?: string;
  instructions?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7355; font-weight: 600;">Return Request</span>
    <h1 class="serif-title" style="margin-top: 4px;">Return Status: ${data.returnStatus}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      We have updated your return request for order <strong>#${data.orderNumber}</strong>.
    </p>
    ${
      data.reverseAwb
        ? `<div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #2c2621; line-height: 1.6;">
            <strong>Reverse Pickup AWB:</strong> <code style="background:#eee;padding:1px 4px;">${data.reverseAwb}</code><br>
            A courier agent will coordinate pickup from your delivery address within 24–48 business hours.
           </div>`
        : ""
    }
    <p style="font-size: 13px; color: #5a4e42; line-height: 1.5; margin: 0;">
      ${data.instructions || "Please pack the saree unworn with original tags and attached blouse piece intact to ensure smooth inspection."}
    </p>
  `;

  return {
    subject: `Return Update: Order #${data.orderNumber} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Return Status Update",
      preheader: `Return status update for order #${data.orderNumber}`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nYour return request for order #${data.orderNumber} is now: ${data.returnStatus}.\n${data.reverseAwb ? `Reverse AWB: ${data.reverseAwb}\n` : ""}RASA Sampoorna`,
  };
}

export function renderRefundStatusTemplate(data: {
  orderNumber: string;
  customerName: string;
  refundId: string;
  amountRupees: number;
  timelineDays?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const timeline = data.timelineDays || "5 to 7 business days";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #15803d; font-weight: 600;">Refund Credited</span>
    <h1 class="serif-title" style="margin-top: 4px;">Refund Processed Successfully</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      We have processed a refund of <strong>₹${data.amountRupees.toLocaleString("en-IN")}</strong> for order <strong>#${data.orderNumber}</strong>.
    </p>
    <div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #2c2621; line-height: 1.6;">
      <strong>Razorpay Refund Reference:</strong> <code style="background:#eee;padding:1px 4px;">${data.refundId}</code><br>
      <strong>Refund Amount:</strong> ₹${data.amountRupees.toLocaleString("en-IN")}<br>
      <strong>Reflection Window:</strong> Funds typically credit to your original payment instrument within ${timeline}.
    </div>
  `;

  return {
    subject: `Refund Credited: #${data.orderNumber} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Refund Processed",
      preheader: `Refund of ₹${data.amountRupees.toLocaleString("en-IN")} initiated for order #${data.orderNumber}`,
      contentHtml,
    }),
    text: `Dear ${name},\n\nRefund of ₹${data.amountRupees.toLocaleString("en-IN")} processed for order #${data.orderNumber}. Ref: ${data.refundId}.\n\nRASA Sampoorna`,
  };
}

// -------------------------------------------------------------
// 3. PRODUCT & RETENTION NOTIFICATIONS (OPT-IN MARKETING)
// -------------------------------------------------------------

export function renderBackInStockTemplate(data: {
  customerName: string;
  productName: string;
  productUrl: string;
  priceRupees: number;
  unsubscribeUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7355; font-weight: 600;">Artisan Restock</span>
    <h1 class="serif-title" style="margin-top: 4px;">Back in Stock: ${data.productName}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      Good news: our weaving atelier has completed fresh yardage of <strong>${data.productName}</strong> (₹${data.priceRupees.toLocaleString("en-IN")}). Because each piece is woven in limited artisanal batches, availability is limited.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${data.productUrl}" class="btn-dark" style="color: #f7f4ee;">
        View Creation
      </a>
    </div>
  `;

  return {
    subject: `Back in Stock: ${data.productName} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Back in Stock",
      preheader: `${data.productName} is back in stock in limited artisanal quantities`,
      contentHtml,
      isMarketing: true,
      unsubscribeUrl: data.unsubscribeUrl,
    }),
    text: `Dear ${name},\n\n${data.productName} is back in stock (₹${data.priceRupees.toLocaleString("en-IN")}).\n\nView piece: ${data.productUrl}\n\nRASA Sampoorna`,
  };
}

export function renderAbandonedCartTemplate(data: {
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  checkoutUrl: string;
  unsubscribeUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr class="item-row">
        <td style="padding: 8px 0; font-size: 13px; color: #2c2621;">
          <strong>${item.name}</strong> × ${item.quantity}
        </td>
        <td align="right" style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #2c2621;">
          ₹${(item.price * item.quantity).toLocaleString("en-IN")}
        </td>
      </tr>
    `
    )
    .join("");

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7355; font-weight: 600;">Saved Bag</span>
    <h1 class="serif-title" style="margin-top: 4px;">Complete Your Handcrafted Selection</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      You left handcrafted artisan pieces waiting in your bag:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border-top: 1px solid #e8dfd5; border-bottom: 1px solid #e8dfd5;">
      ${itemsHtml}
    </table>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${data.checkoutUrl}" class="btn-dark" style="color: #f7f4ee;">
        Return to Checkout
      </a>
    </div>
  `;

  return {
    subject: "Your handcrafted selection is waiting — RASA Sampoorna",
    html: wrapInBaseLayout({
      title: "Your Bag is Waiting",
      preheader: "Complete your checkout for your reserved artisan pieces",
      contentHtml,
      isMarketing: true,
      unsubscribeUrl: data.unsubscribeUrl,
    }),
    text: `Dear ${name},\n\nYou left pieces in your cart:\n${data.items.map((i) => `- ${i.name} × ${i.quantity}`).join("\n")}\n\nReturn to checkout: ${data.checkoutUrl}\n\nRASA Sampoorna`,
  };
}

export function renderPriceDropTemplate(data: {
  customerName: string;
  productName: string;
  productUrl: string;
  originalPriceRupees: number;
  salePriceRupees: number;
  unsubscribeUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #802a2a; font-weight: 600;">Price Update</span>
    <h1 class="serif-title" style="margin-top: 4px;">Price Revised: ${data.productName}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      An artisanal piece from your favorites list has an adjusted celebration price:
    </p>
    <div style="background-color: #faf8f5; border: 1px solid #e8dfd5; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 14px; color: #2c2621; line-height: 1.6;">
      <strong>${data.productName}</strong><br>
      <span style="text-decoration: line-through; color: #8c7d70; font-size: 13px;">₹${data.originalPriceRupees.toLocaleString("en-IN")}</span>
      <span style="font-weight: 700; color: #802a2a; margin-left: 8px; font-size: 16px;">₹${data.salePriceRupees.toLocaleString("en-IN")}</span>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.productUrl}" class="btn-dark" style="color: #f7f4ee;">
        Explore Creation
      </a>
    </div>
  `;

  return {
    subject: `Price Revised: ${data.productName} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Price Revision",
      preheader: `Price update for ${data.productName}: now ₹${data.salePriceRupees.toLocaleString("en-IN")}`,
      contentHtml,
      isMarketing: true,
      unsubscribeUrl: data.unsubscribeUrl,
    }),
    text: `Dear ${name},\n\nPrice update for ${data.productName}: now ₹${data.salePriceRupees.toLocaleString("en-IN")} (was ₹${data.originalPriceRupees.toLocaleString("en-IN")}).\n\nView at: ${data.productUrl}\n\nRASA Sampoorna`,
  };
}

export function renderWishlistAlertTemplate(data: {
  customerName: string;
  productName: string;
  productUrl: string;
  alertReason: string;
  unsubscribeUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = data.customerName || "Patron";

  const contentHtml = `
    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7355; font-weight: 600;">Wishlist Notice</span>
    <h1 class="serif-title" style="margin-top: 4px;">Update on Your Saved Saree</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 16px 0;">
      Dear ${name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4a4036; margin: 0 0 20px 0;">
      ${data.alertReason}
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.productUrl}" class="btn-dark" style="color: #f7f4ee;">
        View Saved Piece
      </a>
    </div>
  `;

  return {
    subject: `Wishlist Update: ${data.productName} — RASA Sampoorna`,
    html: wrapInBaseLayout({
      title: "Wishlist Update",
      preheader: data.alertReason,
      contentHtml,
      isMarketing: true,
      unsubscribeUrl: data.unsubscribeUrl,
    }),
    text: `Dear ${name},\n\n${data.alertReason}\n\nView piece: ${data.productUrl}\n\nRASA Sampoorna`,
  };
}
