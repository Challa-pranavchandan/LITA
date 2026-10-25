const { test, describe } = require("node:test");
const assert = require("node:assert");

// Import schemas and rate limiter directly or recreate pure logic for fast node test
const { z } = require("zod");

const registerSchema = z.object({
  first_name: z.string().trim().min(1, "Please enter your first name."),
  last_name: z.string().trim().min(1, "Please enter your last name."),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  marketing_opt_in: z.boolean().default(false),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

function getSafeRedirectUrl(nextUrl, fallback = "/account") {
  if (!nextUrl || typeof nextUrl !== "string") return fallback;
  const trimmed = nextUrl.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("\\") &&
    !trimmed.startsWith("/\\")
  ) {
    return trimmed;
  }
  return fallback;
}

describe("Authentication Validation & Security", () => {
  describe("Registration Schema", () => {
    test("accepts valid registration input with marketing opt-in", () => {
      const result = registerSchema.safeParse({
        first_name: "Jane",
        last_name: "Doe",
        email: "JANE@EXAMPLE.COM",
        password: "securepassword123",
        marketing_opt_in: true,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.email, "jane@example.com");
      assert.strictEqual(result.data.marketing_opt_in, true);
    });

    test("rejects password shorter than 8 characters", () => {
      const result = registerSchema.safeParse({
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        password: "short",
      });

      assert.strictEqual(result.success, false);
      assert.match(result.error.issues[0].message, /8 characters/i);
    });

    test("rejects invalid email formats", () => {
      const result = registerSchema.safeParse({
        first_name: "Jane",
        last_name: "Doe",
        email: "not-an-email",
        password: "securepassword123",
      });

      assert.strictEqual(result.success, false);
      assert.match(result.error.issues[0].message, /valid email/i);
    });
  });

  describe("Login Schema", () => {
    test("accepts valid login credentials", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "anypassword",
      });
      assert.strictEqual(result.success, true);
    });

    test("rejects missing password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      });
      assert.strictEqual(result.success, false);
    });
  });

  describe("Open Redirect Protection", () => {
    test("permits safe relative paths", () => {
      assert.strictEqual(getSafeRedirectUrl("/checkout"), "/checkout");
      assert.strictEqual(getSafeRedirectUrl("/account/orders"), "/account/orders");
    });

    test("blocks protocol-relative open redirect attacks", () => {
      assert.strictEqual(getSafeRedirectUrl("//evil.com"), "/account");
      assert.strictEqual(getSafeRedirectUrl("///evil.com"), "/account");
    });

    test("blocks absolute external URLs", () => {
      assert.strictEqual(getSafeRedirectUrl("https://evil.com"), "/account");
      assert.strictEqual(getSafeRedirectUrl("http://evil.com"), "/account");
      assert.strictEqual(getSafeRedirectUrl("javascript:alert(1)"), "/account");
    });

    test("blocks backslash open redirect variations", () => {
      assert.strictEqual(getSafeRedirectUrl("/\\evil.com"), "/account");
      assert.strictEqual(getSafeRedirectUrl("\\evil.com"), "/account");
    });

    test("falls back cleanly on empty or missing input", () => {
      assert.strictEqual(getSafeRedirectUrl(null), "/account");
      assert.strictEqual(getSafeRedirectUrl(undefined), "/account");
      assert.strictEqual(getSafeRedirectUrl(""), "/account");
    });
  });
});
