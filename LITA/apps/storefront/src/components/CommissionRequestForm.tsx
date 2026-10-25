"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  createCommissionRequest,
  getCommissionUploadUrl,
  type CommissionImage,
} from "@/lib/data/commission";

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  key?: string;
  error?: string;
};

export function CommissionRequestForm({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("Charcoal on Paper");
  const [size, setSize] = useState("Medium (A3 - 11.7 x 16.5 in)");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [idea, setIdea] = useState("");
  const [requirements, setRequirements] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          item.id === tempId ? { ...item, status: "done", key: urlRes.key } : item
        )
      );
    } catch (err: any) {
      setUploads((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, status: "error", error: err?.message || "Upload failed." }
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
      const cleanBudget = budget ? parseInt(budget.replace(/[^\d]/g, ""), 10) : undefined;
      const res = await createCommissionRequest({
        title: title.trim(),
        idea: idea.trim(),
        requirements: requirements.trim() || undefined,
        medium,
        size,
        budget: cleanBudget && !isNaN(cleanBudget) ? cleanBudget : undefined,
        deadline: deadline || undefined,
        images: readyImages,
      });

      if (res.ok) {
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
          <button
            type="button"
            onClick={() => {
              setTitle("");
              setIdea("");
              setRequirements("");
              setBudget("");
              setDeadline("");
              setUploads([]);
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
      {!isLoggedIn && (
        <div className="border border-amber-200 bg-amber-50/70 p-4 rounded text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-semibold">Sign in required:</span> You must be logged into your account to submit a commission and receive artist quotes.
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

      {/* Budget & Target Deadline */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="commission-budget" className="label">
            Budget Range in ₹ INR <span className="text-graphite/60 text-xs">(optional)</span>
          </label>
          <input
            id="commission-budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 25,000 or 50,000"
            className="field"
          />
        </div>

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
            disabled={!isLoggedIn || uploads.length >= 5}
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
              Reference photographs, room sketches, or inspiration artworks
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

      <div>
        <button
          type="submit"
          disabled={!isLoggedIn || pending}
          className="btn-solid w-full sm:w-auto"
        >
          {pending ? "Submitting Commission Vision…" : "Submit Commission Request"}
        </button>
      </div>
    </form>
  );
}
