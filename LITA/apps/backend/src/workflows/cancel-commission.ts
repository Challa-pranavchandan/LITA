import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  OrderStatus,
} from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { COMMISSION_MODULE } from "../modules/commission"
import CommissionModuleService from "../modules/commission/service"
import {
  assertCommissionCanCancel,
  emitCommissionStatusChanged,
  type CommissionStatus,
} from "../lib/commission-status"

export type CancelCommissionInput = {
  commission_id: string
  reason?: string
  canceled_by?: string
}

export const cancelCommissionStep = createStep(
  "cancel-commission",
  async (
    { commission_id, reason, canceled_by }: CancelCommissionInput,
    { container }
  ) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const service: CommissionModuleService = container.resolve(COMMISSION_MODULE)

    const commission = await service.retrieveCommission(commission_id)
    if (!commission) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Commission with ID ${commission_id} not found.`
      )
    }

    assertCommissionCanCancel(commission as any)

    let canceledOrder: any = null
    if (commission.order_id) {
      try {
        const query: any = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: orders } = await query.graph({
          entity: "order",
          fields: ["id", "status", "canceled_at"],
          filters: { id: commission.order_id },
        })
        const order = orders?.[0]
        if (order && !order.canceled_at && order.status !== OrderStatus.CANCELED) {
          logger.info(
            `[cancel-commission] Cancelling linked Medusa order ${commission.order_id}`
          )
          const { result } = await cancelOrderWorkflow(container).run({
            input: {
              order_id: commission.order_id,
              no_notification: true,
              canceled_by,
            },
          })
          canceledOrder = result
        } else {
          canceledOrder = order
        }
      } catch (orderErr: any) {
        logger.warn(
          `[cancel-commission] Note when cancelling order ${commission.order_id}: ${
            orderErr?.message || orderErr
          }`
        )
      }
    }

    const previousStatus = commission.status
    const trimmedReason = reason?.trim()
    const updatedNotes = trimmedReason
      ? commission.admin_notes
        ? `${commission.admin_notes}\n[Cancelled]: ${trimmedReason}`
        : `Cancelled: ${trimmedReason}`
      : commission.admin_notes

    const updated = await service.updateCommissions({
      id: commission_id,
      status: "cancelled",
      admin_notes: updatedNotes,
    })

    await emitCommissionStatusChanged(
      container,
      previousStatus as CommissionStatus,
      updated
    )

    return new StepResponse(
      { commission: updated, order: canceledOrder },
      {
        commission_id,
        previousStatus,
        adminNotes: commission.admin_notes,
      }
    )
  },
  async (rollbackData, { container }) => {
    if (!rollbackData?.commission_id) return
    const service: CommissionModuleService = container.resolve(COMMISSION_MODULE)
    await service.updateCommissions({
      id: rollbackData.commission_id,
      status: rollbackData.previousStatus,
      admin_notes: rollbackData.adminNotes,
    })
  }
)

export const cancelCommissionWorkflow = createWorkflow(
  "cancel-commission",
  (input: CancelCommissionInput) => {
    const result = cancelCommissionStep(input)
    return new WorkflowResponse(result)
  }
)

export default cancelCommissionWorkflow
