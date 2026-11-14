import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { leadSchema } from '@/lib/validations/leads';
import { getT } from '@vytanexa/i18n/server';

type SubmitLeadRpc = {
  rpc: (
    name: 'submit_patient_lead',
    args: {
      p_doctor_id: string;
      p_chamber_id: string | null;
      p_patient_name: string;
      p_patient_phone: string;
      p_preferred_time: string | null;
      p_message: string | null;
    }
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * POST /api/leads — appointment lead capture.
 *
 * The Route Handler provides localized validation and a per-IP abuse limit.
 * The database RPC repeats every security-critical data check, enforces the
 * per-phone/per-doctor daily limit atomically, derives user_id from auth.uid(),
 * and is the only public write path for patient leads.
 */
export async function POST(request: NextRequest) {
  const t = await getT('validation');
  const body = await request.json().catch(() => null);
  const parsed = leadSchema(t).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t('generic.validationFailed') },
      { status: 400 }
    );
  }

  const {
    doctor_id,
    chamber_id,
    patient_name,
    patient_phone,
    preferred_time,
    message,
  } = parsed.data;

  const supabase = createClient();
  const ip = getClientIp(request);

  // This is the browser-facing request, so the original client IP is
  // available here. Never infer the client IP from the later Supabase RPC's
  // server-to-server request headers.
  if (ip !== 'unknown') {
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_key: `patient_lead_ip:${createHash('sha256').update(ip).digest('hex')}`,
      p_max_count: 20,
      p_window: '1 hour',
    });

    if (rateLimitError || allowed == null) {
      console.error('patient lead IP rate limit failed:', rateLimitError?.message);
      return NextResponse.json({ error: t('leads.sendFailed') }, { status: 503 });
    }

    if (!allowed) {
      return NextResponse.json({ error: t('leads.alreadySent') }, { status: 429 });
    }
  }

  // The database types are generated from the hosted schema. This migration
  // is source-only until the hosted backup/restore gate is cleared.
  const leadClient = supabase as unknown as SubmitLeadRpc;
  const { data, error } = await leadClient.rpc('submit_patient_lead', {
    p_doctor_id: doctor_id,
    p_chamber_id: chamber_id ?? null,
    p_patient_name: patient_name,
    p_patient_phone: patient_phone,
    p_preferred_time: preferred_time ?? null,
    p_message: message ?? null,
  });

  if (error) {
    console.error('patient lead submission RPC failed:', error.code, error.message);
    return NextResponse.json({ error: t('leads.sendFailed') }, { status: 503 });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('patient lead submission RPC returned an invalid response');
    return NextResponse.json({ error: t('leads.sendFailed') }, { status: 503 });
  }

  const result = data as { success?: unknown; error?: unknown };

  if (result.success === true) {
    return NextResponse.json({ success: true });
  }

  if (result.error === 'rate_limited') {
    return NextResponse.json({ error: t('leads.alreadySent') }, { status: 429 });
  }

  if (result.error === 'doctor_unavailable') {
    return NextResponse.json({ error: t('leads.invalidDoctorId') }, { status: 404 });
  }

  if (
    result.error === 'invalid_doctor' ||
    result.error === 'invalid_name' ||
    result.error === 'invalid_phone' ||
    result.error === 'invalid_preferred_time' ||
    result.error === 'invalid_message' ||
    result.error === 'invalid_chamber'
  ) {
    return NextResponse.json({ error: t('generic.validationFailed') }, { status: 400 });
  }

  console.error('patient lead submission rejected:', result.error);
  return NextResponse.json({ error: t('leads.sendFailed') }, { status: 503 });
}
