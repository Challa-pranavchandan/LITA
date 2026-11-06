import {
  renderEditorialEmail,
  escapeHtml,
  formatCurrency,
} from "./editorial-layout"

/* ==========================================================================
   1. Order Placed (Order Confirmation)
   ========================================================================== */
export interface OrderPlacedTemplateData {
  orderId: string
  displayId?: string | number
  customerName?: string
  customerEmail: string
  items: Array<{
    title: string
    quantity: number
    unitPrice: number
    thumbnail?: string
  }>
  subtotal: number
  shippingTotal?: number
  taxTotal?: number
  discountTotal?: number
  total: number
  currencyCode: string
  shippingAddress?: {
    firstName?: string
    lastName?: string
    address1?: string
    address2?: string
    city?: string
    province?: string
    postalCode?: string
    countryCode?: string
  }
  storefrontUrl: string
}

export function orderPlacedTemplate(data: OrderPlacedTemplateData): {
  subject: string
  html: string
} {
  const displayNum = data.displayId ? `#${data.displayId}` : `#${data.orderId.slice(-6).toUpperCase()}`
  const subject = `Order Confirmed: ${displayNum} — Livin In The Art`
  const orderUrl = `${data.storefrontUrl}/account/orders`

  const itemsRows = data.items
    .map((item) => {
      const lineTotal = item.unitPrice * item.quantity
      return `
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #f2ede8; vertical-align: top;">
          <div style="font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px;">
            ${escapeHtml(item.title)}
          </div>
          <div style="font-size: 12px; color: #777777;">
            Qty: ${item.quantity} &times; ${formatCurrency(item.unitPrice, data.currencyCode)}
          </div>
        </td>
        <td style="padding: 14px 0; border-bottom: 1px solid #f2ede8; vertical-align: top; text-align: right; font-size: 14px; font-weight: 500; color: #1a1a1a;">
          ${formatCurrency(lineTotal, data.currencyCode)}
        </td>
      </tr>`
    })
    .join("")

  const address = data.shippingAddress
  const addressHtml = address
    ? `
    <div style="margin: 24px 0; padding: 18px 20px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px;">
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; margin-bottom: 8px;">
        Delivery Destination
      </div>
      <div style="font-size: 13px; line-height: 1.5; color: #444444;">
        ${escapeHtml([address.firstName, address.lastName].filter(Boolean).join(" "))}<br />
        ${escapeHtml(address.address1 || "")}${address.address2 ? `<br />${escapeHtml(address.address2)}` : ""}<br />
        ${escapeHtml([address.city, address.province, address.postalCode].filter(Boolean).join(", "))}<br />
        ${escapeHtml(address.countryCode?.toUpperCase() || "")}
      </div>
    </div>`
    : ""

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 500; color: #1a1a1a; letter-spacing: -0.01em;">
      Thank you for your order
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}We have received your order <strong>${displayNum}</strong> and our atelier is preparing your artwork for dispatch.
    </p>

    <div style="margin: 24px 0 12px 0; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; border-bottom: 1px solid #eee7de; padding-bottom: 8px;">
      Order Summary
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
      ${itemsRows}
      ${
        data.shippingTotal !== undefined
          ? `
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #777777;">Shipping</td>
        <td style="padding: 8px 0; font-size: 13px; color: #1a1a1a; text-align: right;">
          ${data.shippingTotal === 0 ? "Complimentary" : formatCurrency(data.shippingTotal, data.currencyCode)}
        </td>
      </tr>`
          : ""
      }
      ${
        data.taxTotal
          ? `
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #777777;">Taxes</td>
        <td style="padding: 8px 0; font-size: 13px; color: #1a1a1a; text-align: right;">
          ${formatCurrency(data.taxTotal, data.currencyCode)}
        </td>
      </tr>`
          : ""
      }
      ${
        data.discountTotal
          ? `
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #5f2f3c;">Savings applied</td>
        <td style="padding: 8px 0; font-size: 13px; color: #5f2f3c; text-align: right;">
          -${formatCurrency(data.discountTotal, data.currencyCode)}
        </td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 16px 0 0 0; border-top: 1px solid #1a1a1a; font-size: 15px; font-weight: 600; color: #1a1a1a;">
          Total
        </td>
        <td style="padding: 16px 0 0 0; border-top: 1px solid #1a1a1a; font-size: 16px; font-weight: 600; color: #5f2f3c; text-align: right;">
          ${formatCurrency(data.total, data.currencyCode)}
        </td>
      </tr>
    </table>

    ${addressHtml}

    <div style="margin: 32px 0 16px 0; text-align: left;">
      <a href="${orderUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
        View Your Order
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
      Each artwork is accompanied by a Certificate of Authenticity signed by the artist. We will notify you once tracking information is available.
    </p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `Thank you for your order ${displayNum}. We are preparing your artwork.`,
      contentHtml,
    }),
  }
}

/* ==========================================================================
   2. Order Fulfillment Created (Shipment Notification)
   ========================================================================== */
export interface OrderFulfillmentTemplateData {
  orderId: string
  displayId?: string | number
  customerName?: string
  fulfillmentId: string
  trackingNumbers?: string[]
  trackingUrls?: string[]
  carrier?: string
  items?: Array<{
    title: string
    quantity: number
  }>
  storefrontUrl: string
}

export function orderFulfillmentTemplate(data: OrderFulfillmentTemplateData): {
  subject: string
  html: string
} {
  const displayNum = data.displayId ? `#${data.displayId}` : `#${data.orderId.slice(-6).toUpperCase()}`
  const subject = `Your Artwork has Shipped (${displayNum}) — Livin In The Art`
  const orderUrl = `${data.storefrontUrl}/account/orders`

  const trackingNumber = data.trackingNumbers?.[0]
  const trackingUrl = data.trackingUrls?.[0] || orderUrl

  const itemsHtml = data.items?.length
    ? `
    <div style="margin: 20px 0; padding: 16px 18px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px;">
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; margin-bottom: 8px;">
        Items in This Package
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #444444; line-height: 1.6;">
        ${data.items.map((i) => `<li>${escapeHtml(i.title)} &times; ${i.quantity}</li>`).join("")}
      </ul>
    </div>`
    : ""

  const trackingBoxHtml = trackingNumber
    ? `
    <div style="margin: 24px 0; padding: 20px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px;">
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; margin-bottom: 6px;">
        Tracking Information
      </div>
      <div style="font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px;">
        ${data.carrier ? `${escapeHtml(data.carrier)}: ` : ""}<strong>${escapeHtml(trackingNumber)}</strong>
      </div>
      <div style="font-size: 12px; color: #777777;">
        Carrier updates may take a few hours to reflect in live tracking.
      </div>
    </div>`
    : ""

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 500; color: #1a1a1a;">
      Your artwork is on its way
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}Great news! Your order <strong>${displayNum}</strong> has been carefully inspected, packaged in museum-grade archival protection, and dispatched.
    </p>

    ${trackingBoxHtml}
    ${itemsHtml}

    <div style="margin: 32px 0 16px 0; text-align: left;">
      <a href="${trackingUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
        ${trackingNumber ? "Track Shipment" : "View Order Status"}
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
      Upon delivery, please inspect the external packaging before signing. If you have any inquiries regarding delivery, our team is at your service.
    </p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `Your order ${displayNum} has been shipped with museum-grade archival care.`,
      contentHtml,
    }),
  }
}

