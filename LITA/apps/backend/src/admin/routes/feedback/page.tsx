import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Badge, Container, Heading, Select, Table, Tabs } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Item = {
  id: string
  type: "feedback" | "bug"
  message: string
  email: string | null
  page_url: string | null
  image_url: string | null
  status: "new" | "reviewed" | "resolved"
  created_at: string
}

const FeedbackPage = () => {
  const [filter, setFilter] = useState<"all" | "feedback" | "bug">("all")
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ["feedbacks", filter],
    queryFn: () =>
      sdk.client.fetch<{ feedbacks: Item[] }>("/admin/feedback", {
        query: filter === "all" ? {} : { type: filter },
      }),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sdk.client.fetch(`/admin/feedback/${id}`, { method: "POST", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedbacks"] }),
  })

  return (
    <Container className="p-0">
      <div className="px-6 py-4">
        <Heading>Feedback & Bug Reports</Heading>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <Tabs.List className="px-6">
          <Tabs.Trigger value="all">All</Tabs.Trigger>
          <Tabs.Trigger value="feedback">Feedback</Tabs.Trigger>
          <Tabs.Trigger value="bug">Bugs</Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell>Message</Table.HeaderCell>
            <Table.HeaderCell>From</Table.HeaderCell>
            <Table.HeaderCell>Page</Table.HeaderCell>
            <Table.HeaderCell>Screenshot</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data?.feedbacks?.map((f) => (
            <Table.Row
              key={f.id}
              style={{ borderLeft: `4px solid ${f.type === "bug" ? "#ef4444" : "#22c55e"}` }}
            >
              <Table.Cell>
                <Badge color={f.type === "bug" ? "red" : "green"}>
                  {f.type === "bug" ? "Bug" : "Feedback"}
                </Badge>
              </Table.Cell>
              <Table.Cell className="max-w-md whitespace-pre-wrap">{f.message}</Table.Cell>
              <Table.Cell>{f.email ?? "Anonymous"}</Table.Cell>
              <Table.Cell className="max-w-[160px] truncate">{f.page_url ?? "-"}</Table.Cell>
              <Table.Cell>
                {f.image_url ? (
                  <a href={f.image_url} target="_blank" rel="noreferrer">
                    <img src={f.image_url} className="h-10 w-10 rounded object-cover" />
                  </a>
                ) : (
                  "-"
                )}
              </Table.Cell>
              <Table.Cell>
                <Select
                  value={f.status}
                  onValueChange={(status) => setStatus.mutate({ id: f.id, status })}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="new">New</Select.Item>
                    <Select.Item value="reviewed">Reviewed</Select.Item>
                    <Select.Item value="resolved">Resolved</Select.Item>
                  </Select.Content>
                </Select>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Feedback",
  icon: ChatBubbleLeftRight,
})

export default FeedbackPage
