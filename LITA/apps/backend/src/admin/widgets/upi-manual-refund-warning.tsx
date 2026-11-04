import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Alert, Container, Text } from "@medusajs/ui"

const UPI_MANUAL_PROVIDER_ID = "pp_upimanual_upimanual"

type OrderPaymentCollection = {
  payments?: Array<{ provider_id?: string }>
  payment_sessions?: Array<{ provider_id?: string }>
}

type OrderWidgetProps = {
  data: {
    payment_collections?: OrderPaymentCollection[]
  }
}

const UpiManualRefundWarning = ({ data }: OrderWidgetProps) => {
  const usesManualUpi = data.payment_collections?.some((collection) =>
    [...(collection.payments ?? []), ...(collection.payment_sessions ?? [])].some(
      (payment) => payment.provider_id === UPI_MANUAL_PROVIDER_ID
    )
  )

  if (!usesManualUpi) {
    return null
  }

  return (
    <Container>
      <Alert variant="warning">
        <Text>
          Send the refund from the business UPI app first, then click Refund in
          Medusa to record it. This provider does not transfer refund funds.
        </Text>
      </Alert>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default UpiManualRefundWarning
