import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import type { Json } from '@vytanexa/database';
import { pageSubmissionSchema } from '@/lib/validations/page-submissions';

/**
 * POST /api/page-submissions — VYTANEXA-BLUEPRINT.md § S19
 * `report_form` block: "submissions land in a generic
 * page_submissions table." Write-only from the app's perspective —
 * `page_submissions_public_insert` RLS allows INSERT but there's no
 * public SELECT policy at all ("admin reads via service role" per
 * DATABASE-SCHEMA.md § 1.7), so this route only ever inserts, never
 * reads back.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = pageSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { page_id, block_index, submission_data, submitter_phone } = parsed.data;

  const supabase = createClient();
  const ip = getClientIp(request);

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `page_submission:${ip}:${page_id}`,
    p_max_count: 5,
    p_window: '1 hour',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json({ error: 'অনেকবার চেষ্টা করা হয়েছে, পরে আবার চেষ্টা করুন' }, {
      status: 429,
    });
  }

  const { error } = await supabase.from('page_submissions').insert({
    page_id,
    block_index,
    submission_data: submission_data as unknown as Json,
    submitter_phone: submitter_phone?.trim() || null,
  });

  if (error) {
    console.error('page_submissions insert failed:', error.message);
    return NextResponse.json({ error: 'জমা দিতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