/* ==========================================================================
   3. Trade Application Status Changed
   ========================================================================== */
export interface TradeStatusTemplateData {
  name: string
  company?: string
  status: "approved" | "rejected" | string
  storefrontUrl: string
}

export function tradeApplicationStatusTemplate(data: TradeStatusTemplateData): {
  subject: string
  html: string
} {
  const isApproved = data.status === "approved"
  const subject = isApproved
    ? "Welcome to the LITA Trade Program — Application Approved"
    : "Update regarding your LITA Trade Application"
  const tradeUrl = `${data.storefrontUrl}/trade`

  const contentHtml = isApproved
    ? `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 500; color: #1a1a1a;">
      Welcome to the LITA Trade Program
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      Dear ${escapeHtml(data.name)}${data.company ? ` (${escapeHtml(data.company)})` : ""},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      We are delighted to approve your application to the <strong>Livin In The Art Trade &amp; Designer Program</strong>. Your studio now has direct access to our full trade ecosystem.
    </p>

    <div style="margin: 24px 0; padding: 22px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px;">
      <div style="font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; margin-bottom: 12px;">
        Your Trade Privileges
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #444444; line-height: 1.7;">
        <li>Exclusive designer &amp; architect trade tier pricing on all original works</li>
        <li>Priority reservations and 48-hour client holds on newly curated collections</li>
        <li>Dedicated bespoke art commissions with direct artist collaboration</li>
        <li>White-glove museum-grade crating, shipping, and installation coordination</li>
      </ul>
    </div>

    <div style="margin: 32px 0 16px 0; text-align: left;">
      <a href="${tradeUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
        Enter Trade Collection
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
      Should you have any upcoming interior or hospitality projects requiring customized curation, simply reply directly to this email.
    </p>`
    : `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 500; color: #1a1a1a;">
      Trade Program Application Update
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      Dear ${escapeHtml(data.name)}${data.company ? ` (${escapeHtml(data.company)})` : ""},
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      Thank you for taking the time to apply to the Livin In The Art Trade Program. After careful review of your application, we are unable to approve trade privileges at this time.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      You remain warmly invited to explore our public gallery and collection releases. If you believe this decision was made in error or if your credentials change, you are welcome to re-apply in the future.
    </p>
    <div style="margin: 28px 0 16px 0; text-align: left;">
      <a href="${data.storefrontUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
        Browse Gallery
      </a>
    </div>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: isApproved
        ? "Your LITA Trade Program application has been approved."
        : "An update regarding your LITA Trade application.",
      contentHtml,
    }),
  }
}

/* ==========================================================================
   4. Commission Status Changed
   ========================================================================== */
export interface CommissionStatusTemplateData {
  commissionId?: string
  title: string
  customerName?: string
  status: string
  quotedPrice?: number
  currencyCode?: string
  adminNotes?: string
  orderId?: string
  storefrontUrl: string
}

export function commissionStatusTemplate(data: CommissionStatusTemplateData): {
  subject: string
  html: string
} {
  const commissionsUrl = data.commissionId
    ? `${data.storefrontUrl}/account/commissions/${encodeURIComponent(data.commissionId)}/pay`
    : `${data.storefrontUrl}/account`
  const currency = data.currencyCode || "inr"

  let subject = `Update on your Commission "${data.title}" — Livin In The Art`
  let headerText = `Commission Update: ${data.title}`
  let bodyContent = ""

  switch (data.status) {
    case "new":
    case "in_discussion": {
      subject = `Commission Request Received: "${data.title}" — Livin In The Art`
      headerText = data.status === "new" ? "Request Received" : "Studio Discussion Started"
      bodyContent = `
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}Your commission request <strong>"${escapeHtml(data.title)}"</strong> is ${data.status === "new" ? "in the studio's review queue" : "now in discussion with the studio"}.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            View Commission Details
          </a>
        </div>`
      break
    }
    case "quoted": {
      subject = `Quote Ready: "${data.title}" — Livin In The Art`
      headerText = "Commission Quote Received"
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}The artist has reviewed your bespoke commission request for <strong>"${escapeHtml(data.title)}"</strong> and submitted a formal quote.
        </p>
        <div style="margin: 24px 0; padding: 20px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px;">
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; margin-bottom: 6px;">
            Quoted Price
          </div>
          <div style="font-size: 20px; font-weight: 600; color: #1a1a1a;">
            ${data.quotedPrice ? formatCurrency(data.quotedPrice, currency) : "Price on consultation"}
          </div>
          ${
            data.adminNotes
              ? `<div style="margin-top: 12px; font-size: 13px; line-height: 1.5; color: #555555; border-top: 1px solid #eee7de; padding-top: 10px;">
                  <em>Artist note:</em> ${escapeHtml(data.adminNotes)}
                </div>`
              : ""
          }
        </div>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          Please log into your account to review the quote terms and accept or message the artist with feedback.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            Review &amp; Accept Quote
          </a>
        </div>`
      break
    }
    case "accepted": {
      subject = `Commission Accepted: "${data.title}" — Livin In The Art`
      headerText = "Quote Accepted"
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}Thank you for accepting the quote for your commissioned artwork <strong>"${escapeHtml(data.title)}"</strong>.
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          Our atelier is now creating your private order reservation. You will receive a notification as soon as the order is ready for payment.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            View Commission Details
          </a>
        </div>`
      break
    }
    case "awaiting_payment":
    case "converted": {
      subject = `Order Ready for Payment: "${data.title}" — Livin In The Art`
      headerText = "Commission Order Created"
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}Your commissioned artwork <strong>"${escapeHtml(data.title)}"</strong> has been converted into an order ${data.orderId ? `(Order #${escapeHtml(data.orderId.slice(-6).toUpperCase())})` : ""}.
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          You can now review the details and complete checkout securely through your account dashboard.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            Complete Commission Payment
          </a>
        </div>`
      break
    }
    case "in_production": {
      subject = `Commission in Production: "${data.title}" — Livin In The Art`
      headerText = "Your Artwork Is in Production"
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}We have received the 50% upfront payment for <strong>"${escapeHtml(data.title)}"</strong> and work on your commissioned artwork is underway.
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          The remaining 50% will be due once the artwork is ready, before it is packed.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            View Commission Details
          </a>
        </div>`
      break
    }
    case "awaiting_final_payment": {
      subject = `Final Commission Payment Due: "${data.title}" — Livin In The Art`
      headerText = "Artwork Ready for Packing"
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}Your commissioned artwork <strong>"${escapeHtml(data.title)}"</strong> is ready for packing. The remaining 50% of the quoted price is now due.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            Pay Remaining Balance
          </a>
        </div>`
      break
    }
    case "paid": {
      subject = `Payment Confirmed: "${data.title}" — Livin In The Art`
      headerText = "Commission Payment Received"
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}We have received your payment of <strong>${data.quotedPrice ? formatCurrency(data.quotedPrice, currency) : ""}</strong> for your commissioned artwork <strong>"${escapeHtml(data.title)}"</strong>.
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          Your commission is fully paid and will proceed to packing. You can track updates and discussion anytime in your account.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            View Commission in Account
          </a>
        </div>`
      break
    }
    case "rejected":
    case "cancelled": {
      subject = `Commission Status: "${data.title}" — Livin In The Art`
      headerText = `Commission ${data.status === "rejected" ? "Declined" : "Cancelled"}`
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          ${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}Your commission request for <strong>"${escapeHtml(data.title)}"</strong> has been marked as ${escapeHtml(data.status)}.
        </p>
        ${
          data.adminNotes
            ? `<div style="margin: 20px 0; padding: 16px 18px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px; font-size: 13px; color: #555555;">
                ${escapeHtml(data.adminNotes)}
              </div>`
            : ""
        }
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            View Commission Portal
          </a>
        </div>`
      break
    }
    default: {
      bodyContent = `
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
          The status of your commission <strong>"${escapeHtml(data.title)}"</strong> has been updated to <strong>${escapeHtml(data.status)}</strong>.
        </p>
        <div style="margin: 28px 0; text-align: left;">
          <a href="${commissionsUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            View Details
          </a>
        </div>`
      break
    }
  }

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 500; color: #1a1a1a;">
      ${headerText}
    </h1>
    ${bodyContent}
    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
      Questions regarding your commission? Reply directly to this message or send a message in your customer portal.
    </p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `Update on your commission "${data.title}"`,
      contentHtml,
    }),
  }
}

/* ==========================================================================
   5. Password Reset Template
   ========================================================================== */
export interface PasswordResetTemplateData {
  email: string
  resetUrl: string
}

export function passwordResetTemplate(data: PasswordResetTemplateData): {
  subject: string
  html: string
} {
  const subject = "Reset your LITA password"
  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">
      Password Reset Request
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      We received a request to reset the password for your account associated with <strong>${escapeHtml(data.email)}</strong>.
    </p>
    <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      Click the button below to choose a new password. This link is valid for 15 minutes.
    </p>
    <div style="margin: 28px 0; text-align: left;">
      <a href="${data.resetUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
      If you did not request this change, you can safely ignore this email — your password will not be changed.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888; word-break: break-all;">
      If the button above does not work, copy and paste this link into your browser:<br />
      <a href="${data.resetUrl}" style="color: #5f2f3c; text-decoration: underline;">${escapeHtml(data.resetUrl)}</a>
    </p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: "Reset the password for your Livin In The Art account.",
      contentHtml,
    }),
  }
}

/* ==========================================================================
   6. Inquiry Notification to Studio Template
   ========================================================================== */
export interface InquiryStudioNotificationTemplateData {
  inquiryId: string
  kind: "contact" | "artwork" | "commission_general" | "trade_general"
  name: string
  email: string
  phone?: string | null
  artworkHandle?: string | null
  budget?: string | null
  message: string
  sourceUrl?: string | null
}

export function inquiryStudioNotificationTemplate(data: InquiryStudioNotificationTemplateData): {
  subject: string
  html: string
} {
  const kindLabels: Record<string, string> = {
    contact: "Contact Message",
    artwork: "Artwork Inquiry",
    commission_general: "Commission Inquiry",
    trade_general: "Trade Inquiry",
  }
  const kindLabel = kindLabels[data.kind] || "Inquiry"
  const subject = `New ${kindLabel} from ${data.name} — Livin In The Art`

  const detailsRows = [
    `<tr><td style="padding: 6px 0; font-size: 13px; color: #777777; width: 140px;">Name:</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a; font-weight: 500;">${escapeHtml(data.name)}</td></tr>`,
    `<tr><td style="padding: 6px 0; font-size: 13px; color: #777777;">Email:</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a;"><a href="mailto:${escapeHtml(data.email)}" style="color: #5f2f3c; text-decoration: underline;">${escapeHtml(data.email)}</a></td></tr>`,
    data.phone ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #777777;">Phone:</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a;">${escapeHtml(data.phone)}</td></tr>` : "",
    data.artworkHandle ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #777777;">Artwork Handle:</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a;">${escapeHtml(data.artworkHandle)}</td></tr>` : "",
    data.budget ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #777777;">Budget:</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a;">${escapeHtml(data.budget)}</td></tr>` : "",
    data.sourceUrl ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #777777;">Source Page:</td><td style="padding: 6px 0; font-size: 13px; color: #1a1a1a;"><a href="${escapeHtml(data.sourceUrl)}" style="color: #5f2f3c; text-decoration: underline;">${escapeHtml(data.sourceUrl)}</a></td></tr>` : "",
  ].filter(Boolean).join("")

  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">
      New ${escapeHtml(kindLabel)}
    </h1>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      ${detailsRows}
    </table>
    <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; margin-bottom: 8px;">
      Message
    </div>
    <div style="margin: 0 0 24px 0; padding: 16px 18px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px; font-size: 14px; line-height: 1.6; color: #333333; white-space: pre-wrap;">
      ${escapeHtml(data.message)}
    </div>
    <p style="margin: 16px 0 0 0; font-size: 12px; color: #888888;">
      Inquiry ID: ${escapeHtml(data.inquiryId)}
    </p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `New ${kindLabel} received from ${data.name}.`,
      contentHtml,
    }),
  }
}

