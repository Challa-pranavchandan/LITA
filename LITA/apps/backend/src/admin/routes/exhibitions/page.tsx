import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ArrowLeftMini,
  ArrowRightMini,
  CloudArrowUp,
  PhotoSolid,
  Trash,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Text,
  Textarea,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { sdk } from "../../lib/sdk"

type ExhibitionImage = {
  url: string
  alt?: string | null
}

type Exhibition = {
  id: string
  title: string
  description: string
  details: string | null
  location: string | null
  start_date: string
  end_date: string
  image_url: string | null
  image_alt: string | null
  images: ExhibitionImage[] | null
  is_published: boolean
}

type ExhibitionForm = {
  title: string
  description: string
  details: string
  location: string
  start_date: string
  end_date: string
  image_url: string
  image_alt: string
  images: ExhibitionImage[]
  is_published: boolean
}

const emptyForm: ExhibitionForm = {
  title: "",
  description: "",
  details: "",
  location: "",
  start_date: "",
  end_date: "",
  image_url: "",
  image_alt: "",
  images: [],
  is_published: true,
}

function getExhibitionStatus(exhibition: Exhibition) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const today = `${values.year}-${values.month}-${values.day}`
  if (exhibition.end_date < today) return "Past"
  if (exhibition.start_date > today) return "Upcoming"
  return "On view"
}

