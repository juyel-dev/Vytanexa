/**
 * TODO.md — location selects across admin (ChamberEditor at minimum,
 * possibly others) rendered `locations.map(l => <option>)` with zero
 * regard for the state → district → sub_district → ward hierarchy
 * (parent_id/type weren't even being fetched) — every location
 * appeared in one flat, unordered list, exactly the complaint:
 * "West Bengal, Cooch Behar, Dinhata, Tufanganj... kono systematic
 * vabe chose kora nei."
 *
 * A native HTML <select> can't nest <optgroup>s, so a 4-level tree
 * can't become a 4-level visual group. Instead: sort into tree
 * (pre-order) order and indent by depth — state/district render as
 * disabled header rows, sub_district/ward (the levels a chamber
 * address is actually specific enough to need) are the selectable
 * leaves. Gives the same "hierarchy maintained" result a real person
 * would build, without fighting <select>'s HTML limitations.
 */
export type LocationNode = {
  id: string;
  parent_id: string | null;
  type: 'state' | 'district' | 'sub_district' | 'ward';
  name_translations: { bn?: string; en?: string } | null;
  slug: string;
};

export type SortedLocationOption = {
  id: string;
  label: string;
  depth: number;
  selectable: boolean;
};

const locName = (l: LocationNode) => {
  const t = l.name_translations;
  return (t?.bn || t?.en || l.slug) as string;
};

export function sortLocationsHierarchically(locations: LocationNode[]): SortedLocationOption[] {
  const byParent = new Map<string | null, LocationNode[]>();
  for (const l of locations) {
    const key = l.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(l);
  }
  for (const arr of byParent.values()) arr.sort((a, b) => locName(a).localeCompare(locName(b), 'bn'));

  const out: SortedLocationOption[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const node of byParent.get(parentId) ?? []) {
      out.push({
        id: node.id,
        label: node.name_translations ? locName(node) : node.slug,
        depth,
        selectable: node.type === 'sub_district' || node.type === 'ward',
      });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
