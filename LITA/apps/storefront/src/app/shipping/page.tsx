import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping and returns" };

export default function ShippingPage() {
  return (
    <div className="page max-w-3xl py-12">
      <h1 className="text-4xl">Shipping and returns</h1>
      {/* Replace with your real policies before launch. */}
      <div className="prose-art mt-8 space-y-8">
        <section>
          <h2 className="mb-2 font-sans text-xl">Delivery</h2>
          <p>State where you ship, how long dispatch takes, how artworks are packed, and which carriers you use.</p>
        </section>
        <section>
          <h2 className="mb-2 font-sans text-xl">Returns</h2>
          <p>State your return window, who pays for return shipping, and what condition a work must be in.</p>
        </section>
        <section>
          <h2 className="mb-2 font-sans text-xl">Damaged in transit</h2>
          <p>Explain how to report damage and what you&apos;ll do about it.</p>
        </section>
      </div>
    </div>
  );
}
