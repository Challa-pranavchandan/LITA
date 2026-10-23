import type { Metadata } from "next";
import Link from "next/link";
import { listCollections } from "@/lib/data/catalog";

export const revalidate = 60;
export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const collections = await listCollections();
  return (
    <div className="page py-10">
      <h1 className="mb-10 text-3xl">Collections</h1>
      {collections.length === 0 ? (
        <p className="py-16 text-lg">
          No collections yet. Create one in the Medusa admin under Collections and it will show up here.
        </p>
      ) : (
        <ul className="grid gap-px border border-mist bg-mist sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <li key={c.id} className="bg-paper">
              <Link href={`/collections/${c.handle}`} className="flex min-h-40 flex-col justify-between p-7 transition-colors hover:bg-wall">
                <span className="text-2xl">{c.title}</span>
                <span className="mt-8 text-sm text-graphite">View the collection</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
