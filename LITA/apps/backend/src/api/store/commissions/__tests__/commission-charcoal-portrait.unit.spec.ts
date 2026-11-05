import { createContainer, asValue } from "awilix"
import { POST } from "../route"
import { COMMISSION_MODULE } from "../../../../modules/commission"

describe("POST /store/commissions charcoal portrait pricing", () => {
  function makeRequest(body: Record<string, unknown>, commissionService: any) {
    const scope = createContainer()
    scope.register({
      [COMMISSION_MODULE]: asValue(commissionService),
    })

    return {
      req: {
        auth_context: { actor_id: "cus_123" },
        body,
        scope,
      },
      res: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      },
    }
  }

  it("saves the server-calculated fixed price as the quote", async () => {
    const commissionService = {
      createCommissions: jest.fn().mockImplementation((commission) => commission),
    }
    const { req, res } = makeRequest(
      {
        title: "Charcoal Portrait",
        idea: "A family portrait",
        budget: 1,
        quoted_price: 1,
        charcoal_portrait: { size: "A4", person_count: 2 },
      },
      commissionService
    )

    await POST(req as any, res as any)

    expect(commissionService.createCommissions).toHaveBeenCalledWith(
      expect.objectContaining({
        medium: "Charcoal Portrait",
        size: "A4 · 2 people",
        budget: 1499,
        quoted_price: 1499,
        status: "quoted",
        requirements: expect.stringContaining("Total: ₹1499."),
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("rejects invalid portrait selections without creating a commission", async () => {
    const commissionService = {
      createCommissions: jest.fn(),
    }
    const { req, res } = makeRequest(
      {
        title: "Charcoal Portrait",
        idea: "A portrait",
        charcoal_portrait: { size: "A2", person_count: 1 },
      },
      commissionService
    )

    await POST(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(commissionService.createCommissions).not.toHaveBeenCalled()
  })
})
