'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/stores/favorites-store';

/**
 * Favorite Toggle — VYTANEXA-BLUEPRINT.md § S17: "Heart-icon toggle
 * available globally on Doctor/Hospital cards everywhere in the app
 * ... guest users tapping heart → inline prompt 'সাইন ইন করে সেভ
 * করুন' (soft-gate, not a hard redirect, preserves their place in the
 * flow)." The prompt is a small popover anchored to the button itself
 * (auto-dismisses after a few seconds) rather than a modal or
 * navigation — the person stays exactly where they were.
 */
export function FavoriteToggle({
  entityType,
  entityId,
  className,
}: {
  entityType: 'doctor' | 'hospital';
  entityId: string;
  className?: string;
}) {
  const { fetchFavorites, isFavorited, toggle } = useFavoritesStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const favorited = isFavorited(entityType, entityId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    const result = await toggle(entityType, entityId);
    setPending(false);

    if ('requiresSignIn' in result) {
      setShowPrompt(true);
      setTimeout(() => setShowPrompt(false), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        aria-label={favorited ? 'পছন্দের তালিকা থেকে সরান' : 'পছন্দের তালিকায় যোগ করুন'}
        className={
          className ??
          'flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm'
        }
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            favorited ? 'fill-emergency-600 text-emergency-600' : 'text-neutral-400'
          }`}
        />
      </button>
      {showPrompt && (
        <div className="absolute right-0 top-9 z-dropdown w-max max-w-[200px] rounded-md bg-neutral-900 px-3 py-2 text-[12px] text-white shadow-lg">
          সাইন ইন করে সেভ করুন
        </div>
      )}
    </div>
  );
}
