import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { COMMISSION_MODULE } from "../modules/commission"
import CommissionModuleService from "../modules/commission/service"
import {
  assertCommissionTransition,
  emitCommissionStatusChanged,
  type CommissionStatus,
} from "../lib/commission-status"

export type RequestCommissionFinalPaymentInput = {
  commission_id: string
}

export const requestCommissionFinalPaymentStep = createStep(
  "request-commission-final-payment",
  async (
    { commission_id }: RequestCommissionFinalPaymentInput,
    { container }
  ) => {
    const service: CommissionModuleService = container.resolve(COMMISSION_MODULE)
    const commission = await service.retrieveCommission(commission_id)
    if (!commission) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Commission ${commission_id} was not found.`
      )
    }

    if (
      commission.status === "awaiting_final_payment" &&
      commission.final_payment_requested_at
    ) {
      return new StepResponse(commission)
    }

    if (commission.status !== "in_production" || !commission.deposit_paid_at) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The final payment can only be requested after the deposit is paid."
      )
    }

    assertCommissionTransition(
      commission.status as CommissionStatus,
      "awaiting_final_payment"
    )

    const updated = await service.updateCommissions({
      id: commission_id,
      status: "awaiting_final_payment",
      final_payment_requested_at: new Date(),
    })

    await emitCommissionStatusChanged(
      container,
      commission.status as CommissionStatus,
      updated
    )

    return new StepResponse(updated)
  }
)

export const requestCommissionFinalPaymentWorkflow = createWorkflow(
  "request-commission-final-payment",
  (input: RequestCommissionFinalPaymentInput) => {
    const commission = requestCommissionFinalPaymentStep(input)
    return new WorkflowResponse(commission)
  }
)

export default requestCommissionFinalPaymentWorkflow
