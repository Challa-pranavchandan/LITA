import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules, OrderStatus } from "@medusajs/framework/utils"
import {
  createOrderPaymentCollectionWorkflow,
  createOrderWorkflow,
} from "@medusajs/core-flows"
import { COMMISSION_MODULE } from "../modules/commission"
import CommissionModuleService from "../modules/commission/service"

export type ConvertCommissionInput = {
  commission_id: string
}

/* ---------------- STEP 1: Validate Commission ---------------- */

export const validateCommissionStep = createStep(
  "validate-commission-for-conversion",
  async ({ commission_id }: ConvertCommissionInput, { container }) => {
    const commissionService: CommissionModuleService =
      container.resolve(COMMISSION_MODULE)
    const commission = await commissionService.retrieveCommission(commission_id)

    if (!commission) {
      throw new Error(`Commission with ID ${commission_id} not found.`)
    }

    if (commission.order_id) {
      throw new Error(
        `Commission is already converted to order (${commission.order_id}). Double conversion is blocked.`
      )
    }

    if (commission.status !== "accepted") {
      throw new Error(
        `Only commissions with status 'accepted' can be converted to an order. Current status: ${commission.status}`
      )
    }

    if (!commission.quoted_price || commission.quoted_price <= 0) {
      throw new Error(
        "Commission must have a valid quoted price greater than 0 before converting to an order."
      )
    }

    return new StepResponse(commission)
  }
)

/* ---------------- STEP 2: Resolve or Create Custom Commission Variant ---------------- */

export const resolveCommissionVariantStep = createStep(
  "resolve-commission-variant",
  async (_, { container }) => {
    const productService: any = container.resolve(Modules.PRODUCT)
    const [existing] = await productService.listAndCountProducts(
      { handle: "custom-commission" },
      { relations: ["variants"] }
    )

    if (existing.length > 0 && existing[0].variants?.length > 0) {
      return new StepResponse({
        variant_id: existing[0].variants[0].id,
        product_id: existing[0].id,
      })
    }

    // Create the "Custom Commission" product with one non-inventoried variant
    const created = await productService.createProducts([
      {
        title: "Custom Commission",
        handle: "custom-commission",
        description: "Bespoke commissioned artwork",
        options: [{ title: "Type", values: ["Custom Artwork"] }],
        variants: [
          {
            title: "Custom Artwork Piece",
            manage_inventory: false,
            options: { Type: "Custom Artwork" },
          },
        ],
      },
    ])

    const variantId = created[0].variants[0].id
    return new StepResponse({
      variant_id: variantId,
      product_id: created[0].id,
    })
  }
)

/* ---------------- STEP 3: Create Draft Order ---------------- */

type CreateDraftOrderInput = {
  commission: any
  variant_id: string
}

export const createCommissionDraftOrderStep = createStep(
  "create-commission-draft-order",
  async ({ commission, variant_id }: CreateDraftOrderInput, { container }) => {
    const customerService: any = container.resolve(Modules.CUSTOMER)
    const customer = await customerService.retrieveCustomer(commission.customer_id)

    if (!customer?.email) {
      throw new Error(`Customer with ID ${commission.customer_id} has no valid email.`)
    }

    const salesChannelService: any = container.resolve(Modules.SALES_CHANNEL)
    const [channels] = await salesChannelService.listAndCountSalesChannels(
      {},
      { take: 1 }
    )
    const salesChannelId = channels?.[0]?.id

    const regionService: any = container.resolve(Modules.REGION)
    const [regions] = await regionService.listAndCountRegions(
      commission.currency_code ? { currency_code: commission.currency_code.toLowerCase() } : {},
      { take: 1 }
    )
    const regionId = regions?.[0]?.id

    const workflowInput = {
      status: OrderStatus.DRAFT,
      is_draft_order: true,
      customer_id: commission.customer_id,
      email: customer.email,
      currency_code: commission.currency_code?.toLowerCase() || "inr",
      region_id: regionId,
      sales_channel_id: salesChannelId,
      items: [
        {
          title: `Commission: ${commission.title}`,
          variant_id,
          quantity: 1,
          unit_price: commission.quoted_price,
          metadata: {
            commission_id: commission.id,
            title: commission.title,
          },
        },
      ],
      metadata: {
        commission_id: commission.id,
        commission_title: commission.title,
      },
    }

    const { result } = await createOrderWorkflow(container).run({
      input: workflowInput as any,
    })

    return new StepResponse(result, result.id)
  }
)

