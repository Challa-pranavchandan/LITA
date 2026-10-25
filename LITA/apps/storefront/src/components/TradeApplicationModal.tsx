"use client";

import { useEffect, useState } from "react";
import { sdk } from "@/lib/medusa";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: string;
}

const ROLES = [
  "Interior Designer",
  "Architect",
  "Real Estate Developer",
  "Art Consultant",
  "Commercial / Hospitality",
  "Other",
];

export function TradeApplicationModal({ isOpen, onClose, initialRole }: TradeModalProps) {
  const [selectedRole, setSelectedRole] = useState(initialRole || "Interior Designer");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: (formData.get("name") as string)?.trim(),
      email: (formData.get("email") as string)?.trim(),
      company: (formData.get("company") as string)?.trim() || null,
      role: selectedRole,
      phone: (formData.get("phone") as string)?.trim() || null,
      website: (formData.get("website") as string)?.trim() || null,
      message:
        (formData.get("message") as string)?.trim() ||
        `Trade program application for ${selectedRole}`,
    };

    try {
      await sdk.client.fetch("/store/trade-applications", {
        method: "POST",
        body: payload,
      });
      setStatus("success");
      form.reset();
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(
        err?.message || "Unable to submit application. Please check your information and try again."
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-none border border-[#E5E5E5] shadow-2xl p-6 sm:p-10 animate-slideUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-5 right-5 text-[#888888] hover:text-[#111111] transition-colors p-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {status === "success" ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F6F4] text-[#111111]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2
              className="font-cormorant text-3xl font-normal text-[#111111] mb-3"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              Application Received
            </h2>
            <p className="text-[15px] text-[#555555] max-w-md mx-auto leading-relaxed">
              Thank you for applying to the Trade Program. Your dedicated Art Advisor will review your details
              and reach out within one business day with trade pricing credentials and dedicated support.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#222222] bg-[#111111] text-white px-8 py-2.5 text-sm font-normal hover:bg-neutral-800 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8 text-left">
              <span className="block text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-[#888888] mb-2">
                Livinin The Art
              </span>
              <h2
                className="font-cormorant text-3xl sm:text-4xl font-normal text-[#111111] tracking-tight leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Join Trade Program
              </h2>
              <p className="mt-2 text-[14px] text-[#555555] leading-relaxed">
                Enjoy exclusive trade discounts, dedicated art advisors, custom commissions, and white-glove logistics.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#666666] mb-2 font-medium">
                  Profession / Trade Discipline
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`text-xs px-3 py-2 text-center border transition-all ${
                        selectedRole === role
                          ? "border-[#111111] bg-[#111111] text-white font-medium"
                          : "border-[#E5E5E5] bg-white text-[#444444] hover:border-[#999999]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="trade-name" className="block text-xs uppercase tracking-wider text-[#666666] mb-1.5 font-medium">
                    Full Name *
                  </label>
                  <input
                    id="trade-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    className="w-full border border-[#D5D5D5] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="trade-company" className="block text-xs uppercase tracking-wider text-[#666666] mb-1.5 font-medium">
                    Firm / Studio Name *
                  </label>
                  <input
                    id="trade-company"
                    name="company"
                    type="text"
                    required
                    placeholder="e.g. Vance Interiors LLC"
                    className="w-full border border-[#D5D5D5] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="trade-email" className="block text-xs uppercase tracking-wider text-[#666666] mb-1.5 font-medium">
                    Business Email *
                  </label>
                  <input
                    id="trade-email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="w-full border border-[#D5D5D5] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="trade-phone" className="block text-xs uppercase tracking-wider text-[#666666] mb-1.5 font-medium">
                    Phone Number
                  </label>
                  <input
                    id="trade-phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-[#D5D5D5] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label htmlFor="trade-website" className="block text-xs uppercase tracking-wider text-[#666666] mb-1.5 font-medium">
                  Website or Portfolio URL
                </label>
                <input
                  id="trade-website"
                  name="website"
                  type="url"
                  placeholder="https://..."
                  className="w-full border border-[#D5D5D5] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              {/* Message / Project Scope */}
              <div>
                <label htmlFor="trade-message" className="block text-xs uppercase tracking-wider text-[#666666] mb-1.5 font-medium">
                  Current Project Details / Scope (Optional)
                </label>
                <textarea
                  id="trade-message"
                  name="message"
                  rows={3}
                  placeholder="Tell us about upcoming residential, commercial, or hospitality projects..."
                  className="w-full border border-[#D5D5D5] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:bg-white focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full rounded-full border border-[#111111] bg-[#111111] text-white py-3 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  {status === "submitting" ? "Submitting Application..." : "Submit Trade Application"}
                </button>
                <p className="mt-3 text-center text-xs text-[#777777]">
                  Trade verification usually takes less than 24 business hours.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
