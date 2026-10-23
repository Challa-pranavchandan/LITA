"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  images,
  title,
}: {
  images: { id: string; url: string }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-mist text-graphite">
        No image yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse">
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="relative block min-h-[360px] w-full flex-1 cursor-zoom-in bg-mist"
        aria-label={`Enlarge image of ${title}`}
        style={{ aspectRatio: "4 / 5" }}
      >
        <Image
          key={images[active].id}
          src={images[active].url}
          alt={`${title}, view ${active + 1} of ${images.length}`}
          fill
          priority
          sizes="(min-width:1024px) 52vw, 100vw"
          className="object-contain"
        />
      </button>

      {images.length > 1 && (
        <ul className="flex gap-3 md:w-16 md:flex-col" aria-label="Image views">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show view ${i + 1}`}
                aria-current={i === active}
                className={`relative block h-16 w-16 bg-mist ${i === active ? "outline outline-2 outline-offset-2 outline-ink" : "opacity-70 hover:opacity-100"}`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title}, enlarged`}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-ink/90 p-4"
          onClick={() => setZoom(false)}
          onKeyDown={(e) => e.key === "Escape" && setZoom(false)}
        >
          <button
            type="button"
            className="absolute right-5 top-4 text-paper underline underline-offset-4"
            onClick={() => setZoom(false)}
            autoFocus
          >
            Close
          </button>
          <div className="relative h-full w-full">
            <Image src={images[active].url} alt={title} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
