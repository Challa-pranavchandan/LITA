const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Cart and Carted State Synchronization", () => {
  test("lib/carted.ts exports syncCartedItems, unmarkCarted, and clearCarted", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../lib/carted.ts"),
      "utf8"
    );
    assert.strictEqual(
      source.includes("export function markCarted"),
      true,
      "Expected markCarted export"
    );
    assert.strictEqual(
      source.includes("export function unmarkCarted"),
      true,
      "Expected unmarkCarted export"
    );
    assert.strictEqual(
      source.includes("export function syncCartedItems"),
      true,
      "Expected syncCartedItems export"
    );
    assert.strictEqual(
      source.includes("export function clearCarted"),
      true,
      "Expected clearCarted export"
    );
    assert.strictEqual(
      source.includes("export function isCarted"),
      true,
      "Expected isCarted export"
    );
  });

  test("BuyBox.tsx does not mark failed addToCart operations as carted", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/artwork/BuyBox.tsx"),
      "utf8"
    );
    assert.strictEqual(
      source.includes("markCarted(selectedVariantId)"),
      true,
      "Expected markCarted call on success"
    );
    assert.strictEqual(
      source.includes("// Fallback for curated mock products not yet populated in remote Medusa"),
      false,
      "Expected no fake fallback marking items carted on error"
    );
  });

  test("HeaderActions.tsx synchronizes carted state with server cart", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/HeaderActions.tsx"),
      "utf8"
    );
    assert.strictEqual(
      source.includes("syncCartedItems(variantIds)"),
      true,
      "Expected syncCartedItems call in HeaderActions"
    );
    assert.strictEqual(
      source.includes("clearCarted()"),
      true,
      "Expected clearCarted call when cart is null or stale"
    );
  });

  test("CartDrawer and CartView call unmarkCarted on item removal", () => {
    const drawerSource = fs.readFileSync(
      path.resolve(__dirname, "../components/CartDrawer.tsx"),
      "utf8"
    );
    assert.strictEqual(
      drawerSource.includes("unmarkCarted"),
      true,
      "Expected unmarkCarted in CartDrawer"
    );

    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "../components/CartView.tsx"),
      "utf8"
    );
    assert.strictEqual(
      viewSource.includes("unmarkCarted"),
      true,
      "Expected unmarkCarted in CartView"
    );
  });
});
