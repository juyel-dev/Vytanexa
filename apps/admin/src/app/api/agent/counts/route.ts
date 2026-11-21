import 'server-only';
import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/agent-auth';

/**
 * GET /api/agent/counts — pending moderation backlog sizes.
 * Scope: read.
 */
export async function GET(request: Request) {
  const auth = await requireAgent(request, 'read');
  if ('error' in auth) return auth.error;
  const { db } = auth.agent;

  const [reviews, questions, reports] = await Promise.all([
    db
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('deleted_at', null),
    db
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('deleted_at', null),
    db.from('data_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  if (reviews.error || questions.error || reports.error) {
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({
    pending: {
      reviews: reviews.count ?? 0,
      questions: questions.count ?? 0,
      reports: reports.count ?? 0,
    },
  });
}
