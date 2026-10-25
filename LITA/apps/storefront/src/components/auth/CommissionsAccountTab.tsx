"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  acceptCommissionQuote,
  sendCommissionMessage,
  type Commission,
  type CommissionMessage,
} from "@/lib/data/commission";
import { formatMoney } from "@/lib/format";

const statusColor: Record<string, { bg: string; text: string; border: string }> = {
  new: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  in_discussion: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  quoted: { bg: "bg-amber-50", text: "text-amber-850", border: "border-amber-300" },
  accepted: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  converted: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  rejected: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
};

const statusLabels: Record<string, string> = {
  new: "Request Under Review",
  in_discussion: "In Discussion with Studio",
  quoted: "Quote Offered",
  accepted: "Quote Accepted",
  converted: "Order In Progress",
  rejected: "Declined",
  cancelled: "Cancelled",
};

export function CommissionsAccountTab({
  initialCommissions = [],
}: {
  initialCommissions: Commission[];
}) {
  const [commissions, setCommissions] = useState<Commission[]>(initialCommissions);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialCommissions[0]?.id || null
  );

  // Message thread state keyed by commissionId
  const [messagesMap, setMessagesMap] = useState<Record<string, CommissionMessage[]>>({});
  const [loadingMessagesId, setLoadingMessagesId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  // Accept quote transition
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptPending, startAcceptTransition] = useTransition();

  // Send message transition
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendPending, startSendTransition] = useTransition();

  // Preview image modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Load message thread for a commission
  async function loadMessages(commissionId: string) {
    if (messagesMap[commissionId]) return;
    setLoadingMessagesId(commissionId);
    try {
      const res = await fetch(`/api/commissions/${commissionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessagesMap((prev) => ({ ...prev, [commissionId]: data.messages || [] }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingMessagesId(null);
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadMessages(id);
    }
  }

  function handleAcceptQuote(commission: Commission) {
    if (
      !confirm(
        `Accept the studio quote of ₹${commission.quoted_price?.toLocaleString(
          "en-IN"
        )} for "${commission.title}"? The studio will create your draft order.`
      )
    ) {
      return;
    }

    setAcceptingId(commission.id);
    startAcceptTransition(async () => {
      const res = await acceptCommissionQuote(commission.id);
      if (res.ok && res.commission) {
        setCommissions((prev) =>
          prev.map((c) => (c.id === commission.id ? { ...c, status: "accepted" } : c))
        );
      } else {
        alert(res.error || "Failed to accept quote. Please try again.");
      }
      setAcceptingId(null);
    });
  }

  function handleSendMessage(commissionId: string) {
    const text = replyTextMap[commissionId]?.trim();
    if (!text) return;

    setSendingId(commissionId);
    startSendTransition(async () => {
      const res = await sendCommissionMessage(commissionId, text);
      if (res.ok && res.message) {
        setMessagesMap((prev) => ({
          ...prev,
          [commissionId]: [...(prev[commissionId] || []), res.message!],
        }));
        setReplyTextMap((prev) => ({ ...prev, [commissionId]: "" }));
      } else {
        alert(res.error || "Failed to send message.");
      }
      setSendingId(null);
    });
  }

  if (!commissions.length) {
    return (
      <div className="border border-dust bg-wall p-8 md:p-12 text-center rounded">
        <h3 className="font-serif text-2xl font-normal text-ink mb-2">
          No Custom Art Commissions
        </h3>
        <p className="text-graphite text-sm max-w-md mx-auto mb-6 leading-relaxed">
          You haven't commissioned any bespoke artworks yet. Share an original idea with the artist to begin a private collaboration.
        </p>
        <Link href="/commissions" className="btn-solid inline-flex items-center">
          Commission an Artwork
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* List of Commissions */}
      {commissions.map((item) => {
        const isExpanded = expandedId === item.id;
        const color = statusColor[item.status] || statusColor.new;
        const messages = messagesMap[item.id] || [];

        return (
          <div
            key={item.id}
            className="border border-[#EAEAEA] bg-white rounded-lg overflow-hidden transition-all duration-200 shadow-sm"
          >
            {/* Header row / summary */}
            <div
              onClick={() => toggleExpand(item.id)}
              className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/60 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs text-[#888888]">{item.id}</span>
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full border ${color.bg} ${color.text} ${color.border}`}
                  >
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-medium text-[#222222]">
                  {item.title}
                </h3>
                <div className="text-xs text-[#666666] flex flex-wrap gap-x-4 gap-y-1">
                  <span>{item.medium || "Bespoke Medium"}</span>
                  {item.size && <span>· {item.size}</span>}
                  <span>
                    · Submitted{" "}
                    {new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Status / Quote Highlight & Expand Arrow */}
              <div className="flex items-center gap-4 self-end md:self-auto">
                <div className="text-right">
                  {item.quoted_price ? (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#888888] block">
                        Official Quote
                      </span>
                      <span className="font-semibold text-base text-[#111111]">
                        ₹{item.quoted_price.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ) : item.budget ? (
                    <div className="text-xs text-[#666666]">
                      Target: ₹{item.budget.toLocaleString("en-IN")}
                    </div>
                  ) : (
                    <div className="text-xs text-[#888888] italic">Awaiting Quote</div>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full border border-[#EAEAEA] flex items-center justify-center text-[#555555]">
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Expanded Detail Body */}
            {isExpanded && (
              <div className="border-t border-[#EAEAEA] bg-[#FAF8F5]/40 p-5 md:p-8 space-y-6">
                {/* Visual Status Progression Timeline */}
                <div className="py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] mb-3">
                    Progress Timeline
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      {
                        label: "1. Request Sent",
                        active: true,
                        completed: item.status !== "new",
                      },
                      {
                        label: "2. Discussion",
                        active: ["in_discussion", "quoted", "accepted", "converted"].includes(
                          item.status
                        ),
                        completed: ["quoted", "accepted", "converted"].includes(item.status),
                      },
                      {
                        label: "3. Quote Ready",
                        active: ["quoted", "accepted", "converted"].includes(item.status),
                        completed: ["accepted", "converted"].includes(item.status),
                      },
                      {
                        label: "4. Order Created",
                        active: item.status === "converted",
                        completed: item.status === "converted",
                      },
                    ].map((step, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-1.5 transition-colors ${
                            step.completed
                              ? "bg-[#111111] text-white"
                              : step.active
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-[#EAEAEA] text-[#999999]"
                          }`}
                        >
                          {step.completed ? "✓" : idx + 1}
                        </div>
                        <span
                          className={`text-[11px] leading-tight ${
                            step.active ? "font-medium text-[#111111]" : "text-[#888888]"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote Action Box (when status === "quoted") */}
                {item.status === "quoted" && (
                  <div className="border border-amber-300 bg-amber-50/70 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                        Formal Studio Quote Prepared
                      </div>
                      <div className="text-xl md:text-2xl font-serif font-medium text-amber-950 mt-1">
                        ₹{item.quoted_price?.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-sans text-amber-800">
                          (Archival materials, framing & art freight included)
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/80 mt-1">
                        Review the quote and discussion thread below. When you're ready, accept the quote to have the studio generate your custom order.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={acceptPending}
                      onClick={() => handleAcceptQuote(item)}
                      className="px-6 py-3 bg-[#111111] text-white rounded font-medium text-xs uppercase tracking-wider hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {acceptingId === item.id ? "Accepting Quote…" : "Accept Quote"}
                    </button>
                  </div>
                )}

                {/* Order Converted Notification */}
                {item.order_id && (
                  <div className="border border-emerald-200 bg-emerald-50/70 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                        Bespoke Order Generated
                      </div>
                      <div className="text-sm text-emerald-950 mt-1">
                        Your custom commission is officially linked to Order{" "}
                        <span className="font-mono font-semibold">{item.order_id}</span>.
                      </div>
                    </div>
                    <Link
                      href="/account"
                      className="px-5 py-2.5 bg-emerald-900 text-white rounded text-xs font-medium uppercase tracking-wider hover:bg-emerald-950 transition-colors whitespace-nowrap"
                    >
                      View in Orders
                    </Link>
                  </div>
                )}

                {/* Idea & Specifications */}
                <div className="bg-white p-5 rounded border border-[#EAEAEA] space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
                    Artistic Vision
                  </div>
                  <p className="text-sm text-[#333333] whitespace-pre-wrap leading-relaxed">
                    {item.idea}
                  </p>

                  {item.requirements && (
                    <div className="pt-2 border-t border-[#EAEAEA]">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] mb-1">
                        Placement & Framing Context
                      </div>
                      <p className="text-sm text-[#555555] whitespace-pre-wrap leading-relaxed">
                        {item.requirements}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reference Images Gallery */}
                {item.images?.length ? (
                  <div className="bg-white p-5 rounded border border-[#EAEAEA] space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
                      Attached Reference Materials ({item.images.length})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {item.images.map((img, idx) => (
                        <div
                          key={img.key || idx}
                          onClick={() => setPreviewImageUrl(img.url || null)}
                          className="aspect-square border border-[#EAEAEA] rounded overflow-hidden cursor-pointer group relative bg-neutral-100"
                        >
                          {img.url ? (
                            <img
                              src={img.url}
                              alt={img.filename || `Reference ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[#888888] p-2 text-center">
                              {img.filename}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium">
                            Enlarge
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Negotiation / Discussion Thread */}
                <div className="bg-white p-5 rounded border border-[#EAEAEA] space-y-4">
                  <div className="border-b border-[#EAEAEA] pb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
                      Studio Discussion Thread
                    </div>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Chat directly with the artist to discuss dimensions, framing, pigments, and revisions.
                    </p>
                  </div>

                  {/* Messages list */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {loadingMessagesId === item.id ? (
                      <div className="text-center py-6 text-xs text-[#888888]">
                        Loading studio messages…
                      </div>
                    ) : !messages.length ? (
                      <div className="text-center py-6 text-xs text-[#888888] italic">
                        No messages exchanged yet. Send a note below to discuss details with the studio.
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isArtist = msg.sender === "admin";
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              isArtist ? "items-start" : "items-end"
                            }`}
                          >
                            <div className="text-[10px] text-[#888888] mb-0.5 px-1">
                              <span className="font-semibold">
                                {isArtist ? "LITA Studio Artist" : "You"}
                              </span>{" "}
                              ·{" "}
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div
                              className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                                isArtist
                                  ? "bg-[#F3EFEA] text-[#222222] border border-[#E5DFD5]"
                                  : "bg-[#111111] text-white"
                              }`}
                            >
                              {msg.body}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Input Box */}
                  <div className="pt-2 border-t border-[#EAEAEA] space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Type a message or question to the studio..."
                      value={replyTextMap[item.id] || ""}
                      onChange={(e) =>
                        setReplyTextMap((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="field text-xs"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={sendPending || !replyTextMap[item.id]?.trim()}
                        onClick={() => handleSendMessage(item.id)}
                        className="btn-solid text-xs py-2 px-4 cursor-pointer disabled:opacity-50"
                      >
                        {sendingId === item.id ? "Sending…" : "Send Message"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal image preview */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[90vh]">
            <img
              src={previewImageUrl}
              alt="Enlarged Reference Preview"
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
            <div className="text-center text-white/80 text-xs mt-2">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