/* ==========================================================================
   7. Inquiry Customer Acknowledgement Template
   ========================================================================== */
export interface InquiryCustomerAcknowledgementTemplateData {
  name: string
  email: string
  kind: "contact" | "artwork" | "commission_general" | "trade_general"
  artworkHandle?: string | null
  message: string
}

export function inquiryCustomerAcknowledgementTemplate(data: InquiryCustomerAcknowledgementTemplateData): {
  subject: string
  html: string
} {
  const subject = "Thank you for reaching out — Livin In The Art"

  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">
      Thank you for contacting Livin In The Art
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      Dear ${escapeHtml(data.name)},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      We have received your message. Our studio curators review every inquiry thoughtfully and will respond to your email within two working days.
    </p>
    ${data.artworkHandle ? `<p style="margin: 0 0 16px 0; font-size: 13px; color: #777777;">Artwork reference: <strong>${escapeHtml(data.artworkHandle)}</strong></p>` : ""}
    <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #5f2f3c; margin: 24px 0 8px 0;">
      A copy of your message:
    </div>
    <div style="padding: 16px 18px; background-color: #faf8f5; border: 1px solid #eee7de; border-radius: 3px; font-size: 13px; line-height: 1.6; color: #444444; white-space: pre-wrap;">
      ${escapeHtml(data.message)}
    </div>
    <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
      Warm regards,<br />
      The Studio Team &bull; Livin In The Art
    </p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: "We have received your message and will reply shortly.",
      contentHtml,
    }),
  }
}

