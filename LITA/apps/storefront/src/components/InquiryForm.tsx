"use client";

import { useState } from "react";

export function InquiryForm({
  kind,
  artwork,
  submitLabel = "Send inquiry",
  showBudget = false,
  placeholder = "Tell us what you have in mind.",
}: {
  kind: "commission" | "artwork" | "contact";
  artwork?: string;
  submitLabel?: string;
  showBudget?: boolean;
  placeholder?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ ...data, kind, artwork }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't send. Try again.");
      form.reset();
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send. Try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="border border-dust bg-wall p-6">
        <p className="text-lg">Thank you, your message is in.</p>
        <p className="mt-1 text-graphite">You&apos;ll get a reply by email within two working days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${kind}-name`} className="label">Name</label>
          <input id={`${kind}-name`} name="name" required autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor={`${kind}-email`} className="label">Email</label>
          <input id={`${kind}-email`} name="email" type="email" required autoComplete="email" className="field" />
        </div>
      </div>
      {showBudget && (
        <div>
          <label htmlFor={`${kind}-budget`} className="label">Budget (optional)</label>
          <input id={`${kind}-budget`} name="budget" className="field" placeholder="For example, ₹15,000 to ₹25,000" />
        </div>
      )}
      <div>
        <label htmlFor={`${kind}-message`} className="label">Message</label>
        <textarea id={`${kind}-message`} name="message" required rows={5} placeholder={placeholder} className="field" />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-solid">
        {state === "sending" ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
