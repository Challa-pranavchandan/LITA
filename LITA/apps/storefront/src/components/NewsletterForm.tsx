"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = new FormData(form).get("email");
    setState("sending");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "newsletter", email }),
      });
      if (!res.ok) throw new Error();
      form.reset();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="mt-4" role="status">You're on the list. Thank you.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 max-w-sm">
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input id="newsletter-email" name="email" type="email" required placeholder="Email address" className="field" />
        <button type="submit" disabled={state === "sending"} className="btn-solid shrink-0">
          {state === "sending" ? "Joining…" : "Join"}
        </button>
      </div>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-700">Couldn't sign you up. Check the email address and try again.</p>
      )}
    </form>
  );
}
