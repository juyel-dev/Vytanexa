import { create } from 'zustand';

type FavoriteKey = `${string}:${string}`; // `${entityType}:${entityId}`

type FavoritesState = {
  favorites: Set<FavoriteKey>;
  loaded: boolean;
  fetchFavorites: () => Promise<void>;
  isFavorited: (entityType: string, entityId: string) => boolean;
  toggle: (
    entityType: string,
    entityId: string
  ) => Promise<{ favorited: boolean } | { requiresSignIn: true }>;
};

/**
 * Favorites Store — VYTANEXA-BLUEPRINT.md § S17: "Heart-icon toggle
 * available globally on Doctor/Hospital cards everywhere in the app."
 * Zustand, not persisted (unlike `location-store.ts` — this should
 * always reflect the server's actual `user_favorites` rows, not a
 * stale local cache across sign-in/out). Not fetched automatically on
 * store creation — `DoctorCard`/`HospitalCard` call `fetchFavorites()`
 * lazily on first mount (see the `useFavoriteToggle` hook below), so a
 * page that never renders a card never pays for the request.
 */
export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: new Set(),
  loaded: false,

  fetchFavorites: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch('/api/favorites');
      const json = await res.json();
      const keys = (json.favorites ?? []).map(
        (f: { entity_type: string; entity_id: string }): FavoriteKey =>
          `${f.entity_type}:${f.entity_id}`
      );
      set({ favorites: new Set(keys), loaded: true });
    } catch {
      set({ loaded: true }); // don't retry-loop on failure
    }
  },

  isFavorited: (entityType, entityId) => get().favorites.has(`${entityType}:${entityId}`),

  toggle: async (entityType, entityId) => {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId }),
    });
    const json = await res.json();

    if (res.status === 401) {
      return { requiresSignIn: true };
    }

    const key: FavoriteKey = `${entityType}:${entityId}`;
    set((state) => {
      const next = new Set(state.favorites);
      json.favorited ? next.add(key) : next.delete(key);
      return { favorites: next };
    });
    return { favorited: json.favorited };
  },
}));
