import { createContainer, asValue } from "awilix"
import { GET as getCommission } from "../[id]/route"
import { POST as sendCustomerMessage } from "../[id]/messages/route"
import { POST as acceptQuote } from "../[id]/accept/route"
import { COMMISSION_MODULE } from "../../../../modules/commission"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

describe("commission customer ownership and acceptance", () => {
  it("does not return another customer's commission or messages", async () => {
    const service = {
      retrieveCommission: jest.fn().mockResolvedValue({
        id: "com_owner",
        customer_id: "cus_customer_a",
      }),
      listAndCountCommissionMessages: jest.fn(),
    }
    const scope = createContainer()
    scope.register({ [COMMISSION_MODULE]: asValue(service) })
    const req: any = {
      params: { id: "com_owner" },
      auth_context: { actor_id: "cus_customer_b" },
      scope,
    }
    const res = makeResponse()

    await getCommission(req, res as any)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(service.listAndCountCommissionMessages).not.toHaveBeenCalled()
  })

  it("does not let another customer post to a commission thread", async () => {
    const service = {
      retrieveCommission: jest.fn().mockResolvedValue({
        id: "com_owner",
        customer_id: "cus_customer_a",
        status: "new",
      }),
      createCommissionMessages: jest.fn(),
    }
    const scope = createContainer()
    scope.register({ [COMMISSION_MODULE]: asValue(service) })
    const req: any = {
      params: { id: "com_owner" },
      auth_context: { actor_id: "cus_customer_b" },
      body: { body: "Please share progress." },
      scope,
    }
    const res = makeResponse()

    await sendCustomerMessage(req, res as any)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(service.createCommissionMessages).not.toHaveBeenCalled()
  })

  it("rejects acceptance without a valid quote", async () => {
    const service = {
      retrieveCommission: jest.fn().mockResolvedValue({
        id: "com_quote",
        customer_id: "cus_customer_a",
        status: "quoted",
        quoted_price: null,
      }),
      updateCommissions: jest.fn(),
    }
    const scope = createContainer()
    scope.register({ [COMMISSION_MODULE]: asValue(service) })
    const req: any = {
      params: { id: "com_quote" },
      auth_context: { actor_id: "cus_customer_a" },
      scope,
    }
    const res = makeResponse()

    await acceptQuote(req, res as any)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(service.updateCommissions).not.toHaveBeenCalled()
  })

  it("allows an owner to accept a fixed-price quote without an admin-set quote", async () => {
    const commission = {
      id: "com_fixed",
      customer_id: "cus_customer_a",
      status: "quoted",
      quoted_price: 999,
      currency_code: "inr",
    }
    const service = {
      retrieveCommission: jest.fn().mockResolvedValue(commission),
      updateCommissions: jest.fn().mockResolvedValue({
        ...commission,
        status: "accepted",
      }),
    }
    const scope = createContainer()
    scope.register({
      [COMMISSION_MODULE]: asValue(service),
      [ContainerRegistrationKeys.LOGGER]: asValue({ error: jest.fn() }),
      [Modules.EVENT_BUS]: asValue({ emit: jest.fn().mockResolvedValue(undefined) }),
    })
    const req: any = {
      params: { id: "com_fixed" },
      auth_context: { actor_id: "cus_customer_a" },
      scope,
    }
    const res = makeResponse()

    await acceptQuote(req, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(service.updateCommissions).toHaveBeenCalledWith({
      id: "com_fixed",
      status: "accepted",
    })
  })
})
