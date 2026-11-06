import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Envelope,
  ArrowDownTray,
  Plus,
  Trash,
  Check,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Table,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

// Cast Table.Cell to allow HTML attributes like colSpan
const TableCell = Table.Cell as React.ForwardRefExoticComponent<
  React.TdHTMLAttributes<HTMLTableCellElement> & React.RefAttributes<HTMLTableCellElement>
>

export type NewsletterSubscriber = {
  id: string
  email: string
  status: "pending" | "confirmed" | "unsubscribed"
  confirmed_at: string | null
  unsubscribed_at: string | null
  source: string | null
  created_at: string
}

const statusBadgeColor: Record<string, "green" | "orange" | "grey"> = {
  confirmed: "green",
  pending: "orange",
  unsubscribed: "grey",
}

const NewsletterSubscribersPage = () => {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isAddingOpen, setIsAddingOpen] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newStatus, setNewStatus] = useState<"confirmed" | "pending">("confirmed")

  // Fetch subscribers from the backend
  const { data, isLoading } = useQuery({
    queryKey: ["admin-newsletter-subscribers", statusFilter],
    queryFn: () => {
      const url =
        statusFilter === "all"
          ? "/admin/newsletter-subscribers"
          : `/admin/newsletter-subscribers?status=${statusFilter}`
      return sdk.client.fetch<{ subscribers: NewsletterSubscriber[]; count: number }>(url)
    },
  })

  // Filter subscribers locally by search query
  const filteredSubscribers = useMemo(() => {
    const list = data?.subscribers || []
    if (!searchQuery.trim()) return list
    const q = searchQuery.trim().toLowerCase()
    return list.filter((s) => s.email.toLowerCase().includes(q))
  }, [data?.subscribers, searchQuery])

  // Aggregate metrics
  const metrics = useMemo(() => {
    const list = data?.subscribers || []
    return {
      total: list.length,
      confirmed: list.filter((s) => s.status === "confirmed").length,
      pending: list.filter((s) => s.status === "pending").length,
      unsubscribed: list.filter((s) => s.status === "unsubscribed").length,
    }
  }, [data?.subscribers])

  // Update subscriber status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sdk.client.fetch(`/admin/newsletter-subscribers/${id}`, {
        method: "POST",
        body: { status },
      }),
    onSuccess: (_, variables) => {
      toast.success(`Subscriber status updated to ${variables.status}`)
      qc.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update subscriber")
    },
  })

  // Delete subscriber mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/newsletter-subscribers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Subscriber removed successfully")
      qc.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete subscriber")
    },
  })

  // Add subscriber mutation
  const addMutation = useMutation({
    mutationFn: (payload: { email: string; status: string; source: string }) =>
      sdk.client.fetch("/admin/newsletter-subscribers", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      toast.success("Subscriber added successfully")
      setNewEmail("")
      setIsAddingOpen(false)
      qc.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add subscriber")
    },
  })

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Please provide a valid email address.")
      return
    }
    addMutation.mutate({
      email: newEmail.trim(),
      status: newStatus,
      source: "admin_manual",
    })
  }

  function handleExportCsv() {
    const list = filteredSubscribers
    if (list.length === 0) {
      toast.error("No subscribers to export.")
      return
    }

    const headers = ["Email", "Status", "Source", "Subscribed At", "Confirmed At", "Unsubscribed At"]
    const rows = list.map((s) => [
      s.email,
      s.status,
      s.source || "storefront",
      new Date(s.created_at).toISOString(),
      s.confirmed_at ? new Date(s.confirmed_at).toISOString() : "",
      s.unsubscribed_at ? new Date(s.unsubscribed_at).toISOString() : "",
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `lita-newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${list.length} subscribers to CSV.`)
  }

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <Toaster />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-ui-border-base">
        <div>
          <Heading level="h1" className="text-2xl font-semibold tracking-tight text-ui-fg-base flex items-center gap-2.5">
            <Envelope className="text-[#5f2f3c] w-6 h-6" /> Newsletter Subscribers
          </Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Review and manage studio newsletter subscribers, double opt-in verification statuses, and acquisition channels.
          </Text>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            size="small"
            variant="secondary"
            onClick={handleExportCsv}
            disabled={filteredSubscribers.length === 0}
          >
            <ArrowDownTray className="mr-1.5 w-4 h-4 text-ui-fg-subtle" />
            Export CSV
          </Button>
          <Button
            size="small"
            variant={isAddingOpen ? "secondary" : "primary"}
            onClick={() => setIsAddingOpen(!isAddingOpen)}
          >
            <Plus className="mr-1.5 w-4 h-4" />
            {isAddingOpen ? "Close Form" : "Add Subscriber"}
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-ui-bg-subtle border border-ui-border-base rounded-lg border-t-2 border-t-ui-border-strong">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wider font-medium">
            Total Subscribers
          </Text>
          <Text size="large" className="text-2xl font-semibold text-ui-fg-base mt-1">
            {metrics.total}
          </Text>
        </div>
        <div className="p-4 bg-ui-bg-subtle border border-ui-border-base rounded-lg border-t-2 border-t-[#5f2f3c]">
          <Text size="xsmall" className="text-[#5f2f3c] uppercase tracking-wider font-semibold">
            Confirmed Active
          </Text>
          <Text size="large" className="text-2xl font-semibold text-[#5f2f3c] mt-1">
            {metrics.confirmed}
          </Text>
        </div>
        <div className="p-4 bg-ui-bg-subtle border border-ui-border-base rounded-lg border-t-2 border-t-amber-600">
          <Text size="xsmall" className="text-amber-800 uppercase tracking-wider font-semibold">
            Pending Opt-In
          </Text>
          <Text size="large" className="text-2xl font-semibold text-amber-800 mt-1">
            {metrics.pending}
          </Text>
        </div>
        <div className="p-4 bg-ui-bg-subtle border border-ui-border-base rounded-lg border-t-2 border-t-ui-fg-muted">
          <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider font-medium">
            Unsubscribed
          </Text>
          <Text size="large" className="text-2xl font-semibold text-ui-fg-muted mt-1">
            {metrics.unsubscribed}
          </Text>
        </div>
      </div>

      {/* Add Subscriber Panel (Inline Collapsible) */}
      {isAddingOpen && (
        <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-ui-border-base pb-3">
            <div>
              <Heading level="h2" className="text-lg font-medium text-ui-fg-base">
                Manual Subscriber Registration
              </Heading>
              <Text size="small" className="text-ui-fg-subtle mt-0.5">
                Register a collector directly from gallery events or bespoke commissions.
              </Text>
            </div>
            <Button
              variant="transparent"
              size="small"
              onClick={() => setIsAddingOpen(false)}
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
            <div>
              <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="collector@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider block mb-1">
                Subscription Status
              </label>
              <Select
                value={newStatus}
                onValueChange={(val) => setNewStatus(val as "confirmed" | "pending")}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="confirmed">Confirmed (Immediate)</Select.Item>
                  <Select.Item value="pending">Pending (Awaiting Opt-In)</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" type="submit" disabled={addMutation.isPending} className="w-full">
                <Check className="mr-1.5 w-4 h-4" />
                {addMutation.isPending ? "Saving…" : "Save Subscriber"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search subscribers by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="w-48">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Filter by status" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All Subscribers</Select.Item>
                <Select.Item value="confirmed">Confirmed Active</Select.Item>
                <Select.Item value="pending">Pending Verification</Select.Item>
                <Select.Item value="unsubscribed">Unsubscribed</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <Badge size="small" color="grey">
            {filteredSubscribers.length} {filteredSubscribers.length === 1 ? "record" : "records"}
          </Badge>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-ui-border-base rounded-lg overflow-hidden bg-ui-bg-base">
        <Table>
          <Table.Header>
            <Table.Row className="bg-ui-bg-subtle">
              <Table.HeaderCell>Email Address</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Acquisition Channel</Table.HeaderCell>
              <Table.HeaderCell>Subscribed Date</Table.HeaderCell>
              <Table.HeaderCell>Verification Date</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <TableCell colSpan={6} className="text-center py-12 text-ui-fg-muted">
                  Loading subscribers directory...
                </TableCell>
              </Table.Row>
            ) : filteredSubscribers.length === 0 ? (
              <Table.Row>
                <TableCell colSpan={6} className="text-center py-12 text-ui-fg-muted">
                  No newsletter subscribers found matching your criteria.
                </TableCell>
              </Table.Row>
            ) : (
              filteredSubscribers.map((sub) => (
                <Table.Row key={sub.id} className="hover:bg-ui-bg-subtle/50 transition-colors">
                  <Table.Cell>
                    <div className="font-medium text-ui-fg-base">{sub.email}</div>
                    <a
                      href={`mailto:${sub.email}`}
                      className="text-xs text-ui-fg-subtle hover:text-[#5f2f3c] underline mt-0.5 inline-block"
                    >
                      Compose email
                    </a>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusBadgeColor[sub.status] || "grey"}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-subtle capitalize">
                    {sub.source ? sub.source.replace(/_/g, " ") : "Storefront footer"}
                  </Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-muted whitespace-nowrap">
                    {new Date(sub.created_at).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-muted whitespace-nowrap">
                    {sub.confirmed_at
                      ? new Date(sub.confirmed_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : sub.status === "unsubscribed"
                      ? "Unsubscribed"
                      : "Pending Opt-In"}
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        size="small"
                        value={sub.status}
                        onValueChange={(newSt) =>
                          updateStatusMutation.mutate({ id: sub.id, status: newSt })
                        }
                      >
                        <Select.Trigger className="w-32">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="confirmed">Confirmed</Select.Item>
                          <Select.Item value="pending">Pending</Select.Item>
                          <Select.Item value="unsubscribed">Unsubscribed</Select.Item>
                        </Select.Content>
                      </Select>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Remove subscriber ${sub.email}?`)) {
                            deleteMutation.mutate(sub.id)
                          }
                        }}
                        title="Delete subscriber"
                      >
                        <Trash className="w-3.5 h-3.5 text-ui-fg-danger" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Newsletter Subscribers",
  icon: Envelope,
})

export default NewsletterSubscribersPage
