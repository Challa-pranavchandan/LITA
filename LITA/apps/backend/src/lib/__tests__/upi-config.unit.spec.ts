describe("UPI payment configuration", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.UPI_ORDER_EXPIRY_HOURS
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("defaults the order expiry to 48 hours and reads it only once", () => {
    const { getUpiOrderExpiryHours } = require("../upi-config")
    expect(getUpiOrderExpiryHours()).toBe(48)
    process.env.UPI_ORDER_EXPIRY_HOURS = "72"
    expect(getUpiOrderExpiryHours()).toBe(48)
  })

  it.each(["6", "24", "168"])(
    "accepts the configured expiry value %s",
    (expiryHours) => {
      process.env.UPI_ORDER_EXPIRY_HOURS = expiryHours
      const { getUpiOrderExpiryHours } = require("../upi-config")
      expect(getUpiOrderExpiryHours()).toBe(Number(expiryHours))
    }
  )

  it.each(["5", "169", "6.5", "invalid"])(
    "rejects invalid expiry configuration %s",
    (expiryHours) => {
      process.env.UPI_ORDER_EXPIRY_HOURS = expiryHours
      const { getUpiOrderExpiryHours } = require("../upi-config")
      expect(() => getUpiOrderExpiryHours()).toThrow(
        "UPI_ORDER_EXPIRY_HOURS must be an integer between 6 and 168."
      )
    }
  )
})
