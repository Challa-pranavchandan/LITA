import {
  CommissionListQuerySchema,
  CommissionPaySchema,
  CommissionUploadUrlSchema,
  CreateCommissionSchema,
} from "../commission"

describe("commission API schemas", () => {
  it("accepts the customer-submittable commission fields", () => {
    expect(
      CreateCommissionSchema.safeParse({
        title: "Portrait",
        idea: "A charcoal portrait",
        images: [
          {
            key: "commissions/cus_1/ref.jpg",
            filename: "ref.jpg",
            mime: "image/jpeg",
            size: 1024,
          },
        ],
      }).success
    ).toBe(true)
  })

  it("rejects client-supplied ownership and price fields", () => {
    expect(
      CreateCommissionSchema.safeParse({
        title: "Portrait",
        idea: "A charcoal portrait",
        customer_id: "cus_someone_else",
        quoted_price: 1,
      }).success
    ).toBe(false)
  })

  it("caps references and upload size and allows only image MIME types", () => {
    const image = {
      key: "commissions/cus_1/ref.jpg",
      filename: "ref.jpg",
      mime: "image/jpeg",
      size: 1024,
    }
    expect(
      CreateCommissionSchema.safeParse({
        title: "Portrait",
        idea: "A charcoal portrait",
        images: Array.from({ length: 6 }, (_, index) => ({
          ...image,
          key: `${image.key}-${index}`,
        })),
      }).success
    ).toBe(false)
    expect(
      CommissionUploadUrlSchema.safeParse({
        filename: "ref.svg",
        contentType: "image/svg+xml",
        size: 1024,
      }).success
    ).toBe(false)
    expect(
      CommissionUploadUrlSchema.safeParse({
        filename: "large.jpg",
        contentType: "image/jpeg",
        size: 10 * 1024 * 1024 + 1,
      }).success
    ).toBe(false)
  })

  it("requires the full Razorpay callback payload and bounds admin list filters", () => {
    expect(CommissionPaySchema.safeParse({ session_id: "ps_1" }).success).toBe(false)
    expect(
      CommissionListQuerySchema.safeParse({
        status: "awaiting_payment",
        q: "portrait",
        limit: "50",
        offset: "0",
      }).success
    ).toBe(true)
    expect(
      CommissionListQuerySchema.safeParse({ limit: "1000" }).success
    ).toBe(false)
  })
})