/* ==========================================================================
   8. Newsletter Double Opt-In Confirmation Template
   ========================================================================== */
export interface NewsletterConfirmationTemplateData {
  email: string
  confirmUrl: string
}

export function newsletterConfirmationTemplate(data: NewsletterConfirmationTemplateData): {
  subject: string
  html: string
} {
  const subject = "Confirm your subscription — Livin In The Art"

  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">
      Confirm Your Subscription
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #555555;">
      Thank you for your interest in Livin In The Art. Please confirm your email address (<strong>${escapeHtml(data.email)}</strong>) to receive our monthly curations, studio journal releases, and exhibition invitations.
    </p>
    <div style="margin: 28px 0; text-align: left;">
      <a href="${data.confirmUrl}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
        Confirm Subscription
      </a>
    </div>
    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888;">
      If you did not request this newsletter subscription, you can safely ignore this email.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.5; color: #888888; word-break: break-all;">
      Or paste this URL into your browser:<br />
      <a href="${data.confirmUrl}" style="color: #5f2f3c; text-decoration: underline;">${escapeHtml(data.confirmUrl)}</a>
    </p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: "Please confirm your subscription to Livin In The Art releases.",
      contentHtml,
    }),
  }
}

export interface UpiPaymentEmailData {
  referenceCode: string
  amount: number
  currencyCode: string
  orderId: string
  orderNumber: string
  storefrontUrl: string
  customerName?: string
  vpa?: string
  payeeName?: string
  deadline?: string
  utrLast4?: string
  rejectReason?: string
  adminUrl?: string
}

