import type { Metadata } from "next"
import { ExhibitionImageGallery } from "./ExhibitionImageGallery"

export const metadata: Metadata = {
  title: "Exhibitions | LITA Studio",
  description:
    "Discover exhibitions currently on view, upcoming shows, and past exhibitions at LITA Studio.",
}

type ExhibitionImage = {
  url: string
  alt?: string | null
}

type Exhibition = {
  id: string
  title: string
  description: string
  details: string | null
  location: string | null
  start_date: string
  end_date: string
  image_url: string | null
  image_alt: string | null
  images?: Array<ExhibitionImage | string> | null
}

function getTodayInIndia() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

async function getExhibitions(): Promise<Exhibition[]> {
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const apiKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  try {
    const response = await fetch(`${backendUrl}/store/exhibitions`, {
      headers: apiKey ? { "x-publishable-api-key": apiKey } : {},
      cache: "no-store",
    })
    if (!response.ok) {
      console.error(
        `[exhibitions] Backend returned ${response.status} ${response.statusText}`
      )
      return []
    }

    const data = (await response.json()) as { exhibitions?: Exhibition[] }
    return data.exhibitions || []
  } catch (error) {
    console.error("[exhibitions] Failed to load exhibitions:", error)
    return []
  }
}

function ExhibitionCard({ exhibition }: { exhibition: Exhibition }) {
  return (
    <article className="grid overflow-hidden border border-[#E5E5E5] bg-white md:grid-cols-[minmax(280px,0.9fr)_1.1fr]">
      <ExhibitionImageGallery
        images={exhibition.images}
        primaryUrl={exhibition.image_url}
        primaryAlt={exhibition.image_alt}
        title={exhibition.title}
      />
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#777]">
          {formatDate(exhibition.start_date)} – {formatDate(exhibition.end_date)}
        </p>
        <h3 className="mt-3 font-cormorant text-3xl text-[#232629] sm:text-4xl">
          {exhibition.title}
        </h3>
        {exhibition.location && (
          <p className="mt-2 text-sm font-medium text-[#5C6168]">
            {exhibition.location}
          </p>
        )}
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#5C6168]">
          {exhibition.description}
        </p>
        {exhibition.details && (
          <details className="mt-4 border-t border-[#E5E5E5] pt-4">
            <summary className="cursor-pointer text-sm font-medium text-[#232629]">
              Exhibition details
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#5C6168]">
              {exhibition.details}
            </p>
          </details>
        )}
      </div>
    </article>
  )
}

function ExhibitionSection({
  id,
  title,
  description,
  exhibitions,
}: {
  id: string
  title: string
  description: string
  exhibitions: Exhibition[]
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-[#E5E5E5] py-12 sm:py-16">
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#777]">
          {title}
        </p>
        <h2 className="mt-2 font-cormorant text-4xl text-[#232629] sm:text-5xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5C6168]">
          {description}
        </p>
      </div>
      {exhibitions.length ? (
        <div className="space-y-5">
          {exhibitions.map((exhibition) => (
            <ExhibitionCard key={exhibition.id} exhibition={exhibition} />
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-[#D8D8D8] bg-white p-6 text-sm text-[#777]">
          There are no {title.toLowerCase()} exhibitions at this time.
        </p>
      )}
    </section>
  )
}

export default async function ExhibitionsPage() {
  const exhibitions = await getExhibitions()
  const today = getTodayInIndia()
  const onView = exhibitions.filter(
    (exhibition) =>
      exhibition.start_date <= today && exhibition.end_date >= today
  )
  const upcoming = exhibitions.filter((exhibition) => exhibition.start_date > today)
  const past = exhibitions
    .filter((exhibition) => exhibition.end_date < today)
    .sort((a, b) => b.end_date.localeCompare(a.end_date))

  return (
    <main className="min-h-screen bg-[#FAF9F7] pb-20 text-[#232629]">
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#5C6168]">
            LITA Studio
          </p>
          <h1 className="mt-3 font-cormorant text-5xl sm:text-6xl">
            Exhibitions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#5C6168]">
            Explore what is on view now, what is coming next, and exhibitions
            from our past programme.
          </p>
          <nav
            aria-label="Exhibition sections"
            className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-medium uppercase tracking-wider"
          >
            <a className="border border-[#D8D8D8] px-4 py-2 hover:border-black" href="#on-view">On View</a>
            <a className="border border-[#D8D8D8] px-4 py-2 hover:border-black" href="#upcoming">Upcoming</a>
            <a className="border border-[#D8D8D8] px-4 py-2 hover:border-black" href="#past">Past</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <ExhibitionSection
          id="on-view"
          title="On View"
          description="Exhibitions currently open to visitors."
          exhibitions={onView}
        />
        <ExhibitionSection
          id="upcoming"
          title="Upcoming"
          description="Save the date for exhibitions opening soon."
          exhibitions={upcoming}
        />
        <ExhibitionSection
          id="past"
          title="Past"
          description="A record of exhibitions from our previous programme."
          exhibitions={past}
        />
      </div>
    </main>
  )
}
