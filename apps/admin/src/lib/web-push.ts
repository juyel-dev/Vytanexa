import 'server-only';
import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Web Push delivery for admin notifications (PWA).
 *
 * Env (set in the ADMIN Vercel project):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY (or VAPID_PUBLIC_KEY) — same value as the user app
 *   VAPID_PRIVATE_KEY                                  — secret, admin only
 *   VAPID_SUBJECT                                      — e.g. mailto:you@example.com
 *
 * Delivery is best-effort and bounded: the admin request must finish inside
 * the serverless time limit, so sending stops at TIME_BUDGET_MS and reports
 * how many devices were left (`skipped`). Dead endpoints (404/410) are
 * deleted so the list self-cleans.
 */

export type PushResult =
  | { configured: false }
  | { configured: true; sent: number; failed: number; removed: number; skipped: number };

type NotificationForPush = {
  id: string;
  type: string;
  title: string;
  body: string;
  target_url: string | null;
  target_user_id: string | null;
};

const PAGE = 500;
const CONCURRENCY = 25;
const TIME_BUDGET_MS = 45_000;

let configured: boolean | null = null;
function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:noreply@vytanexa.app', pub, priv);
  return (configured = true);
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export async function sendPushForNotification(
  supabase: SupabaseClient<Database>,
  n: NotificationForPush
): Promise<PushResult> {
  if (!configure()) return { configured: false };

  const emergency = n.type === 'emergency';
  const payload = JSON.stringify({
    title: clip(n.title, 80),
    body: clip(n.body, 240),
    url: n.target_url || '/notifications',
    type: n.type,
    tag: `n-${n.id}`,
  });
  // Emergency alerts: high urgency, valid 24h. Everything else: normal, 12h.
  const options = { TTL: emergency ? 24 * 3600 : 12 * 3600, urgency: emergency ? ('high' as const) : ('normal' as const) };

  const deadline = Date.now() + TIME_BUDGET_MS;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const gone: string[] = [];
  let after = '00000000-0000-0000-0000-000000000000';

  for (;;) {
    let q = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .gt('id', after)
      .order('id')
      .limit(PAGE);
    if (n.type === 'personal') {
      if (!n.target_user_id) break;
      q = q.eq('user_id', n.target_user_id);
    }
    const { data, error } = await q;
    if (error) throw new Error(`push_subscriptions read failed: ${error.message}`);
    if (!data || data.length === 0) break;
    after = data[data.length - 1]!.id;

    // Bounded-concurrency worker pool over this page.
    let i = 0;
    const worker = async () => {
      while (i < data.length) {
        const sub = data[i++]!;
        if (Date.now() > deadline) {
          skipped++;
          continue;
        }
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            options
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(sub.id);
          else failed++;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, data.length) }, worker));

    if (data.length < PAGE) break;
  }

  if (gone.length > 0) {
    for (let k = 0; k < gone.length; k += 200) {
      await supabase.from('push_subscriptions').delete().in('id', gone.slice(k, k + 200));
    }
  }
  return { configured: true, sent, failed, removed: gone.length, skipped };
}
