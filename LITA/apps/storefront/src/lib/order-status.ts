export function getCustomerOrderStatus({
  orderStatus,
  paymentStatus,
  fulfillmentStatus,
}: {
  orderStatus: string;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
}): string {
  if (orderStatus === "canceled") return "Canceled";

  switch (fulfillmentStatus) {
    case "delivered":
      return "Delivered";
    case "partially_delivered":
      return "Partially delivered";
    case "shipped":
      return "Shipped";
    case "partially_shipped":
      return "Partially shipped";
    case "fulfilled":
      return "Fulfilled";
    case "partially_fulfilled":
      return "Partially fulfilled";
  }

  if (
    paymentStatus === "captured" ||
    paymentStatus === "partially_captured" ||
    paymentStatus === "authorized" ||
    paymentStatus === "partially_authorized"
  ) {
    return "Processing";
  }

  return orderStatus.replaceAll("_", " ");
}
