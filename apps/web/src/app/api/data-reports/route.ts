import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { dataReportSchema } from '@/lib/validations/data-reports';
import { getT } from '@vytanexa/i18n/server';

type SubmitDataReportRpc = {
  rpc: (
    name: 'submit_data_report',
    args: {
      p_entity_type: 'doctor' | 'hospital' | 'article' | 'question' | 'poll';
      p_entity_id: string;
      p_reason: string;
      p_detail: string | null;
    }
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

/** POST /api/data-reports — submit a correction for admin moderation. */
export async function POST(request: NextRequest) {
  const t = await getT('validation');
  const body = await request.json().catch(() => null);
  const parsed = dataReportSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const ip = getClientIp(request);
  const ipHash = createHash('sha256').update(ip).digest('hex');
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `data_report_ip:${ipHash}`,
    p_max_count: 10,
    p_window: '24 hours',
  });

  if (rateLimitError || allowed == null) {
    console.error('data report IP rate limit failed:', rateLimitError?.message);
    return NextResponse.json({ error: t('dataReports.submitFailed') }, { status: 503 });
  }
  if (!allowed) {
    return NextResponse.json({ error: t('dataReports.dailyLimitReached') }, { status: 429 });
  }

  const reportClient = supabase as unknown as SubmitDataReportRpc;
  const { data, error } = await reportClient.rpc('submit_data_report', {
    p_entity_type: parsed.data.entity_type,
    p_entity_id: parsed.data.entity_id,
    p_reason: parsed.data.reason,
    p_detail: parsed.data.detail?.trim() || null,
  });

  if (error) {
    console.error('data report RPC failed:', error.code, error.message);
    return NextResponse.json({ error: t('dataReports.submitFailed') }, { status: 503 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('data report RPC returned an invalid response');
    return NextResponse.json({ error: t('dataReports.submitFailed') }, { status: 503 });
  }

  const result = data as { success?: unknown; error?: unknown };
  if (result.success === true) return NextResponse.json({ success: true });

  if (result.error === 'invalid_target' || result.error === 'invalid_reason' || result.error === 'invalid_detail') {
    return NextResponse.json({ error: t('generic.validationFailed') }, { status: 400 });
  }
  if (result.error === 'rate_limited') {
    return NextResponse.json({ error: t('dataReports.dailyLimitReached') }, { status: 429 });
  }

  console.error('data report submission rejected:', result.error);
  return NextResponse.json({ error: t('dataReports.submitFailed') }, { status: 503 });
}
