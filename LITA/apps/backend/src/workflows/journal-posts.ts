import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { JOURNAL_MODULE } from "../modules/journal"
import JournalModuleService from "../modules/journal/service"

export type CreateJournalPostInput = {
  title: string
  slug: string
  content: string
  excerpt?: string | null
  cover_image_url?: string | null
  status?: "draft" | "published"
  tags?: string[] | null
}

export const createPostStep = createStep(
  "create-post-step",
  async (input: CreateJournalPostInput, { container }) => {
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    const post = await service.createJournalPosts({
      ...input,
      published_at: input.status === "published" ? new Date() : null,
    } as any)
    return new StepResponse(post, post.id)
  },
  async (id, { container }) => {
    if (!id) return
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    await service.deleteJournalPosts(id)
  }
)

export const createJournalPostWorkflow = createWorkflow(
  "create-journal-post",
  (input: CreateJournalPostInput) => new WorkflowResponse(createPostStep(input))
)

export type UpdateJournalPostInput = { id: string } & Partial<CreateJournalPostInput>

export const updatePostStep = createStep(
  "update-post-step",
  async (input: UpdateJournalPostInput, { container }) => {
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    const prev = await service.retrieveJournalPost(input.id)
    const patch: any = { ...input }
    // set published_at the first time a post is published
    if (input.status === "published" && !prev.published_at) {
      patch.published_at = new Date()
    }
    const post = await service.updateJournalPosts(patch)
    return new StepResponse(post, prev)
  },
  async (prev, { container }) => {
    if (!prev) return
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    await service.updateJournalPosts(prev as any)
  }
)

export const updateJournalPostWorkflow = createWorkflow(
  "update-journal-post",
  (input: UpdateJournalPostInput) => new WorkflowResponse(updatePostStep(input))
)

export type DeleteJournalPostInput = { id: string }

export const deletePostStep = createStep(
  "delete-post-step",
  async ({ id }: DeleteJournalPostInput, { container }) => {
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    const prev = await service.retrieveJournalPost(id)
    await service.deleteJournalPosts(id)
    return new StepResponse({ id, deleted: true }, prev)
  },
  async (prev, { container }) => {
    if (!prev) return
    const service: JournalModuleService = container.resolve(JOURNAL_MODULE)
    await service.createJournalPosts(prev as any)
  }
)

export const deleteJournalPostWorkflow = createWorkflow(
  "delete-journal-post",
  (input: DeleteJournalPostInput) => new WorkflowResponse(deletePostStep(input))
)
