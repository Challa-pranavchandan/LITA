import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { TRADE_MODULE } from "../modules/trade"
import TradeModuleService from "../modules/trade/service"

export type CustomerTradeApplicationDTO = {
  id: string
  status: "pending" | "approved" | "rejected"
  company: string | null
  role: string | null
  message: string | null
  created_at: string | Date
  updated_at: string | Date
}

export type ListCustomerTradeApplicationsInput = {
  customerId: string
}

export type ListCustomerTradeApplicationsOutput = {
  application: CustomerTradeApplicationDTO | null
  applications: CustomerTradeApplicationDTO[]
  count: number
}

export const listCustomerTradeApplicationsStep = createStep(
  "list-customer-trade-applications",
  async (
    input: ListCustomerTradeApplicationsInput,
    { container }
  ): Promise<StepResponse<ListCustomerTradeApplicationsOutput>> => {
    const customerService: any = container.resolve(Modules.CUSTOMER)
    const customer = await customerService
      .retrieveCustomer(input.customerId)
      .catch(() => null)

    if (!customer?.email) {
      return new StepResponse({
        application: null,
        applications: [],
        count: 0,
      })
    }

    const tradeService: TradeModuleService = container.resolve(TRADE_MODULE)
    const applications = await tradeService.listTradeApplications(
      {
        email: { $ilike: customer.email },
      },
      {
        order: { created_at: "DESC" },
      }
    )

    const safeApplications: CustomerTradeApplicationDTO[] = applications.map(
      (app: any) => ({
        id: app.id,
        status: app.status,
        company: app.company ?? null,
        role: app.role ?? null,
        message: app.message ?? null,
        created_at: app.created_at,
        updated_at: app.updated_at,
      })
    )

    return new StepResponse({
      application: safeApplications[0] ?? null,
      applications: safeApplications,
      count: safeApplications.length,
    })
  }
)

export const listCustomerTradeApplicationsWorkflow = createWorkflow(
  "list-customer-trade-applications",
  (input: ListCustomerTradeApplicationsInput) => {
    return new WorkflowResponse(listCustomerTradeApplicationsStep(input))
  }
)

export type CreateTradeApplicationInput = {
  name: string
  email: string
  company?: string | null
  role?: string | null
  phone?: string | null
  website?: string | null
  message?: string | null
}

export type CreateTradeApplicationOutput = {
  application: any
  isExisting: boolean
}

export const createOrReuseTradeApplicationStep = createStep(
  "create-or-reuse-trade-application",
  async (
    input: CreateTradeApplicationInput,
    { container }
  ): Promise<StepResponse<CreateTradeApplicationOutput, string | null>> => {
    const tradeService: TradeModuleService = container.resolve(TRADE_MODULE)
    const normalizedEmail = input.email.trim().toLowerCase()

    const pending = await tradeService.listTradeApplications(
      {
        email: { $ilike: normalizedEmail },
        status: "pending",
      },
      {
        order: { created_at: "DESC" },
        take: 1,
      }
    )

    if (pending.length > 0) {
      return new StepResponse(
        {
          application: pending[0],
          isExisting: true,
        },
        null
      )
    }

    const created = await tradeService.createTradeApplications({
      name: input.name.trim(),
      email: normalizedEmail,
      company: input.company?.trim() || null,
      role: input.role?.trim() || null,
      phone: input.phone?.trim() || null,
      website: input.website?.trim() || null,
      message: input.message?.trim() || null,
    })

    return new StepResponse(
      {
        application: created,
        isExisting: false,
      },
      created.id
    )
  },
  async (createdId, { container }) => {
    if (!createdId) return
    const tradeService: TradeModuleService = container.resolve(TRADE_MODULE)
    await tradeService.deleteTradeApplications([createdId])
  }
)

export const createTradeApplicationWorkflow = createWorkflow(
  "create-trade-application",
  (input: CreateTradeApplicationInput) => {
    return new WorkflowResponse(createOrReuseTradeApplicationStep(input))
  }
)
