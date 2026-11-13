const { test, describe } = require("node:test");
const assert = require("node:assert");

// Import the core pure functions directly for fast node test
const {
  getOrderState,
  formatOrderDate,
  formatOrderMoney,
} = require("../lib/order-state-core.js");

describe("Order State Machine (getOrderState)", () => {
  test("placed: derives 'Thank you, {firstName}', shows timeline, hides payment & tracking", () => {
    const order = {
      id: "order_01",
      display_id: 1042,
      status: "completed",
      payment_status: "captured",
      fulfillment_status: "not_fulfilled",
      email: "collector@example.com",
      shipping_address: { first_name: "Aditi" },
    };

    const state = getOrderState(order);
    assert.strictEqual(state.key, "placed");
    assert.strictEqual(state.heading, "Thank you, Aditi");
    assert.match(state.subheading, /collector@example\.com/);
    assert.strictEqual(state.tone, "neutral");
    assert.strictEqual(state.primaryCta.label, "Continue browsing");
    assert.strictEqual(state.showPayment, false);
    assert.strictEqual(state.showTracking, false);
    assert.strictEqual(state.showTimeline, true);
  });

  test("placed without firstName falls back gracefully", () => {
    const order = {
      id: "order_02",
      status: "completed",
      payment_status: "captured",
      email: null,
    };
    const state = getOrderState(order);
    assert.strictEqual(state.key, "placed");
    assert.strictEqual(state.heading, "Thank you for collecting with LITA");
    assert.strictEqual(state.subheading, "Your bespoke order has been confirmed.");
  });

  test("pending_payment: derives 'Complete your payment', shows payment & countdown, CTA Pay now", () => {
    const order = {
      id: "order_03",
      display_id: 1043,
      status: "pending",
      payment_status: "awaiting",
      fulfillment_status: "not_fulfilled",
    };

    const state = getOrderState(order);
    assert.strictEqual(state.key, "pending_payment");
    assert.strictEqual(state.heading, "Complete your payment");
    assert.strictEqual(state.tone, "amber");
    assert.strictEqual(state.primaryCta.label, "Pay now");
    assert.strictEqual(state.showPayment, true);
    assert.strictEqual(state.showTracking, false);
    assert.strictEqual(state.showTimeline, true);
  });

  test("payment_expired: derives 'Payment window expired', CTA Retry payment", () => {
    const order = {
      id: "order_04",
      display_id: 1044,
      status: "pending",
      payment_status: "awaiting",
      upiPayment: {
        status: "expired",
      },
    };

    const state = getOrderState(order);
    assert.strictEqual(state.key, "payment_expired");
    assert.strictEqual(state.heading, "Payment window expired");
    assert.strictEqual(state.tone, "danger");
    assert.strictEqual(state.primaryCta.label, "Retry payment");
    assert.strictEqual(state.showPayment, true);
    assert.strictEqual(state.showTracking, false);
    assert.strictEqual(state.showTimeline, false);
  });

  test("canceled: derives 'Order #{display_id} was canceled', shows cancel date and refund note, never shows thank you or tracking", () => {
    const order = {
      id: "order_05",
      display_id: 1045,
      status: "canceled",
      payment_status: "captured",
      canceled_at: "2026-11-08T10:00:00.000Z",
      shipping_address: { first_name: "Rohan" },
    };

    const state = getOrderState(order);
    assert.strictEqual(state.key, "canceled");
    assert.strictEqual(state.heading, "Order #1045 was canceled");
    assert.match(state.subheading, /Canceled on 8 Nov 2026/);
    assert.match(state.subheading, /refund/i);
    assert.strictEqual(state.tone, "danger");
    assert.strictEqual(state.primaryCta.label, "Buy again");
    assert.strictEqual(state.showPayment, false);
    assert.strictEqual(state.showTracking, false);
    assert.strictEqual(state.showTimeline, false);
    assert.doesNotMatch(state.heading, /Thank you/i);
    assert.doesNotMatch(state.subheading, /Thank you/i);
  });

  test("canceled with no captured funds reflects non-charge note", () => {
    const order = {
      id: "order_06",
      display_id: 1046,
      status: "canceled",
      payment_status: "not_paid",
    };
    const state = getOrderState(order);
    assert.strictEqual(state.key, "canceled");
    assert.match(state.subheading, /No funds were captured/i);
  });

  test("shipped: derives 'On its way', shows tracking and stepper, CTA Track package", () => {
    const order = {
      id: "order_07",
      display_id: 1047,
      status: "completed",
      payment_status: "captured",
      fulfillment_status: "shipped",
    };

    const state = getOrderState(order);
    assert.strictEqual(state.key, "shipped");
    assert.strictEqual(state.heading, "On its way");
    assert.strictEqual(state.tone, "neutral");
    assert.strictEqual(state.primaryCta.label, "Track package");
    assert.strictEqual(state.showPayment, false);
    assert.strictEqual(state.showTracking, true);
    assert.strictEqual(state.showTimeline, true);
  });

  test("delivered: derives 'Delivered {date}', CTA Buy again", () => {
    const order = {
      id: "order_08",
      display_id: 1048,
      status: "completed",
      payment_status: "captured",
      fulfillment_status: "delivered",
      updated_at: "2026-11-09T14:30:00.000Z",
    };

    const state = getOrderState(order);
    assert.strictEqual(state.key, "delivered");
    assert.strictEqual(state.heading, "Delivered 9 Nov 2026");
    assert.strictEqual(state.tone, "green");
    assert.strictEqual(state.primaryCta.label, "Buy again");
    assert.strictEqual(state.showPayment, false);
    assert.strictEqual(state.showTracking, true);
    assert.strictEqual(state.showTimeline, true);
  });

  test("formatOrderDate formats '8 Nov 2026' with Intl.DateTimeFormat('en-IN') and handles undefined", () => {
    assert.strictEqual(formatOrderDate("2026-11-08T00:00:00.000Z"), "8 Nov 2026");
    assert.strictEqual(formatOrderDate(undefined), "");
    assert.strictEqual(formatOrderDate(null), "");
    assert.strictEqual(formatOrderDate("invalid-date-string"), "");
  });

  test("formatOrderMoney formats INR amounts without dividing by 100 and returns '—' for null", () => {
    assert.strictEqual(formatOrderMoney(null), "—");
    assert.strictEqual(formatOrderMoney(undefined), "—");
    const formatted = formatOrderMoney(4500, "INR");
    assert.match(formatted, /4,500/);
    assert.match(formatted, /₹/);
  });
});
