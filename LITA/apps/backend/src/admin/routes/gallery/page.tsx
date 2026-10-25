import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PhotoSolid, Trash, EyeSlash, Eye } from "@medusajs/icons"
import { Button, Container, Heading, IconButton, Input, Text, toast, Toaster } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useEffect, useRef, useState } from "react"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { sdk } from "../../lib/sdk"

type Item = {
  id: string
  image_url: string
  alt: string | null
  caption: string | null
  width: number | null
  height: number | null
  position: number
  col_span: number
  row_span: number
  is_published: boolean
}

const SIZES: { label: string; c: number; r: number }[] = [
  { label: "1x1", c: 1, r: 1 },
  { label: "2x1", c: 2, r: 1 },
  { label: "1x2", c: 1, r: 2 },
  { label: "2x2", c: 2, r: 2 },
]

// IMPORTANT: keep these grid styles identical to the storefront
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gridAutoRows: "220px",
  gridAutoFlow: "dense",
  gap: 12,
}

const readSize = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = URL.createObjectURL(file)
  })

function Tile({
  item, onSize, onToggle, onDelete, onAlt,
}: {
  item: Item
  onSize: (c: number, r: number) => void
  onToggle: () => void
  onDelete: () => void
  onAlt: (alt: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `span ${item.col_span}`,
        gridRow: `span ${item.row_span}`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : item.is_published ? 1 : 0.4,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: "#eee",
        zIndex: isDragging ? 10 : 0,
      }}
      className="group"
    >
      <img
        src={item.image_url}
        alt={item.alt ?? ""}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        {...attributes}
        {...listeners}
      />
      {/* hover toolbar */}
      <div
        style={{
          position: "absolute", inset: "auto 8px 8px 8px", display: "flex",
          gap: 6, flexWrap: "wrap", alignItems: "center",
          background: "rgba(255,255,255,0.92)", borderRadius: 12, padding: 6,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {SIZES.map((s) => (
          <Button
            key={s.label}
            size="small"
            variant={item.col_span === s.c && item.row_span === s.r ? "primary" : "secondary"}
            onClick={() => onSize(s.c, s.r)}
          >
            {s.label}
          </Button>
        ))}
        <IconButton size="small" variant="transparent" onClick={onToggle}>
          {item.is_published ? <Eye /> : <EyeSlash />}
        </IconButton>
        <IconButton size="small" variant="transparent" onClick={onDelete}>
          <Trash />
        </IconButton>
        <Input
          size="small"
          placeholder="Alt text"
          defaultValue={item.alt ?? ""}
          onBlur={(e) => onAlt(e.target.value)}
          style={{ flex: 1, minWidth: 100 }}
        />
      </div>
    </div>
  )
}

const GalleryPage = () => {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data } = useQuery({
    queryKey: ["gallery"],
    queryFn: () => sdk.client.fetch<{ items: Item[] }>("/admin/gallery"),
  })

  useEffect(() => {
    if (data) { setItems(data.items); setDirty(false) }
  }, [data])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === active.id)
      const to = prev.findIndex((i) => i.id === over.id)
      return arrayMove(prev, from, to)
    })
    setDirty(true)
  }

  const patch = (id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)))
    setDirty(true)
  }

  const saveLayout = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/gallery/layout", {
        method: "POST",
        body: {
          items: items.map((i, idx) => ({
            id: i.id, position: idx, col_span: i.col_span, row_span: i.row_span,
          })),
        },
      }),
    onSuccess: async () => {
      // publish/unpublish and alt changes are saved per item below
      await Promise.all(
        items.map((i) =>
          sdk.client.fetch(`/admin/gallery/${i.id}`, {
            method: "POST",
            body: { is_published: i.is_published, alt: i.alt },
          })
        )
      )
      toast.success("Gallery saved")
      setDirty(false)
      qc.invalidateQueries({ queryKey: ["gallery"] })
    },
    onError: () => toast.error("Could not save gallery"),
  })

  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/gallery/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success("Photo deleted")
    },
  })

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const list = Array.from(files)
      const sizes = await Promise.all(list.map(readSize))
      const { files: uploaded } = await sdk.admin.upload.create({ files: list })
      await sdk.client.fetch("/admin/gallery", {
        method: "POST",
        body: {
          items: uploaded.map((f: any, idx: number) => ({
            image_url: f.url,
            file_id: f.id,
            width: sizes[idx].width || undefined,
            height: sizes[idx].height || undefined,
          })),
        },
      })
      toast.success(`${uploaded.length} photo(s) uploaded`)
      qc.invalidateQueries({ queryKey: ["gallery"] })
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <Container>
      <Toaster />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Heading level="h1">Gallery</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Drag to reorder, pick a size on each tile, then save. This preview matches the storefront.
          </Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button variant="secondary" isLoading={uploading} onClick={() => fileRef.current?.click()}>
            Upload photos
          </Button>
          <Button disabled={!dirty} isLoading={saveLayout.isPending} onClick={() => saveLayout.mutate()}>
            Save layout
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div style={gridStyle}>
            {items.map((item) => (
              <Tile
                key={item.id}
                item={item}
                onSize={(c, r) => patch(item.id, { col_span: c, row_span: r })}
                onToggle={() => patch(item.id, { is_published: !item.is_published })}
                onDelete={() => remove.mutate(item.id)}
                onAlt={(alt) => patch(item.id, { alt })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Gallery", icon: PhotoSolid })
export default GalleryPage
