"use client";

import React from "react";
import type { Commission } from "./types";

interface ProgressStepperProps {
  commission: Commission;
}

interface StepDef {
  index: number;
  label: string;
}

const STEPS: StepDef[] = [
  { index: 1, label: "Brief" },
  { index: 2, label: "Deposit" },
  { index: 3, label: "Creating" },
  { index: 4, label: "Final payment" },
  { index: 5, label: "Shipped" },
];

function getStepInfo(status: Commission["status"]) {
  switch (status) {
    case "new":
      return {
        currentStep: 1,
        nextText: "The atelier is reviewing your bespoke brief.",
      };
    case "in_discussion":
      return {
        currentStep: 1,
        nextText: "Discuss reference images and artwork details with the studio in the Messages tab.",
      };
    case "quoted":
      return {
        currentStep: 2,
        nextText: "Review and accept your bespoke quote to proceed to the deposit.",
      };
    case "accepted":
      return {
        currentStep: 2,
        nextText: "Quote accepted. The studio is preparing your deposit invoice.",
      };
    case "awaiting_payment":
      return {
        currentStep: 2,
        nextText: "Pay the 50% deposit to start your artwork.",
      };
    case "in_production":
      return {
        currentStep: 3,
        nextText: "Your 50% deposit is received. The artist is currently creating your bespoke artwork.",
      };
    case "awaiting_final_payment":
      return {
        currentStep: 4,
        nextText: "Artwork completed! Complete the final 50% payment before packing and dispatch.",
      };
    case "paid":
    case "converted":
      return {
        currentStep: 5,
        nextText: "Commission paid in full. Your artwork is being prepared for insured courier dispatch.",
      };
    case "cancelled":
      return {
        currentStep: 1,
        nextText: "This bespoke commission has been cancelled.",
      };
    case "rejected":
      return {
        currentStep: 1,
        nextText: "This commission request was declined by the studio atelier.",
      };
    default:
      return {
        currentStep: 1,
        nextText: "The atelier is processing your request.",
      };
  }
}

export function ProgressStepper({ commission }: ProgressStepperProps) {
  const isCancelled = commission.status === "cancelled" || commission.status === "rejected";
  const { currentStep, nextText } = getStepInfo(commission.status);
  const currentStepName = STEPS[currentStep - 1]?.label || "Brief";
  const progressPercent = Math.min(100, Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100));

  return (
    <div className="py-6 sm:py-8 border-b border-[#e8e4df]">
      {/* ── Mobile Layout (< 1024px): Collapsed step + progress bar ── */}
      <div className="lg:hidden space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-neutral-800">
            {isCancelled ? "Commission Status" : `Step ${currentStep} of ${STEPS.length}: ${currentStepName}`}
          </span>
          <span className="text-neutral-500 font-mono text-[11px]">
            {isCancelled ? "Cancelled" : `${progressPercent}%`}
          </span>
        </div>

        {/* Thin progress bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Commission progress"
          className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden"
        >
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${
              isCancelled ? "bg-neutral-400" : "bg-[#5f2f3c]"
            }`}
            style={{ width: isCancelled ? "100%" : `${progressPercent}%` }}
          />
        </div>

        {/* What happens next */}
        <p className="text-xs text-neutral-600 pt-0.5 leading-relaxed">
          {nextText}
        </p>
      </div>

      {/* ── Desktop Layout (>= 1024px): Full 5-Step Stepper ── */}
      <div className="hidden lg:block">
        <ol
          aria-label="Commission progress stages"
          className="relative flex items-center justify-between w-full"
        >
          {STEPS.map((step, idx) => {
            const isCompleted = !isCancelled && step.index < currentStep;
            const isCurrent = !isCancelled && step.index === currentStep;
            const isLast = idx === STEPS.length - 1;

            return (
              <li
                key={step.index}
                className={`relative flex flex-col items-center flex-1 ${
                  isLast ? "flex-none" : ""
                }`}
              >
                {/* Connecting Line (drawn to the next step) */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="absolute top-4 left-1/2 w-full h-[2px] -translate-y-1/2 z-0"
                  >
                    <div
                      className={`h-full transition-colors duration-300 ${
                        step.index < currentStep && !isCancelled
                          ? "bg-[#5f2f3c]"
                          : "bg-neutral-200"
                      }`}
                    />
                  </div>
                )}

                {/* Step Circle Indicator */}
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all duration-200 ${
                    isCompleted
                      ? "bg-[#5f2f3c] text-white ring-4 ring-white shadow-sm"
                      : isCurrent
                      ? "border-2 border-[#5f2f3c] bg-white text-[#5f2f3c] ring-4 ring-[#5f2f3c]/10"
                      : "border border-neutral-300 bg-white text-neutral-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4 stroke-current"
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
                    <span>{step.index}</span>
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={`mt-2 text-xs text-center select-none ${
                    isCompleted
                      ? "font-medium text-neutral-800"
                      : isCurrent
                      ? "font-semibold text-[#5f2f3c]"
                      : "text-neutral-400"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* What happens next line below stepper */}
        <div className="mt-6 pt-4 border-t border-[#f0ede8] flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5f2f3c]" aria-hidden="true" />
            <span className="font-medium text-neutral-900">Current Phase:</span>
            <span>{nextText}</span>
          </div>
          {commission.deadline && (
            <span className="text-neutral-500 text-[11px]">
              Target completion: {new Date(commission.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProgressStepper;
