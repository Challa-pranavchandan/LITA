import { MedusaError } from "@medusajs/framework/utils"
import { POST as cancelCommissionHandler } from "../[id]/cancel/route"
import { POST as updateCommissionHandler } from "../[id]/route"
import { cancelCommissionWorkflow } from "../../../../workflows/cancel-commission"

jest.mock("../../../../workflows/cancel-commission", () => ({
  cancelCommissionWorkflow: jest.fn(),
}))

const mockCancelCommissionWorkflow = cancelCommissionWorkflow as unknown as jest.Mock

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

describe("Admin cancel commission API route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns 400 when commission ID format is invalid", async () => {
    const req: any = {
      params: { id: "invalid_id!" },
      body: { reason: "test" },
      scope: {},
    }
    const res = makeResponse()

    await cancelCommissionHandler(req, res as any)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid commission ID." })
    )
    expect(mockCancelCommissionWorkflow).not.toHaveBeenCalled()
  })

  it("successfully invokes cancelCommissionWorkflow and returns 200", async () => {
    const mockCommission = { id: "com_123", status: "cancelled", title: "Artwork" }
    mockCancelCommissionWorkflow.mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: {
          commission: mockCommission,
          order: { id: "order_123", status: "canceled" },
        },
      }),
    })

    const req: any = {
      params: { id: "com_123" },
      body: { reason: "Client request" },
      scope: {},
    }
    const res = makeResponse()

    await cancelCommissionHandler(req, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Commission order cancelled successfully.",
      commission: mockCommission,
      order: { id: "order_123", status: "canceled" },
    })
  })

  it("maps NOT_FOUND error to 404", async () => {
    mockCancelCommissionWorkflow.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(MedusaError.Types.NOT_FOUND, "Commission not found.")
      ),
    })

    const req: any = {
      params: { id: "com_123" },
      body: {},
      scope: {},
    }
    const res = makeResponse()

    await cancelCommissionHandler(req, res as any)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "Commission not found." })
  })

  it("maps CONFLICT error to 409", async () => {
    mockCancelCommissionWorkflow.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(MedusaError.Types.CONFLICT, "Commission is already cancelled.")
      ),
    })

    const req: any = {
      params: { id: "com_123" },
      body: {},
      scope: {},
    }
    const res = makeResponse()

    await cancelCommissionHandler(req, res as any)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      message: "Commission is already cancelled.",
    })
  })

  it("maps INVALID_DATA error to 400", async () => {
    mockCancelCommissionWorkflow.mockReturnValue({
      run: jest.fn().mockRejectedValue(
        new MedusaError(MedusaError.Types.INVALID_DATA, "Cannot cancel paid commission.")
      ),
    })

    const req: any = {
      params: { id: "com_123" },
      body: {},
      scope: {},
    }
    const res = makeResponse()

    await cancelCommissionHandler(req, res as any)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "Cannot cancel paid commission.",
    })
  })

  it("delegates to cancelCommissionWorkflow when status is changed to cancelled in generic update route", async () => {
    const mockCommission = { id: "com_123", status: "cancelled" }
    mockCancelCommissionWorkflow.mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: { commission: mockCommission },
      }),
    })

    const commissionService = {
      retrieveCommission: jest.fn().mockResolvedValue({
        id: "com_123",
        status: "in_discussion",
      }),
    }

    const req: any = {
      params: { id: "com_123" },
      body: { status: "cancelled", admin_notes: "Cancelled via status dropdown" },
      scope: {
        resolve: jest.fn().mockReturnValue(commissionService),
      },
    }
    const res = makeResponse()

    await updateCommissionHandler(req, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ commission: mockCommission })
    expect(mockCancelCommissionWorkflow).toHaveBeenCalled()
  })
})
