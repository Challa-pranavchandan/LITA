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

type UploadItem = {
  id: string
  file: File
  previewUrl: string
  status: "uploading" | "done" | "error"
  key?: string
  error?: string
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
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const price = getCharcoalPortraitPrice(size, personCount)

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
            ? { ...upload, status: "done", key: uploadUrl.key }
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

    const images: CommissionImage[] = uploads
      .filter((upload) => upload.status === "done" && upload.key)
      .map((upload) => ({
        key: upload.key!,
        filename: upload.file.name,
        mime: upload.file.type,
        size: upload.file.size,
      }))

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
        <Link href="/account" className="btn-solid inline-block">
          View in My Account
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isLoggedIn && (
        <div className="flex flex-col gap-3 border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold">Sign in required:</span> Sign in to
            submit your portrait request and track it in your account.
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
          Reference photos{" "}
          <span className="text-xs text-graphite/60">
            (Optional · up to 5 images · JPG, PNG, WEBP · 10MB each)
          </span>
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isLoggedIn || uploads.length >= 5}
          className="w-full cursor-pointer rounded border border-dashed border-dust bg-white p-6 text-center transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
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
          <span className="block text-sm font-medium text-ink">
            {uploads.length >= 5
              ? "Maximum 5 reference images reached"
              : "Choose reference photos"}
          </span>
          <span className="mt-1 block text-xs text-graphite">
            Upload the photo(s) you would like the artist to use for your portrait.
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

      <button
        type="submit"
        disabled={pending || !isLoggedIn || !price}
        className="btn-solid w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Submitting…"
          : `Request Portrait${price ? ` · ₹${price.toLocaleString("en-IN")}` : ""}`}
      </button>
      <p className="text-xs leading-relaxed text-graphite">
        The fixed price is saved with your commission request. Once you accept
        it, the studio prepares your payment order.
      </p>
    </form>
  )
}
