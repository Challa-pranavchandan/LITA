import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="page grid gap-12 py-12 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
      <h1 className="text-4xl leading-tight">About {siteConfig.name}</h1>
      <div className="prose-art">
        {/* Replace this placeholder text with your own story. */}
        <p>
          Write a few paragraphs here about who you are, what you make, and how you work: charcoal portraits, line and pen art, acrylic painting, dot mandalas.
        </p>
        <p>
          Say what a buyer can expect when they order: how pieces are packed, how long a gift takes to make, and how to reach you with questions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/artworks" className="btn-solid">See the work</Link>
          <Link href="/commissions" className="btn-line">Request a commission</Link>
        </div>
      </div>
    </div>
  );
}
