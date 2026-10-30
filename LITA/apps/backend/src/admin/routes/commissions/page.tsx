import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Sparkles, ArrowUpRightOnBox } from "@medusajs/icons"
import {
  Container,
  Heading,
  Table,
  Badge,
  Button,
  Text,
  toast,
  Toaster,
  Select,
  Input,
  Textarea,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

export type CommissionImage = {
  key: string
  filename: string
  mime: string
  size: number
  url?: string
}

export type CommissionMessage = {
  id: string
  commission_id: string
  sender: "client" | "admin"
  body: string
  created_at: string
}

export type Commission = {
  id: string
  customer_id: string
  title: string
  idea: string
  requirements: string | null
  medium: string | null
  size: string | null
  budget: number | null
  deadline: string | null
  status:
    | "new"
    | "in_discussion"
    | "quoted"
    | "accepted"
    | "converted"
    | "rejected"
    | "cancelled"
  quoted_price: number | null
  currency_code: string
  admin_notes: string | null
  order_id: string | null
  images: CommissionImage[] | null
  created_at: string
  customer?: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }
}

const statusBadgeColor: Record<string, "purple" | "blue" | "orange" | "green" | "red" | "grey"> = {
  new: "purple",
  in_discussion: "blue",
  quoted: "orange",
  accepted: "green",
  converted: "green",
  rejected: "red",
  cancelled: "grey",
}

