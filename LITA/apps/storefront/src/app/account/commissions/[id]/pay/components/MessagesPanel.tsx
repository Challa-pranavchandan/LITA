"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  sendCommissionMessage,
  getCommissionUploadUrl,
  type CommissionMessage,
} from "@/lib/data/commission";

const REFRESH_INTERVAL = 15_000;

interface MessagesPanelProps {
  commissionId: string;
  initialMessages: CommissionMessage[];
  onMessageCountChange?: (count: number) => void;
}

function mergeMessages(
  current: CommissionMessage[],
  incoming: CommissionMessage[]
): CommissionMessage[] {
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function formatMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatMessageDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function MessagesPanel({
  commissionId,
  initialMessages,
  onMessageCountChange,
}: MessagesPanelProps) {
  const [messages, setMessages] = useState<CommissionMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMountedRef = useRef(false);

  // Auto-scroll on mount and when messages change
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "nearest",
    });
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      scrollToBottom(false);
    } else {
      scrollToBottom(true);
    }
  }, [messages.length]);

  // Sync count to parent if provided
  useEffect(() => {
    onMessageCountChange?.(messages.length);
  }, [messages.length, onMessageCountChange]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Auto-refresh via polling
  const refreshMessages = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch(
        `/api/commissions/${encodeURIComponent(commissionId)}/messages`,
        { cache: "no-store" }
      );
      if (!response.ok) return;
      const data: { messages: CommissionMessage[] } = await response.json();
      if (Array.isArray(data.messages)) {
        setMessages((current) => mergeMessages(current, data.messages));
      }
    } catch {
      // Background poll failure is silent to avoid disturbing client
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || isPending) return;

    startTransition(async () => {
      const result = await sendCommissionMessage(commissionId, cleanBody);
      if (!result.ok || !result.message) {
        setToast({
          type: "error",
          text: result.error || "Message could not be sent. Please try again.",
        });
        return;
      }

      setMessages((current) => mergeMessages(current, [result.message!]));
      setBody("");
      setToast({
        type: "success",
        text: "Message delivered to the studio artist.",
      });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast({ type: "error", text: "Please select an image file (JPEG, PNG, or WebP)." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: "error", text: "Image must be under 10MB." });
      return;
    }

    setIsUploading(true);
    try {
      const uploadRes = await getCommissionUploadUrl(file.name, file.type, file.size);
      if (!uploadRes.ok || !uploadRes.url) {
        throw new Error(uploadRes.error || "Failed to generate upload URL.");
      }

      const putRes = await fetch(uploadRes.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Direct upload failed.");
      }

      // Append upload note to composer
      setBody((prev) =>
        prev
          ? `${prev}\n[Attached reference image: ${file.name}]`
          : `[Attached reference image: ${file.name}]`
      );
      setToast({ type: "success", text: `Image attached: ${file.name}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image attachment failed.";
      setToast({ type: "error", text: msg });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      role="tabpanel"
      id="panel-messages"
      aria-labelledby="tab-messages"
      className="flex flex-col h-[600px] border border-[#eee7de] rounded-lg bg-[#faf8f5] overflow-hidden"
    >
      {/* ── Chat Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#eee7de]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#5f2f3c] text-white flex items-center justify-center text-xs font-serif font-semibold">
              A
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"
              title="Studio active"
            />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Studio Atelier
            </h2>
            <p className="text-[11px] text-neutral-500">
              Private correspondence with the artist
            </p>
          </div>
        </div>

        <span className="text-[11px] text-neutral-400 font-mono">
          Refreshes every 15s
        </span>
      </div>

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-2 text-xs font-medium text-center transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-b border-emerald-200"
              : "bg-red-50 text-red-900 border-b border-red-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* ── Message Thread ── */}
      <div
        aria-live="polite"
        className="flex-1 overflow-y-auto p-5 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
            <span className="text-4xl mb-3 select-none" aria-hidden="true">
              👋
            </span>
            <h3 className="font-cormorant text-xl text-neutral-900 mb-1">
              Say hello to your artist
            </h3>
            <p className="text-xs text-neutral-600 max-w-sm leading-relaxed">
              Have specific ideas, framing requests, or reference materials?
              Drop a message here to refine your bespoke piece.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isClient = message.sender === "client";
            const timeStr = formatMessageTime(message.created_at);
            const dateStr = formatMessageDate(message.created_at);

            return (
              <div
                key={message.id}
                className={`flex flex-col ${
                  isClient ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${
                    isClient ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Sender Avatar */}
                  {!isClient ? (
                    <div
                      className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[11px] font-serif font-bold flex-shrink-0 mb-1"
                      title="Artist Studio"
                    >
                      A
                    </div>
                  ) : null}

                  {/* Speech Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                      isClient
                        ? "bg-[#5f2f3c] text-white rounded-br-sm"
                        : "bg-white text-neutral-900 border border-[#eee7de] rounded-bl-sm"
                    }`}
                  >
                    {message.body}
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-neutral-400 mt-1 px-1">
                  {isClient ? "You" : "Artist"} · {dateStr} at {timeStr}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Composer Form ── */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 bg-white border-t border-[#eee7de]"
      >
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            maxLength={4000}
            placeholder="Type your message to the artist... (Press Enter to send)"
            className="w-full resize-none rounded-lg border border-[#eee7de] bg-[#faf8f5] p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5f2f3c]"
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          {/* Attach image button */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAttachImage}
              className="hidden"
              id="commission-attach-image"
              aria-label="Attach reference image"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isPending}
              aria-label="Attach reference photo"
              title="Attach reference photo"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f2f3c] disabled:opacity-50 cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-neutral-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span>{isUploading ? "Uploading..." : "Attach Image"}</span>
            </button>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={isPending || !body.trim() || isUploading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-[#5f2f3c] text-white text-xs uppercase tracking-wider font-medium hover:bg-[#4a242f] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5f2f3c]"
          >
            {isPending ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <span>Send Message</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessagesPanel;
