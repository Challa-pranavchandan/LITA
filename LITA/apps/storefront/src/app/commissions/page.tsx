import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";

export const metadata: Metadata = { title: "Commissions" };

export default function CommissionsPage() {
  return (
    <div className="page grid gap-14 py-12 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
      <div>
        <h1 className="text-4xl leading-tight">Commission a piece</h1>
        <div className="prose-art mt-6">
          <p>
            Share what you'd like made, the size, and when you need it. You'll get a reply with a quote and a timeline before anything starts.
          </p>
          <p>
            Useful to include: a reference photo or description, where it will hang or who it is for, and your budget range.
          </p>
        </div>
      </div>
      <InquiryForm
        kind="commission"
        showBudget
        submitLabel="Send commission request"
        placeholder="What would you like made, at what size, and by when?"
      />
    </div>
  );
}
