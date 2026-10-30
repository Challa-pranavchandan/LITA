import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { GALLERY_MODULE } from "../modules/gallery"
import GalleryModuleService from "../modules/gallery/service"

/* ---------- create (batch, appended at the end) ---------- */

export type NewItem = {
  image_url: string
  file_id?: string
  alt?: string
  width?: number
  height?: number
}

export const createItemsStep = createStep(
  "create-gallery-items",
  async (input: { items: NewItem[] }, { container }) => {
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    const existing = await service.listGalleryItems({}, { select: ["position"] })
    const start = existing.length
      ? Math.max(...existing.map((i) => i.position)) + 1
      : 0

    const created = await service.createGalleryItems(
      input.items.map((item, idx) => ({ ...item, position: start + idx }))
    )
    return new StepResponse(created, created.map((c) => c.id))
  },
  async (ids, { container }) => {
    if (!ids?.length) return
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    await service.deleteGalleryItems(ids)
  }
)

export const createGalleryItemsWorkflow = createWorkflow(
  "create-gallery-items",
  (input: { items: NewItem[] }) => new WorkflowResponse(createItemsStep(input))
)

/* ---------- update layout (batch) ---------- */

export type LayoutItem = {
  id: string
  position: number
  col_span: number
  row_span: number
}

export const updateLayoutStep = createStep(
  "update-gallery-layout",
  async (input: { items: LayoutItem[] }, { container }) => {
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    const ids = input.items.map((i) => i.id)
    const previous = await service.listGalleryItems(
      { id: ids },
      { select: ["id", "position", "col_span", "row_span"] }
    )
    const updated = await service.updateGalleryItems(input.items)
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous?.length) return
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    await service.updateGalleryItems(
      previous.map((p) => ({
        id: p.id,
        position: p.position,
        col_span: p.col_span,
        row_span: p.row_span,
      }))
    )
  }
)

export const updateGalleryLayoutWorkflow = createWorkflow(
  "update-gallery-layout",
  (input: { items: LayoutItem[] }) =>
    new WorkflowResponse(updateLayoutStep(input))
)

/* ---------- delete (record + file in R2) ---------- */

export const deleteItemStep = createStep(
  "delete-gallery-item",
  async (input: { id: string }, { container }) => {
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    const item = await service.retrieveGalleryItem(input.id)
    await service.deleteGalleryItems(input.id)

    if (item.file_id) {
      try {
        const fileModule = container.resolve(Modules.FILE)
        await (fileModule as any).deleteFiles(item.file_id)
      } catch (e) {
        // do not fail the workflow if the file is already gone
      }
    }
    return new StepResponse({ id: input.id }, item)
  },
  async (item, { container }) => {
    if (!item) return
    const service: GalleryModuleService = container.resolve(GALLERY_MODULE)
    await service.createGalleryItems({
      id: item.id,
      file_id: item.file_id,
      image_url: item.image_url,
      alt: item.alt,
      caption: item.caption,
      width: item.width,
      height: item.height,
      position: item.position,
      col_span: item.col_span,
      row_span: item.row_span,
      is_published: item.is_published,
    } as any)
  }
)

export const deleteGalleryItemWorkflow = createWorkflow(
  "delete-gallery-item",
  (input: { id: string }) => new WorkflowResponse(deleteItemStep(input))
)
