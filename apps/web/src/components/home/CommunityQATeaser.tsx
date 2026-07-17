import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

/**
 * Community Q&A Teaser — VYTANEXA-BLUEPRINT.md § S04 SEC-11
 * Feature-flag gated via `app_settings.features.community_qa`
 * (DATABASE-SCHEMA.md § 1.5) — defaults OFF, so this section stays
 * hidden until an admin explicitly enables it (A08's Feature Flags
 * screen), matching the flag's own default.
 */
export async function CommunityQATeaser() {
  const supabase = createClient();

  const { data: settings } = await supabase
    .from('app_settings')
    .select('features')
    .eq('id', 1)
    .single();

  const features = settings?.features as { community_qa?: boolean } | null;
  if (!features?.community_qa) {
    return null;
  }

  const { data: question, error } = await supabase
    .from('questions')
    .select('id, title, is_anonymous, author_name, upvote_count, answer_count')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('CommunityQATeaser query failed:', error.message);
  }

  return (
    <section className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bengali-display text-[17px] font-bold text-neutral-900">
          🙋 সম্প্রদায়ের প্রশ্নোত্তর
        </h2>
        <Link href="/community/qa" className="text-[13px] text-brand-600">
          সব দেখুন →
        </Link>
      </div>

      {question && (
        <Link
          href={`/community/qa/${question.id}`}
          className="mb-3 block rounded-lg border border-neutral-200 bg-white p-3"
        >
          <p className="text-[14px] font-semibold text-neutral-900">
            {question.title}
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">
            ⬆ {question.upvote_count} জন একমত · 💬 {question.answer_count} উত্তর
          </p>
        </Link>
      )}

      <Link
        href="/community/qa"
        className="block rounded-md border border-life-600 py-2.5 text-center text-[13px] font-semibold text-life-600"
      >
        + আপনার প্রশ্ন করুন
      </Link>
    </section>
  );
}
