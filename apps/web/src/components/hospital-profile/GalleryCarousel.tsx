'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Image Gallery — VYTANEXA-BLUEPRINT.md § S08 "Image Gallery":
 * "Swipeable, 16:9, dot pagination, tap → full-screen lightbox w/
 * pinch-zoom, source: hospitals.gallery_images[]. Single image → no
 * swipe/dots, static."
 *
 * Native scroll-snap for swipe (no carousel library — one extra
 * dependency this project doesn't otherwise need). Lightbox pinch-zoom
 * uses the browser's native pinch-to-zoom on the fullscreen `<img>`
 * (no custom zoom/pan implementation) — meets the spec's intent
 * without hand-rolled gesture code that would be its own maintenance
 * burden.
 */
export function GalleryCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return <div className="h-[220px] w-full bg-neutral-100" />;
  }

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  };

  return (
    <>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-[220px] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- gallery thumbnails, variable aspect content
            <img
              key={src + i}
              src={src}
              alt={`${alt} — ছবি ${i + 1}`}
              onClick={() => {
                setActiveIndex(i);
                setLightboxOpen(true);
              }}
              className="h-[220px] w-full shrink-0 snap-start object-cover"
            />
          ))}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/95"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- fullscreen lightbox view, relies on native pinch-zoom */}
          <img
            src={images[activeIndex]}
            alt={`${alt} — ছবি ${activeIndex + 1}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </>
  );
}
