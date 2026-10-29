import type { Metadata } from "next";
import { SavedWorks } from "@/components/SavedWorks";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <div className="w-full bg-white">
      <SavedWorks />
    </div>
  );
}

