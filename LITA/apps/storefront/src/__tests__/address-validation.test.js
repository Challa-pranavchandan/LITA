const test = require("node:test");
const assert = require("node:assert/strict");
const {
  INDIAN_STATES,
  hasFirstAndLastName,
  isValidIndianPhone,
  isValidIndianPincode,
  normalizeIndianPhone,
  splitFullName,
} = require("../lib/validation/address-utils.js");

test("normalizes valid Indian phone formats and rejects invalid numbers", () => {
  assert.equal(normalizeIndianPhone("+91 98765 43210"), "9876543210");
  assert.equal(normalizeIndianPhone("09876543210"), "9876543210");
  assert.equal(normalizeIndianPhone("98765-43210"), "9876543210");
  assert.equal(isValidIndianPhone("+91 98765 43210"), true);
  assert.equal(isValidIndianPhone("5987654321"), false);
  assert.equal(isValidIndianPhone("987654321"), false);
  assert.equal(isValidIndianPhone("98765432100"), false);
});

test("validates Indian PIN codes including the first digit constraint", () => {
  assert.equal(isValidIndianPincode("495009"), true);
  assert.equal(isValidIndianPincode("012345"), false);
  assert.equal(isValidIndianPincode("12345"), false);
  assert.equal(isValidIndianPincode("1234567"), false);
  assert.equal(isValidIndianPincode("12A456"), false);
});

test("splits full names on the first word and leaves one-word last names empty", () => {
  assert.deepEqual(splitFullName("  Ch.   Venkatesh  "), {
    first_name: "Ch.",
    last_name: "Venkatesh",
  });
  assert.deepEqual(splitFullName("Madonna"), {
    first_name: "Madonna",
    last_name: "",
  });
  assert.equal(hasFirstAndLastName("Madonna"), false);
  assert.equal(hasFirstAndLastName("Mary Jane Smith"), true);
  assert.deepEqual(splitFullName(""), {
    first_name: "",
    last_name: "",
  });
});

test("lists all Indian states and union territories exactly once", () => {
  assert.equal(INDIAN_STATES.length, 36);
  assert.equal(new Set(INDIAN_STATES).size, 36);
  assert.ok(INDIAN_STATES.includes("Andhra Pradesh"));
  assert.ok(INDIAN_STATES.includes("Delhi (NCT)"));
  assert.ok(INDIAN_STATES.includes("Dadra and Nagar Haveli and Daman and Diu"));
  assert.ok(INDIAN_STATES.includes("Ladakh"));
});
