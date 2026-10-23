import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy and data collection practices for Uprise Art.",
};

export default function PrivacyPage() {
  return (
    <div className="page max-w-3xl py-16">
      <h1 className="text-4xl font-normal tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-sm text-graphite">Last updated: October 2026</p>

      <div className="prose-art mt-8 space-y-8">
        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">Information We Collect</h2>
          <p>
            We collect information you provide directly to us when subscribing to our newsletter,
            inquiring about artworks, commissioning pieces, or placing an order. This may include
            your name, email address, postal address, and payment information.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">How We Use Information</h2>
          <p>
            Your information is used solely to fulfill your inquiries and orders, communicate about
            new artworks and exhibitions, and provide a tailored art advisory service. We never sell
            your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">Cookies and Analytics</h2>
          <p>
            We use essential cookies to maintain your cart and session, as well as anonymous
            analytics to understand how visitors engage with our gallery.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-sans text-xl font-medium">Contact Us</h2>
          <p>
            If you have questions regarding your privacy, please contact our team at{" "}
            <a href="mailto:hello@example.com" className="link">
              hello@example.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
