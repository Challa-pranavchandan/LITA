import { GET, POST } from "../route"
import { PostTradeApplicationSchema } from "../../../middlewares"
import {
  listCustomerTradeApplicationsWorkflow,
  createTradeApplicationWorkflow,
} from "../../../../workflows/trade-applications"
import { Modules } from "@medusajs/framework/utils"
import { TRADE_MODULE } from "../../../../modules/trade"
import { createContainer, asValue } from "awilix"

describe("Store Trade Applications API & Workflows (B3 Hardening)", () => {
  describe("PostTradeApplicationSchema validation", () => {
    it("trims and lowercases valid email", () => {
      const parsed = PostTradeApplicationSchema.parse({
        name: "  Jane Doe  ",
        email: "  Jane.Doe@STUDIO.COM  ",
      })
      expect(parsed.name).toBe("Jane Doe")
      expect(parsed.email).toBe("jane.doe@studio.com")
    })

    it("rejects invalid email formats", () => {
      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "Jane",
          email: "invalid-email",
        })
      ).toThrow()
    })

    it("rejects names exceeding 120 characters", () => {
      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "A".repeat(121),
          email: "jane@studio.com",
        })
      ).toThrow()
    })

    it("rejects company exceeding 120 characters", () => {
      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "Jane",
          email: "jane@studio.com",
          company: "C".repeat(121),
        })
      ).toThrow()
    })

    it("rejects role exceeding 100 characters", () => {
      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "Jane",
          email: "jane@studio.com",
          role: "R".repeat(101),
        })
      ).toThrow()
    })

    it("rejects phone exceeding 30 characters", () => {
      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "Jane",
          email: "jane@studio.com",
          phone: "1".repeat(31),
        })
      ).toThrow()
    })

    it("rejects message exceeding 4000 characters", () => {
      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "Jane",
          email: "jane@studio.com",
          message: "M".repeat(4001),
        })
      ).toThrow()
    })

    it("accepts valid website URL and normalizes empty website string to undefined", () => {
      const valid = PostTradeApplicationSchema.parse({
        name: "Jane",
        email: "jane@studio.com",
        website: "https://studio.design",
      })
      expect(valid.website).toBe("https://studio.design")

      const empty = PostTradeApplicationSchema.parse({
        name: "Jane",
        email: "jane@studio.com",
        website: "   ",
      })
      expect(empty.website).toBeUndefined()
    })

    it("rejects invalid website URLs and URLs exceeding 200 characters", () => {
      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "Jane",
          email: "jane@studio.com",
          website: "not-a-valid-url",
        })
      ).toThrow()

      expect(() =>
        PostTradeApplicationSchema.parse({
          name: "Jane",
          email: "jane@studio.com",
          website: `https://example.com/${"x".repeat(200)}`,
        })
      ).toThrow()
    })
  })

  describe("GET /store/trade-applications route handler", () => {
    it("returns 401 when customer authentication is missing", async () => {
      const req = {
        auth_context: null,
        query: { email: "victim@example.com" },
        scope: createContainer(),
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any

      await GET(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        message: "Customer authentication required.",
      })
    })

    it("regression test: ?email= parameter is ignored and auth_context.actor_id is used", async () => {
      const mockCustomer = { id: "cus_alice", email: "alice@studio.com" }
      const mockTradeService = {
        listTradeApplications: jest.fn().mockResolvedValue([
          {
            id: "trade_1",
            status: "approved",
            company: "Alice Interiors",
            role: "Interior Designer",
            message: "Looking for artwork",
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-02"),
            internal_notes: "TOP SECRET NOTE - DO NOT LEAK",
          },
        ]),
      }

      const mockCustomerService = {
        retrieveCustomer: jest.fn().mockResolvedValue(mockCustomer),
      }

      const container = createContainer()
      container.register({
        [Modules.CUSTOMER]: asValue(mockCustomerService),
        [TRADE_MODULE]: asValue(mockTradeService),
      })

      const req = {
        auth_context: { actor_id: "cus_alice" },
        query: { email: "other_victim@example.com" },
        scope: container,
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any

      await GET(req, res)

      expect(mockCustomerService.retrieveCustomer).toHaveBeenCalledWith("cus_alice")
      expect(mockTradeService.listTradeApplications).toHaveBeenCalledWith(
        { email: { $ilike: "alice@studio.com" } },
        { order: { created_at: "DESC" } }
      )

      expect(res.json).toHaveBeenCalledWith({
        count: 1,
        application: {
          id: "trade_1",
          status: "approved",
          company: "Alice Interiors",
          role: "Interior Designer",
          message: "Looking for artwork",
          created_at: new Date("2026-01-01").toISOString(),
          updated_at: new Date("2026-01-02").toISOString(),
        },
        applications: [
          {
            id: "trade_1",
            status: "approved",
            company: "Alice Interiors",
            role: "Interior Designer",
            message: "Looking for artwork",
            created_at: new Date("2026-01-01").toISOString(),
            updated_at: new Date("2026-01-02").toISOString(),
          },
        ],
      })
      // Ensures internal notes are not leaked
      const responseData = res.json.mock.calls[0][0]
      expect(responseData.application.internal_notes).toBeUndefined()
    })
  })

  describe("listCustomerTradeApplicationsWorkflow isolation & scale", () => {
    it("returns only customer A applications and isolates from customer B", async () => {
      const mockTradeService = {
        listTradeApplications: jest
          .fn()
          .mockImplementation((filters: any) => {
            if (filters.email?.$ilike === "alice@studio.com") {
              return Promise.resolve([
                {
                  id: "trade_alice",
                  status: "approved",
                  company: "Alice Studio",
                  role: "Architect",
                  message: null,
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              ])
            }
            if (filters.email?.$ilike === "bob@studio.com") {
              return Promise.resolve([
                {
                  id: "trade_bob",
                  status: "pending",
                  company: "Bob Design",
                  role: "Designer",
                  message: null,
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              ])
            }
            return Promise.resolve([])
          }),
      }

      const mockCustomerService = {
        retrieveCustomer: jest.fn((id: string) => {
          if (id === "cus_A") return Promise.resolve({ id: "cus_A", email: "alice@studio.com" })
          if (id === "cus_B") return Promise.resolve({ id: "cus_B", email: "bob@studio.com" })
          return Promise.resolve(null)
        }),
      }

      const container = createContainer()
      container.register({
        [Modules.CUSTOMER]: asValue(mockCustomerService),
        [TRADE_MODULE]: asValue(mockTradeService),
      })

      const { result: resA } = await listCustomerTradeApplicationsWorkflow(container as any).run({
        input: { customerId: "cus_A" },
      })
      expect(resA.applications).toHaveLength(1)
      expect(resA.applications[0].id).toBe("trade_alice")

      const { result: resB } = await listCustomerTradeApplicationsWorkflow(container as any).run({
        input: { customerId: "cus_B" },
      })
      expect(resB.applications).toHaveLength(1)
      expect(resB.applications[0].id).toBe("trade_bob")
    })

    it("filters at database query level and returns all matching rows regardless of table size (> 100 rows)", async () => {
      const customerEmail = "scale.designer@example.com"
      const matchingRows = Array.from({ length: 5 }, (_, i) => ({
        id: `trade_scale_${i}`,
        status: "pending",
        company: `Studio ${i}`,
        role: "Interior Designer",
        message: `Project ${i}`,
        created_at: new Date(2026, 0, i + 1),
        updated_at: new Date(2026, 0, i + 1),
      }))

      const mockTradeService = {
        listTradeApplications: jest.fn().mockImplementation((filters: any) => {
          expect(filters.email).toEqual({ $ilike: customerEmail })
          return Promise.resolve(matchingRows)
        }),
      }

      const mockCustomerService = {
        retrieveCustomer: jest.fn().mockResolvedValue({
          id: "cus_scale",
          email: customerEmail,
        }),
      }

      const container = createContainer()
      container.register({
        [Modules.CUSTOMER]: asValue(mockCustomerService),
        [TRADE_MODULE]: asValue(mockTradeService),
      })

      const { result } = await listCustomerTradeApplicationsWorkflow(container as any).run({
        input: { customerId: "cus_scale" },
      })

      expect(result.count).toBe(5)
      expect(result.applications).toHaveLength(5)
    })
  })

  describe("createTradeApplicationWorkflow & POST route handler", () => {
    it("returns existing application (200) when a pending application already exists for lowercased email", async () => {
      const existingApp = {
        id: "trade_existing_123",
        name: "Existing Applicant",
        email: "charlie@firm.com",
        status: "pending",
      }

      const mockTradeService = {
        listTradeApplications: jest.fn().mockResolvedValue([existingApp]),
        createTradeApplications: jest.fn(),
      }

      const container = createContainer()
      container.register({
        [TRADE_MODULE]: asValue(mockTradeService),
      })

      const req = {
        validatedBody: {
          name: "Charlie",
          email: "  CHARLIE@FIRM.COM  ",
          company: "Firm LLC",
          role: "Architect",
          phone: null,
          website: null,
          message: null,
        },
        scope: container,
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any

      await POST(req, res)

      expect(mockTradeService.listTradeApplications).toHaveBeenCalledWith(
        { email: { $ilike: "charlie@firm.com" }, status: "pending" },
        { order: { created_at: "DESC" }, take: 1 }
      )
      expect(mockTradeService.createTradeApplications).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ application: existingApp })
    })

    it("creates a new application with lowercased email (201) when no pending application exists", async () => {
      const createdApp = {
        id: "trade_new_456",
        name: "Dave",
        email: "dave@firm.com",
        company: "Dave Studio",
        status: "pending",
      }

      const mockTradeService = {
        listTradeApplications: jest.fn().mockResolvedValue([]),
        createTradeApplications: jest.fn().mockResolvedValue(createdApp),
      }

      const container = createContainer()
      container.register({
        [TRADE_MODULE]: asValue(mockTradeService),
      })

      const req = {
        validatedBody: {
          name: "Dave",
          email: "DAVE@Firm.COM",
          company: "Dave Studio",
          role: "Art Consultant",
          phone: null,
          website: null,
          message: null,
        },
        scope: container,
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any

      await POST(req, res)

      expect(mockTradeService.createTradeApplications).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Dave",
          email: "dave@firm.com",
          company: "Dave Studio",
        })
      )
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ application: createdApp })
    })
  })
})