function upiOrderUrl(data: UpiPaymentEmailData): string {
  return `${data.storefrontUrl.replace(/\/$/, "")}/order/${encodeURIComponent(data.orderId)}?pay=upi`
}

function upiEmailButton(url: string, label: string): string {
  return `<div style="margin: 28px 0; text-align: left;"><a href="${escapeHtml(url)}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">${escapeHtml(label)}</a></div>`
}

export function upiPaymentInstructionsTemplate(data: UpiPaymentEmailData): {
  subject: string
  html: string
} {
  const subject = `Complete your UPI payment — ${data.orderNumber}`
  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">Complete your UPI payment</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #555555;">${data.customerName ? `Dear ${escapeHtml(data.customerName)}, ` : ""}Your order ${escapeHtml(data.orderNumber)} is awaiting payment. We will confirm it after your UPI payment is verified.</p>
    <p style="font-size: 14px; line-height: 1.6; color: #555555;"><strong>Reference:</strong> ${escapeHtml(data.referenceCode)}<br /><strong>Exact amount:</strong> ${formatCurrency(data.amount, data.currencyCode)}<br /><strong>UPI ID:</strong> ${escapeHtml(data.vpa || "")}<br /><strong>Payee:</strong> ${escapeHtml(data.payeeName || "")}<br /><strong>Payment deadline:</strong> ${escapeHtml(data.deadline || "")}</p>
    ${upiEmailButton(upiOrderUrl(data), "Pay by UPI")}
    <p style="font-size: 12px; line-height: 1.5; color: #888888;">Include the reference code in your payment note so we can match your payment.</p>`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `Complete UPI payment for ${data.orderNumber}.`,
      contentHtml,
    }),
  }
}

export function upiProofReceivedStudioTemplate(data: UpiPaymentEmailData): {
  subject: string
  html: string
} {
  const subject = `UPI proof submitted — ${data.referenceCode}`
  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">UPI proof submitted</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #555555;"><strong>Reference:</strong> ${escapeHtml(data.referenceCode)}<br /><strong>Order:</strong> ${escapeHtml(data.orderNumber)}<br /><strong>Amount:</strong> ${formatCurrency(data.amount, data.currencyCode)}<br /><strong>UTR ending:</strong> ${escapeHtml(data.utrLast4 || "Not provided")}</p>
    ${upiEmailButton(data.adminUrl || "", "Review UPI Payments")}`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `New UPI proof for ${data.orderNumber}.`,
      contentHtml,
    }),
  }
}

