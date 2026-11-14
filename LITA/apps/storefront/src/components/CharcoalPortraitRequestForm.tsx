"use client"

import Link from "next/link"
import { useRef, useState, useTransition } from "react"
import {
  getCharcoalPortraitPrice,
  type CharcoalPortraitSize,
} from "@/lib/charcoal-portrait-pricing"
import {
  createCommissionRequest,
  getCommissionUploadUrl,
  type CommissionImage,
} from "@/lib/data/commission"

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.04 2a9.87 9.87 0 0 0-8.52 14.86L2 22l5.28-1.38A9.93 9.93 0 0 0 12.04 2Zm0 18.18h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.18 8.18 0 1 1 6.98 3.86Zm4.49-6.13c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.78.98-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-.1-.74-.67-1.24-1.49-1.39-1.74-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.16.04-.31-.02-.43-.07-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.12.16 1.75 2.67 4.24 3.74.59.25 1.05.4 1.41.51.59.19 1.13.16 1.56.1.48-.07 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

type UploadItem = {
  id: string
  file: File
  previewUrl: string
  status: "uploading" | "done" | "error"
  key?: string
  downloadUrl?: string
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CharcoalPortraitRequestForm({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean
}) {
  const [size, setSize] = useState<CharcoalPortraitSize>("A4")
  const [personCount, setPersonCount] = useState(1)
  const [portraitFor, setPortraitFor] = useState("")
  const [details, setDetails] = useState("")
  const [requirements, setRequirements] = useState("")
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [createdCommission, setCreatedCommission] = useState<any>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const price = getCharcoalPortraitPrice(size, personCount)

  function buildWhatsAppUrl() {
    const phone = "917799671321"
    const lines: string[] = [
      "Hello Livin In The Art Atelier,",
      "",
      "I would like to order a Hand-Drawn Charcoal Portrait:",
      `• Paper Size: ${size}`,
      `• Number of Subjects: ${personCount} ${personCount === 1 ? "person" : "people"}`,
    ]

    if (price) {
      lines.push(`• Fixed Atelier Price: ₹${price.toLocaleString("en-IN")}`)
    }
    if (portraitFor.trim()) {
      lines.push(`• Portrait For: ${portraitFor.trim()}`)
    }
    if (details.trim()) {
      lines.push(`• Details/Pose: ${details.trim()}`)
    }
    if (requirements.trim()) {
      lines.push(`• Notes: ${requirements.trim()}`)
    }
    if (uploads.length > 0) {
      lines.push("")
      lines.push(`• Reference Photos (${uploads.length}):`)
      uploads.forEach((item, idx) => {
        const sizeStr = formatBytes(item.file.size)
        if (item.downloadUrl) {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr}) - ${item.downloadUrl}`)
        } else {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr})`)
        }
      })
      lines.push("  *(I am sharing these reference photos directly in this WhatsApp chat)*")
    }

    lines.push("", "Please assist me with completing my portrait order. Thank you!")
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`
  }

  function buildSubmittedWhatsAppUrl() {
    const phone = "917799671321"
    const refText = createdCommission?.id ? ` (Ref: #${createdCommission.id.slice(-6).toUpperCase()})` : ""
    const lines: string[] = [
      "Hello Livin In The Art Atelier,",
      "",
      `I have requested a Hand-Drawn Charcoal Portrait${refText}:`,
      `• Paper Size: ${size}`,
      `• Number of Subjects: ${personCount} ${personCount === 1 ? "person" : "people"}`,
    ]

    if (price) {
      lines.push(`• Fixed Atelier Price: ₹${price.toLocaleString("en-IN")}`)
    }

    const imagesToDisplay = createdCommission?.images || []
    if (imagesToDisplay.length > 0) {
      lines.push("")
      lines.push(`• Uploaded Reference Photos (${imagesToDisplay.length}):`)
      imagesToDisplay.forEach((img: any, idx: number) => {
        if (img.url) {
          lines.push(`  ${idx + 1}. ${img.filename || `Photo ${idx + 1}`} - ${img.url}`)
        } else {
          lines.push(`  ${idx + 1}. ${img.filename || `Photo ${idx + 1}`}`)
        }
      })
    } else if (uploads.length > 0) {
      lines.push("")
      lines.push(`• Reference Photos (${uploads.length}):`)
      uploads.forEach((item, idx) => {
        const sizeStr = formatBytes(item.file.size)
        if (item.downloadUrl) {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr}) - ${item.downloadUrl}`)
        } else {
          lines.push(`  ${idx + 1}. ${item.file.name} (${sizeStr})`)
        }
      })
    }

    lines.push("", "Looking forward to following progress in my account. Thank you!")
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`
  }

  async function handleFileUpload(file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setFormError(`"${file.name}" is not supported. Upload a JPG, PNG, or WEBP image.`)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError(`"${file.name}" exceeds the 10MB limit.`)
      return
    }

    const id = crypto.randomUUID()

    if (!isLoggedIn) {
      // Guest users can select photos to preview and prefill into WhatsApp
      const item: UploadItem = {
        id,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "done",
      }
      setUploads((current) => [...current, item])
      return
    }

    const item: UploadItem = {
      id,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
    }
    setUploads((current) => [...current, item])

    try {
      const uploadUrl = await getCommissionUploadUrl(file.name, file.type, file.size)
      if (!uploadUrl.ok || !uploadUrl.url || !uploadUrl.key) {
        throw new Error(uploadUrl.error || "Failed to prepare image upload.")
      }

      const response = await fetch(uploadUrl.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!response.ok) {
        throw new Error(`Image upload failed with status ${response.status}.`)
      }

      setUploads((current) =>
        current.map((upload) =>
          upload.id === id
            ? { ...upload, status: "done", key: uploadUrl.key, downloadUrl: uploadUrl.downloadUrl }
            : upload
        )
      )
    } catch (error: unknown) {
      setUploads((current) =>
        current.map((upload) =>
          upload.id === id
            ? {
                ...upload,
                status: "error",
                error: error instanceof Error ? error.message : "Image upload failed.",
              }
            : upload
        )
      )
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length + uploads.length > 5) {
      setFormError("You can upload a maximum of 5 reference images.")
      event.target.value = ""
      return
    }
    setFormError(null)
    files.forEach((file) => void handleFileUpload(file))
    event.target.value = ""
  }

  function removeUpload(id: string) {
    setUploads((current) => {
      const item = current.find((upload) => upload.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return current.filter((upload) => upload.id !== id)
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!isLoggedIn) {
      setFormError("Please sign in to submit your portrait request.")
      return
    }
    if (!price) {
      setFormError("Enter a valid whole number of people.")
      return
    }
    if (!details.trim()) {
      setFormError("Please describe the portrait you have in mind.")
      return
    }
    if (uploads.some((upload) => upload.status === "uploading")) {
      setFormError("Please wait for reference images to finish uploading.")
      return
    }
    if (uploads.some((upload) => upload.status === "error")) {
      setFormError("One or more reference images failed to upload. Please remove or re-upload them.")
      return
    }

    const images: CommissionImage[] = uploads
      .filter((upload) => upload.status === "done" && upload.key)
      .map((upload) => ({
        key: upload.key!,
        filename: upload.file.name,
        mime: upload.file.type,
        size: upload.file.size,
      }))

    if (images.length === 0) {
      setFormError("Please upload at least one reference photo for your portrait.")
      return
    }

    startTransition(async () => {
      const subject = portraitFor.trim()
      const result = await createCommissionRequest({
        title: `Charcoal Portrait${subject ? ` — ${subject}` : ""}`,
        idea: details.trim(),
        requirements: requirements.trim() || undefined,
        medium: "Charcoal Portrait",
        size: `${size} · ${personCount} ${personCount === 1 ? "person" : "people"}`,
        charcoal_portrait: {
          size,
          person_count: personCount,
        },
        images,
      })

      if (result.ok) {
        setCreatedCommission(result.commission || null)
        setSubmitted(true)
      } else {
        setFormError(result.error || "Failed to submit your portrait request.")
      }
    })
  }

  if (submitted) {
    return (
      <div className="space-y-4 border border-dust bg-white p-6 text-center">
        <h2 className="text-2xl font-medium tracking-tightish">
          Portrait request received
        </h2>
        <p className="text-sm leading-relaxed text-graphite">
          Your fixed price is ₹{price?.toLocaleString("en-IN")}. The studio will
          review your request; you can accept the price and follow payment
          progress from your account.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/account" className="btn-solid inline-block">
            View in My Account
          </Link>
          <a
            href={buildSubmittedWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1ebe5d] transition-all shadow-sm"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Follow Up on WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Quick Action: Order on WhatsApp Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded">
        <div className="text-xs text-[#166534] leading-relaxed">
          <span className="font-semibold block sm:inline sm:mr-1">Quick Action:</span>
          Want to share photos directly or order via chat? Connect with our atelier on WhatsApp.
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
        <div className="flex flex-col gap-3 border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold">Sign in required for website portal:</span> Sign in to
            submit your portrait request and track it in your account, or use <strong>Order on WhatsApp</strong> for quick direct ordering.
          </p>
          <Link
            href="/login?next=/commissions/charcoal-portrait"
            className="whitespace-nowrap bg-amber-950 px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-white"
          >
            Log In / Sign Up
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="charcoal-size" className="label">
            Paper size
          </label>
          <select
            id="charcoal-size"
            value={size}
            onChange={(event) =>
              setSize(event.target.value as CharcoalPortraitSize)
            }
            className="field cursor-pointer"
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
          </select>
        </div>
        <div>
          <label htmlFor="charcoal-people" className="label">
            Number of people
          </label>
          <input
            id="charcoal-people"
            type="number"
            min="1"
            step="1"
            required
            value={personCount}
            onChange={(event) => {
              const value = Number(event.target.value)
              setPersonCount(Number.isNaN(value) ? 0 : value)
            }}
            className="field"
          />
        </div>
      </div>

      <div className="border border-dust bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-graphite">
          Fixed portrait price
        </div>
        <div className="mt-1 text-2xl font-medium text-ink">
          {price ? `₹${price.toLocaleString("en-IN")}` : "Enter a valid number"}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-graphite">
          A4: 1 person ₹999, 2 people ₹1,499, then ₹500 per extra person. A3: 1
          person ₹1,500, then ₹600 per extra person.
        </p>
      </div>

      <div>
        <label htmlFor="charcoal-subject" className="label">
          Who is the portrait for? <span className="text-graphite/60">(optional)</span>
        </label>
        <input
          id="charcoal-subject"
          value={portraitFor}
          onChange={(event) => setPortraitFor(event.target.value)}
          className="field"
          placeholder="Names or a short title"
        />
      </div>

      <div>
        <label htmlFor="charcoal-details" className="label">
          Portrait details <span className="text-red-500">*</span>
        </label>
        <textarea
          id="charcoal-details"
          rows={4}
          required
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className="field"
          placeholder="Share pose, preferred reference photo, or any details the artist should know."
        />
      </div>

      <div>
        <label htmlFor="charcoal-requirements" className="label">
          Additional notes <span className="text-graphite/60">(optional)</span>
        </label>
        <textarea
          id="charcoal-requirements"
          rows={3}
          value={requirements}
          onChange={(event) => setRequirements(event.target.value)}
          className="field"
          placeholder="Framing, delivery, or other requests"
        />
      </div>

      <div>
        <label className="label">
          Reference photos <span className="text-red-500">*</span>{" "}
          <span className="text-xs text-graphite/60">
            (Required · at least 1 image, up to 5 · JPG, PNG, WEBP · 10MB each)
          </span>
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploads.length >= 5}
          className="w-full cursor-pointer rounded border border-dashed border-dust bg-white p-6 text-center transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
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
          <span className="block text-sm font-medium text-ink">
            {uploads.length >= 5
              ? "Maximum 5 reference images reached"
              : uploads.length > 0
                ? "Add more reference photos"
                : "Choose reference photos"}
          </span>
          <span className="mt-1 block text-xs text-graphite">
            Upload the photo(s) you would like the artist to use for your portrait (prefilled into WhatsApp order).
          </span>
        </button>

        {uploads.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="group relative aspect-square overflow-hidden rounded border border-dust bg-wall"
              >
                <img
                  src={upload.previewUrl}
                  alt={upload.file.name}
                  className="h-full w-full object-cover"
                />
                <div
                  className={`absolute inset-x-0 bottom-0 p-2 text-xs text-white ${
                    upload.status === "done"
                      ? "bg-emerald-900/80"
                      : upload.status === "error"
                        ? "bg-red-900/80"
                        : "bg-black/70"
                  }`}
                >
                  {upload.status === "uploading"
                    ? "Uploading…"
                    : upload.status === "error"
                      ? upload.error || "Upload failed"
                      : upload.file.name}
                </div>
                <button
                  type="button"
                  onClick={() => removeUpload(upload.id)}
                  aria-label={`Remove ${upload.file.name}`}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-700">
          {formError}
        </p>
      )}

      {/* Quick Actions & Submission Controls */}
      <div className="pt-4 border-t border-[#E5E5E5] space-y-3">
        <div className="text-xs uppercase tracking-wider font-semibold text-graphite">
          Quick Actions &amp; Submission
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="submit"
            disabled={pending || !isLoggedIn || !price}
            className="btn-solid flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Submitting…"
              : `Request Portrait${price ? ` · ₹${price.toLocaleString("en-IN")}` : ""}`}
          </button>
          <a
            href={buildWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded bg-[#25D366] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1ebe5d] active:scale-[0.99] transition-all shadow-sm text-center"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Order on WhatsApp</span>
          </a>
        </div>
        <p className="text-xs leading-relaxed text-graphite">
          The fixed price is saved with your commission request. Alternatively, use <strong>Order on WhatsApp</strong> to send your reference photos and order directly (+91 77996 71321).
        </p>
      </div>
    </form>
  )
}
