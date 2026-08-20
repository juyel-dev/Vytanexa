import Link from 'next/link';
import { toBengaliDigits } from '@/lib/i18n';
import { getPollById } from '@/lib/queries/polls';
import { createClient } from '@/lib/supabase/server';
import type { PollBlock } from '@/lib/custom-page-blocks';

/**
 * `poll` embed block — VYTANEXA-BLUEPRINT.md § S19: "Embeds an
 * existing poll from S15, by poll_id."
 *
 * Renders a compact, read-only results summary rather than the full
 * interactive voting widget (`components/polls/PollsClient.tsx`'s
 * `PollCard`) — voting needs client-side state (localStorage voted
 * flag, optimistic updates, the device-ID vote call) that would mean
 * either duplicating that stateful logic here or making this whole
 * Server Component page ship a client island per embed. Since a
 * fully-featured version already exists at `/community/polls`, this
 * embed links there rather than reimplementing it — a reasonable
 * scope line for a page-builder embed block.
 */
export async function PollEmbedBlockView({ block }: { block: PollBlock }) {
  if (!block.poll_id) return null;
  const supabase = createClient();
  const poll = await getPollById(supabase, block.poll_id);
  if (!poll) return null;

  const options = [...poll.poll_options].sort((a, b) => a.display_order - b.display_order);

  return (
    <Link
      href="/community/polls"
      className="mx-4 my-3 block rounded-xl border border-neutral-200 bg-white p-4 shadow-card"
    >
      <p className="mb-2 text-[14px] font-semibold text-neutral-900">📊 {poll.question}</p>
      {options.slice(0, 3).map((opt) => {
        const pct =
          poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
        return (
          <div key={opt.id} className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-neutral-600">{opt.option_text}</span>
            <span className="font-semibold text-neutral-700">{toBengaliDigits(pct)}%</span>
          </div>
        );
      })}
      <p className="mt-2 text-[12px] font-semibold text-brand-600">জরিপে অংশ নিন →</p>
    </Link>
  );
}