export function upiPaymentVerifiedTemplate(data: UpiPaymentEmailData): {
  subject: string
  html: string
} {
  const subject = `UPI payment received — ${data.orderNumber}`
  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">Payment received</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #555555;">We have verified your UPI payment of ${formatCurrency(data.amount, data.currencyCode)} for order ${escapeHtml(data.orderNumber)} (reference ${escapeHtml(data.referenceCode)}). Thank you.</p>
    ${upiEmailButton(upiOrderUrl(data), "View Your Order")}`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `Your UPI payment for ${data.orderNumber} has been verified.`,
      contentHtml,
    }),
  }
}

export function upiPaymentRejectedTemplate(data: UpiPaymentEmailData): {
  subject: string
  html: string
} {
  const subject = `Action needed for your UPI payment — ${data.orderNumber}`
  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">Please resubmit your payment proof</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #555555;">We could not verify the proof for order ${escapeHtml(data.orderNumber)} (reference ${escapeHtml(data.referenceCode)}). Reason: <strong>${escapeHtml(data.rejectReason || "Please contact the studio.")}</strong></p>
    ${upiEmailButton(upiOrderUrl(data), "Resubmit Proof")}`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `Please review your UPI payment proof for ${data.orderNumber}.`,
      contentHtml,
    }),
  }
}

