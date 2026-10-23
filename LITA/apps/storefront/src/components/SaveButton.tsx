"use client";

import { toggleSaved, useSaved } from "@/lib/saved";

export function SaveButton({
  productId,
  title,
  className = "",
  withLabel = false,
}: {
  productId: string;
  title: string;
  className?: string;
  withLabel?: boolean;
}) {
  const saved = useSaved().includes(productId);
  return (
    <button
      type="button"
      onClick={() => toggleSaved(productId)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      className={`inline-flex items-center gap-2 text-ink transition-colors hover:text-indigo-ink ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" strokeLinejoin="round" />
      </svg>
      {withLabel && <span className="text-[15px]">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}

export function SavedCount() {
  const n = useSaved().length;
  return n > 0 ? <span className="ml-1 text-sm tabular-nums">({n})</span> : null;
}
