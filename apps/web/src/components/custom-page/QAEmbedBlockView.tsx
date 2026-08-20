import Link from 'next/link';
import { getQuestionById, getAnswers } from '@/lib/queries/qa-detail';
import { createClient } from '@/lib/supabase/server';
import type { QAEmbedBlock } from '@/lib/custom-page-blocks';

/**
 * `qa_embed` block — VYTANEXA-BLUEPRINT.md § S19: "Embeds a specific
 * Q&A thread, by question_id." Shows the question + a preview of the
 * top answer (doctor-authored if one exists, else the first community
 * answer), links through to the full interactive thread — same "embed
 * links to the real page" pattern as `PollEmbedBlockView` above, for
 * the same reason (voting/answering needs client state this
 * server-rendered embed doesn't carry).
 */
export async function QAEmbedBlockView({ block }: { block: QAEmbedBlock }) {
  if (!block.question_id) return null;
  const supabase = createClient();
  const question = await getQuestionById(supabase, block.question_id);
  if (!question) return null;

  const { doctorAnswers, communityAnswers } = await getAnswers(supabase, question.id);
  const topAnswer = doctorAnswers[0] ?? communityAnswers[0];

  return (
    <Link
      href={`/community/qa/${question.id}`}
      className="mx-4 my-3 block rounded-xl border border-neutral-200 bg-white p-4 shadow-card"
    >
      <p className="text-[14px] font-semibold text-neutral-900">🙋 {question.title}</p>
      {topAnswer && (
        <p className="mt-2 line-clamp-2 text-[13px] text-neutral-600">
          {doctorAnswers[0] ? '✅ ' : ''}
          {topAnswer.body}
        </p>
      )}
      <p className="mt-2 text-[12px] font-semibold text-brand-600">
        {question.answer_count} টি উত্তর দেখুন →
      </p>
    </Link>
  );
}
