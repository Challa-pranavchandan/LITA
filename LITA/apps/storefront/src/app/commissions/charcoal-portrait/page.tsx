import type { Metadata } from "next"
import Link from "next/link"
import { getCustomer } from "@/lib/data/customer"
import { CharcoalPortraitRequestForm } from "@/components/CharcoalPortraitRequestForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Charcoal Portraits | LITA Studio",
  description:
    "Commission a hand-drawn charcoal portrait with clear fixed pricing for A4 and A3.",
}

export default async function CharcoalPortraitPage() {
  const customer = await getCustomer()

  return (
    <div className="page py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/commissions"
          className="text-xs uppercase tracking-wider text-graphite hover:text-ink"
        >
          ← All commissions
        </Link>
        <header className="mb-10 mt-6">
          <span className="text-xs font-medium uppercase tracking-widest text-graphite">
            Hand-drawn in charcoal
          </span>
          <h1 className="mt-2 text-4xl font-medium leading-tight tracking-tightish md:text-5xl">
            Charcoal Portrait
          </h1>
          <p className="mt-4 font-serif text-lg leading-relaxed text-graphite md:text-xl">
            Choose the paper size and number of people to see your fixed price
            before requesting your portrait.
          </p>
        </header>

        <section className="border border-dust bg-wall p-6 md:p-8">
          <CharcoalPortraitRequestForm isLoggedIn={Boolean(customer?.id)} />
        </section>
      </div>
    </div>
  )
}