/* ---------------- STEP 4: Create Order Payment Collection ---------------- */

type CreatePaymentCollectionInput = {
  order_id: string
  amount: number | null
}

export const createCommissionPaymentCollectionStep = createStep(
  "create-commission-payment-collection",
  async ({ order_id, amount }: CreatePaymentCollectionInput, { container }) => {
    const { result } = await createOrderPaymentCollectionWorkflow(container).run({
      input: {
        order_id,
        amount: Number(amount || 0),
      },
    })
    const paymentCollection = Array.isArray(result) ? result[0] : result
    return new StepResponse(paymentCollection, paymentCollection?.id)
  },
  async (paymentCollectionId, { container }) => {
    if (!paymentCollectionId) return
    try {
      const paymentModule: any = container.resolve(Modules.PAYMENT)
      if (typeof paymentModule.deletePaymentCollections === "function") {
        await paymentModule.deletePaymentCollections([paymentCollectionId])
      }
    } catch (err: any) {
      console.warn(`[commissions] Failed to rollback payment collection ${paymentCollectionId}: ${err?.message}`)
    }
  }
)

/* ---------------- STEP 5: Update Commission Awaiting Payment Status ---------------- */

type UpdateCommissionInput = {
  commission_id: string
  order_id: string
}

export const updateCommissionConvertedStep = createStep(
  "update-commission-converted",
  async ({ commission_id, order_id }: UpdateCommissionInput, { container }) => {
    const commissionService: CommissionModuleService =
      container.resolve(COMMISSION_MODULE)

    const updated = await commissionService.updateCommissions({
      id: commission_id,
      status: "awaiting_payment",
      order_id,
      admin_notes: `Converted to Draft Order ${order_id} - Awaiting Payment`,
    })

    try {
      const eventBus: any = container.resolve(Modules.EVENT_BUS)
      if (eventBus) {
        await eventBus.emit({
          name: "commission.status_changed",
          data: {
            id: updated.id,
            customer_id: updated.customer_id,
            title: updated.title,
            status: "awaiting_payment",
            previous_status: "accepted",
            quoted_price: updated.quoted_price,
            currency_code: updated.currency_code,
            order_id,
          },
        })
      }
    } catch (err: any) {
      console.warn(`[commissions] Failed to emit converted status event: ${err?.message}`)
    }

    return new StepResponse(updated, { commission_id })
  },
  async (rollbackData, { container }) => {
    if (!rollbackData?.commission_id) return
    const commissionService: CommissionModuleService =
      container.resolve(COMMISSION_MODULE)
    await commissionService.updateCommissions({
      id: rollbackData.commission_id,
      status: "accepted",
      order_id: null,
    })
  }
)

/* ---------------- MAIN WORKFLOW ---------------- */

export const convertCommissionToOrderWorkflow = createWorkflow(
  "convert-commission-to-order",
  (input: ConvertCommissionInput) => {
    const commission = validateCommissionStep(input)
    const variantInfo = resolveCommissionVariantStep()
    const draftOrder = createCommissionDraftOrderStep({
      commission,
      variant_id: variantInfo.variant_id,
    })
    const paymentCollection = createCommissionPaymentCollectionStep({
      order_id: draftOrder.id,
      amount: commission.quoted_price,
    })
    const updatedCommission = updateCommissionConvertedStep({
      commission_id: input.commission_id,
      order_id: draftOrder.id,
    })

    return new WorkflowResponse({
      commission: updatedCommission,
      order: draftOrder,
      payment_collection: paymentCollection,
    })
  }
)

export default convertCommissionToOrderWorkflow
