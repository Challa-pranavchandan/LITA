import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { InquiryForm } from "@/components/InquiryForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="page grid gap-12 py-12 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
      <div>
        <h1 className="text-4xl">Contact</h1>
        <p className="prose-art mt-5">
          Questions about an order, shipping, or an artwork? Send a message here or email{" "}
          <a href={`mailto:${siteConfig.email}`} className="link">{siteConfig.email}</a>.
        </p>
      </div>
      <InquiryForm kind="contact" submitLabel="Send message" placeholder="How can we help?" />
    </div>
  );
}