const ExhibitionsPage = () => {
  const queryClient = useQueryClient()
  const imageInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ExhibitionForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["exhibitions"],
    queryFn: () =>
      sdk.client.fetch<{ exhibitions: Exhibition[] }>("/admin/exhibitions"),
  })

  useEffect(() => {
    if (isError) toast.error("Could not load exhibitions")
  }, [isError])

  const save = useMutation({
    mutationFn: () => {
      const primaryUrl = form.image_url || form.images[0]?.url || null
      const primaryAlt = form.image_alt || form.images[0]?.alt || null

      const payload = {
        title: form.title,
        description: form.description,
        details: form.details?.trim() || null,
        location: form.location?.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        image_url: primaryUrl?.trim() || null,
        image_alt: primaryAlt?.trim() || null,
        images: form.images.length > 0 ? form.images : null,
        is_published: form.is_published,
      }

      return editingId
        ? sdk.client.fetch(`/admin/exhibitions/${editingId}`, {
            method: "POST",
            body: payload,
          })
        : sdk.client.fetch("/admin/exhibitions", {
            method: "POST",
            body: payload,
          })
    },
    onSuccess: () => {
      toast.success(editingId ? "Exhibition updated" : "Exhibition added")
      setForm(emptyForm)
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ["exhibitions"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not save exhibition"),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/exhibitions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Exhibition removed")
      if (editingId) {
        setEditingId(null)
        setForm(emptyForm)
      }
      queryClient.invalidateQueries({ queryKey: ["exhibitions"] })
    },
    onError: (error: Error) =>
      toast.error(error.message || "Could not remove exhibition"),
  })

  async function uploadImages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const filesArray = Array.from(fileList)
    setUploading(true)
    try {
      const { files: uploaded } = await sdk.admin.upload.create({ files: filesArray })
      const validUploaded = uploaded.filter((f) => !!f?.url)
      if (!validUploaded.length) throw new Error("No image URLs returned from upload")

      const newImages: ExhibitionImage[] = validUploaded.map((f) => ({
        url: f.url,
        alt: "",
      }))

      setForm((current) => {
        const combined = [...current.images, ...newImages]
        const primaryUrl = current.image_url || combined[0]?.url || ""
        const primaryAlt = current.image_alt || combined[0]?.alt || ""
        return {
          ...current,
          images: combined,
          image_url: primaryUrl,
          image_alt: primaryAlt,
        }
      })

      toast.success(
        validUploaded.length === 1
          ? "Exhibition image uploaded"
          : `${validUploaded.length} exhibition images uploaded`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload exhibition images"
      )
    } finally {
      setUploading(false)
      if (imageInput.current) imageInput.current.value = ""
    }
  }

  function setCoverImage(index: number) {
    setForm((current) => {
      const target = current.images[index]
      if (!target) return current
      return {
        ...current,
        image_url: target.url,
        image_alt: target.alt || current.image_alt,
      }
    })
    toast.success("Cover image updated")
  }

  function moveImage(index: number, direction: "prev" | "next") {
    setForm((current) => {
      const targetIndex = direction === "prev" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.images.length) return current
      const newImages = [...current.images]
      const [item] = newImages.splice(index, 1)
      newImages.splice(targetIndex, 0, item)
      return {
        ...current,
        images: newImages,
      }
    })
  }

  function updateImageAlt(index: number, alt: string) {
    setForm((current) => {
      const target = current.images[index]
      const isCover = target && target.url === current.image_url
      const newImages = current.images.map((img, i) =>
        i === index ? { ...img, alt } : img
      )
      return {
        ...current,
        images: newImages,
        ...(isCover ? { image_alt: alt } : {}),
      }
    })
  }

  function removeImage(index: number) {
    setForm((current) => {
      const removed = current.images[index]
      const newImages = current.images.filter((_, i) => i !== index)
      let newImageUrl = current.image_url
      let newImageAlt = current.image_alt

      if (removed && removed.url === current.image_url) {
        newImageUrl = newImages[0]?.url || ""
        newImageAlt = newImages[0]?.alt || ""
      }

      return {
        ...current,
        images: newImages,
        image_url: newImageUrl,
        image_alt: newImageAlt,
      }
    })
  }

  function edit(exhibition: Exhibition) {
    setEditingId(exhibition.id)

    let images: ExhibitionImage[] = []
    if (Array.isArray(exhibition.images) && exhibition.images.length > 0) {
      images = exhibition.images.map((img: any) =>
        typeof img === "string" ? { url: img, alt: "" } : { url: img.url, alt: img.alt || "" }
      )
    } else if (exhibition.image_url) {
      images = [{ url: exhibition.image_url, alt: exhibition.image_alt || "" }]
    }

    const coverUrl = exhibition.image_url || images[0]?.url || ""
    const coverAlt = exhibition.image_alt || images[0]?.alt || ""

    setForm({
      title: exhibition.title,
      description: exhibition.description,
      details: exhibition.details || "",
      location: exhibition.location || "",
      start_date: exhibition.start_date,
      end_date: exhibition.end_date,
      image_url: coverUrl,
      image_alt: coverAlt,
      images,
      is_published: exhibition.is_published,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <Container className="divide-y divide-ui-border-base p-0">
      <Toaster />
      <div className="px-6 py-5">
        <Heading level="h1">Exhibitions</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          Add and manage exhibition details. Dates automatically place published
          exhibitions under On View, Upcoming, or Past on the storefront.
        </Text>
      </div>

      <form
        className="grid gap-4 px-6 py-6 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate()
        }}
      >
        <div className="md:col-span-2">
          <Heading level="h2">{editingId ? "Edit exhibition" : "Add exhibition"}</Heading>
        </div>
        <Input
          placeholder="Exhibition title"
          required
          maxLength={200}
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
        />
        <Input
          placeholder="Gallery / venue"
          value={form.location || ""}
          maxLength={300}
          onChange={(event) =>
            setForm((current) => ({ ...current, location: event.target.value }))
          }
        />
        <div>
          <Text size="small" className="mb-1">Start date</Text>
          <Input
            type="date"
            required
            value={form.start_date}
            onChange={(event) =>
              setForm((current) => ({ ...current, start_date: event.target.value }))
            }
          />
        </div>
        <div>
          <Text size="small" className="mb-1">End date</Text>
          <Input
            type="date"
            required
            value={form.end_date}
            onChange={(event) =>
              setForm((current) => ({ ...current, end_date: event.target.value }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <Textarea
            placeholder="Short description shown in exhibition listings"
            required
            rows={3}
            maxLength={4000}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <Textarea
            placeholder="Additional exhibition details (optional)"
            rows={4}
            maxLength={8000}
            value={form.details || ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, details: event.target.value }))
            }
          />
        </div>

        {/* Multiple Image Upload & Manager Section */}
        <div className="space-y-4 rounded-xl border border-ui-border-base bg-ui-bg-subtle/40 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h3" className="text-sm font-semibold">
                  Exhibition Images
                </Heading>
                {form.images.length > 0 && (
                  <Badge size="small" color="grey">
                    {form.images.length} {form.images.length === 1 ? "image" : "images"}
                  </Badge>
                )}
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                Upload multiple photos for this exhibition. You can select one as the cover image, edit alt text, and reorder.
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={imageInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => void uploadImages(event.target.files)}
              />
              <Button
                type="button"
                variant="secondary"
                isLoading={uploading}
                onClick={() => imageInput.current?.click()}
              >
                <CloudArrowUp className="mr-1.5" />
                {form.images.length > 0 ? "Add more images" : "Upload images"}
              </Button>
              {form.images.length > 0 && (
                <Button
                  type="button"
                  variant="transparent"
                  size="small"
                  className="text-ui-fg-muted hover:text-ui-fg-danger"
                  onClick={() => {
                    if (window.confirm("Remove all uploaded images for this exhibition?")) {
                      setForm((current) => ({
                        ...current,
                        images: [],
                        image_url: "",
                        image_alt: "",
                      }))
                    }
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {form.images.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {form.images.map((img, index) => {
                const isCover = form.image_url ? img.url === form.image_url : index === 0
                return (
                  <div
                    key={`${img.url}-${index}`}
                    className={`relative flex flex-col overflow-hidden rounded-lg border bg-white p-2.5 transition-all shadow-sm ${
                      isCover
                        ? "border-ui-border-interactive ring-2 ring-ui-border-interactive/20"
                        : "border-ui-border-base"
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-ui-bg-subtle">
                      <img
                        src={img.url}
                        alt={img.alt || `Exhibition image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-2 top-2">
                        {isCover ? (
                          <Badge size="small" color="green" className="shadow">
                            ★ Cover image
                          </Badge>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCoverImage(index)}
                            className="rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white shadow backdrop-blur transition hover:bg-black/80"
                          >
                            Set as cover
                          </button>
                        )}
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 p-1 backdrop-blur">
                        <IconButton
                          type="button"
                          size="small"
                          variant="transparent"
                          className="text-white hover:text-white"
                          disabled={index === 0}
                          onClick={() => moveImage(index, "prev")}
                          title="Move left"
                        >
                          <ArrowLeftMini />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="small"
                          variant="transparent"
                          className="text-white hover:text-white"
                          disabled={index === form.images.length - 1}
                          onClick={() => moveImage(index, "next")}
                          title="Move right"
                        >
                          <ArrowRightMini />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="small"
                          variant="transparent"
                          className="text-red-300 hover:text-red-400"
                          onClick={() => removeImage(index)}
                          title="Remove image"
                        >
                          <Trash />
                        </IconButton>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <Input
                        size="small"
                        placeholder="Alt / description text"
                        value={img.alt || ""}
                        maxLength={300}
                        onChange={(e) => updateImageAlt(index, e.target.value)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              onClick={() => imageInput.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ui-border-strong bg-ui-bg-base px-6 py-8 text-center transition hover:border-ui-border-interactive hover:bg-ui-bg-subtle"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ui-bg-subtle text-ui-fg-subtle">
                <CloudArrowUp className="h-5 w-5" />
              </div>
              <Text size="small" weight="plus" className="mt-2">
                Click to upload multiple exhibition images
              </Text>
              <Text size="xsmall" className="mt-0.5 text-ui-fg-muted">
                PNG, JPG, WEBP, GIF. Select one or multiple files at once.
              </Text>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                is_published: event.target.checked,
              }))
            }
          />
          Published on storefront
        </label>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" isLoading={save.isPending}>
            {editingId ? "Save exhibition" : "Add exhibition"}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-3 px-6 py-6">
        <Heading level="h2">All exhibitions</Heading>
        {isLoading ? (
          <Text>Loading exhibitions…</Text>
        ) : data?.exhibitions?.length ? (
          data.exhibitions.map((exhibition) => {
            const exhibitionImages = Array.isArray(exhibition.images)
              ? exhibition.images
              : exhibition.image_url
              ? [{ url: exhibition.image_url, alt: exhibition.image_alt }]
              : []
            const coverUrl = exhibition.image_url || exhibitionImages[0]?.url

            return (
              <div
                key={exhibition.id}
                className="flex flex-col gap-4 rounded-lg border border-ui-border-base p-4 sm:flex-row sm:items-center"
              >
                <div className="relative shrink-0">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={exhibition.image_alt || exhibition.title}
                      className="h-20 w-28 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-28 items-center justify-center rounded bg-ui-bg-subtle text-xs text-ui-fg-subtle">
                      No image
                    </div>
                  )}
                  {exhibitionImages.length > 1 && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                      {exhibitionImages.length} photos
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Text weight="plus">{exhibition.title}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {getExhibitionStatus(exhibition)} · {exhibition.start_date} – {exhibition.end_date}
                    {exhibition.location ? ` · ${exhibition.location}` : ""}
                    {!exhibition.is_published ? " · Draft" : ""}
                    {exhibitionImages.length > 0 &&
                      ` · ${exhibitionImages.length} ${exhibitionImages.length === 1 ? "photo" : "photos"}`}
                  </Text>
                  <Text size="small" className="mt-1 line-clamp-2">
                    {exhibition.description}
                  </Text>
                  {exhibitionImages.length > 1 && (
                    <div className="mt-2 flex items-center gap-1.5 overflow-x-auto py-0.5">
                      {exhibitionImages.slice(1, 6).map((img, idx) => (
                        <img
                          key={idx}
                          src={typeof img === "string" ? img : img.url}
                          alt=""
                          className="h-8 w-10 shrink-0 rounded border border-ui-border-base object-cover opacity-80"
                        />
                      ))}
                      {exhibitionImages.length > 6 && (
                        <span className="text-[10px] text-ui-fg-muted">
                          +{exhibitionImages.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="small" variant="secondary" onClick={() => edit(exhibition)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    isLoading={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove "${exhibition.title}"?`)) {
                        remove.mutate(exhibition.id)
                      }
                    }}
                  >
                    <Trash />
                    Remove
                  </Button>
                </div>
              </div>
            )
          })
        ) : (
          <Text className="text-ui-fg-subtle">No exhibitions have been added.</Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Exhibitions",
  icon: PhotoSolid,
})

export default ExhibitionsPage
