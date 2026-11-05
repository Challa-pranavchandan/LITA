import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PhotoSolid, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  Textarea,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { sdk } from "../../lib/sdk"

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
  is_published: boolean
}

type ExhibitionForm = Omit<Exhibition, "id">

const emptyForm: ExhibitionForm = {
  title: "",
  description: "",
  details: "",
  location: "",
  start_date: "",
  end_date: "",
  image_url: "",
  image_alt: "",
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
      const payload = {
        ...form,
        details: form.details?.trim() || null,
        location: form.location?.trim() || null,
        image_url: form.image_url?.trim() || null,
        image_alt: form.image_alt?.trim() || null,
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

  async function uploadImage(file?: File) {
    if (!file) return
    setUploading(true)
    try {
      const { files } = await sdk.admin.upload.create({ files: [file] })
      if (!files[0]?.url) throw new Error("The uploaded image has no URL")
      setForm((current) => ({ ...current, image_url: files[0].url }))
      toast.success("Exhibition image uploaded")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload exhibition image"
      )
    } finally {
      setUploading(false)
      if (imageInput.current) imageInput.current.value = ""
    }
  }

  function edit(exhibition: Exhibition) {
    setEditingId(exhibition.id)
    setForm({
      title: exhibition.title,
      description: exhibition.description,
      details: exhibition.details || "",
      location: exhibition.location || "",
      start_date: exhibition.start_date,
      end_date: exhibition.end_date,
      image_url: exhibition.image_url || "",
      image_alt: exhibition.image_alt || "",
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
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void uploadImage(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            isLoading={uploading}
            onClick={() => imageInput.current?.click()}
          >
            Upload exhibition image
          </Button>
          {form.image_url && (
            <div className="flex items-center gap-3">
              <img
                src={form.image_url}
                alt={form.image_alt || "Exhibition preview"}
                className="h-14 w-20 rounded object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    image_url: "",
                    image_alt: "",
                  }))
                }
              >
                Remove image
              </Button>
            </div>
          )}
          <Input
            placeholder="Image alt text"
            value={form.image_alt || ""}
            maxLength={300}
            onChange={(event) =>
              setForm((current) => ({ ...current, image_alt: event.target.value }))
            }
          />
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
          data.exhibitions.map((exhibition) => (
            <div
              key={exhibition.id}
              className="flex flex-col gap-4 rounded-lg border border-ui-border-base p-4 sm:flex-row sm:items-center"
            >
              {exhibition.image_url ? (
                <img
                  src={exhibition.image_url}
                  alt={exhibition.image_alt || exhibition.title}
                  className="h-20 w-28 rounded object-cover"
                />
              ) : (
                <div className="flex h-20 w-28 items-center justify-center rounded bg-ui-bg-subtle text-ui-fg-subtle">
                  No image
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Text weight="plus">{exhibition.title}</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {getExhibitionStatus(exhibition)} · {exhibition.start_date} – {exhibition.end_date}
                  {exhibition.location ? ` · ${exhibition.location}` : ""}
                  {!exhibition.is_published ? " · Draft" : ""}
                </Text>
                <Text size="small" className="mt-1 line-clamp-2">
                  {exhibition.description}
                </Text>
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
          ))
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
