"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/data/customer";

export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const password = String(f.get("password") ?? "");
    setError(null);
    startTransition(async () => {
      const res =
        mode === "login"
          ? await login(email, password)
          : await register({
              email,
              password,
              first_name: String(f.get("first_name") ?? ""),
              last_name: String(f.get("last_name") ?? ""),
            });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="max-w-md">
      <div role="tablist" aria-label="Account" className="mb-6 flex gap-6 border-b border-mist">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className={`-mb-px border-b-2 pb-3 text-[15px] ${mode === m ? "border-ink" : "border-transparent text-graphite hover:text-ink"}`}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="first_name" className="label">First name</label><input id="first_name" name="first_name" required autoComplete="given-name" className="field" /></div>
            <div><label htmlFor="last_name" className="label">Last name</label><input id="last_name" name="last_name" required autoComplete="family-name" className="field" /></div>
          </div>
        )}
        <div><label htmlFor="auth-email" className="label">Email</label><input id="auth-email" name="email" type="email" required autoComplete="email" className="field" /></div>
        <div>
          <label htmlFor="auth-password" className="label">Password</label>
          <input id="auth-password" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className="field" />
          {mode === "register" && <p className="mt-1 text-sm text-graphite">Use at least 8 characters.</p>}
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending} className="btn-solid w-full">
          {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
