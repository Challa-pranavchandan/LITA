import React from "react";
import type { HttpTypes } from "@medusajs/types";
import { formatOrderDate } from "@/lib/order-state";

interface OrderTimelineStepperProps {
  order: HttpTypes.StoreOrder & { canceled_at?: string | Date | null };
}

interface StepDef {
  key: string;
  label: string;
}

const TIMELINE_STEPS: StepDef[] = [
  { key: "ordered", label: "Ordered" },
  { key: "paid", label: "Paid" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export function OrderTimelineStepper({ order }: OrderTimelineStepperProps) {
  const isCanceled = order.status === "canceled";

  // Canceled state: Single banner replacing the stepper
  if (isCanceled) {
    const cancelDate = formatOrderDate(order.canceled_at || order.updated_at || order.created_at);
    const dateText = cancelDate ? `Canceled on ${cancelDate}` : "Order Canceled";

    let refundText = "No payment was collected for this order.";
    if (order.payment_status === "captured" || order.payment_status === "partially_captured") {
      refundText = "A full refund has been initiated and will credit to your account within 5–7 business days.";
    } else if (order.payment_status === "refunded") {
      refundText = "A full refund has been returned to your original payment method.";
    }

    return (
      <div
        role="alert"
        className="border border-rose-200 bg-rose-50/70 rounded-lg p-5 sm:p-6 text-rose-950 space-y-1.5"
      >
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-bold"
            aria-hidden="true"
          >
            ✕
          </span>
          <h2 className="font-semibold text-sm">{dateText}</h2>
        </div>
        <p className="text-xs text-rose-900/90 leading-relaxed pl-7">
          {refundText}
        </p>
      </div>
    );
  }

  // Active steps calculation
  const isPaid =
    order.payment_status === "captured" ||
    order.payment_status === "partially_captured" ||
    order.payment_status === "authorized" ||
    order.payment_status === "refunded";

  const isPacked =
    order.fulfillment_status === "fulfilled" ||
    order.fulfillment_status === "partially_fulfilled" ||
    order.fulfillment_status === "shipped" ||
    order.fulfillment_status === "partially_shipped" ||
    order.fulfillment_status === "delivered";

  const isShipped =
    order.fulfillment_status === "shipped" ||
    order.fulfillment_status === "partially_shipped" ||
    order.fulfillment_status === "delivered";

  const isDelivered = order.fulfillment_status === "delivered";

  const stepStatusMap: Record<string, boolean> = {
    ordered: true,
    paid: isPaid,
    packed: isPacked,
    shipped: isShipped,
    delivered: isDelivered,
  };

  // Find current active step index
  let currentStepIdx = 0;
  if (isDelivered) currentStepIdx = 4;
  else if (isShipped) currentStepIdx = 3;
  else if (isPacked) currentStepIdx = 2;
  else if (isPaid) currentStepIdx = 1;
  else currentStepIdx = 0;

  return (
    <div className="bg-[#faf8f5] border border-[#eee7de] rounded-lg p-5 sm:p-7">
      <span className="block text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-neutral-500 mb-5">
        Fulfillment Timeline
      </span>

      <ol
        aria-label="Order progress"
        className="relative flex items-center justify-between w-full"
      >
        {TIMELINE_STEPS.map((step, idx) => {
          const isCompleted = stepStatusMap[step.key] === true;
          const isCurrent = idx === currentStepIdx;
          const isLast = idx === TIMELINE_STEPS.length - 1;

          return (
            <li
              key={step.key}
              className={`relative flex flex-col items-center flex-1 ${
                isLast ? "flex-none" : ""
              }`}
            >
              {/* Connecting line to next step */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="absolute top-3.5 left-1/2 w-full h-[2px] -translate-y-1/2 z-0"
                >
                  <div
                    className={`h-full transition-colors duration-300 ${
                      isCompleted && stepStatusMap[TIMELINE_STEPS[idx + 1].key]
                        ? "bg-neutral-900"
                        : isCompleted
                        ? "bg-neutral-400"
                        : "bg-neutral-200"
                    }`}
                  />
                </div>
              )}

              {/* Circle indicator */}
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all duration-200 ${
                  isCompleted
                    ? "bg-neutral-900 text-white ring-4 ring-[#faf8f5]"
                    : "border border-neutral-300 bg-white text-neutral-400 ring-4 ring-[#faf8f5]"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-3.5 h-3.5 stroke-current"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                )}
              </div>

              {/* Step label */}
              <span
                className={`mt-2 text-xs text-center select-none ${
                  isCurrent
                    ? "font-semibold text-neutral-900"
                    : isCompleted
                    ? "font-medium text-neutral-800"
                    : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default OrderTimelineStepper;
