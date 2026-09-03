import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Location subtree expansion — hierarchy-aware filtering WITHOUT any
 * database change (no RPC, no migration, per product decision).
 *
 * Problem it solves: entities (hospitals, chambers, ambulances) are
 * tagged at their LOWEST location level (sub_district/ward), but users
 * pick a district (or state) in the Location Picker. An exact
 * `location_id = <district>` match then finds ~nothing inside that
 * district. Expanding the picked id to itself + all descendants makes
 * "Cooch Behar" mean "Cooch Behar and everything inside it".
 *
 * Implementation: iterative breadth-first walk over `parent_id`
 * (indexed — `idx_locations_parent`) — typically 2 small round-trips
 * (district → sub_districts → wards), depth-capped at 4 (the enum has
 * exactly 4 levels, so this always terminates). Deleted rows excluded;
 * inactive ones INCLUDED — expansion is geography, not visibility, and
 * excluding them could only hide results, never add wrong ones.
 *
 * Failure mode: on any query error returns `[rootId]` — identical to
 * the old exact-match behavior, so filtering degrades to status-quo
 * instead of empty.
 */
export async function getLocationSubtreeIds(
  supabase: SupabaseClient<Database>,
  rootId: string
): Promise<string[]> {
  const seen = new Set<string>([rootId]);
  let frontier = [rootId];

  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const { data, error } = await supabase
      .from('locations')
      .select('id')
      .in('parent_id', frontier)
      .is('deleted_at', null);

    if (error || !data) break;

    frontier = data.map((r) => r.id).filter((id) => !seen.has(id));
    for (const id of frontier) seen.add(id);
  }

  return [...seen];
}
