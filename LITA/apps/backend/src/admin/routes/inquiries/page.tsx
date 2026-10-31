import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Inquiry = {
  id: string
  kind: "contact" | "artwork" | "commission_general" | "trade_general"
  name: string
  email: string
  phone: string | null
  artwork_handle: string | null
  budget: string | null
  message: string
  status: "new" | "replied" | "archived"
  source_url: string | null
  created_at: string
}

type NewsletterSubscriber = {
  id: string
  email: string
  status: "pending" | "confirmed" | "unsubscribed"
  confirmed_at: string | null
  unsubscribed_at: string | null
  source: string | null
  created_at: string
}

const kindBadges: Record<string, { label: string; color: "blue" | "purple" | "orange" | "green" }> = {
  contact: { label: "Contact", color: "blue" },
  artwork: { label: "Artwork", color: "purple" },
  commission_general: { label: "Commission", color: "orange" },
  trade_general: { label: "Trade", color: "green" },
}

const subscriberStatusColor: Record<string, "green" | "orange" | "grey"> = {
  confirmed: "green",
  pending: "orange",
  unsubscribed: "grey",
}

const InquiriesPage = () => {
  const [activeTab, setActiveTab] = useState<"inquiries" | "subscribers">("inquiries")
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>("all")
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState<string>("all")
  const qc = useQueryClient()

  const { data: inquiryData, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["inquiries", inquiryStatusFilter],
    queryFn: () => {
      const url =
        inquiryStatusFilter === "all"
          ? "/admin/inquiries"
          : `/admin/inquiries?status=${inquiryStatusFilter}`
      return sdk.client.fetch<{ inquiries: Inquiry[]; count: number }>(url)
    },
    enabled: activeTab === "inquiries",
  })

  const { data: subscriberData, isLoading: subscribersLoading } = useQuery({
    queryKey: ["newsletter-subscribers", subscriberStatusFilter],
    queryFn: () => {
      const url =
        subscriberStatusFilter === "all"
          ? "/admin/newsletter-subscribers"
          : `/admin/newsletter-subscribers?status=${subscriberStatusFilter}`
      return sdk.client.fetch<{ subscribers: NewsletterSubscriber[]; count: number }>(url)
    },
    enabled: activeTab === "subscribers",
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sdk.client.fetch(`/admin/inquiries/${id}`, {
        method: "POST",
        body: { status },
      }),
    onSuccess: (_, variables) => {
      toast.success(`Inquiry marked as ${variables.status}`)
      qc.invalidateQueries({ queryKey: ["inquiries"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update inquiry status")
    },
  })

  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      <Toaster />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
        <div>
          <Heading level="h1">
            {activeTab === "inquiries" ? "Inquiries & Contact" : "Newsletter Subscribers"}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle mt-0.5">
            {activeTab === "inquiries"
              ? "Review and respond to artwork inquiries, studio contact messages, and general requests."
              : "Review studio newsletter subscribers, double opt-in verification statuses, and sign-up sources."}
          </Text>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          {activeTab === "inquiries" ? (
            <div className="w-40">
              <Select
                size="small"
                value={inquiryStatusFilter}
                onValueChange={(val) => setInquiryStatusFilter(val)}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Filter by status" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All Inquiries</Select.Item>
                  <Select.Item value="new">New</Select.Item>
                  <Select.Item value="replied">Replied</Select.Item>
                  <Select.Item value="archived">Archived</Select.Item>
                </Select.Content>
              </Select>
            </div>
          ) : (
            <div className="w-44">
              <Select
                size="small"
                value={subscriberStatusFilter}
                onValueChange={(val) => setSubscriberStatusFilter(val)}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Filter by status" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All Subscribers</Select.Item>
                  <Select.Item value="confirmed">Confirmed</Select.Item>
                  <Select.Item value="pending">Pending</Select.Item>
                  <Select.Item value="unsubscribed">Unsubscribed</Select.Item>
                </Select.Content>
              </Select>
            </div>
          )}

          <Badge size="small" color="grey">
            {activeTab === "inquiries"
              ? `${inquiryData?.count ?? 0} ${inquiryData?.count === 1 ? "inquiry" : "inquiries"}`
              : `${subscriberData?.count ?? 0} ${subscriberData?.count === 1 ? "subscriber" : "subscribers"}`}
          </Badge>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 px-6 py-2.5 bg-ui-bg-subtle">
        <Button
          size="small"
          variant={activeTab === "inquiries" ? "primary" : "secondary"}
          onClick={() => setActiveTab("inquiries")}
        >
          Inquiries ({inquiryData?.count ?? 0})
        </Button>
        <Button
          size="small"
          variant={activeTab === "subscribers" ? "primary" : "secondary"}
          onClick={() => setActiveTab("subscribers")}
        >
          Newsletter Subscribers ({subscriberData?.count ?? 0})
        </Button>
      </div>

      {activeTab === "inquiries" ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Kind</Table.HeaderCell>
              <Table.HeaderCell>Name & Email</Table.HeaderCell>
              <Table.HeaderCell>Context / Reference</Table.HeaderCell>
              <Table.HeaderCell>Message</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Received</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {inquiriesLoading ? (
              <Table.Row>
                <Table.Cell colSpan={6} className="text-center py-8 text-ui-fg-muted">
                  Loading inquiries...
                </Table.Cell>
              </Table.Row>
            ) : inquiryData?.inquiries?.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6} className="text-center py-8 text-ui-fg-muted">
                  No inquiries found
                </Table.Cell>
              </Table.Row>
            ) : (
              inquiryData?.inquiries?.map((inq) => {
                const badge = kindBadges[inq.kind] || { label: inq.kind, color: "grey" }
                return (
                  <Table.Row key={inq.id}>
                    <Table.Cell>
                      <Badge color={badge.color}>{badge.label}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-medium text-ui-fg-base">{inq.name}</div>
                      <a
                        href={`mailto:${inq.email}`}
                        className="text-xs text-ui-fg-subtle hover:text-ui-fg-base underline"
                      >
                        {inq.email}
                      </a>
                      {inq.phone && (
                        <div className="text-xs text-ui-fg-muted">{inq.phone}</div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {inq.artwork_handle && (
                        <div className="text-xs">
                          <span className="text-ui-fg-subtle">Artwork:</span>{" "}
                          <span className="font-medium">{inq.artwork_handle}</span>
                        </div>
                      )}
                      {inq.budget && (
                        <div className="text-xs">
                          <span className="text-ui-fg-subtle">Budget:</span> {inq.budget}
                        </div>
                      )}
                      {inq.source_url && (
                        <a
                          href={inq.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-ui-fg-muted truncate max-w-[140px] block hover:underline"
                        >
                          {inq.source_url}
                        </a>
                      )}
                      {!inq.artwork_handle && !inq.budget && !inq.source_url && (
                        <span className="text-ui-fg-muted text-xs">-</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="max-w-md whitespace-pre-wrap text-sm text-ui-fg-subtle">
                      {inq.message}
                    </Table.Cell>
                    <Table.Cell>
                      <Select
                        size="small"
                        value={inq.status}
                        onValueChange={(status) =>
                          updateStatus.mutate({ id: inq.id, status })
                        }
                      >
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="new">New</Select.Item>
                          <Select.Item value="replied">Replied</Select.Item>
                          <Select.Item value="archived">Archived</Select.Item>
                        </Select.Content>
                      </Select>
                    </Table.Cell>
                    <Table.Cell className="text-xs text-ui-fg-muted whitespace-nowrap">
                      {new Date(inq.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Table.Cell>
                  </Table.Row>
                )
              })
            )}
          </Table.Body>
        </Table>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Email Address</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Source</Table.HeaderCell>
              <Table.HeaderCell>Subscribed At</Table.HeaderCell>
              <Table.HeaderCell>Confirmed At</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {subscribersLoading ? (
              <Table.Row>
                <Table.Cell colSpan={5} className="text-center py-8 text-ui-fg-muted">
                  Loading subscribers...
                </Table.Cell>
              </Table.Row>
            ) : subscriberData?.subscribers?.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} className="text-center py-8 text-ui-fg-muted">
                  No subscribers found
                </Table.Cell>
              </Table.Row>
            ) : (
              subscriberData?.subscribers?.map((sub) => (
                <Table.Row key={sub.id}>
                  <Table.Cell>
                    <div className="font-medium text-ui-fg-base">{sub.email}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={subscriberStatusColor[sub.status] || "grey"}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-subtle">
                    {sub.source || "storefront"}
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
                      : "Pending"}
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Inquiries",
  icon: ChatBubbleLeftRight,
})

export default InquiriesPage