export function upiPaymentExpiredTemplate(data: UpiPaymentEmailData): {
  subject: string
  html: string
} {
  const subject = `UPI payment window expired — ${data.orderNumber}`
  const contentHtml = `
    <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500; color: #1a1a1a;">UPI payment window expired</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #555555;">The UPI payment window for order ${escapeHtml(data.orderNumber)} (reference ${escapeHtml(data.referenceCode)}) has expired. We can no longer accept payment through this order. You are welcome to browse our collection again.</p>
    ${upiEmailButton(`${data.storefrontUrl.replace(/\/$/, "")}/artworks`, "Visit the Shop")}`

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: `The UPI payment window for ${data.orderNumber} has expired.`,
      contentHtml,
    }),
  }
}

export function upiOrderPlacedTemplate(data: OrderPlacedTemplateData): {
  subject: string
  html: string
} {
  const rendered = orderPlacedTemplate(data)
  const subject = rendered.subject.replace("Order Confirmed:", "Order Received:")
  const html = rendered.html
    .replace("Order Confirmed:", "Order Received:")
    .replace(
      "and our atelier is preparing your artwork for dispatch.",
      "and will confirm it once your UPI payment is verified."
    )
    .replace(
      "We are preparing your artwork.",
      "We will confirm your order once your UPI payment is verified."
    )

  return { subject, html }
}

