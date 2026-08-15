'use client';

import { useEffect, useState } from 'react';
import { getDeviceId } from '@/lib/device-id';
import { toBengaliDigits } from '@/lib/i18n';
import type { PollWithOptions } from '@/lib/queries/polls';

/**
 * Polls — VYTANEXA-BLUEPRINT.md § S15 `/community/polls`. Voted state
 * (which poll IDs this device has already voted in) is tracked in
 * localStorage separately from the vote itself — the DB's
 * `poll_votes.UNIQUE` constraint is the real enforcement, but reading
 * it back per-poll on every page load would mean N extra requests (no
 * `poll_votes` SELECT is even allowed publicly, `poll_votes_no_read`
 * RLS — DATABASE-SCHEMA.md § 4.4 — protects voter anonymity). Instead:
 * try to vote optimistically; if the server says "already voted"
 * (409), that also tells us to show results-only for that poll.
 */
export function PollsClient({ polls }: { polls: PollWithOptions[] }) {
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'poll_view' }),
    }).catch(() => {});
  }, []);

  if (polls.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-[15px] font-semibold text-neutral-700">এই মুহূর্তে কোনো জরিপ নেই।</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}

function PollCard({ poll }: { poll: PollWithOptions }) {
  const votedKey = `vytanexa_voted_poll_${poll.id}`;
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [options, setOptions] = useState(
    [...poll.poll_options].sort((a, b) => a.display_order - b.display_order)
  );
  const [totalVotes, setTotalVotes] = useState(poll.total_votes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false;
  const showResults = hasVoted || isExpired;

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(votedKey)) {
      setHasVoted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVote = async (optionId: string) => {
    if (showResults || submitting) return;
    setSelectedOption(optionId);
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, voterKey: getDeviceId() }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 409) {
        // Already voted from this device previously (e.g. localStorage
        // was cleared) — show results anyway rather than erroring.
        localStorage.setItem(votedKey, '1');
        setHasVoted(true);
        return;
      }
      setError(json.error ?? 'ভোট দিতে সমস্যা হয়েছে');
      setSelectedOption(null);
      return;
    }

    localStorage.setItem(votedKey, '1');
    setOptions((prev) =>
      prev.map((o) => {
        const updated = json.options.find((u: { id: string; vote_count: number }) => u.id === o.id);
        return updated ? { ...o, vote_count: updated.vote_count } : o;
      })
    );
    setTotalVotes(json.totalVotes);
    setHasVoted(true);

    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'poll_vote',
        entity_type: 'poll',
        entity_id: poll.id,
      }),
    }).catch(() => {});
  };

  const daysLeft = poll.expires_at
    ? Math.ceil((new Date(poll.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
      <p className="mb-3 text-[15px] font-semibold text-neutral-900">{poll.question}</p>

      <div className="space-y-2">
        {options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={showResults || submitting}
              className="relative block w-full overflow-hidden rounded-md border border-neutral-200 text-left disabled:cursor-default"
            >
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 bg-brand-50 transition-all duration-500 ease-spring"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2.5 text-[13px]">
                <span className="flex items-center gap-2 text-neutral-800">
                  {!showResults && (
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        selectedOption === opt.id ? 'border-brand-600' : 'border-neutral-300'
                      }`}
                    />
                  )}
                  {opt.option_text}
                </span>
                {showResults && (
                  <span className="font-semibold text-neutral-700">
                    {toBengaliDigits(pct)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-[12px] text-emergency-600">{error}</p>}

      <p className="mt-3 text-[12px] text-neutral-500">
        মোট ভোট: {toBengaliDigits(totalVotes)}
        {isExpired
          ? '  ·  জরিপ শেষ হয়েছে'
          : daysLeft !== null && daysLeft >= 0
            ? `  ·  ${toBengaliDigits(daysLeft)} দিন বাকি`
            : ''}
      </p>
    </div>
  );
}
