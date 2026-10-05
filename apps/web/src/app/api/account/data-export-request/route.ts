import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@vytanexa/i18n/server';

/**
 * POST /api/account/data-export-request — VYTANEXA-BLUEPRINT.md § S18
 * "আমার ডেটা ডাউনলোড করুন": "GDPR/data-portability-style export
 * request (queues a job, emails/WhatsApps a data export link;
 * lightweight compliance feature, low priority but included for
 * completeness)."
 *
 * Honest scope note: there's no job queue or email/WhatsApp delivery
 * system in this codebase (that's real infrastructure work, not a
 * page-scoped feature). This logs the request as an `analytics_events`
 * row (`event_type: 'data_export_request'`) rather than a dedicated
 * table — cheap, queryable by an admin who wants to see pending
 * requests, and avoids adding a single-purpose table for what the
 * spec itself calls "low priority." When real fulfillment (an actual
 * export job + delivery) becomes a priority, that's new infrastructure
 * work, not a fix to this route.
 */
export async function POST() {
  const tCommon = await getT('common');
  const t = await getT('validation');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: tCommon('signIn') }, { status: 401 });
  }

  // Every tap used to insert another request row — an admin queue could be
  // flooded by one user. One request per 24h; repeats are acknowledged
  // (not an error) since the earlier request is still pending.
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `data_export:${user.id}`,
    p_max_count: 1,
    p_window: '24 hours',
  });
  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json({ success: true, alreadyRequested: true });
  }

  const { error } = await supabase.from('analytics_events').insert({
    event_type: 'data_export_request',
    user_id: user.id,
    metadata: { requested_at: new Date().toISOString() },
  });

  if (error) {
    console.error('data export request logging failed:', error.message);
    return NextResponse.json({ error: t('account.exportRequestFailed') }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
