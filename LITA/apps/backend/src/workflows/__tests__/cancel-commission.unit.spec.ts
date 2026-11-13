import { asValue, createContainer } from "awilix"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  OrderStatus,
} from "@medusajs/framework/utils"
import { COMMISSION_MODULE } from "../../modules/commission"
import { cancelCommissionWorkflow } from "../cancel-commission"

const mockCancelOrder = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => {
  const actual = jest.requireActual("@medusajs/medusa/core-flows")
  return {
    ...actual,
    cancelOrderWorkflow: jest.fn(() => ({
      run: (args: any) => mockCancelOrder(args),
    })),
  }
})

function makeCommission(overrides: Partial<any> = {}) {
  return {
    id: "com_test_123",
    customer_id: "cus_123",
    title: "Oil Painting of Mountain",
    idea: "A serene Himalayan mountain landscape",
    status: "new",
    quoted_price: 25000,
    currency_code: "inr",
    admin_notes: "Initial review",
    order_id: null,
    ...overrides,
  }
}

function createTestContainer(commissionRecord: any) {
  let record = { ...commissionRecord }

  const commissionService = {
    retrieveCommission: jest.fn(async (id: string) => {
      return record && record.id === id ? record : null
    }),
    updateCommissions: jest.fn(async (input: any) => {
      record = { ...record, ...input }
      return record
    }),
  }

  const query = {
    graph: jest.fn(async ({ entity, filters }: any) => {
      if (entity === "order" && filters?.id === "order_linked_123") {
        return {
          data: [
            {
              id: "order_linked_123",
              status: OrderStatus.PENDING,
              canceled_at: null,
            },
          ],
        }
      }
      return { data: [] }
    }),
  }

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }

  const eventBus = {
    emit: jest.fn().mockResolvedValue(undefined),
    releaseGroupedEvents: jest.fn().mockResolvedValue(undefined),
    clearGroupedEvents: jest.fn().mockResolvedValue(undefined),
  }

  const container = createContainer()
  container.register({
    [COMMISSION_MODULE]: asValue(commissionService),
    [ContainerRegistrationKeys.QUERY]: asValue(query),
    [ContainerRegistrationKeys.LOGGER]: asValue(logger),
    [Modules.EVENT_BUS]: asValue(eventBus),
  })

  return { container, commissionService, query, logger, eventBus, getRecord: () => record }
}

describe("cancelCommissionWorkflow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCancelOrder.mockResolvedValue({
      result: { id: "order_linked_123", status: OrderStatus.CANCELED },
    })
  })

  it("successfully cancels an unconverted commission and emits status changed event", async () => {
    const initial = makeCommission({ status: "in_discussion" })
    const { container, eventBus, getRecord } = createTestContainer(initial)

    const { result } = await cancelCommissionWorkflow(container as any).run({
      input: {
        commission_id: "com_test_123",
        reason: "Client decided not to proceed",
      },
    })

    expect(result.commission.status).toBe("cancelled")
    expect(result.commission.admin_notes).toContain("[Cancelled]: Client decided not to proceed")
    expect(mockCancelOrder).not.toHaveBeenCalled()
    expect(eventBus.emit).toHaveBeenCalledWith({
      name: "commission.status_changed",
      data: expect.objectContaining({
        id: "com_test_123",
        status: "cancelled",
        previous_status: "in_discussion",
      }),
    })
    expect(getRecord().status).toBe("cancelled")
  })

  it("cancels linked Medusa order when cancelling a converted commission order", async () => {
    const initial = makeCommission({
      status: "awaiting_payment",
      order_id: "order_linked_123",
    })
    const { container, eventBus } = createTestContainer(initial)

    const { result } = await cancelCommissionWorkflow(container as any).run({
      input: {
        commission_id: "com_test_123",
        reason: "Payment window expired",
      },
    })

    expect(result.commission.status).toBe("cancelled")
    expect(mockCancelOrder).toHaveBeenCalledWith({
      input: expect.objectContaining({
        order_id: "order_linked_123",
        no_notification: true,
      }),
    })
    expect(eventBus.emit).toHaveBeenCalledWith({
      name: "commission.status_changed",
      data: expect.objectContaining({
        id: "com_test_123",
        status: "cancelled",
        order_id: "order_linked_123",
      }),
    })
  })

  it("permits cancellation when commission is in_production and cancels order", async () => {
    const initial = makeCommission({
      status: "in_production",
      order_id: "order_linked_123",
      deposit_paid_at: new Date(),
    })
    const { container } = createTestContainer(initial)

    const { result } = await cancelCommissionWorkflow(container as any).run({
      input: {
        commission_id: "com_test_123",
        reason: "Mutual agreement to terminate project",
      },
    })

    expect(result.commission.status).toBe("cancelled")
    expect(mockCancelOrder).toHaveBeenCalled()
  })

  it("throws conflict error when commission is already cancelled", async () => {
    const initial = makeCommission({ status: "cancelled" })
    const { container } = createTestContainer(initial)

    const { errors } = await cancelCommissionWorkflow(container as any).run({
      input: { commission_id: "com_test_123" },
      throwOnError: false,
    })
    expect(errors).toBeDefined()
    expect(errors?.length).toBeGreaterThan(0)
    expect((errors?.[0]?.error as any).message).toMatch(/already cancelled/)
  })

  it("throws invalid data error when commission is already paid", async () => {
    const initial = makeCommission({ status: "paid", paid_at: new Date() })
    const { container } = createTestContainer(initial)

    const { errors } = await cancelCommissionWorkflow(container as any).run({
      input: { commission_id: "com_test_123" },
      throwOnError: false,
    })
    expect(errors).toBeDefined()
    expect(errors?.length).toBeGreaterThan(0)
    expect((errors?.[0]?.error as any).message).toMatch(/already been fully paid/)
  })

  it("throws invalid data error when commission was rejected", async () => {
    const initial = makeCommission({ status: "rejected" })
    const { container } = createTestContainer(initial)

    const { errors } = await cancelCommissionWorkflow(container as any).run({
      input: { commission_id: "com_test_123" },
      throwOnError: false,
    })
    expect(errors).toBeDefined()
    expect(errors?.length).toBeGreaterThan(0)
    expect((errors?.[0]?.error as any).message).toMatch(/already rejected/)
  })

  it("throws not found when commission does not exist", async () => {
    const { container } = createTestContainer(null)

    const { errors } = await cancelCommissionWorkflow(container as any).run({
      input: { commission_id: "com_non_existent" },
      throwOnError: false,
    })
    expect(errors).toBeDefined()
    expect(errors?.length).toBeGreaterThan(0)
    expect((errors?.[0]?.error as any).message).toMatch(/not found/)
  })
})