const statusLabels: Record<string, string> = {
  new: "New Request",
  in_discussion: "In Discussion",
  quoted: "Quoted",
  accepted: "Quote Accepted",
  converted: "Converted to Order",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

const CommissionsPage = () => {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCommissionId, setSelectedCommissionId] = useState<string | null>(null)

  // Edit state within detail view
  const [editStatus, setEditStatus] = useState<string>("")
  const [editQuotePrice, setEditQuotePrice] = useState<string>("")
  const [editAdminNotes, setEditAdminNotes] = useState<string>("")
  const [newMessageBody, setNewMessageBody] = useState<string>("")
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null)

  // Fetch list of commissions
  const { data, isLoading } = useQuery({
    queryKey: ["commissions", statusFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (searchQuery.trim()) params.append("q", searchQuery.trim())
      const qs = params.toString() ? `?${params.toString()}` : ""
      return sdk.client.fetch<{ commissions: Commission[]; count: number; total: number }>(
        `/admin/commissions${qs}`
      )
    },
  })

  // Fetch detailed commission when selected
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["commission-detail", selectedCommissionId],
    queryFn: () =>
      sdk.client.fetch<{
        commission: Commission
        customer: any
        messages: CommissionMessage[]
      }>(`/admin/commissions/${selectedCommissionId}`),
    enabled: Boolean(selectedCommissionId),
  })

  // When detail data loads, initialize editable form fields
  const handleSelectCommission = (com: Commission) => {
    setSelectedCommissionId(com.id)
    setEditStatus(com.status)
    setEditQuotePrice(com.quoted_price ? String(com.quoted_price) : "")
    setEditAdminNotes(com.admin_notes || "")
    setNewMessageBody("")
    setSelectedImagePreview(null)
  }

  // Update commission status, quote price, admin notes
  const updateMutation = useMutation({
    mutationFn: (payload: {
      status?: string
      quoted_price?: number
      admin_notes?: string
    }) =>
      sdk.client.fetch<{ commission: Commission }>(
        `/admin/commissions/${selectedCommissionId}`,
        {
          method: "POST",
          body: payload,
        }
      ),
    onSuccess: (res) => {
      toast.success("Commission details updated successfully")
      qc.invalidateQueries({ queryKey: ["commissions"] })
      qc.invalidateQueries({ queryKey: ["commission-detail", selectedCommissionId] })
      if (res.commission) {
        setEditStatus(res.commission.status)
        setEditQuotePrice(
          res.commission.quoted_price ? String(res.commission.quoted_price) : ""
        )
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update commission")
    },
  })

  // Send negotiation message to client
  const sendMessageMutation = useMutation({
    mutationFn: (body: string) =>
      sdk.client.fetch<{ message: CommissionMessage }>(
        `/admin/commissions/${selectedCommissionId}/messages`,
        {
          method: "POST",
          body: { body },
        }
      ),
    onSuccess: () => {
      toast.success("Message sent to client")
      setNewMessageBody("")
      qc.invalidateQueries({ queryKey: ["commission-detail", selectedCommissionId] })
      qc.invalidateQueries({ queryKey: ["commissions"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send message")
    },
  })

  // Convert accepted commission to Medusa draft order
  const convertMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{
        success: boolean
        message: string
        commission: Commission
        order: any
      }>(`/admin/commissions/${selectedCommissionId}/convert`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Successfully converted commission to draft order!")
      qc.invalidateQueries({ queryKey: ["commissions"] })
      qc.invalidateQueries({ queryKey: ["commission-detail", selectedCommissionId] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to convert commission to order")
    },
  })

  const selectedCommission = detailData?.commission || data?.commissions.find((c) => c.id === selectedCommissionId)
  const messages = detailData?.messages || []
  const customer = detailData?.customer || selectedCommission?.customer

  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      <Toaster />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-ui-fg-subtle w-5 h-5" />
            <Heading level="h1">Custom Art Commissions</Heading>
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-0.5">
            Review custom artwork requests, set quotes, negotiate with clients, and convert accepted commissions to orders.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <Input
              size="small"
              placeholder="Search title, client, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-44">
            <Select
              size="small"
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Filter by status" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All Statuses</Select.Item>
                <Select.Item value="new">New Requests</Select.Item>
                <Select.Item value="in_discussion">In Discussion</Select.Item>
                <Select.Item value="quoted">Quoted</Select.Item>
                <Select.Item value="accepted">Accepted</Select.Item>
                <Select.Item value="converted">Converted to Order</Select.Item>
                <Select.Item value="rejected">Rejected</Select.Item>
                <Select.Item value="cancelled">Cancelled</Select.Item>
              </Select.Content>
            </Select>
          </div>

          <Badge size="small" color="grey">
            {data?.count ?? 0} {data?.count === 1 ? "commission" : "commissions"}
          </Badge>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-12 text-center text-ui-fg-muted">
          <Text>Loading commissions...</Text>
        </div>
      ) : !data?.commissions?.length ? (
        <div className="p-12 text-center text-ui-fg-muted space-y-2">
          <Text size="base" className="font-medium text-ui-fg-base">
            No commissions found
          </Text>
          <Text size="small">
            {statusFilter !== "all" || searchQuery
              ? "Try adjusting your status filter or search query."
              : "When clients submit bespoke commission requests via the storefront, they will appear here."}
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>ID</Table.HeaderCell>
              <Table.HeaderCell>Client</Table.HeaderCell>
              <Table.HeaderCell>Artwork Title</Table.HeaderCell>
              <Table.HeaderCell>Medium / Size</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Quote / Budget</Table.HeaderCell>
              <Table.HeaderCell>Created</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Action</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.commissions.map((item) => {
              const clientName =
                item.customer?.first_name || item.customer?.last_name
                  ? `${item.customer.first_name || ""} ${item.customer.last_name || ""}`.trim()
                  : "Client"
              const clientEmail = item.customer?.email || item.customer_id
              const isSelected = selectedCommissionId === item.id

              return (
                <Table.Row
                  key={item.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-ui-bg-subtle-hover" : "hover:bg-ui-bg-subtle"
                  }`}
                  onClick={() => handleSelectCommission(item)}
                >
                  <Table.Cell className="font-mono text-xs text-ui-fg-muted">
                    {item.id}
                  </Table.Cell>

                  <Table.Cell>
                    <div className="font-medium text-ui-fg-base text-sm">{clientName}</div>
                    <div className="text-xs text-ui-fg-subtle">{clientEmail}</div>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="font-medium text-ui-fg-base max-w-[200px] truncate">
                      {item.title}
                    </div>
                    {item.images?.length ? (
                      <div className="text-xs text-ui-fg-muted mt-0.5">
                        {item.images.length} {item.images.length === 1 ? "reference image" : "reference images"}
                      </div>
                    ) : null}
                  </Table.Cell>

                  <Table.Cell className="text-xs text-ui-fg-subtle">
                    {item.medium || "Bespoke"}{item.size ? ` · ${item.size}` : ""}
                  </Table.Cell>

                  <Table.Cell>
                    <Badge size="small" color={statusBadgeColor[item.status] || "grey"}>
                      {statusLabels[item.status] || item.status}
                    </Badge>
                  </Table.Cell>

                  <Table.Cell className="text-xs">
                    {item.quoted_price ? (
                      <div>
                        <span className="font-semibold text-ui-fg-base">
                          ₹{Number(item.quoted_price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-ui-fg-muted ml-1 text-[10px] uppercase">Quote</span>
                      </div>
                    ) : item.budget ? (
                      <span className="text-ui-fg-subtle">
                        Budget: ₹{Number(item.budget).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-ui-fg-muted italic">Unspecified</span>
                    )}
                  </Table.Cell>

                  <Table.Cell className="text-xs text-ui-fg-muted whitespace-nowrap">
                    {new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Table.Cell>

                  <Table.Cell className="text-right">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectCommission(item)
                      }}
                    >
                      Manage
                    </Button>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      )}

      {/* Slide-out / Bottom Detail View for Selected Commission */}
      {selectedCommission && (
        <div className="p-6 bg-ui-bg-subtle border-t border-ui-border-base space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ui-border-base pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h2" className="text-lg font-semibold">
                  {selectedCommission.title}
                </Heading>
                <Badge size="small" color={statusBadgeColor[selectedCommission.status] || "grey"}>
                  {statusLabels[selectedCommission.status] || selectedCommission.status}
                </Badge>
              </div>
              <Text size="small" className="text-ui-fg-subtle mt-0.5">
                Commission ID: <span className="font-mono">{selectedCommission.id}</span> · Submitted on{" "}
                {new Date(selectedCommission.created_at).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </Text>
            </div>

            <div className="flex items-center gap-3">
              {/* Convert to Order Action */}
              {selectedCommission.order_id ? (
                <div className="flex items-center gap-2">
                  <Badge size="small" color="green">
                    Converted to Order
                  </Badge>
                  <Button
                    size="small"
                    variant="secondary"
                    asChild
                  >
                    <a href={`/orders/${selectedCommission.order_id}`} target="_blank" rel="noreferrer">
                      View Order <ArrowUpRightOnBox className="ml-1 w-3.5 h-3.5 inline" />
                    </a>
                  </Button>
                </div>
              ) : selectedCommission.status === "accepted" ? (
                <Button
                  size="small"
                  variant="primary"
                  isLoading={convertMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Convert accepted commission "${selectedCommission.title}" into a Medusa draft order for ₹${selectedCommission.quoted_price?.toLocaleString(
                          "en-IN"
                        )}?`
                      )
                    ) {
                      convertMutation.mutate()
                    }
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Convert to Order
                </Button>
              ) : null}

              <Button
                size="small"
                variant="secondary"
                onClick={() => setSelectedCommissionId(null)}
              >
                Close
              </Button>
            </div>
          </div>

          {/* Grid: 2 Columns (Details & Negotiation) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Client, Artwork Scope, Reference Images, Quote & Status */}
            <div className="space-y-6">
              {/* Client Info Card */}
              <div className="bg-ui-bg-base p-4 rounded-md border border-ui-border-base space-y-2">
                <Text size="small" className="font-semibold text-ui-fg-subtle uppercase tracking-wider text-[11px]">
                  Client Details
                </Text>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ui-fg-muted">Name</div>
                    <div className="font-medium text-ui-fg-base">
                      {customer?.first_name || customer?.last_name
                        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                        : "Client"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ui-fg-muted">Email</div>
                    <div className="text-ui-fg-base truncate">{customer?.email || selectedCommission.customer_id}</div>
                  </div>
                  {customer?.phone && (
                    <div>
                      <div className="text-xs text-ui-fg-muted">Phone</div>
                      <div className="text-ui-fg-base">{customer.phone}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-ui-fg-muted">Customer ID</div>
                    <div className="font-mono text-xs text-ui-fg-muted truncate">{selectedCommission.customer_id}</div>
                  </div>
                </div>
              </div>

              {/* Artwork Scope Card */}
              <div className="bg-ui-bg-base p-4 rounded-md border border-ui-border-base space-y-3">
                <Text size="small" className="font-semibold text-ui-fg-subtle uppercase tracking-wider text-[11px]">
                  Commission Specifications
                </Text>
                <div className="grid grid-cols-3 gap-3 text-sm border-b border-ui-border-base pb-3">
                  <div>
                    <div className="text-xs text-ui-fg-muted">Medium</div>
                    <div className="font-medium text-ui-fg-base">{selectedCommission.medium || "Flexible"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ui-fg-muted">Target Size</div>
                    <div className="font-medium text-ui-fg-base">{selectedCommission.size || "Flexible"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ui-fg-muted">Client Budget</div>
                    <div className="font-medium text-ui-fg-base">
                      {selectedCommission.budget ? `₹${selectedCommission.budget.toLocaleString("en-IN")}` : "Flexible"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-ui-fg-muted mb-1">Concept / Idea</div>
                  <p className="text-sm text-ui-fg-base whitespace-pre-wrap leading-relaxed bg-ui-bg-subtle p-3 rounded border border-ui-border-base">
                    {selectedCommission.idea}
                  </p>
                </div>

                {selectedCommission.requirements && (
                  <div>
                    <div className="text-xs text-ui-fg-muted mb-1">Additional Requirements / Placement</div>
                    <p className="text-sm text-ui-fg-base whitespace-pre-wrap leading-relaxed bg-ui-bg-subtle p-3 rounded border border-ui-border-base">
                      {selectedCommission.requirements}
                    </p>
                  </div>
                )}
              </div>

              {/* Reference Images Gallery */}
              <div className="bg-ui-bg-base p-4 rounded-md border border-ui-border-base space-y-3">
                <Text size="small" className="font-semibold text-ui-fg-subtle uppercase tracking-wider text-[11px]">
                  Reference Images ({selectedCommission.images?.length || 0})
                </Text>
                {selectedCommission.images?.length ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {selectedCommission.images.map((img, idx) => (
                      <div
                        key={img.key || idx}
                        className="group relative border border-ui-border-base rounded overflow-hidden aspect-square cursor-pointer hover:border-ui-border-interactive transition-all"
                        onClick={() => setSelectedImagePreview(img.url || null)}
                      >
                        {img.url ? (
                          <img
                            src={img.url}
                            alt={img.filename || `Reference ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-ui-bg-subtle text-xs text-ui-fg-muted p-2 text-center">
                            {img.filename}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                          Preview
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text size="small" className="text-ui-fg-muted italic">
                    No reference images uploaded.
                  </Text>
                )}

                {/* Modal preview if clicked */}
                {selectedImagePreview && (
                  <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setSelectedImagePreview(null)}
                  >
                    <div className="max-w-3xl max-h-[90vh] relative">
                      <img
                        src={selectedImagePreview}
                        alt="Enlarged Reference Preview"
                        className="max-w-full max-h-[85vh] object-contain rounded"
                      />
                      <div className="text-center text-white/80 text-xs mt-2">
                        Click anywhere to close preview
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quote & Status Management Form */}
              <div className="bg-ui-bg-base p-4 rounded-md border border-ui-border-base space-y-4">
                <Text size="small" className="font-semibold text-ui-fg-subtle uppercase tracking-wider text-[11px]">
                  Update Status & Quote
                </Text>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-ui-fg-muted mb-1 block">Status</label>
                    <Select
                      size="small"
                      value={editStatus}
                      onValueChange={(val) => setEditStatus(val)}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="new">New Request</Select.Item>
                        <Select.Item value="in_discussion">In Discussion</Select.Item>
                        <Select.Item value="quoted">Quoted</Select.Item>
                        <Select.Item value="accepted">Quote Accepted</Select.Item>
                        <Select.Item value="converted">Converted to Order</Select.Item>
                        <Select.Item value="rejected">Rejected</Select.Item>
                        <Select.Item value="cancelled">Cancelled</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-ui-fg-muted mb-1 block">Quoted Price (₹ INR)</label>
                    <Input
                      size="small"
                      type="number"
                      placeholder="e.g. 25000"
                      value={editQuotePrice}
                      onChange={(e) => setEditQuotePrice(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-ui-fg-muted mb-1 block">Internal Admin Notes</label>
                  <Textarea
                    rows={2}
                    placeholder="Private notes about negotiations, framing, timeline..."
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    size="small"
                    variant="primary"
                    isLoading={updateMutation.isPending}
                    onClick={() => {
                      updateMutation.mutate({
                        status: editStatus,
                        quoted_price: editQuotePrice ? Number(editQuotePrice) : undefined,
                        admin_notes: editAdminNotes,
                      })
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Negotiation & Discussion Thread with Client */}
            <div className="bg-ui-bg-base p-4 rounded-md border border-ui-border-base flex flex-col h-full min-h-[500px]">
              <div className="border-b border-ui-border-base pb-3 mb-4">
                <Text size="small" className="font-semibold text-ui-fg-subtle uppercase tracking-wider text-[11px]">
                  Client Discussion & Negotiation Thread
                </Text>
                <Text size="small" className="text-ui-fg-muted text-xs">
                  Communicate directly with the client regarding sizing, materials, timelines, and revisions.
                </Text>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[460px]">
                {detailLoading ? (
                  <div className="text-center py-8 text-xs text-ui-fg-muted">Loading messages...</div>
                ) : !messages.length ? (
                  <div className="text-center py-12 text-xs text-ui-fg-muted italic">
                    No discussion messages yet. Send a message below to start negotiating with the client.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender === "admin"
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-ui-fg-muted mb-0.5 px-1">
                          <span className="font-semibold">{isAdmin ? "You (Artist)" : customer?.first_name || "Client"}</span>
                          <span>·</span>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                            isAdmin
                              ? "bg-ui-bg-interactive text-ui-fg-on-color"
                              : "bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base"
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Message Input Box */}
              <div className="border-t border-ui-border-base pt-3 mt-4 space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Type a message to the client (discuss ideas, timeline, or quote)..."
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      if (newMessageBody.trim()) {
                        sendMessageMutation.mutate(newMessageBody.trim())
                      }
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-ui-fg-muted">Press Enter to send</span>
                  <Button
                    size="small"
                    variant="primary"
                    disabled={!newMessageBody.trim()}
                    isLoading={sendMessageMutation.isPending}
                    onClick={() => {
                      if (newMessageBody.trim()) {
                        sendMessageMutation.mutate(newMessageBody.trim())
                      }
                    }}
                  >
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Commissions",
  icon: Sparkles,
})

export default CommissionsPage
