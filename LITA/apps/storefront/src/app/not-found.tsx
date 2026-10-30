import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page py-28 text-center">
      <h1 className="text-4xl">We can&apos;t find that page</h1>
      <p className="mt-3 text-graphite">The link may be old, or the work may have sold.</p>
      <Link href="/artworks" className="btn-solid mt-8">Browse artwork</Link>
    </div>
  );
}
