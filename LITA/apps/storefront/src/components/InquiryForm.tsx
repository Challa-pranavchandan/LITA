"use client";

import { useState } from "react";
import { Turnstile } from "./Turnstile";

export function InquiryForm({
  kind,
  artwork,
  submitLabel = "Send inquiry",
  showBudget = false,
  placeholder = "Tell us what you have in mind.",
}: {
  kind: "commission" | "artwork" | "contact" | "trade";
  artwork?: string;
  submitLabel?: string;
  showBudget?: boolean;
  placeholder?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    setState("sending");
    setError(null);

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          kind,
          artwork,
          turnstile_token: turnstileToken || "dummy-turnstile-token",
          source_url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Unable to send inquiry. Please try again.");
      }

      form.reset();
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send inquiry. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="border border-dust bg-wall p-6 transition-all duration-300">
        <h3 className="text-lg font-medium text-black">Thank you, your inquiry is received.</h3>
        <p className="mt-1 text-sm text-graphite">
          Our studio curators review every request carefully. You will receive an acknowledgment and a direct response by email within two working days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot field for spam bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${kind}-name`} className="label">
            Name
          </label>
          <input
            id={`${kind}-name`}
            name="name"
            required
            disabled={state === "sending"}
            autoComplete="name"
            className="field disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor={`${kind}-email`} className="label">
            Email
          </label>
          <input
            id={`${kind}-email`}
            name="email"
            type="email"
            required
            disabled={state === "sending"}
            autoComplete="email"
            className="field disabled:opacity-50"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${kind}-phone`} className="label">
            Phone (optional)
          </label>
          <input
            id={`${kind}-phone`}
            name="phone"
            type="tel"
            disabled={state === "sending"}
            autoComplete="tel"
            className="field disabled:opacity-50"
            placeholder="+91..."
          />
        </div>
        {showBudget && (
          <div>
            <label htmlFor={`${kind}-budget`} className="label">
              Budget (optional)
            </label>
            <input
              id={`${kind}-budget`}
              name="budget"
              disabled={state === "sending"}
              className="field disabled:opacity-50"
              placeholder="e.g. ₹25,000 to ₹50,000"
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`${kind}-message`} className="label">
          Message
        </label>
        <textarea
          id={`${kind}-message`}
          name="message"
          required
          rows={5}
          disabled={state === "sending"}
          placeholder={placeholder}
          className="field disabled:opacity-50"
        />
      </div>

      <Turnstile onVerify={(token) => setTurnstileToken(token)} />

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 border border-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="btn-solid disabled:opacity-50 cursor-pointer"
      >
        {state === "sending" ? "Sending inquiry…" : submitLabel}
      </button>
    </form>
  );
}
