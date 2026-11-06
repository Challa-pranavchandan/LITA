import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BellAlertSolid, Trash, PencilSquare, PaperPlane, Eye } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"
import { sdk } from "../../lib/sdk"

const TableCell = Table.Cell as React.ForwardRefExoticComponent<
  React.TdHTMLAttributes<HTMLTableCellElement> & React.RefAttributes<HTMLTableCellElement>
>

type Broadcast = {
  id: string
  title: string
  channels: string[] | null
  status: "draft" | "scheduled" | "active" | "completed" | "archived"
  target_audience: "all_subscribers" | "opted_in_customers" | "all_users"
  email_subject: string | null
  email_preheader: string | null
  email_content_html: string | null
  popup_title: string | null
  popup_body: string | null
  popup_image_url: string | null
  popup_coupon_code: string | null
  popup_cta_text: string | null
  popup_cta_link: string | null
  popup_type: "modal" | "banner" | "both"
  popup_frequency: "once_per_visitor" | "once_per_session" | "always"
  is_popup_active: boolean
  starts_at: string | null
  ends_at: string | null
  sent_at: string | null
  recipients_count: number
  sent_count: number
  failed_count: number
  impressions_count: number
  clicks_count: number
  created_at: string
}

type BroadcastForm = {
  title: string
  channels: string[]
  status: "draft" | "scheduled" | "active" | "completed" | "archived"
  target_audience: "all_subscribers" | "opted_in_customers" | "all_users"
  email_subject: string
  email_preheader: string
  email_content_html: string
  popup_title: string
  popup_body: string
  popup_image_url: string
  popup_coupon_code: string
  popup_cta_text: string
  popup_cta_link: string
  popup_type: "modal" | "banner" | "both"
  popup_frequency: "once_per_visitor" | "once_per_session" | "always"
  is_popup_active: boolean
  starts_at: string
  ends_at: string
}

const emptyForm: BroadcastForm = {
  title: "",
  channels: ["email", "popup"],
  status: "active",
  target_audience: "all_subscribers",
  email_subject: "",
  email_preheader: "",
  email_content_html: "",
  popup_title: "",
  popup_body: "",
  popup_image_url: "",
  popup_coupon_code: "",
  popup_cta_text: "Shop the Collection",
  popup_cta_link: "/artworks",
  popup_type: "modal",
  popup_frequency: "once_per_visitor",
  is_popup_active: false,
  starts_at: "",
  ends_at: "",
}

