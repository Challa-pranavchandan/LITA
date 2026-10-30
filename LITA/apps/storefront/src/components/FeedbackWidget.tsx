"use client"
import React, { useState } from "react"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"feedback" | "bug">("feedback")
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setStatus("sending")
    const fd = new FormData(form)
    fd.set("type", type)
    fd.set("page_url", window.location.href)
    try {
      const headers: Record<string, string> = {}
      if (PK) {
        headers["x-publishable-api-key"] = PK
      }
      const res = await fetch(`${BACKEND}/store/feedback`, {
        method: "POST",
        headers,
        body: fd,
      })
      if (!res.ok) throw new Error("Feedback submission failed")
      setStatus("done")
      form.reset()
    } catch {
      setStatus("error")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setStatus("idle")
        }}
        className="text-[13px] text-[#333333] hover:text-black underline underline-offset-4 transition-colors"
      >
        Feedback / Report a bug
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 text-black shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {status === "done" ? (
              <div className="text-center py-4">
                <p className="mb-4 text-sm font-medium text-emerald-800">
                  Thank you! Your message has been sent.
                </p>
                <button
                  type="button"
                  className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="font-semibold text-[15px] text-gray-900">
                    Feedback / Report a bug
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-gray-400 hover:text-gray-700 text-lg leading-none"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("feedback")}
                    className={`flex-1 rounded border px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                      type === "feedback"
                        ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    Feedback / Advice
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("bug")}
                    className={`flex-1 rounded border px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
                      type === "bug"
                        ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    Report a bug
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    maxLength={3000}
                    placeholder={
                      type === "bug"
                        ? "What went wrong? What did you click?"
                        : "Tell us what you think..."
                    }
                    className="w-full rounded border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email (optional)
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    className="w-full rounded border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Screenshot (optional)
                  </label>
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-100 hover:file:bg-gray-200"
                  />
                </div>

                {/* honeypot */}
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" />

                {status === "error" && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Something went wrong. Please try again.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded border border-gray-200 px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="rounded bg-black px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                  >
                    {status === "sending" ? "Sending..." : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
export { FeedbackWidget }
