import type { HttpTypes } from "@medusajs/types";

export type OrderStateKey =
  | "placed"
  | "pending_payment"
  | "payment_expired"
  | "canceled"
  | "shipped"
  | "delivered";

export type OrderTone = "neutral" | "green" | "danger" | "amber";

export interface OrderStateResult {
  key: OrderStateKey;
  heading: string;
  subheading: string;
  tone: OrderTone;
  primaryCta: {
    label: string;
    href?: string;
    action?: string;
  };
  showPayment: boolean;
  showTracking: boolean;
  showTimeline: boolean;
}

export type OrderWithPaymentMeta = Partial<HttpTypes.StoreOrder> & {
  canceled_at?: string | Date | null;
  upiPayment?: {
    status?: string | null;
    expires_at?: string | null;
  } | null;
};

/** Format dates like "8 Nov 2026" with Intl.DateTimeFormat("en-IN"), guarding against invalid or undefined dates */
export function formatOrderDate(
  date: string | Date | null | undefined
): string {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

/** Format currency in INR or specified currency in major units, returning "—" if undefined */
export function formatOrderMoney(
  amount: number | null | undefined,
  currencyCode?: string | null
): string {
  if (amount == null || isNaN(amount)) return "—";
  const code = (currencyCode || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount}`;
  }
}

/**
 * Pure function to derive customer-facing order state, heading, subheading, tone, CTAs, and visibility flags
 */
export function getOrderState(
  order: OrderWithPaymentMeta | null | undefined
): OrderStateResult {
  if (!order) {
    return {
      key: "placed",
      heading: "Thank you",
      subheading: "Your order details could not be loaded.",
      tone: "neutral",
      primaryCta: { label: "Continue browsing", href: "/artworks" },
      showPayment: false,
      showTracking: false,
      showTimeline: false,
    };
  }

  // 1. CANCELED STATE
  // Never show "Thank you for collecting", payment block, or tracking.
  if (order.status === "canceled") {
    const displayId = order.display_id
      ? `#${order.display_id}`
      : order.id
      ? `#${order.id}`
      : "";
    const cancelDate = formatOrderDate(
      order.canceled_at || order.updated_at || order.created_at
    );
    const datePrefix = cancelDate ? `Canceled on ${cancelDate}. ` : "";

    let refundNote = "No funds were captured for this order.";
    if (
      order.payment_status === "captured" ||
      order.payment_status === "partially_captured"
    ) {
      refundNote =
        "A full refund has been initiated and will credit to your account within 5–7 business days.";
    } else if (order.payment_status === "refunded") {
      refundNote =
        "A full refund has been issued to your original payment method.";
    }

    return {
      key: "canceled",
      heading: `Order ${displayId} was canceled`.trim(),
      subheading: `${datePrefix}${refundNote}`,
      tone: "danger",
      primaryCta: {
        label: "Buy again",
        href: "/artworks",
        action: "buy_again",
      },
      showPayment: false,
      showTracking: false,
      showTimeline: false,
    };
  }

  // 2. DELIVERED STATE
  if (order.fulfillment_status === "delivered") {
    const fulfillments = order.fulfillments ?? [];
    const deliveredFulfillment = fulfillments.find(
      (f) => Boolean(f?.delivered_at)
    );
    const deliveredDate = formatOrderDate(
      deliveredFulfillment?.delivered_at || order.updated_at
    );
    const heading = deliveredDate ? `Delivered ${deliveredDate}` : "Delivered";

    return {
      key: "delivered",
      heading,
      subheading:
        "Your bespoke artwork has been safely delivered to your address.",
      tone: "green",
      primaryCta: {
        label: "Buy again",
        href: "/artworks",
        action: "buy_again",
      },
      showPayment: false,
      showTracking: true,
      showTimeline: true,
    };
  }

  // 3. SHIPPED STATE
  if (
    order.fulfillment_status === "shipped" ||
    order.fulfillment_status === "partially_shipped"
  ) {
    return {
      key: "shipped",
      heading: "On its way",
      subheading:
        "Your order is in transit with insured fine-art courier delivery.",
      tone: "neutral",
      primaryCta: { label: "Track package", href: "#tracking" },
      showPayment: false,
      showTracking: true,
      showTimeline: true,
    };
  }

  // 4. PAYMENT EXPIRED STATE
  const isUpiExpired =
    order.upiPayment?.status === "expired" ||
    (Boolean(order.upiPayment?.expires_at) &&
      new Date(order.upiPayment!.expires_at!).getTime() <= Date.now());

  const isExplicitPaymentExpired =
    (order.metadata as Record<string, unknown> | null)?.payment_expired ===
      true || (order.payment_status as string | undefined) === "failed";

  if (isUpiExpired || isExplicitPaymentExpired) {
    return {
      key: "payment_expired",
      heading: "Payment window expired",
      subheading:
        "The secure payment window for this order has expired. You can retry payment by creating a fresh bag.",
      tone: "danger",
      primaryCta: {
        label: "Retry payment",
        href: "/checkout",
        action: "retry_payment",
      },
      showPayment: true,
      showTracking: false,
      showTimeline: false,
    };
  }

  // 5. PENDING PAYMENT STATE
  const isPendingPayment =
    order.payment_status === "awaiting" ||
    order.payment_status === "not_paid" ||
    order.payment_status === "requires_action" ||
    order.upiPayment?.status === "awaiting_proof";

  if (isPendingPayment) {
    return {
      key: "pending_payment",
      heading: "Complete your payment",
      subheading:
        "Please complete your payment within the allotted time to confirm your art acquisition.",
      tone: "amber",
      primaryCta: { label: "Pay now", href: "#payment" },
      showPayment: true,
      showTracking: false,
      showTimeline: true,
    };
  }

  // 6. PLACED STATE (Default confirmed)
  const firstName =
    order.shipping_address?.first_name ||
    order.customer?.first_name ||
    "";
  const heading = firstName
    ? `Thank you, ${firstName}`
    : "Thank you for collecting with LITA";
  const subheading = order.email
    ? `A formal collector summary has been dispatched to ${order.email}.`
    : "Your bespoke order has been confirmed.";

  return {
    key: "placed",
    heading,
    subheading,
    tone: "neutral",
    primaryCta: { label: "Continue browsing", href: "/artworks" },
    showPayment: false,
    showTracking: false,
    showTimeline: true,
  };
}
