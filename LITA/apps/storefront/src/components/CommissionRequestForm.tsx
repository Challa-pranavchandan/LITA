"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  createCommissionRequest,
  getCommissionUploadUrl,
  type CommissionImage,
} from "@/lib/data/commission";

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.04 2a9.87 9.87 0 0 0-8.52 14.86L2 22l5.28-1.38A9.93 9.93 0 0 0 12.04 2Zm0 18.18h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.18 8.18 0 1 1 6.98 3.86Zm4.49-6.13c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.78.98-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-.1-.74-.67-1.24-1.49-1.39-1.74-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.16.04-.31-.02-.43-.07-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.12.16 1.75 2.67 4.24 3.74.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  key?: string;
  downloadUrl?: string;
  error?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CommissionRequestForm({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("Charcoal on Paper");
  const [size, setSize] = useState("Medium (A3 - 11.7 x 16.5 in)");
  const [deadline, setDeadline] = useState("");
  const [idea, setIdea] = useState("");
  const [requirements, setRequirements] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [createdCommission, setCreatedCommission] = useState<any>(null);
  const [pending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  function buildWhatsAppUrl() {
    const phone = "917799671321";
    const lines: string[] = [
      "Hello Livin In The Art Atelier,",
      "",
      "I would like to order / discuss a bespoke art commission:",
    ];

    if (title.trim()) {
      lines.push(`• Title/Concept: ${title.trim()}`);
    }
    if (medium) {
      lines.push(`• Preferred Medium: ${medium}`);
    }
    if (size) {
      lines.push(`• Dimensions/Size: ${size}`);
    }
    if (deadline) {
      lines.push(`• Target Completion: ${deadline}`);
    }
    if (idea.trim()) {
      lines.push(`• Artistic Vision: ${idea.trim()}`);
    }
    if (requirements.trim()) {
      lines.push(`• Notes/Placement: ${requirements.trim()}`);
    }
    if (uploads.length > 0) {
      lines.push("");
      lines.push(`• Reference Images (${uploads.length}):`);
      uploads.forEach((item, idx) => {
        const sizeStr = formatBytes(item.file.size);
        if (item.downloadUrl) {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr}) - ${item.downloadUrl}`);
        } else {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr})`);
        }
      });
      lines.push("  *(I am sharing these reference photos directly in this WhatsApp chat)*");
    }

    lines.push("", "Please advise on feasibility, quote, and next steps. Thank you!");
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function buildSubmittedWhatsAppUrl() {
    const phone = "917799671321";
    const refText = createdCommission?.id ? ` (Ref: #${createdCommission.id.slice(-6).toUpperCase()})` : "";
    const lines: string[] = [
      "Hello Livin In The Art Atelier,",
      "",
      `I have submitted a bespoke commission request${refText}:`,
    ];

    if (title.trim()) lines.push(`• Title: ${title.trim()}`);
    if (medium) lines.push(`• Medium: ${medium}`);
    if (size) lines.push(`• Size: ${size}`);

    const imagesToDisplay = createdCommission?.images || [];
    if (imagesToDisplay.length > 0) {
      lines.push("");
      lines.push(`• Uploaded Reference Images (${imagesToDisplay.length}):`);
      imagesToDisplay.forEach((img: any, idx: number) => {
        if (img.url) {
          lines.push(`  ${idx + 1}. ${img.filename || `Image ${idx + 1}`} - ${img.url}`);
        } else {
          lines.push(`  ${idx + 1}. ${img.filename || `Image ${idx + 1}`}`);
        }
      });
    } else if (uploads.length > 0) {
      lines.push("");
      lines.push(`• Reference Images (${uploads.length}):`);
      uploads.forEach((item, idx) => {
        const sizeStr = formatBytes(item.file.size);
        if (item.downloadUrl) {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr}) - ${item.downloadUrl}`);
        } else {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr})`);
        }
      });
    }

    lines.push("", "Looking forward to your review and artist proposal. Thank you!");
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  // Handle uploading individual file to Cloudflare R2 via presigned PUT URL
  async function handleFileUpload(file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert(`"${file.name}" is not a supported format. Please upload JPG, PNG, or WEBP.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(`"${file.name}" exceeds the 10MB limit.`);
      return;
    }

    const tempId = Math.random().toString(36).substring(2, 9);
    const previewUrl = URL.createObjectURL(file);

    if (!isLoggedIn) {
      // Guest users can select images to preview and prefill their WhatsApp order
      const newItem: UploadItem = {
        id: tempId,
        file,
        previewUrl,
        status: "done",
      };
      setUploads((prev) => [...prev, newItem]);
      return;
    }

    const newItem: UploadItem = {
      id: tempId,
      file,
      previewUrl,
      status: "uploading",
    };

    setUploads((prev) => [...prev, newItem]);

    try {
      const urlRes = await getCommissionUploadUrl(file.name, file.type, file.size);
      if (!urlRes.ok || !urlRes.url || !urlRes.key) {
        throw new Error(urlRes.error || "Failed to generate upload link.");
      }

      // Direct upload to R2
      const putRes = await fetch(urlRes.url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(`R2 upload failed with status ${putRes.status}`);
      }

      // Mark done
      setUploads((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, status: "done", key: urlRes.key, downloadUrl: urlRes.downloadUrl }
            : item
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Upload failed.";
      setUploads((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, status: "error", error: errMsg }
            : item
        )
      );
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length + uploads.length > 5) {
      alert("You can upload a maximum of 5 reference images.");
      return;
    }
    for (const f of files) {
      handleFileUpload(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeUpload(id: string) {
    setUploads((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Please provide a title or brief concept for your commission.");
      return;
    }

    if (!idea.trim()) {
      setFormError("Please share details about your artistic vision or description.");
      return;
    }

    // Check if any files are still uploading
    const stillUploading = uploads.some((u) => u.status === "uploading");
    if (stillUploading) {
      setFormError("Please wait for all reference images to finish uploading.");
      return;
    }

    const readyImages: CommissionImage[] = uploads
      .filter((u) => u.status === "done" && u.key)
      .map((u) => ({
        key: u.key!,
        filename: u.file.name,
        mime: u.file.type,
        size: u.file.size,
      }));

    startTransition(async () => {
      const res = await createCommissionRequest({
        title: title.trim(),
        idea: idea.trim(),
        requirements: requirements.trim() || undefined,
        medium,
        size,
        deadline: deadline || undefined,
        images: readyImages,
      });

      if (res.ok) {
        setCreatedCommission(res.commission || null);
        setSubmitted(true);
      } else {
        setFormError(res.error || "Failed to submit commission request.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="border border-dust bg-wall p-8 md:p-12 text-center max-w-2xl mx-auto space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#111111] text-white flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tightish">
          Commission Request Received
        </h2>
        <p className="text-graphite leading-relaxed max-w-lg mx-auto text-[15px]">
          Thank you for sharing your vision. The studio is reviewing your concept and reference materials. You will receive a personalized quote and discussion notes directly in your account dashboard.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/account" className="btn-solid">
            View in My Account
          </Link>
          <a
            href={buildSubmittedWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1ebe5d] transition-all shadow-sm"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Quick Follow-up on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              setTitle("");
              setIdea("");
              setRequirements("");
              setDeadline("");
              setUploads([]);
              setCreatedCommission(null);
              setSubmitted(false);
            }}
            className="btn-line"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick Action: Order on WhatsApp Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded">
        <div className="text-xs text-[#166534] leading-relaxed">
          <span className="font-semibold block sm:inline sm:mr-1">Quick Action:</span>
          Need immediate consultation or prefer ordering directly via chat? Connect with the atelier on WhatsApp.
        </div>
        <a
          href={buildWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1ebe5d] transition-all shrink-0 shadow-sm"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          <span>Order on WhatsApp</span>
        </a>
      </div>

      {!isLoggedIn && (
        <div className="border border-amber-200 bg-amber-50/70 p-4 rounded text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-semibold">Sign in required for website portal:</span> You must be logged into your account to submit through the website, or use <strong>Order on WhatsApp</strong> for instant ordering.
          </div>
          <Link
            href="/login?next=/commissions"
            className="inline-block px-4 py-2 bg-amber-950 text-white rounded text-xs font-medium uppercase tracking-wider hover:bg-black transition-colors whitespace-nowrap text-center"
          >
            Log In / Sign Up
          </Link>
        </div>
      )}

      {/* Title / Concept */}
      <div>
        <label htmlFor="commission-title" className="label">
          Artwork Title / Concept Name <span className="text-red-500">*</span>
        </label>
        <input
          id="commission-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Meditative Mandala with Golden Leaf, Sacred Geometry in Charcoal"
          className="field"
        />
      </div>

      {/* Medium & Size */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="commission-medium" className="label">
            Preferred Medium
          </label>
          <select
            id="commission-medium"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            className="field cursor-pointer"
          >
            <option value="Charcoal on Paper">Charcoal on Paper</option>
            <option value="Acrylic on Canvas">Acrylic on Canvas</option>
            <option value="Pen & Ink Stippling">Pen & Ink Stippling</option>
            <option value="Sacred Mandala Art">Sacred Mandala Art</option>
            <option value="Oil on Linen">Oil on Linen</option>
            <option value="Watercolor & Gouache">Watercolor & Gouache</option>
            <option value="Textured Mixed Media">Textured Mixed Media</option>
            <option value="Other / Open to Artist Advice">Other / Open to Artist Advice</option>
          </select>
        </div>

        <div>
          <label htmlFor="commission-size" className="label">
            Target Dimensions / Size
          </label>
          <select
            id="commission-size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="field cursor-pointer"
          >
            <option value="Small (A4 - 8.3 x 11.7 in)">Small (A4 — 8.3 x 11.7 in)</option>
            <option value="Medium (A3 - 11.7 x 16.5 in)">Medium (A3 — 11.7 x 16.5 in)</option>
            <option value="Large (A2 - 16.5 x 23.4 in)">Large (A2 — 16.5 x 23.4 in)</option>
            <option value="Statement (24 x 36 in / 60 x 90 cm)">Statement (24 x 36 in / 60 x 90 cm)</option>
            <option value="Oversized (36 x 48 in or larger)">Oversized (36 x 48 in or larger)</option>
            <option value="Custom Size (Specify in details)">Custom Size (Specify in details)</option>
          </select>
        </div>
      </div>

      {/* Target Deadline */}
      <div>
        <label htmlFor="commission-deadline" className="label">
          Target Completion Date <span className="text-graphite/60 text-xs">(optional)</span>
        </label>
        <input
          id="commission-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="field"
        />
      </div>

      {/* Artistic Vision & Concept Description */}
      <div>
        <label htmlFor="commission-idea" className="label">
          Artistic Vision & Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="commission-idea"
          required
          rows={5}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe your vision: motifs, emotions, subjects, symbolic elements, or personal stories you wish to have immortalized..."
          className="field"
        />
      </div>

      {/* Specific Placement / Requirements */}
      <div>
        <label htmlFor="commission-reqs" className="label">
          Placement, Framing & Color Notes <span className="text-graphite/60 text-xs">(optional)</span>
        </label>
        <textarea
          id="commission-reqs"
          rows={3}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="e.g. To hang above a walnut credenza in warm afternoon light. Prefer minimalist floating frame in black or oak..."
          className="field"
        />
      </div>

      {/* Direct R2 Reference Image Upload */}
      <div>
        <label className="label">
          Reference Images & Moodboard <span className="text-graphite/60 text-xs">(Max 5 images · JPG, PNG, WEBP · up to 10MB each)</span>
        </label>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-dust hover:border-ink bg-wall p-6 rounded text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploads.length >= 5}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <svg
              className="w-8 h-8 text-graphite"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="text-sm font-medium text-ink">
              {uploads.length >= 5
                ? "Maximum 5 reference images reached"
                : "Click or drag images here to attach"}
            </div>
            <div className="text-xs text-graphite">
              Reference photographs, room sketches, or inspiration artworks (prefilled into WhatsApp order)
            </div>
          </div>
        </div>

        {/* Thumbnail Preview Grid */}
        {uploads.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square border border-dust bg-wall rounded overflow-hidden group"
              >
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />

                {/* Status Indicator */}
                {item.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-medium">
                    Uploading…
                  </div>
                )}
                {item.status === "error" && (
                  <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center text-white text-xs p-1 text-center">
                    Failed
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeUpload(item.id)}
                  aria-label="Remove image"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formError && (
        <div role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">
          {formError}
        </div>
      )}

      {/* Quick Actions & Submission Controls */}
      <div className="pt-6 border-t border-[#E5E5E5] space-y-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-graphite block mb-1">
            Quick Actions &amp; Submission
          </span>
          <p className="text-xs text-graphite/80 leading-relaxed">
            Submit your concept through our secure atelier portal, or use our quick action to order and consult immediately with the artist via WhatsApp.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="submit"
            disabled={!isLoggedIn || pending}
            className="btn-solid flex-1 sm:flex-initial"
          >
            {pending ? "Submitting Commission Vision…" : "Submit Commission Request"}
          </button>

          <a
            href={buildWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded bg-[#25D366] text-white font-semibold text-xs uppercase tracking-wider hover:bg-[#1ebe5d] active:scale-[0.99] transition-all shadow-sm text-center"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Order on WhatsApp</span>
          </a>
        </div>

        <p className="text-[11px] text-graphite/70">
          Quick actions connect directly with the Livin In The Art atelier desk (+91 77996 71321) with your entered specifications pre-filled.
        </p>
      </div>
    </form>
  );
}
