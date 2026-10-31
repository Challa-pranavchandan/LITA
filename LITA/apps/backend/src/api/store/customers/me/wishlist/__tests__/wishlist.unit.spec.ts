import { GET as getWishlistHandler } from "../route"
import { POST as addWishlistItemHandler } from "../items/route"
import { DELETE as deleteWishlistItemHandler } from "../items/[product_id]/route"
import { POST as mergeWishlistHandler } from "../merge/route"
import { WISHLIST_MODULE } from "../../../../../../modules/wishlist"
import { Modules } from "@medusajs/framework/utils"
import { createContainer, asValue } from "awilix"

describe("Store Wishlist API (Production-Grade Saved Feature)", () => {
  describe("GET /store/customers/me/wishlist", () => {
    it("returns 401 when customer is unauthenticated", async () => {
      const req: any = {
        auth_context: null,
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await getWishlistHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Authentication required") })
      )
    })

    it("returns product_ids newest first capped at 200", async () => {
      const mockItems = [
        { id: "wl_1", product_id: "prod_newest", created_at: new Date(2026, 0, 3) },
        { id: "wl_2", product_id: "prod_older", created_at: new Date(2026, 0, 2) },
      ]
      const mockWishlistService = {
        listWishlistItems: jest.fn().mockResolvedValue(mockItems),
      }
      const container = createContainer()
      container.register({
        [WISHLIST_MODULE]: asValue(mockWishlistService),
      })

      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await getWishlistHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockWishlistService.listWishlistItems).toHaveBeenCalledWith(
        { customer_id: "cus_alice" },
        { order: { created_at: "DESC" }, take: 200 }
      )
      expect(res.json).toHaveBeenCalledWith({
        product_ids: ["prod_newest", "prod_older"],
      })
    })
  })

  describe("POST /store/customers/me/wishlist/items", () => {
    it("returns 401 when customer is unauthenticated", async () => {
      const req: any = {
        auth_context: null,
        body: { product_id: "prod_1" },
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await addWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it("returns 400 when product_id is missing or invalid", async () => {
      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        body: { product_id: "" },
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await addWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it("returns 404 when product does not exist in catalog", async () => {
      const mockProductService = {
        retrieveProduct: jest.fn().mockRejectedValue(new Error("Not found")),
      }
      const mockWishlistService = {
        listWishlistItems: jest.fn().mockResolvedValue([]),
      }
      const container = createContainer()
      container.register({
        [Modules.PRODUCT]: asValue(mockProductService),
        [WISHLIST_MODULE]: asValue(mockWishlistService),
      })

      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        body: { product_id: "prod_ghost" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await addWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("not found") })
      )
    })

    it("is idempotent: returns 200 without duplicating if item is already saved", async () => {
      const mockProductService = {
        retrieveProduct: jest.fn().mockResolvedValue({ id: "prod_existing" }),
      }
      const existingItems = [
        { id: "wl_1", product_id: "prod_existing", customer_id: "cus_alice" },
      ]
      const mockWishlistService = {
        listWishlistItems: jest.fn().mockResolvedValue(existingItems),
        createWishlistItems: jest.fn(),
      }
      const container = createContainer()
      container.register({
        [Modules.PRODUCT]: asValue(mockProductService),
        [WISHLIST_MODULE]: asValue(mockWishlistService),
      })

      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        body: { product_id: "prod_existing" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await addWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockWishlistService.createWishlistItems).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        product_ids: ["prod_existing"],
      })
    })

    it("returns 422 if wishlist is already at the 200 items cap", async () => {
      const mockProductService = {
        retrieveProduct: jest.fn().mockResolvedValue({ id: "prod_new" }),
      }
      const existing200Items = Array.from({ length: 200 }, (_, i) => ({
        id: `wl_${i}`,
        product_id: `prod_${i}`,
      }))
      const mockWishlistService = {
        listWishlistItems: jest.fn().mockResolvedValue(existing200Items),
        createWishlistItems: jest.fn(),
      }
      const container = createContainer()
      container.register({
        [Modules.PRODUCT]: asValue(mockProductService),
        [WISHLIST_MODULE]: asValue(mockWishlistService),
      })

      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        body: { product_id: "prod_new" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await addWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("cannot exceed 200") })
      )
      expect(mockWishlistService.createWishlistItems).not.toHaveBeenCalled()
    })

    it("creates item, emits wishlist.item_added, and returns updated list", async () => {
      const mockProductService = {
        retrieveProduct: jest.fn().mockResolvedValue({ id: "prod_art1" }),
      }
      let savedItems: any[] = []
      const mockWishlistService = {
        listWishlistItems: jest.fn().mockImplementation(() => Promise.resolve(savedItems)),
        createWishlistItems: jest.fn().mockImplementation((payload) => {
          savedItems = [{ id: "wl_123", product_id: payload.product_id }]
          return Promise.resolve(savedItems)
        }),
      }
      const mockEventBus = {
        emit: jest.fn().mockResolvedValue(undefined),
      }
      const container = createContainer()
      container.register({
        [Modules.PRODUCT]: asValue(mockProductService),
        [WISHLIST_MODULE]: asValue(mockWishlistService),
        [Modules.EVENT_BUS]: asValue(mockEventBus),
      })

      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        body: { product_id: "prod_art1" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await addWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockWishlistService.createWishlistItems).toHaveBeenCalledWith({
        customer_id: "cus_alice",
        product_id: "prod_art1",
      })
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        name: "wishlist.item_added",
        data: { customer_id: "cus_alice", product_id: "prod_art1" },
      })
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        product_ids: ["prod_art1"],
      })
    })
  })

  describe("DELETE /store/customers/me/wishlist/items/:product_id", () => {
    it("returns 401 when customer is unauthenticated", async () => {
      const req: any = {
        auth_context: null,
        params: { product_id: "prod_1" },
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await deleteWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it("deletes existing item, emits wishlist.item_removed, and returns remaining list", async () => {
      let items = [
        { id: "wl_1", product_id: "prod_to_delete" },
        { id: "wl_2", product_id: "prod_keep" },
      ]
      const mockWishlistService = {
        listWishlistItems: jest.fn().mockImplementation((filters: any) => {
          if (filters.product_id) {
            return Promise.resolve(items.filter((i) => i.product_id === filters.product_id))
          }
          return Promise.resolve(items)
        }),
        deleteWishlistItems: jest.fn().mockImplementation((ids: string[]) => {
          items = items.filter((i) => !ids.includes(i.id))
          return Promise.resolve()
        }),
      }
      const mockEventBus = {
        emit: jest.fn().mockResolvedValue(undefined),
      }
      const container = createContainer()
      container.register({
        [WISHLIST_MODULE]: asValue(mockWishlistService),
        [Modules.EVENT_BUS]: asValue(mockEventBus),
      })

      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        params: { product_id: "prod_to_delete" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await deleteWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockWishlistService.deleteWishlistItems).toHaveBeenCalledWith(["wl_1"])
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        name: "wishlist.item_removed",
        data: { customer_id: "cus_alice", product_id: "prod_to_delete" },
      })
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        product_ids: ["prod_keep"],
      })
    })

    it("is idempotent: returns 200 without error even if item was not in wishlist", async () => {
      const mockWishlistService = {
        listWishlistItems: jest.fn().mockResolvedValue([]),
        deleteWishlistItems: jest.fn(),
      }
      const container = createContainer()
      container.register({
        [WISHLIST_MODULE]: asValue(mockWishlistService),
      })

      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        params: { product_id: "prod_already_gone" },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await deleteWishlistItemHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockWishlistService.deleteWishlistItems).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        product_ids: [],
      })
    })
  })

  describe("POST /store/customers/me/wishlist/merge", () => {
    it("returns 401 when customer is unauthenticated", async () => {
      const req: any = {
        auth_context: null,
        body: { product_ids: ["prod_1"] },
        scope: createContainer(),
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await mergeWishlistHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it("deduplicates input IDs, drops unknown catalog IDs, skips existing, and enforces 200 cap", async () => {
      // 1. Existing customer items: 198 items
      const existingItems = Array.from({ length: 198 }, (_, i) => ({
        id: `wl_old_${i}`,
        product_id: `prod_existing_${i}`,
      }))

      let allItems = [...existingItems]

      const mockWishlistService = {
        listWishlistItems: jest.fn().mockImplementation(() => Promise.resolve(allItems)),
        createWishlistItems: jest.fn().mockImplementation((payload: any[]) => {
          const added = payload.map((p, idx) => ({ id: `wl_new_${idx}`, product_id: p.product_id }))
          allItems = [...added, ...allItems]
          return Promise.resolve(added)
        }),
      }

      // Catalog has prod_new_1, prod_new_2, prod_new_3, and prod_existing_0
      // Catalog does NOT have prod_ghost
      const mockProductService = {
        listAndCountProducts: jest.fn().mockResolvedValue([
          [
            { id: "prod_new_1" },
            { id: "prod_new_2" },
            { id: "prod_new_3" },
            { id: "prod_existing_0" },
          ],
          4,
        ]),
      }

      const mockEventBus = {
        emit: jest.fn().mockResolvedValue(undefined),
      }

      const container = createContainer()
      container.register({
        [WISHLIST_MODULE]: asValue(mockWishlistService),
        [Modules.PRODUCT]: asValue(mockProductService),
        [Modules.EVENT_BUS]: asValue(mockEventBus),
      })

      // Input has duplicate prod_new_1, unknown prod_ghost, already saved prod_existing_0, and prod_new_2, prod_new_3
      // Since existing count is 198, available slots = 200 - 198 = 2 slots!
      // So only prod_new_1 and prod_new_2 should be added, prod_new_3 dropped due to cap
      const req: any = {
        auth_context: { actor_id: "cus_alice" },
        body: {
          product_ids: [
            "prod_new_1",
            "prod_new_1", // duplicate
            "prod_ghost", // unknown in catalog
            "prod_existing_0", // already saved
            "prod_new_2",
            "prod_new_3", // beyond cap
          ],
        },
        scope: container,
      }
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }

      await mergeWishlistHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)

      // Verified createWishlistItems was called with exactly 2 items (prod_new_1, prod_new_2)
      expect(mockWishlistService.createWishlistItems).toHaveBeenCalledWith([
        { customer_id: "cus_alice", product_id: "prod_new_1" },
        { customer_id: "cus_alice", product_id: "prod_new_2" },
      ])

      // Events emitted only for newly added items
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2)
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        name: "wishlist.item_added",
        data: { customer_id: "cus_alice", product_id: "prod_new_1" },
      })
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        name: "wishlist.item_added",
        data: { customer_id: "cus_alice", product_id: "prod_new_2" },
      })

      // Total items is 200
      expect(allItems).toHaveLength(200)
    })
  })
})
