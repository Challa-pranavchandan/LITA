import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms and conditions for browsing and purchasing from Uprise Art.",
};

export default function TermsPage() {
  return (
    <div className="page max-w-3xl py-16">
      <h1 className="text-4xl font-normal tracking-tight">Terms of Use</h1>
      <p className="mt-4 text-sm text-graphite">Last updated: October 2026</p>

      <div className="prose-art mt-8 space-y-8">
        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">Original Artwork & Copyright</h2>
          <p>
            All artwork featured on this site is original and protected by copyright law. All rights
            remain with the respective artists. Reproduction or unauthorized use of imagery without
            express written consent is strictly prohibited.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">Orders and Pricing</h2>
          <p>
            Prices are listed in local currency and are subject to change without notice. We reserve
            the right to cancel or refuse any order in the event of an typographical or pricing error.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">Advisory & Commissions</h2>
          <p>
            Custom artwork commissions require an initial consultation and deposit. Completion
            timelines vary by artist and medium, as outlined in individual commission agreements.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">Governing Law</h2>
          <p>
            These terms are governed by and construed in accordance with applicable commercial and
            copyright laws.
          </p>
        </section>
      </div>
    </div>
  );
}
