import type { Metadata } from "next";
import { SavedWorks } from "@/components/SavedWorks";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <div className="page py-10">
      <h1 className="mb-10 text-3xl">Saved</h1>
      <SavedWorks />
    </div>
  );
}
