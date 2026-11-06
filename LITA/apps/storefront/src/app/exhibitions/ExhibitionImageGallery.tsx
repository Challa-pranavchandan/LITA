"use client"

import { useState } from "react"
import Image from "next/image"

type ExhibitionImageItem = {
  url: string
  alt?: string | null
}

export function ExhibitionImageGallery({
  images = [],
  primaryUrl,
  primaryAlt,
  title,
}: {
  images?: Array<ExhibitionImageItem | string> | null
  primaryUrl?: string | null
  primaryAlt?: string | null
  title: string
}) {
  const normalizedList: ExhibitionImageItem[] = []

  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      if (typeof img === "string") {
        normalizedList.push({ url: img, alt: null })
      } else if (img?.url) {
        normalizedList.push({ url: img.url, alt: img.alt || null })
      }
    }
  }

  if (normalizedList.length === 0 && primaryUrl) {
    normalizedList.push({ url: primaryUrl, alt: primaryAlt || null })
  }

  const [activeIdx, setActiveIdx] = useState(0)

  if (normalizedList.length === 0) {
    return (
      <div className="flex min-h-52 items-center justify-center bg-[#F1F1EF] text-sm text-[#5C6168] md:min-h-80">
        Exhibition
      </div>
    )
  }

  const activeImage = normalizedList[activeIdx] || normalizedList[0]

  return (
    <div className="flex flex-col bg-[#F1F1EF]">
      <div className="relative min-h-64 flex-1 md:min-h-80">
        <Image
          src={activeImage.url}
          alt={activeImage.alt || primaryAlt || title}
          fill
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover transition-opacity duration-300"
          priority={false}
        />
        {normalizedList.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white backdrop-blur">
            {activeIdx + 1} / {normalizedList.length}
          </div>
        )}
      </div>

      {normalizedList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-[#E5E5E5] bg-white p-2.5">
          {normalizedList.map((item, idx) => {
            const isSelected = idx === activeIdx
            return (
              <button
                key={`${item.url}-${idx}`}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-label={`View image ${idx + 1} for ${title}`}
                className={`relative h-14 w-16 shrink-0 overflow-hidden rounded border transition-all ${
                  isSelected
                    ? "border-black ring-2 ring-black/20"
                    : "border-[#E5E5E5] opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={item.url}
                  alt={item.alt || `${title} photo ${idx + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