/* ==========================================================================
   Broadcast / Campaign Email Template
   ========================================================================== */
export interface BroadcastEmailTemplateData {
  subject: string
  preheader?: string
  headline?: string
  bodyHtml: string
  imageUrl?: string
  couponCode?: string
  ctaText?: string
  ctaLink?: string
  storefrontUrl: string
  recipientEmail?: string
  unsubscribeUrl?: string
}

export function broadcastEmailTemplate(data: BroadcastEmailTemplateData): {
  subject: string
  html: string
} {
  const subject = data.subject || "An Update from Livin In The Art"

  const imageBlock = data.imageUrl
    ? `<div style="margin-bottom: 24px; text-align: center;">
        <img src="${escapeHtml(data.imageUrl)}" alt="${escapeHtml(data.headline || subject)}" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto;" />
       </div>`
    : ""

  const couponBlock = data.couponCode
    ? `<div style="margin: 28px 0; padding: 20px 24px; background-color: #fbf7f4; border: 1px dashed #d5c3b2; border-radius: 4px; text-align: center;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #7f6e62; margin-bottom: 6px; font-weight: 600;">Exclusive Collector Offer</div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 700; letter-spacing: 0.22em; color: #5f2f3c; padding: 4px 0;">${escapeHtml(data.couponCode)}</div>
        <div style="font-size: 12px; color: #888888; margin-top: 6px;">Enter this code during checkout to redeem your offer.</div>
       </div>`
    : ""

  const ctaBlock =
    data.ctaText && data.ctaLink
      ? `<div style="margin: 28px 0; text-align: center;">
          <a href="${escapeHtml(data.ctaLink)}" style="background-color: #5f2f3c; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; border-radius: 2px; display: inline-block;">
            ${escapeHtml(data.ctaText)}
          </a>
         </div>`
      : ""

  const unsubscribeBlock = `
    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #eee7de; font-size: 11px; color: #999999; text-align: center; line-height: 1.6;">
      You received this broadcast as a registered collector or newsletter subscriber with Livin In The Art.<br />
      ${
        data.unsubscribeUrl
          ? `<a href="${escapeHtml(data.unsubscribeUrl)}" style="color: #5f2f3c; text-decoration: underline; margin-top: 4px; display: inline-block;">Manage email preferences or unsubscribe</a>`
          : ""
      }
    </div>
  `

  const contentHtml = `
    ${imageBlock}
    <h1 style="margin: 0 0 18px 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; font-weight: 500; letter-spacing: 0.05em; color: #1a1a1a; line-height: 1.3;">
      ${escapeHtml(data.headline || subject)}
    </h1>
    <div style="font-size: 14px; line-height: 1.7; color: #444444; margin-bottom: 20px;">
      ${data.bodyHtml}
    </div>
    ${couponBlock}
    ${ctaBlock}
    ${unsubscribeBlock}
  `

  return {
    subject,
    html: renderEditorialEmail({
      title: subject,
      preheader: data.preheader || subject,
      contentHtml,
    }),
  }
}

