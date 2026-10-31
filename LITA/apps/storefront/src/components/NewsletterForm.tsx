"use client";

import { useState } from "react";
import { Turnstile } from "./Turnstile";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setState("sending");
    setFeedbackMessage("");

    const form = e.currentTarget;
    const website = (form.elements.namedItem("website") as HTMLInputElement)?.value;

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "newsletter",
          email: email.trim(),
          website,
          turnstile_token: turnstileToken || "dummy-turnstile-token",
          source_url: typeof window !== "undefined" ? window.location.pathname : "footer",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Subscription request failed. Please try again.");
      }

      setEmail("");
      setState("done");
      setFeedbackMessage(
        data.already_confirmed
          ? "You are already subscribed to our newsletter."
          : "Please check your inbox to confirm your subscription."
      );
    } catch (err: unknown) {
      setState("error");
      setFeedbackMessage(
        err instanceof Error ? err.message : "Unable to subscribe right now. Please try again later."
      );
    }
  }

  return (
    <div className="w-full max-w-[440px]">
      <form onSubmit={handleSubmit}>
        {/* Honeypot field for bot suppression */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <div className="relative flex items-center bg-[#ECEBE8] border-b border-[#CCCCCC] px-4 py-3 transition-colors focus-within:border-[#222222]">
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email Address"
            disabled={state === "sending"}
            className="w-full bg-transparent text-[14px] text-[#222222] placeholder:text-[#7A7A7A] focus:outline-none font-normal pr-3 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="text-[14px] text-[#222222] font-normal hover:text-black whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer"
          >
            {state === "sending" ? "Signing Up…" : state === "done" ? "Signed Up ✓" : "Sign Up"}
          </button>
        </div>

        <Turnstile onVerify={(token) => setTurnstileToken(token)} className="my-2" />

        {state === "done" && (
          <p className="mt-2 text-xs text-emerald-800 font-medium" role="status">
            {feedbackMessage}
          </p>
        )}
        {state === "error" && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 border border-red-200" role="alert">
            {feedbackMessage}
          </p>
        )}
      </form>
    </div>
  );
}

export default NewsletterForm;
