"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  sendCommissionMessage,
  type CommissionMessage,
} from "@/lib/data/commission";

const REFRESH_INTERVAL = 15_000;

type CustomerCommissionDiscussionProps = {
  commissionId: string;
  initialMessages: CommissionMessage[];
};

function mergeMessages(
  current: CommissionMessage[],
  incoming: CommissionMessage[]
): CommissionMessage[] {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function CustomerCommissionDiscussion({
  commissionId,
  initialMessages,
}: CustomerCommissionDiscussionProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshMessages = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch(
        `/api/commissions/${encodeURIComponent(commissionId)}/messages`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error("The discussion could not be refreshed.");
      }

      const data: { messages: CommissionMessage[] } = await response.json();
      setMessages((current) => mergeMessages(current, data.messages));
      setError(null);
    } catch {
      setError("New messages could not be loaded. Please try again.");
    }
  }, [commissionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshMessages();
    }, REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", refreshMessages);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshMessages);
    };
  }, [refreshMessages]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await sendCommissionMessage(commissionId, cleanBody);
      const sentMessage = result.message;
      if (!result.ok || !sentMessage) {
        setError(result.error ?? "Your message could not be sent.");
        return;
      }

      setMessages((current) => mergeMessages(current, [sentMessage]));
      setBody("");
    });
  }

  return (
    <section
      aria-labelledby="commission-discussion-heading"
      className="mt-10 border border-neutral-200 bg-[#faf8f5] p-5 sm:p-7"
    >
      <div className="border-b border-neutral-200 pb-4">
        <h2
          id="commission-discussion-heading"
          className="text-xs font-semibold uppercase tracking-wider text-neutral-800"
        >
          Studio Discussion
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Messages from you and the artist about your commission.
        </p>
      </div>

      <ol
        aria-live="polite"
        aria-label="Commission messages"
        className="max-h-[28rem] min-h-40 space-y-4 overflow-y-auto py-5"
      >
        {messages.length === 0 ? (
          <li className="py-10 text-center text-sm text-neutral-500">
            No messages yet. Send a message to start the discussion.
          </li>
        ) : (
          messages.map((message) => {
            const isClient = message.sender === "client";
            return (
              <li
                key={message.id}
                className={`flex ${isClient ? "justify-end" : "justify-start"}`}
              >
                <article className="max-w-[85%]">
                  <p
                    className={`mb-1 text-xs text-neutral-500 ${
                      isClient ? "text-right" : "text-left"
                    }`}
                  >
                    {isClient ? "You" : "Artist"} ·{" "}
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                  <p
                    className={`whitespace-pre-wrap break-words rounded-lg px-4 py-3 text-sm ${
                      isClient
                        ? "bg-[#5f2f3c] text-white"
                        : "border border-neutral-200 bg-white text-neutral-900"
                    }`}
                  >
                    {message.body}
                  </p>
                </article>
              </li>
            );
          })
        )}
      </ol>

      <form onSubmit={handleSubmit} className="border-t border-neutral-200 pt-4">
        <label
          htmlFor="commission-message"
          className="mb-2 block text-sm font-medium text-neutral-800"
        >
          Send a message
        </label>
        <textarea
          id="commission-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Ask a question or discuss your commission with the artist..."
          className="w-full resize-y rounded border border-neutral-300 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-xs text-neutral-500">
            New messages refresh automatically.
          </p>
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="btn-line disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </section>
  );
}
