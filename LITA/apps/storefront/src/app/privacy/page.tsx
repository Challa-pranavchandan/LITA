import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy | Livin In The Art",
  description:
    "Privacy policy and data governance practices for Livin In The Art (LITA) gallery and studio.",
};

export default function PrivacyPage() {
  return (
    <div className="w-full bg-white text-[#232629]">
      {/* ── Page Header ── */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <span className="block pb-3 text-xs font-sans font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            Legal &amp; Privacy
          </span>
          <h1
            className="font-cormorant text-4xl sm:text-5xl md:text-6xl font-normal text-[#232629] leading-[1.15]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#5C6168] max-w-xl mx-auto leading-relaxed">
            How Livin In The Art protects, respects, and stewards your personal data across our gallery and studio services.
          </p>
          <p className="mt-2 text-xs font-mono uppercase tracking-wider text-[#888888]">
            Last updated: November 2026
          </p>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="space-y-12 text-[15px] sm:text-base leading-relaxed text-[#3a3a3a]">
          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              1. Our Studio Philosophy &amp; Data Stewardship
            </h2>
            <p className="mb-4">
              Livin In The Art (&ldquo;LITA&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates a fine art gallery and custom studio based in India. We believe collecting artwork is an intimate and enduring relationship. We collect only the information necessary to fulfill your artwork orders, curate bespoke commissions, and share studio dispatches.
            </p>
            <p>
              We never sell, rent, or trade your personal information to third-party data brokers or marketing networks.
            </p>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              2. Information We Collect
            </h2>
            <p className="mb-4">
              We collect information provided directly by you when interacting with our platform:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#4a4a4a]">
              <li>
                <strong className="text-[#232629]">Collector Profiles &amp; Accounts:</strong> Name, email address, contact telephone, and delivery addresses for fine art handling.
              </li>
              <li>
                <strong className="text-[#232629]">Bespoke Commissions &amp; Inquiries:</strong> Creative ideas, architectural space dimensions, and private reference imagery uploaded to our encrypted media storage.
              </li>
              <li>
                <strong className="text-[#232629]">Trade Program Applications:</strong> Company name, interior design or architecture credentials, professional portfolio website, and business contact information.
              </li>
              <li>
                <strong className="text-[#232629]">Newsletter Subscriptions:</strong> Email address for our double-opt-in studio releases.
              </li>
            </ul>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              3. Payment Security
            </h2>
            <p className="mb-4">
              All transactions on Livin In The Art are processed in Indian Rupees (INR).
            </p>
            <p className="mb-4">
              Online card, netbanking, and UPI payments are processed directly through <strong>Razorpay</strong>, an RBI-regulated and PCI-DSS Level 1 compliant payment processor. Livin In The Art never captures, processes, or stores your full credit card numbers or banking credentials on our servers.
            </p>
            <p>
              For direct UPI transfers, reference UTR numbers submitted for manual verification are used strictly to reconcile accounting records against the corresponding order.
            </p>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              4. Media Storage &amp; Confidentiality
            </h2>
            <p>
              Reference photographs and architectural blueprints uploaded for bespoke art commissions are stored securely in dedicated, access-controlled Cloudflare R2 object storage. Upload and preview URLs are cryptographically signed with short expiration windows and are accessible solely by the collector and our lead artist.
            </p>
          </section>

          <section className="border-b border-[#E5E7EB] pb-10">
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              5. Cookies &amp; Bot Protection
            </h2>
            <p className="mb-4">
              We employ essential HttpOnly session cookies to preserve your cart contents, authentication state, and saved wishlist preferences.
            </p>
            <p>
              To protect our inquiry forms and studio contact channels from spam and automated abuse, we utilize Cloudflare Turnstile, a privacy-respecting verification service that does not harvest tracking cookies or track cross-site user behavior.
            </p>
          </section>

          <section>
            <h2
              className="text-2xl sm:text-3xl font-normal text-[#232629] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
            >
              6. Contact &amp; Grievances
            </h2>
            <p className="mb-4">
              If you have any questions regarding this Privacy Policy, wish to request access to or deletion of your personal data, or need to contact our studio grievance officer, please write to:
            </p>
            <div className="bg-[#FAF9F7] border border-[#E5E5E5] p-6 text-sm">
              <p className="font-medium text-[#232629]">Livin In The Art Studio</p>
              <p className="mt-1 text-[#5C6168]">Fine Art Gallery &amp; Atelier</p>
              <p className="mt-2 text-[#5C6168]">
                Email:{" "}
                <a href={`mailto:${siteConfig.email}`} className="text-[#232629] underline underline-offset-4 hover:text-[#5f2f3c]">
                  {siteConfig.email}
                </a>
              </p>
              <p className="mt-1 text-[#5C6168]">
                Studio Direct:{" "}
                <a href="https://wa.me/917799671321" target="_blank" rel="noopener noreferrer" className="text-[#232629] underline underline-offset-4 hover:text-[#5f2f3c]">
                  +91 77996 71321
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
