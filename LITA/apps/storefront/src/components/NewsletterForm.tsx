"use client";

import { useState, useEffect } from "react";
import { Turnstile } from "./Turnstile";
import {
  getNewsletterSubscription,
  saveNewsletterSubscription,
  clearNewsletterSubscription,
  NEWSLETTER_EVENT_NAME,
  type NewsletterSubscription,
} from "@/lib/newsletter";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [subscription, setSubscription] = useState<NewsletterSubscription | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setSubscription(getNewsletterSubscription());

    function handleSync() {
      setSubscription(getNewsletterSubscription());
    }

    window.addEventListener(NEWSLETTER_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(NEWSLETTER_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

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
          email: normalizedEmail,
          website,
          turnstile_token: turnstileToken || "dummy-turnstile-token",
          source_url: typeof window !== "undefined" ? window.location.pathname : "footer",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Subscription request failed. Please try again.");
      }

      const isConfirmed = Boolean(data.already_confirmed);
      const newSub = saveNewsletterSubscription(normalizedEmail, isConfirmed);
      setSubscription(newSub);
      setIsEditing(false);
      setEmail("");
      setState("done");
      setFeedbackMessage(
        isConfirmed
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

  function handleSwitchEmail() {
    setIsEditing(true);
    setState("idle");
    setFeedbackMessage("");
  }

  async function handleUnsubscribe() {
    if (!subscription?.email) return;
    setIsUnsubscribing(true);
    try {
      await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "newsletter_unsubscribe",
          email: subscription.email,
          source_url: typeof window !== "undefined" ? window.location.pathname : "footer",
        }),
      });
    } catch {
      // Even if network fails, proceed with local clearing so the user isn't stuck
    } finally {
      clearNewsletterSubscription();
      setSubscription(null);
      setIsUnsubscribing(false);
      setIsEditing(false);
      setState("idle");
      setFeedbackMessage("You have been unsubscribed from our newsletter.");
    }
  }

  // Display signed-up view once subscribed (persisted in localStorage)
  if (isMounted && subscription && !isEditing) {
    return (
      <div className="w-full max-w-[440px]">
        <div
          className="relative bg-[#F2F1ED] border border-[#DDD9D2] p-4 text-[#222222] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5f2f3c] text-white text-[11px] font-bold shadow-sm"
              aria-hidden="true"
            >
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-[15px] font-normal tracking-tight text-[#111111]" style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}>
                  Signed up for newsletter
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 border ${
                    subscription.confirmed
                      ? "bg-[#F3ECEE] text-[#5f2f3c] border-[#E2D4D7]"
                      : "bg-[#F7F4EC] text-[#7A5B35] border-[#E8DFC8]"
                  }`}
                >
                  {subscription.confirmed ? "Confirmed" : "Active"}
                </span>
              </div>
              <p
                className="mt-1 text-[13px] text-[#444444] truncate font-normal"
                title={subscription.email}
              >
                {subscription.email}
              </p>
              <p className="mt-1.5 text-[12px] text-[#666666] leading-relaxed font-serif italic" style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}>
                {subscription.confirmed
                  ? "You will receive our editorial releases, exhibition previews, and studio reflections."
                  : "Please check your inbox to confirm your subscription."}
              </p>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-[#DDD9D2] flex items-center justify-between text-[11.5px]">
            <span className="text-[#888888] font-sans">
              Livin In The Art releases
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSwitchEmail}
                className="text-[12px] text-[#555555] hover:text-[#5f2f3c] underline underline-offset-2 transition-colors cursor-pointer"
              >
                Change email
              </button>
              <span className="text-[#CCCCCC]" aria-hidden="true">•</span>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={isUnsubscribing}
                className="text-[12px] text-[#888888] hover:text-[#991B1B] underline underline-offset-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUnsubscribing ? "Unsubscribing…" : "Unsubscribe"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

        {subscription && isEditing && (
          <div className="mt-2 flex items-center justify-between text-xs text-[#7A7A7A]">
            <span>
              Currently signed up as{" "}
              <strong className="text-[#222222] font-medium">{subscription.email}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setState("idle");
                setFeedbackMessage("");
              }}
              className="underline hover:text-[#222222] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        <Turnstile onVerify={(token) => setTurnstileToken(token)} className="my-2" />

        {state === "done" && (
          <p className="mt-2 text-xs text-emerald-800 font-medium" role="status">
            {feedbackMessage}
          </p>
        )}
        {state === "idle" && feedbackMessage && (
          <p className="mt-2 text-xs text-[#555555] font-normal" role="status">
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
