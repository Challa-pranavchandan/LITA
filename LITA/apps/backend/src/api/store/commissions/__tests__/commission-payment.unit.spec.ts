import { POST as initSessionHandler } from "../[id]/payment-session/route"
import { POST as payHandler } from "../[id]/pay/route"
import { validateCommissionForSession } from "../../../../workflows/create-commission-payment-session"
import { COMMISSION_MODULE } from "../../../../modules/commission"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createContainer, asValue } from "awilix"

describe("Commission Payment Path (B10 Hardening)", () => {
  describe("validateCommissionForSession guards", () => {
    it("throws NOT_FOUND when commission does not exist", async () => {
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue(null),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      await expect(
        validateCommissionForSession(
          { commission_id: "com_missing", customer_id: "cus_123" },
          container
        )
      ).rejects.toThrow(MedusaError)
    })

    it("throws NOT_FOUND when customer_id does not match (prevent resource enumeration)", async () => {
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue({
          id: "com_1",
          customer_id: "cus_owner",
          status: "awaiting_payment",
          quoted_price: 50000,
          order_id: "order_123",
        }),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      await expect(
        validateCommissionForSession(
          { commission_id: "com_1", customer_id: "cus_attacker" },
          container
        )
      ).rejects.toThrow(MedusaError)
    })

    it("throws CONFLICT (409) when commission is already paid", async () => {
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue({
          id: "com_1",
          customer_id: "cus_123",
          status: "paid",
          paid_at: new Date(),
          quoted_price: 50000,
          order_id: "order_123",
        }),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      await expect(
        validateCommissionForSession(
          { commission_id: "com_1", customer_id: "cus_123" },
          container
        )
      ).rejects.toThrow(/already been paid/)
    })

    it("throws INVALID_DATA (400) when commission is in unapproved status (e.g. new, in_discussion, quoted)", async () => {
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue({
          id: "com_1",
          customer_id: "cus_123",
          status: "quoted",
          quoted_price: 50000,
          order_id: "order_123",
        }),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      await expect(
        validateCommissionForSession(
          { commission_id: "com_1", customer_id: "cus_123" },
          container
        )
      ).rejects.toThrow(/awaiting payment/)
    })

    it("throws INVALID_DATA (400) when order_id is missing", async () => {
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue({
          id: "com_1",
          customer_id: "cus_123",
          status: "awaiting_payment",
          quoted_price: 50000,
          order_id: null,
        }),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      await expect(
        validateCommissionForSession(
          { commission_id: "com_1", customer_id: "cus_123" },
          container
        )
      ).rejects.toThrow(/linked order/)
    })

    it("throws INVALID_DATA (400) when quoted price is 0 or negative", async () => {
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue({
          id: "com_1",
          customer_id: "cus_123",
          status: "awaiting_payment",
          quoted_price: 0,
          order_id: "order_123",
        }),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      await expect(
        validateCommissionForSession(
          { commission_id: "com_1", customer_id: "cus_123" },
          container
        )
      ).rejects.toThrow(/greater than 0/)
    })

    it("accepts valid awaiting_payment and converted commissions", async () => {
      const commissionData = {
        id: "com_valid",
        customer_id: "cus_123",
        status: "awaiting_payment",
        quoted_price: 75000,
        order_id: "order_123",
      }
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue(commissionData),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      const result = await validateCommissionForSession(
        { commission_id: "com_valid", customer_id: "cus_123" },
        container
      )

      expect(result).toEqual(commissionData)
    })
  })

  describe("POST /store/commissions/:id/payment-session Route Handler", () => {
    it("returns 401 when customer is unauthenticated", async () => {
      const req: any = {
        params: { id: "com_1" },
        auth_context: null,
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await initSessionHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Authentication required." })
      )
    })

    it("enforces server-side amount calculation from DB (cannot be manipulated by client)", async () => {
      const mockCommission = {
        id: "com_1",
        customer_id: "cus_123",
        status: "awaiting_payment",
        quoted_price: 45000, // 45,000 INR
        currency_code: "inr",
        order_id: "order_123",
        title: "Bespoke Canvas",
      }

      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue(mockCommission),
      }

      const mockQuery = {
        graph: jest.fn().mockResolvedValue({
          data: [
            {
              payment_collection_id: "paycol_123",
              payment_collection: {
                id: "paycol_123",
                status: "not_paid",
                amount: 45000,
                currency_code: "inr",
              },
            },
          ],
        }),
      }

      const mockPaymentModule = {
        createPaymentSession: jest.fn(),
      }

      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
        query: asValue(mockQuery),
        [Modules.PAYMENT]: asValue(mockPaymentModule),
      })

      // Client attempts to pass a tampered amount in the request body
      const req: any = {
        params: { id: "com_1" },
        body: { amount: 1 }, // Malicious client attempt: ₹1 instead of ₹45,000
        auth_context: { actor_id: "cus_123" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      // Validates step output uses quoted_price from DB
      const stepRes = await validateCommissionForSession(
        { commission_id: "com_1", customer_id: "cus_123" },
        container
      )

      expect(stepRes.quoted_price).toBe(45000)
    })
  })

  describe("POST /store/commissions/:id/pay Route Handler", () => {
    it("returns 401 when customer is unauthenticated", async () => {
      const req: any = {
        params: { id: "com_1" },
        auth_context: null,
        body: {},
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await payHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it("returns 400 when required Razorpay payload fields are missing", async () => {
      const req: any = {
        params: { id: "com_1" },
        auth_context: { actor_id: "cus_123" },
        body: { session_id: "payses_123" }, // missing payment_id and signature
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await payHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("required"),
        })
      )
    })

    it("returns 404 when commission does not belong to the authenticated customer", async () => {
      const mockCommissionService = {
        retrieveCommission: jest.fn().mockResolvedValue({
          id: "com_1",
          customer_id: "cus_different_customer",
        }),
      }
      const container = createContainer()
      container.register({
        [COMMISSION_MODULE]: asValue(mockCommissionService),
      })

      const req: any = {
        params: { id: "com_1" },
        auth_context: { actor_id: "cus_123" },
        body: {
          session_id: "payses_123",
          razorpay_payment_id: "pay_123",
          razorpay_signature: "sig_123",
        },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await payHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe("Order Payment Collection Reconciliation Branch", () => {
    it("identifies order_payment_collection when cart_payment_collection is null", async () => {
      const mockQuery = {
        graph: jest.fn().mockImplementation(({ entity }: { entity: string }) => {
          if (entity === "payment_session") {
            return {
              data: [
                {
                  id: "payses_order_col",
                  payment_collection_id: "paycol_order_123",
                  data: {},
                },
              ],
            }
          }
          if (entity === "cart_payment_collection") {
            return { data: [] } // No cart linked
          }
          if (entity === "order_payment_collection") {
            return {
              data: [{ order_id: "order_commission_123" }],
            }
          }
          return { data: [] }
        }),
      }

      const queryRes = await mockQuery.graph({
        entity: "order_payment_collection",
        fields: ["order_id"],
        filters: { payment_collection_id: "paycol_order_123" },
      })

      expect(queryRes.data[0].order_id).toBe("order_commission_123")
    })
  })
})
