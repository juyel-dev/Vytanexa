import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/questions/[id]/upvote — VYTANEXA-BLUEPRINT.md § S14
 * "upvote count (⬆, tap to vote — one vote per device via localStorage
 * id)". `voter_key` is the client's persisted device ID
 * (`lib/device-id.ts`); `question_upvotes`'s `UNIQUE(question_id,
 * voter_key)` constraint (DATABASE-SCHEMA.md § 4.3) is the actual
 * dedup enforcement — this route just surfaces a clean toggle API over
 * it rather than leaking a raw unique-constraint-violation error to
 * the client. Un-voting (tap again) deletes the row; the
 * `recalc_question_counts()` trigger keeps `questions.upvote_count`
 * in sync either way, so this route never writes that counter itself.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { voterKey } = await request.json();
  if (!voterKey) {
    return NextResponse.json({ error: 'voterKey প্রয়োজন' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('question_upvotes')
    .select('id')
    .eq('question_id', params.id)
    .eq('voter_key', voterKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('question_upvotes').delete().eq('id', existing.id);
    if (error) {
      console.error('upvote delete failed:', error.message);
      return NextResponse.json({ error: 'সমস্যা হয়েছে' }, { status: 500 });
    }
    return NextResponse.json({ upvoted: false });
  }

  const { error } = await supabase
    .from('question_upvotes')
    .insert({ question_id: params.id, voter_key: voterKey });
  if (error) {
    console.error('upvote insert failed:', error.message);
    return NextResponse.json({ error: 'সমস্যা হয়েছে' }, { status: 500 });
  }
  return NextResponse.json({ upvoted: true });
}
