import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BookOpen, Plus, Trash, PencilSquare } from "@medusajs/icons"
import {
  Container,
  Heading,
  Table,
  Badge,
  Button,
  FocusModal,
  Input,
  Textarea,
  Select,
  Text,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"
import { sdk } from "../../lib/sdk"

// Cast Table.Cell to include TdHTMLAttributes (such as colSpan)
const TableCell = Table.Cell as React.ForwardRefExoticComponent<
  React.TdHTMLAttributes<HTMLTableCellElement> & React.RefAttributes<HTMLTableCellElement>
>

type JournalPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover_image_url: string | null
  status: "draft" | "published"
  published_at: string | null
  tags: string[] | null
  created_at: string
}

type PostFormState = {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image_url: string
  status: "draft" | "published"
  tags: string
}

const initialFormState: PostFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  status: "draft",
  tags: "",
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

const JournalPage = () => {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [formState, setFormState] = useState<PostFormState>(initialFormState)
  const [isEditing, setIsEditing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["journal-posts"],
    queryFn: () => sdk.client.fetch<{ posts: JournalPost[]; count: number }>("/admin/journal"),
  })

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      sdk.client.fetch<{ post: JournalPost }>("/admin/journal", {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-posts"] })
      setModalOpen(false)
      setFormState(initialFormState)
      setFormError(null)
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create post")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      sdk.client.fetch<{ post: JournalPost }>(`/admin/journal/${id}`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-posts"] })
      setModalOpen(false)
      setFormState(initialFormState)
      setFormError(null)
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to update post")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch<{ id: string; deleted: boolean }>(`/admin/journal/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-posts"] })
    },
  })

  const handleOpenCreate = () => {
    setIsEditing(false)
    setFormState(initialFormState)
    setFormError(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (post: JournalPost) => {
    setIsEditing(true)
    setFormState({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      cover_image_url: post.cover_image_url || "",
      status: post.status,
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete post "${title}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleTitleChange = (val: string) => {
    setFormState((prev) => ({
      ...prev,
      title: val,
      slug: !isEditing && (!prev.slug || prev.slug === slugify(prev.title)) ? slugify(val) : prev.slug,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formState.title.trim()) {
      setFormError("Title is required")
      return
    }
    if (!formState.slug.trim()) {
      setFormError("Slug is required")
      return
    }
    if (!formState.content.trim()) {
      setFormError("Content is required")
      return
    }

    const payload: any = {
      title: formState.title.trim(),
      slug: formState.slug.trim(),
      content: formState.content.trim(),
      excerpt: formState.excerpt.trim() || null,
      cover_image_url: formState.cover_image_url.trim() || null,
      status: formState.status,
      tags: formState.tags
        ? formState.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : null,
    }

    if (isEditing && formState.id) {
      updateMutation.mutate({ id: formState.id, body: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <Container className="p-8">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-6 border-b border-ui-border-base">
        <div>
          <Heading level="h1">Journal</Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Publish studio stories, exhibition notes, and artist narratives for your storefront.
          </Text>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus className="mr-2" /> New Post
        </Button>
      </div>

      {/* Posts Table */}
      <div className="mt-6">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Slug</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Published</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading && (
              <Table.Row>
                <TableCell colSpan={5} className="text-center py-8 text-ui-fg-muted">
                  Loading journal posts...
                </TableCell>
              </Table.Row>
            )}

            {!isLoading && (!data?.posts || data.posts.length === 0) && (
              <Table.Row>
                <TableCell colSpan={5} className="text-center py-10 text-ui-fg-muted">
                  No journal posts yet. Click &quot;New Post&quot; to write your first story.
                </TableCell>
              </Table.Row>
            )}

            {data?.posts?.map((post) => (
              <Table.Row key={post.id}>
                <Table.Cell className="font-medium text-ui-fg-base">
                  {post.title}
                </Table.Cell>
                <Table.Cell className="text-ui-fg-subtle font-mono text-xs">
                  /{post.slug}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={post.status === "published" ? "green" : "grey"}>
                    {post.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-ui-fg-subtle text-xs">
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString()
                    : "—"}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => handleOpenEdit(post)}
                    >
                      <PencilSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => handleDelete(post.id, post.title)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      {/* Create / Edit FocusModal */}
      <FocusModal open={modalOpen} onOpenChange={setModalOpen}>
        <FocusModal.Content>
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <FocusModal.Header>
              <div className="flex items-center justify-between w-full px-6 py-4">
                <Heading level="h2">
                  {isEditing ? "Edit Journal Post" : "Create Journal Post"}
                </Heading>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  >
                    {isEditing ? "Save Changes" : "Create Post"}
                  </Button>
                </div>
              </div>
            </FocusModal.Header>

            <FocusModal.Body className="p-8 max-w-4xl mx-auto w-full overflow-y-auto space-y-6">
              {formError && (
                <div className="p-4 bg-ui-bg-subtle border border-ui-border-error text-ui-fg-error rounded text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                    Title *
                  </label>
                  <Input
                    placeholder="e.g. Inside the Studio: Dan Covert on Sculptural Form"
                    value={formState.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                    Slug *
                  </label>
                  <Input
                    placeholder="e.g. inside-the-studio-dan-covert"
                    value={formState.slug}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                    Status
                  </label>
                  <Select
                    value={formState.status}
                    onValueChange={(val: "draft" | "published") =>
                      setFormState((prev) => ({ ...prev, status: val }))
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="draft">Draft</Select.Item>
                      <Select.Item value="published">Published</Select.Item>
                    </Select.Content>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                    Cover Image URL
                  </label>
                  <Input
                    placeholder="https://... or /about/hero-curated.jpg"
                    value={formState.cover_image_url}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        cover_image_url: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                  Tags (comma separated)
                </label>
                <Input
                  placeholder="e.g. Studio Visit, Sculpture, Contemporary Art"
                  value={formState.tags}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, tags: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                  Excerpt
                </label>
                <Textarea
                  placeholder="Short preview summary displayed in article cards..."
                  rows={2}
                  value={formState.excerpt}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, excerpt: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ui-fg-subtle mb-1">
                  Content (Markdown) *
                </label>
                <Textarea
                  placeholder="Write your article in Markdown..."
                  rows={14}
                  className="font-mono text-sm"
                  value={formState.content}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, content: e.target.value }))
                  }
                  required
                />
              </div>
            </FocusModal.Body>
          </form>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Journal", icon: BookOpen })
export default JournalPage
