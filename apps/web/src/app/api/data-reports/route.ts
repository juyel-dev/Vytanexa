import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_REASONS = ['wrong_phone', 'wrong_address', 'wrong_hours', 'closed', 'other'];
const VALID_ENTITY_TYPES = ['doctor', 'hospital', 'article', 'question', 'poll'];

/**
 * POST /api/data-reports — VYTANEXA-BLUEPRINT.md § S15 "Reports
 * (User-Flagged Data Corrections)". Writes to `data_reports` with
 * `status='open'` — "surfaces in Admin Panel as a moderation queue,
 * NOT auto-applied (prevents vandalism; admin verifies then edits
 * source record)." No login required, matches
 * `data_reports_public_insert` RLS. Light rate limiting (not
 * moderation-queue-item-per-se, just anti-spam) since this has no
 * approval gate before landing in the admin queue — an unrated flood
 * would still need real admin attention to dismiss.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { entity_type, entity_id, reason, detail } = body;

  if (!VALID_ENTITY_TYPES.includes(entity_type) || !entity_id) {
    return NextResponse.json({ error: 'তথ্য অসম্পূর্ণ' }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'কারণ নির্বাচন করুন' }, { status: 400 });
  }

  const supabase = createClient();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `data_report:${ip}`,
    p_max_count: 10,
    p_window: '24 hours',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json(
      { error: 'আজকের জন্য রিপোর্ট করার সীমা শেষ হয়েছে।' },
      { status: 429 }
    );
  }

  const { error } = await supabase.from('data_reports').insert({
    entity_type,
    entity_id,
    reason,
    detail: detail?.trim() || null,
    status: 'open',
  });

  if (error) {
    console.error('data_reports insert failed:', error.message);
    return NextResponse.json({ error: 'রিপোর্ট জমা দিতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
