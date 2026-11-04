import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CreditCard } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Drawer,
  Heading,
  Input,
  Table,
  Text,
  Textarea,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type PaymentStatus =
  | "awaiting_proof"
  | "submitted"
  | "verified"
  | "rejected"
  | "expired"

type UpiPayment = {
  id: string
  reference_code: string
  order_id: string | null
  order_display_id: number | null
  email: string
  amount: number
  currency_code: string
  order_total: number | null
  order_currency_code: string
  status: PaymentStatus
  utr: string | null
  payer_vpa: string | null
  screenshot_key: string | null
  screenshot_url: string | null
  submitted_at: string | null
  expires_at: string
  created_at: string
  reject_reason: string | null
}

type ListResponse = {
  payments: UpiPayment[]
  count: number
  total: number
  counts: Record<PaymentStatus, number>
}

const STATUS_TABS: Array<{ value: PaymentStatus | "all"; label: string }> = [
  { value: "submitted", label: "Submitted" },
  { value: "awaiting_proof", label: "Awaiting proof" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "All" },
]

const STATUS_COLORS: Record<
  PaymentStatus,
  "purple" | "blue" | "orange" | "green" | "red" | "grey"
> = {
  awaiting_proof: "orange",
  submitted: "blue",
  verified: "green",
  rejected: "red",
  expired: "grey",
}

const QUICK_REASONS = [
  "Amount mismatch",
  "UTR not found",
  "Duplicate",
  "Unreadable screenshot",
]

