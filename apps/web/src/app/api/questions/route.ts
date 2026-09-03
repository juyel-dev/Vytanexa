import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { queryQuestionList, type QAListParams } from '@/lib/queries/qa-list';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { questionSchema } from '@/lib/validations/questions';

/** GET /api/questions — infinite scroll continuation, mirrors /api/hospitals (S08). */
export async function GET(request: NextRequest) {
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    return NextResponse.json({ questions: [], count: 0, hasMore: false }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const params: QAListParams = {
    filter: (sp.get('filter') as QAListParams['filter']) ?? 'all',
    sort: (sp.get('sort') as QAListParams['sort']) ?? 'newest',
    page: sp.get('page') ? Number(sp.get('page')) : 0,
  };

  const { data, error, count, pageSize } = await queryQuestionList(supabase, params);

  if (error) {
    console.error('questions list query failed:', error.message);
    return NextResponse.json({ questions: [], count: 0, hasMore: false }, { status: 500 });
  }

  const hasMore = ((params.page ?? 0) + 1) * pageSize < count;
  return NextResponse.json({ questions: data, count, hasMore });
}

/**
 * POST /api/questions — VYTANEXA-BLUEPRINT.md § S14 "Ask a Question".
 * Moderated (`status='pending'`), same pattern as reviews (S07) and
 * donor registration (S11). Anonymous option (`is_anonymous=true`)
 * stores the record as usual but the detail/list views display
 * "একজন ব্যবহারকারী" instead of the name — handled at render time,
 * not by omitting `author_name` here (an admin moderating the queue
 * still needs to see who actually submitted it).
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();

  if (!(await isFeatureEnabled(supabase, 'community_qa'))) {
    return NextResponse.json({ error: 'এই ফিচারটি এখন উপলব্ধ নয়' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }
  const { title, body: questionBody, category_id, is_anonymous, author_name, author_phone } =
    parsed.data;

  const ip = getClientIp(request);
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `question_submit:${ip}`,
    p_max_count: 5,
    p_window: '24 hours',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json(
      { error: 'আজকের জন্য প্রশ্ন করার সীমা শেষ হয়েছে। কাল আবার চেষ্টা করুন।' },
      { status: 429 }
    );
  }

  // S17 "আমার প্রশ্ন ও উত্তর": associate with the signed-in submitter
  // when present, so questions_own_read (migration 0014) can surface
  // this back to them even before it's approved. Doesn't gate
  // submission on being signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Keep the real author_name even when anonymous — list/detail views
  // render "একজন ব্যবহারকারী" when is_anonymous (see
  // QuestionDetailClient), but moderation needs to know who submitted it.
  const { error } = await supabase.from('questions').insert({
    title: title.trim(),
    body: questionBody?.trim() || null,
    category_id,
    is_anonymous: !!is_anonymous,
    author_name: author_name?.trim() || null,
    author_phone: author_phone?.trim() || null,
    status: 'pending',
    user_id: user?.id ?? null,
  });

  if (error) {
    console.error('question insert failed:', error.message);
    return NextResponse.json({ error: 'প্রশ্ন জমা দিতে সমস্যা হয়েছে' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
