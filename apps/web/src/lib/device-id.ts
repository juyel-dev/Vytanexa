const STORAGE_KEY = 'vytanexa_device_id';

/**
 * Persistent per-browser device ID — VYTANEXA-BLUEPRINT.md § S14
 * ("one vote per device via localStorage id, or per-user if
 * signed-in") and § S15 ("one vote per device (localStorage poll_id
 * list) or per-account if signed in"). Shared between question
 * upvotes and poll votes since both use the identical `voter_key`
 * dedup mechanism (`question_upvotes.voter_key`, `poll_votes.voter_key`
 * — DATABASE-SCHEMA.md §§ 4.3–4.4).
 *
 * Not a security boundary (a person can clear localStorage or use a
 * different browser to vote again) — the spec is explicit that this
 * is intentional: "device-level dedup acceptable for engagement polls,
 * not a security-critical feature." Once real auth (S22) ships,
 * `user_id` becomes the stronger key for signed-in users; this stays
 * as the guest fallback.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