function formatInr(amount: number, currency = "inr"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function expiresIn(value: string): string {
  const remaining = new Date(value).getTime() - Date.now()
  if (remaining <= 0) return "Expired"
  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  return hours >= 24
    ? `${Math.floor(hours / 24)}d ${hours % 24}h`
    : `${hours}h ${minutes}m`
}

const UpiPaymentsPage = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<PaymentStatus | "all">("submitted")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<UpiPayment | null>(null)
  const [dialog, setDialog] = useState<"verify" | "reject" | "cancel" | null>(null)
  const [amountConfirmed, setAmountConfirmed] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["upi-payments", status, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      if (search.trim()) params.set("q", search.trim())
      const query = params.toString()
      return sdk.client.fetch<ListResponse>(
        `/admin/upi-payments${query ? `?${query}` : ""}`
      )
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ payment: UpiPayment }>(
        `/admin/upi-payments/${selected?.id}/verify`,
        {
          method: "POST",
          body: { amount_confirmed: true },
        }
      ),
    onSuccess: () => {
      toast.success("UPI payment verified and captured")
      setDialog(null)
      setAmountConfirmed(false)
      queryClient.invalidateQueries({ queryKey: ["upi-payments"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to verify UPI payment")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ payment: UpiPayment }>(
        `/admin/upi-payments/${selected?.id}/reject`,
        {
          method: "POST",
          body: { reason: rejectReason },
        }
      ),
    onSuccess: () => {
      toast.success("UPI proof rejected. The customer can submit updated proof.")
      setDialog(null)
      setRejectReason("")
      queryClient.invalidateQueries({ queryKey: ["upi-payments"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject UPI payment")
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ payment: UpiPayment }>(
        `/admin/upi-payments/${selected?.id}/cancel`,
        { method: "POST" }
      ),
    onSuccess: () => {
      toast.success("UPI order cancelled and inventory released")
      setDialog(null)
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: ["upi-payments"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel UPI order")
    },
  })

  function openPayment(payment: UpiPayment) {
    setSelected(payment)
    setDialog(null)
    setAmountConfirmed(false)
    setRejectReason("")
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  const selectedAmount = selected
    ? formatInr(selected.order_total ?? selected.amount, selected.order_currency_code)
    : ""
  const verifyText = selected?.utr
    ? `I confirmed ${selectedAmount} with UTR ${selected.utr} in my bank or UPI app`
    : `I confirmed ${selectedAmount} in my bank or UPI app`

  return (
    <Container className="divide-y divide-ui-border-base p-0">
      <Toaster />
      <div className="flex flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-ui-fg-subtle" />
            <Heading level="h1">UPI Payments</Heading>
          </div>
          <Text size="small" className="mt-0.5 text-ui-fg-subtle">
            Match customer proof against your business UPI account, then verify or reject it.
          </Text>
        </div>
        <div className="w-full sm:w-72">
          <Input
            aria-label="Search reference, email, or UTR"
            placeholder="Search reference, email, or UTR"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div
        role="note"
        className="m-6 border border-ui-border-warning bg-ui-bg-warning p-4 text-sm text-ui-fg-base"
      >
        <strong>UPI refunds are manual.</strong> Send the refund from the business UPI app first, then click Refund in Medusa to record it.
      </div>

      <div className="flex flex-wrap gap-2 bg-ui-bg-subtle px-6 py-3">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? data?.total ?? 0
              : data?.counts[tab.value] ?? 0
          return (
            <Button
              key={tab.value}
              size="small"
              variant={status === tab.value ? "primary" : "secondary"}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label} ({count})
            </Button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-ui-fg-muted">
          <Text>Loading UPI payments…</Text>
        </div>
      ) : isError ? (
        <div role="alert" className="p-12 text-center text-ui-fg-error">
          Could not load UPI payments. Refresh the page to try again.
        </div>
      ) : !data?.payments.length ? (
        <div className="p-12 text-center text-ui-fg-muted">
          <Text>
            {search
              ? "No UPI payments match this search."
              : "No UPI payments in this status."}
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Reference</Table.HeaderCell>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Customer email</Table.HeaderCell>
              <Table.HeaderCell>Amount</Table.HeaderCell>
              <Table.HeaderCell>UTR</Table.HeaderCell>
              <Table.HeaderCell>Submitted</Table.HeaderCell>
              <Table.HeaderCell>Expires in</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.payments.map((payment) => (
              <Table.Row
                key={payment.id}
                className="cursor-pointer hover:bg-ui-bg-subtle"
                onClick={() => openPayment(payment)}
              >
                <Table.Cell className="font-mono text-xs">
                  {payment.reference_code}
                </Table.Cell>
                <Table.Cell>
                  {payment.order_display_id
                    ? `#${payment.order_display_id}`
                    : payment.order_id ?? "—"}
                </Table.Cell>
                <Table.Cell>{payment.email}</Table.Cell>
                <Table.Cell>
                  {formatInr(payment.amount, payment.currency_code)}
                </Table.Cell>
                <Table.Cell className="font-mono">
                  {payment.utr ?? "—"}
                </Table.Cell>
                <Table.Cell>
                  {formatDate(payment.submitted_at)}
                  {payment.status === "submitted" &&
                    payment.submitted_at &&
                    Date.now() - new Date(payment.submitted_at).getTime() >
                      24 * 60 * 60 * 1000 && (
                      <Badge color="orange" className="mt-1 block w-fit">
                        Submitted for more than 24 hours
                      </Badge>
                    )}
                </Table.Cell>
                <Table.Cell>{expiresIn(payment.expires_at)}</Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLORS[payment.status]}>
                    {payment.status.replaceAll("_", " ")}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <Drawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setDialog(null)
          }
        }}
      >
        <Drawer.Content className="z-50">
          {selected && (
            <>
              <Drawer.Header>
                <Drawer.Title>UPI payment details</Drawer.Title>
                <Drawer.Description>
                  Reference {selected.reference_code}
                </Drawer.Description>
              </Drawer.Header>
              <Drawer.Body className="space-y-5 overflow-y-auto p-4">
                <div className="grid gap-3 text-sm">
                  <p>
                    <strong>Customer:</strong> {selected.email}
                  </p>
                  <p>
                    <strong>Amount:</strong>{" "}
                    {formatInr(selected.amount, selected.currency_code)}
                  </p>
                  <p>
                    <strong>Order total:</strong>{" "}
                    {selected.order_total == null
                      ? "Unavailable"
                      : formatInr(
                          selected.order_total,
                          selected.order_currency_code
                        )}
                  </p>
                  <p>
                    <strong>UTR:</strong>{" "}
                    {selected.utr ? (
                      <>
                        <span className="font-mono">{selected.utr}</span>{" "}
                        <Button
                          size="small"
                          variant="transparent"
                          onClick={() =>
                            void copyValue("UTR", selected.utr as string)
                          }
                        >
                          Copy
                        </Button>
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                  <p>
                    <strong>Payer UPI ID:</strong>{" "}
                    {selected.payer_vpa ? (
                      <>
                        <span>{selected.payer_vpa}</span>{" "}
                        <Button
                          size="small"
                          variant="transparent"
                          onClick={() =>
                            void copyValue("Payer UPI ID", selected.payer_vpa as string)
                          }
                        >
                          Copy
                        </Button>
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                  <p>
                    <strong>Submitted:</strong> {formatDate(selected.submitted_at)}
                  </p>
                  <p>
                    <strong>Expires in:</strong> {expiresIn(selected.expires_at)}
                  </p>
                  {selected.order_id && (
                    <a
                      className="text-ui-fg-interactive underline"
                      href={`/app/orders/${selected.order_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open order {selected.order_display_id
                        ? `#${selected.order_display_id}`
                        : selected.order_id}
                    </a>
                  )}
                  {selected.screenshot_url && (
                    <a
                      href={selected.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={selected.screenshot_url}
                        alt={`Payment screenshot for ${selected.reference_code}`}
                        className="max-h-96 max-w-full border border-ui-border-base object-contain"
                      />
                    </a>
                  )}
                  {selected.reject_reason && (
                    <p>
                      <strong>Previous rejection:</strong> {selected.reject_reason}
                    </p>
                  )}
                </div>

                {dialog === "verify" && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="upi-verify-title"
                    className="space-y-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-modal"
                  >
                    <Heading id="upi-verify-title" level="h2">
                      Confirm payment
                    </Heading>
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox
                        checked={amountConfirmed}
                        onCheckedChange={(checked) =>
                          setAmountConfirmed(checked === true)
                        }
                        aria-label={verifyText}
                      />
                      <span>{verifyText}</span>
                    </label>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setDialog(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={!amountConfirmed || verifyMutation.isPending}
                        isLoading={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate()}
                      >
                        Verify and capture
                      </Button>
                    </div>
                  </div>
                )}

                {dialog === "reject" && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="upi-reject-title"
                    className="space-y-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-modal"
                  >
                    <Heading id="upi-reject-title" level="h2">
                      Reject payment proof
                    </Heading>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_REASONS.map((reason) => (
                        <Button
                          key={reason}
                          size="small"
                          variant={
                            rejectReason === reason ? "primary" : "secondary"
                          }
                          onClick={() => setRejectReason(reason)}
                        >
                          {reason}
                        </Button>
                      ))}
                    </div>
                    <label htmlFor="upi-reject-reason" className="text-sm">
                      Reason (3–300 characters)
                    </label>
                    <Textarea
                      id="upi-reject-reason"
                      value={rejectReason}
                      maxLength={300}
                      onChange={(event) => setRejectReason(event.target.value)}
                      aria-required="true"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setDialog(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        disabled={
                          rejectReason.trim().length < 3 ||
                          rejectReason.trim().length > 300 ||
                          rejectMutation.isPending
                        }
                        isLoading={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate()}
                      >
                        Reject proof
                      </Button>
                    </div>
                  </div>
                )}

                {dialog === "cancel" && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="upi-cancel-title"
                    className="space-y-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-modal"
                  >
                    <Heading id="upi-cancel-title" level="h2">
                      Cancel unpaid order?
                    </Heading>
                    <Text>
                      This cancels the Medusa order and releases its inventory
                      reservation. Use only after confirming the order should
                      not remain open.
                    </Text>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setDialog(null)}
                      >
                        Keep order
                      </Button>
                      <Button
                        variant="danger"
                        isLoading={cancelMutation.isPending}
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate()}
                      >
                        Cancel order
                      </Button>
                    </div>
                  </div>
                )}
              </Drawer.Body>
              <Drawer.Footer className="flex justify-between">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(null)
                    setDialog(null)
                  }}
                >
                  Close
                </Button>
                {(selected.status === "submitted" ||
                  selected.status === "awaiting_proof") && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRejectReason("")
                        setDialog("reject")
                      }}
                    >
                      Reject
                    </Button>
                    <Button onClick={() => setDialog("verify")}>
                      Verify
                    </Button>
                  </div>
                )}
                {selected.status === "awaiting_proof" && (
                  <Button
                    variant="danger"
                    onClick={() => setDialog("cancel")}
                  >
                    Cancel order
                  </Button>
                )}
              </Drawer.Footer>
            </>
          )}
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "UPI Payments",
  icon: CreditCard,
})

export default UpiPaymentsPage