const BroadcastsPage = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<BroadcastForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [testTargetId, setTestTargetId] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState<Broadcast | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: () =>
      sdk.client.fetch<{ broadcasts: Broadcast[]; count: number }>("/admin/broadcasts"),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: BroadcastForm) => {
      const formatted = {
        ...payload,
        email_subject: payload.email_subject.trim() || null,
        email_preheader: payload.email_preheader.trim() || null,
        email_content_html: payload.email_content_html.trim() || null,
        popup_title: payload.popup_title.trim() || null,
        popup_body: payload.popup_body.trim() || null,
        popup_image_url: payload.popup_image_url.trim() || null,
        popup_coupon_code: payload.popup_coupon_code.trim().toUpperCase() || null,
        popup_cta_text: payload.popup_cta_text.trim() || null,
        popup_cta_link: payload.popup_cta_link.trim() || null,
        starts_at: payload.starts_at || null,
        ends_at: payload.ends_at || null,
      }

      return editingId
        ? sdk.client.fetch<{ broadcast: Broadcast }>(`/admin/broadcasts/${editingId}`, {
            method: "POST",
            body: formatted,
          })
        : sdk.client.fetch<{ broadcast: Broadcast }>("/admin/broadcasts", {
            method: "POST",
            body: formatted,
          })
    },
    onSuccess: () => {
      toast.success(editingId ? "Broadcast updated" : "Broadcast created")
      setForm(emptyForm)
      setEditingId(null)
      setIsFormOpen(false)
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save broadcast")
    },
  })

  const togglePopupMutation = useMutation({
    mutationFn: ({ id, is_popup_active }: { id: string; is_popup_active: boolean }) =>
      sdk.client.fetch(`/admin/broadcasts/${id}`, {
        method: "POST",
        body: { is_popup_active },
      }),
    onSuccess: () => {
      toast.success("Storefront popup status updated")
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status")
    },
  })

  const sendLiveMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/broadcasts/${id}/send`, { method: "POST" }),
    onSuccess: (data: any) => {
      toast.success(data.message || "Broadcast dispatch initiated")
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to dispatch broadcast")
    },
  })

  const sendTestMutation = useMutation({
    mutationFn: ({ id, test_email }: { id: string; test_email: string }) =>
      sdk.client.fetch(`/admin/broadcasts/${id}/test`, {
        method: "POST",
        body: { test_email },
      }),
    onSuccess: (data: any) => {
      toast.success(data.message || "Test email sent")
      setTestTargetId(null)
      setTestEmailAddress("")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send test email")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/broadcasts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Broadcast deleted")
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete broadcast")
    },
  })

  const handleEdit = (broadcast: Broadcast) => {
    setEditingId(broadcast.id)
    setForm({
      title: broadcast.title || "",
      channels: Array.isArray(broadcast.channels) ? broadcast.channels : ["email"],
      status: broadcast.status || "active",
      target_audience: broadcast.target_audience || "all_subscribers",
      email_subject: broadcast.email_subject || "",
      email_preheader: broadcast.email_preheader || "",
      email_content_html: broadcast.email_content_html || "",
      popup_title: broadcast.popup_title || "",
      popup_body: broadcast.popup_body || "",
      popup_image_url: broadcast.popup_image_url || "",
      popup_coupon_code: broadcast.popup_coupon_code || "",
      popup_cta_text: broadcast.popup_cta_text || "Shop Now",
      popup_cta_link: broadcast.popup_cta_link || "/artworks",
      popup_type: broadcast.popup_type || "modal",
      popup_frequency: broadcast.popup_frequency || "once_per_visitor",
      is_popup_active: Boolean(broadcast.is_popup_active),
      starts_at: broadcast.starts_at ? broadcast.starts_at.slice(0, 16) : "",
      ends_at: broadcast.ends_at ? broadcast.ends_at.slice(0, 16) : "",
    })
    setIsFormOpen(true)
  }

  const toggleChannel = (channel: string) => {
    const current = form.channels || []
    if (current.includes(channel)) {
      setForm({ ...form, channels: current.filter((c) => c !== channel) })
    } else {
      setForm({ ...form, channels: [...current, channel] })
    }
  }

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-ui-border-base">
        <div>
          <Heading level="h1" className="text-2xl font-semibold tracking-tight text-ui-fg-base flex items-center gap-2">
            <BellAlertSolid className="text-[#5f2f3c]" /> Broadcasts &amp; Storefront Offers
          </Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Dispatch emails to all collectors and subscribers, and activate promotional popups and banner alerts on screen.
          </Text>
        </div>
        <Button
          variant={isFormOpen ? "secondary" : "primary"}
          onClick={() => {
            if (isFormOpen) {
              setIsFormOpen(false)
              setEditingId(null)
              setForm(emptyForm)
            } else {
              setEditingId(null)
              setForm(emptyForm)
              setIsFormOpen(true)
            }
          }}
        >
          {isFormOpen ? "Close Form" : "+ Create New Campaign"}
        </Button>
      </div>

      {/* Creation / Edit Form */}
      {isFormOpen && (
        <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-ui-border-base pb-3">
            <Heading level="h2" className="text-lg font-medium text-ui-fg-base">
              {editingId ? "Edit Campaign" : "New Broadcast Campaign"}
            </Heading>
            <Button
              variant="transparent"
              size="small"
              onClick={() => {
                setIsFormOpen(false)
                setEditingId(null)
                setForm(emptyForm)
              }}
            >
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title & Channels */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                  Campaign Title *
                </label>
                <Input
                  placeholder="e.g. Diwali Collector Showcase & 15% Exclusive"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-2">
                  Delivery Channels
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-ui-fg-base cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.channels.includes("email")}
                      onChange={() => toggleChannel("email")}
                      className="rounded border-ui-border-base text-[#5f2f3c] focus:ring-[#5f2f3c]"
                    />
                    <span>Email Broadcast</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ui-fg-base cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.channels.includes("popup")}
                      onChange={() => toggleChannel("popup")}
                      className="rounded border-ui-border-base text-[#5f2f3c] focus:ring-[#5f2f3c]"
                    />
                    <span>On-Screen Modal Popup</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ui-fg-base cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.channels.includes("banner")}
                      onChange={() => toggleChannel("banner")}
                      className="rounded border-ui-border-base text-[#5f2f3c] focus:ring-[#5f2f3c]"
                    />
                    <span>Top Announcement Bar</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                  Target Audience (Email)
                </label>
                <select
                  value={form.target_audience}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target_audience: e.target.value as any,
                    })
                  }
                  className="w-full bg-ui-bg-field border border-ui-border-base rounded px-3 py-2 text-sm text-ui-fg-base"
                >
                  <option value="all_subscribers">
                    Confirmed Newsletter Subscribers (Recommended / High Deliverability)
                  </option>
                  <option value="opted_in_customers">
                    Subscribers + Registered Customers (Marketing Opt-in)
                  </option>
                  <option value="all_users">
                    All Contacts &amp; Users (Critical Announcements Only)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                    Campaign Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full bg-ui-bg-field border border-ui-border-base rounded px-3 py-2 text-sm text-ui-fg-base"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-sm text-ui-fg-base cursor-pointer py-2">
                    <Switch
                      checked={form.is_popup_active}
                      onCheckedChange={(checked) => setForm({ ...form, is_popup_active: checked })}
                    />
                    <span className="font-medium">Activate Live On Storefront</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Scheduling & Offer Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                    Starts At (Optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                    Ends / Expiry (Optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                    Offer / Coupon Code
                  </label>
                  <Input
                    placeholder="e.g. ART15"
                    value={form.popup_coupon_code}
                    onChange={(e) => setForm({ ...form, popup_coupon_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                    Popup Frequency
                  </label>
                  <select
                    value={form.popup_frequency}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        popup_frequency: e.target.value as any,
                      })
                    }
                    className="w-full bg-ui-bg-field border border-ui-border-base rounded px-3 py-2 text-sm text-ui-fg-base"
                  >
                    <option value="once_per_visitor">Once per Visitor (Saved in Storage)</option>
                    <option value="once_per_session">Once per Browser Session</option>
                    <option value="always">Always on Every Visit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                  Banner / Popup Image URL
                </label>
                <Input
                  placeholder="https://... (Image link for modal banner)"
                  value={form.popup_image_url}
                  onChange={(e) => setForm({ ...form, popup_image_url: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Email Content Section */}
          {form.channels.includes("email") && (
            <div className="border-t border-ui-border-base pt-6 space-y-4">
              <Heading level="h3" className="text-sm font-semibold text-ui-fg-base uppercase tracking-wider">
                Email Message Content
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-ui-fg-subtle block mb-1">Email Subject Line *</label>
                  <Input
                    placeholder="e.g. An exclusive invitation to our Fall Collection"
                    value={form.email_subject}
                    onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-ui-fg-subtle block mb-1">Preview / Preheader Text</label>
                  <Input
                    placeholder="e.g. Discover hand-curated oil paintings and studio archives..."
                    value={form.email_preheader}
                    onChange={(e) => setForm({ ...form, email_preheader: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-ui-fg-subtle block mb-1">Email Body (HTML / Editorial copy)</label>
                <Textarea
                  rows={4}
                  placeholder="<p>Dear Collector,</p><p>We are delighted to share...</p>"
                  value={form.email_content_html}
                  onChange={(e) => setForm({ ...form, email_content_html: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* On-Screen Popup & Banner Section */}
          {(form.channels.includes("popup") || form.channels.includes("banner")) && (
            <div className="border-t border-ui-border-base pt-6 space-y-4">
              <Heading level="h3" className="text-sm font-semibold text-ui-fg-base uppercase tracking-wider">
                Storefront Screen Popup &amp; Banner Copy
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-ui-fg-subtle block mb-1">Popup Headline</label>
                  <Input
                    placeholder="e.g. Welcome to Livin In The Art"
                    value={form.popup_title}
                    onChange={(e) => setForm({ ...form, popup_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-ui-fg-subtle block mb-1">CTA Button Text &amp; Link</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="e.g. Explore Works"
                      value={form.popup_cta_text}
                      onChange={(e) => setForm({ ...form, popup_cta_text: e.target.value })}
                    />
                    <Input
                      placeholder="e.g. /artworks"
                      value={form.popup_cta_link}
                      onChange={(e) => setForm({ ...form, popup_cta_link: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-ui-fg-subtle block mb-1">Popup Body / Promotion Details</label>
                <Textarea
                  rows={2}
                  placeholder="Enjoy 15% off your first original acquisition. Handcrafted and verified authentic."
                  value={form.popup_body}
                  onChange={(e) => setForm({ ...form, popup_body: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Save Bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-ui-border-base">
            <Button
              variant="secondary"
              onClick={() => {
                setIsFormOpen(false)
                setEditingId(null)
                setForm(emptyForm)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={saveMutation.isPending || !form.title.trim()}
              onClick={() => saveMutation.mutate(form)}
            >
              {saveMutation.isPending ? "Saving..." : editingId ? "Save Changes" : "Create Campaign"}
            </Button>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="border border-ui-border-base rounded-lg overflow-hidden bg-ui-bg-base">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Campaign Title</Table.HeaderCell>
              <Table.HeaderCell>Channels</Table.HeaderCell>
              <Table.HeaderCell>Target Audience</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Live On Screen</Table.HeaderCell>
              <Table.HeaderCell>Metrics</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <TableCell colSpan={7} className="text-center py-8 text-ui-fg-subtle">
                  Loading broadcast campaigns...
                </TableCell>
              </Table.Row>
            ) : data?.broadcasts && data.broadcasts.length > 0 ? (
              data.broadcasts.map((b) => (
                <Table.Row key={b.id} className="hover:bg-ui-bg-subtle-hover transition-colors">
                  <Table.Cell>
                    <div className="font-medium text-ui-fg-base">{b.title}</div>
                    {b.popup_coupon_code && (
                      <span className="inline-block mt-1 font-mono text-xs px-2 py-0.5 bg-[#f5ede4] text-[#5f2f3c] font-semibold rounded">
                        {b.popup_coupon_code}
                      </span>
                    )}
                  </Table.Cell>

                  <Table.Cell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(b.channels) &&
                        b.channels.map((ch) => (
                          <Badge
                            key={ch}
                            color={ch === "email" ? "blue" : ch === "popup" ? "purple" : "orange"}
                            size="xsmall"
                          >
                            {ch}
                          </Badge>
                        ))}
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <Text className="text-xs text-ui-fg-subtle">
                      {b.target_audience === "all_subscribers"
                        ? "Newsletter Subscribers"
                        : b.target_audience === "opted_in_customers"
                        ? "Subscribers + Customers"
                        : "All Users"}
                    </Text>
                  </Table.Cell>

                  <Table.Cell>
                    <Badge
                      color={
                        b.status === "active"
                          ? "green"
                          : b.status === "completed"
                          ? "grey"
                          : "orange"
                      }
                      size="small"
                    >
                      {b.status}
                    </Badge>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={b.is_popup_active}
                        onCheckedChange={(val) =>
                          togglePopupMutation.mutate({ id: b.id, is_popup_active: val })
                        }
                      />
                      <span className="text-xs text-ui-fg-subtle">
                        {b.is_popup_active ? "Active" : "Off"}
                      </span>
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="text-xs space-y-0.5 text-ui-fg-subtle">
                      <div>
                        Sent: <span className="font-semibold text-ui-fg-base">{b.sent_count}</span>
                        {b.recipients_count > 0 && ` / ${b.recipients_count}`}
                      </div>
                      <div>
                        Impressions:{" "}
                        <span className="font-semibold text-ui-fg-base">{b.impressions_count || 0}</span>
                      </div>
                    </div>
                  </Table.Cell>

                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Live preview */}
                      <Button
                        variant="transparent"
                        size="small"
                        title="Preview Popup"
                        onClick={() => setShowPreviewModal(b)}
                      >
                        <Eye className="w-4 h-4 text-ui-fg-muted" />
                      </Button>

                      {/* Test email */}
                      <Button
                        variant="transparent"
                        size="small"
                        title="Send Test Email"
                        onClick={() => {
                          setTestTargetId(b.id)
                          const promptEmail = window.prompt("Enter email address to send test preview:")
                          if (promptEmail && promptEmail.includes("@")) {
                            sendTestMutation.mutate({ id: b.id, test_email: promptEmail.trim() })
                          }
                        }}
                      >
                        <PaperPlane className="w-4 h-4 text-ui-fg-muted" />
                      </Button>

                      {/* Send to All button */}
                      <Button
                        variant="secondary"
                        size="small"
                        disabled={sendLiveMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to broadcast "${b.title}" to all target recipients via email?`
                            )
                          ) {
                            sendLiveMutation.mutate(b.id)
                          }
                        }}
                      >
                        Send Email Blast
                      </Button>

                      {/* Edit */}
                      <Button
                        variant="transparent"
                        size="small"
                        title="Edit"
                        onClick={() => handleEdit(b)}
                      >
                        <PencilSquare className="w-4 h-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="transparent"
                        size="small"
                        title="Delete"
                        onClick={() => {
                          if (window.confirm(`Delete campaign "${b.title}"?`)) {
                            deleteMutation.mutate(b.id)
                          }
                        }}
                      >
                        <Trash className="w-4 h-4 text-ui-fg-error" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row>
                <TableCell colSpan={7} className="text-center py-12 text-ui-fg-subtle">
                  No broadcast campaigns created yet. Click "+ Create New Campaign" to get started.
                </TableCell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Live Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-[#e7dfd5]">
            <div className="p-4 bg-[#faf8f5] border-b border-[#eee7de] flex justify-between items-center">
              <span className="text-xs uppercase tracking-widest text-[#5f2f3c] font-semibold">
                Storefront Popup Preview
              </span>
              <button
                className="text-gray-400 hover:text-black font-semibold text-sm"
                onClick={() => setShowPreviewModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              {showPreviewModal.popup_image_url && (
                <img
                  src={showPreviewModal.popup_image_url}
                  alt={showPreviewModal.popup_title || ""}
                  className="w-full h-44 object-cover rounded"
                />
              )}

              <h3 className="font-serif text-2xl text-[#1a1a1a]">
                {showPreviewModal.popup_title || showPreviewModal.title}
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed">
                {showPreviewModal.popup_body || "Special offer available for a limited time on our curated original art."}
              </p>

              {showPreviewModal.popup_coupon_code && (
                <div className="p-3 bg-[#faf5f0] border border-dashed border-[#d5c3b2] rounded">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                    Use Coupon Code
                  </span>
                  <span className="block font-mono text-lg font-bold tracking-widest text-[#5f2f3c]">
                    {showPreviewModal.popup_coupon_code}
                  </span>
                </div>
              )}

              {showPreviewModal.popup_cta_text && (
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="block w-full py-3 bg-[#5f2f3c] text-white text-xs uppercase tracking-widest font-medium rounded hover:bg-[#4a242e] transition"
                >
                  {showPreviewModal.popup_cta_text}
                </a>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <button
                className="text-xs text-gray-500 hover:underline"
                onClick={() => setShowPreviewModal(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Broadcasts & Offers",
  icon: BellAlertSolid,
})

export default BroadcastsPage
