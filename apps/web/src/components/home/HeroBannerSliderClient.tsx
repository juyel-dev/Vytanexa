'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

type Ad = {
  id: string;
  image_url: string;
  target_url: string;
  sponsor_name: string;
};

/**
 * Hero Banner Slider (interactive part) — VYTANEXA-BLUEPRINT.md § S04
 * SEC-02. CSS scroll-snap gives native swipe for free; auto-advance
 * runs on a 4500ms interval per spec, pauses while the user is
 * actively touching/scrolling (avoids fighting the user's gesture).
 */
export function HeroBannerSliderClient({ ads }: { ads: Ad[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteracting = useRef(false);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      if (isInteracting.current) return;
      const next = (activeIndex + 1) % ads.length;
      scrollRef.current?.children[next]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
      });
      setActiveIndex(next);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeIndex, ads.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  };

  const handleAdClick = (adId: string) => {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'ad_click', entity_type: 'ads', entity_id: adId }),
    }).catch(() => {
      // Analytics failures should never block the user's navigation —
      // fire-and-forget by design.
    });
  };

  return (
    <div className="relative mx-4 mt-3 overflow-hidden rounded-xl shadow-card">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={() => (isInteracting.current = true)}
        onTouchEnd={() => (isInteracting.current = false)}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
      >
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={ad.target_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => handleAdClick(ad.id)}
            className="relative aspect-[2/1] w-full shrink-0 snap-start"
          >
            <Image
              src={ad.image_url}
              alt={ad.sponsor_name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </a>
        ))}
      </div>

      {ads.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {ads.map((ad, i) => (
            <span
              key={ad.id}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-5 bg-brand-600' : 'w-1.5 bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
