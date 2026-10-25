import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront, ArrowUpRightOnBox } from "@medusajs/icons"
import { Container, Heading, Table, Badge, Button, Text, toast, Toaster, Select } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Application = {
  id: string
  name: string
  email: string
  company: string | null
  role: string | null
  phone: string | null
  website: string | null
  message: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
}

const statusColor: Record<string, "orange" | "green" | "red" | "grey"> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
}

const TradeApplicationsPage = () => {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["trade-applications", statusFilter],
    queryFn: () => {
      const url = statusFilter === "all" 
        ? "/admin/trade-applications" 
        : `/admin/trade-applications?status=${statusFilter}`
      return sdk.client.fetch<{ applications: Application[]; count: number }>(url)
    },
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" | "pending" }) =>
      sdk.client.fetch<{ application: Application }>(`/admin/trade-applications/${id}`, {
        method: "POST",
        body: { status },
      }),
    onSuccess: (_, variables) => {
      toast.success(`Application marked as ${variables.status}`)
      qc.invalidateQueries({ queryKey: ["trade-applications"] })
      if (selectedApp && selectedApp.id === variables.id) {
        setSelectedApp((prev) => prev ? { ...prev, status: variables.status } : null)
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update application status")
    },
  })

  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      <Toaster />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
        <div>
          <Heading level="h1">Trade Applications</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-0.5">
            Review and manage interior designer, architect, and commercial trade partner applications.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val)}
            >
              <Select.Trigger size="small">
                <Select.Value placeholder="Filter by status" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All Applications</Select.Item>
                <Select.Item value="pending">Pending</Select.Item>
                <Select.Item value="approved">Approved</Select.Item>
                <Select.Item value="rejected">Rejected</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <Badge size="small" color="grey">
            {data?.count ?? 0} {data?.count === 1 ? "application" : "applications"}
          </Badge>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-8 text-center text-ui-fg-muted">
          <Text>Loading applications...</Text>
        </div>
      ) : !data?.applications?.length ? (
        <div className="p-12 text-center text-ui-fg-subtle">
          <Text className="text-base font-medium text-ui-fg-base mb-1">No applications found</Text>
          <Text size="small">
            {statusFilter === "all"
              ? "New submissions from the storefront Trade Program will appear here."
              : `No applications with status "${statusFilter}".`}
          </Text>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Date</Table.HeaderCell>
                <Table.HeaderCell>Applicant</Table.HeaderCell>
                <Table.HeaderCell>Role / Discipline</Table.HeaderCell>
                <Table.HeaderCell>Company</Table.HeaderCell>
                <Table.HeaderCell>Contact</Table.HeaderCell>
                <Table.HeaderCell>Message / Scope</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.applications.map((app) => (
                <Table.Row key={app.id}>
                  {/* Date */}
                  <Table.Cell className="text-xs text-ui-fg-subtle whitespace-nowrap">
                    {new Date(app.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Table.Cell>

                  {/* Name */}
                  <Table.Cell>
                    <div className="font-medium text-ui-fg-base">{app.name}</div>
                    <div className="text-xs text-ui-fg-muted font-mono">{app.email}</div>
                  </Table.Cell>

                  {/* Role */}
                  <Table.Cell>
                    {app.role ? (
                      <Badge size="small" color="grey">{app.role}</Badge>
                    ) : (
                      <span className="text-ui-fg-muted text-xs">—</span>
                    )}
                  </Table.Cell>

                  {/* Company & Website */}
                  <Table.Cell>
                    <div className="text-sm text-ui-fg-base font-medium">{app.company || "—"}</div>
                    {app.website && (
                      <a
                        href={app.website.startsWith("http") ? app.website : `https://${app.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-ui-fg-interactive hover:underline mt-0.5"
                      >
                        Visit Portfolio <ArrowUpRightOnBox className="w-3 h-3" />
                      </a>
                    )}
                  </Table.Cell>

                  {/* Phone */}
                  <Table.Cell className="text-xs text-ui-fg-subtle whitespace-nowrap">
                    {app.phone || "—"}
                  </Table.Cell>

                  {/* Message */}
                  <Table.Cell className="max-w-[220px]">
                    <div
                      className="text-xs text-ui-fg-subtle truncate cursor-pointer hover:text-ui-fg-base"
                      title={app.message || ""}
                      onClick={() => setSelectedApp(app)}
                    >
                      {app.message || "—"}
                    </div>
                  </Table.Cell>

                  {/* Status */}
                  <Table.Cell>
                    <Badge color={statusColor[app.status] || "grey"}>
                      {app.status}
                    </Badge>
                  </Table.Cell>

                  {/* Actions */}
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="small"
                        variant="primary"
                        disabled={app.status === "approved" || update.isPending}
                        onClick={() => update.mutate({ id: app.id, status: "approved" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={app.status === "rejected" || update.isPending}
                        onClick={() => update.mutate({ id: app.id, status: "rejected" })}
                      >
                        Reject
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {/* Message / Application Details Drawer */}
      {selectedApp && (
        <div className="p-6 bg-ui-bg-subtle border-t border-ui-border-base">
          <div className="flex items-start justify-between mb-3">
            <div>
              <Text size="large" className="font-semibold text-ui-fg-base">
                Application from {selectedApp.name} ({selectedApp.company || "Independent"})
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Discipline: {selectedApp.role || "Not specified"} • Status: {selectedApp.status}
              </Text>
            </div>
            <Button size="small" variant="secondary" onClick={() => setSelectedApp(null)}>
              Close
            </Button>
          </div>
          <div className="bg-ui-bg-base p-4 rounded-md border border-ui-border-base space-y-2">
            <div className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider">
              Message / Project Scope:
            </div>
            <p className="text-sm text-ui-fg-base whitespace-pre-wrap leading-relaxed">
              {selectedApp.message || "No message provided."}
            </p>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Trade Applications",
  icon: BuildingStorefront,
})

export default TradeApplicationsPage
