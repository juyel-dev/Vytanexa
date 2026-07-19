const STORAGE_KEY = 'vytanexa_recent_searches';
const MAX_STORED = 10;
const MAX_DISPLAYED = 5;

type RecentSearch = { query: string; timestamp: number };

/**
 * Recent Searches — VYTANEXA-BLUEPRINT.md § S05 "Recent Searches"
 * localStorage-backed, exact key/limits from the spec.
 */
export function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: RecentSearch[] = raw ? JSON.parse(raw) : [];
    return all.slice(0, MAX_DISPLAYED);
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: RecentSearch[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((r) => r.query !== query);
    filtered.unshift({ query, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_STORED)));
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded cases
    // -- recent search history is a convenience, not critical, so
    // failing silently here is the correct behavior.
  }
}

export function removeRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: RecentSearch[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter((r) => r.query !== query)));
  } catch {
    // See saveRecentSearch note above.
  }
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
