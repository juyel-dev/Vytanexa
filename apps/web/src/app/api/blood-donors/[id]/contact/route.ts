import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';
import { getT } from '@vytanexa/i18n/server';

const idSchema = z.string().uuid();
const donorPhoneSchema = z.string().regex(/^[6-9][0-9]{9}$/);
const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
};

/**
 * GET /api/blood-donors/[id]/contact
 *
 * Donor phone is a private contact detail. A signed-in caller must pass
 * both an IP/donor route limit and a separate atomic per-account limit
 * enforced inside get_donor_phone(). The database function only returns
 * verified, not-deleted, explicitly contact-consented donors.
 *
 * Mobile uses a tel: redirect. Desktop uses ?format=json so it can render
 * a copyable number; both responses are private and never cacheable.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = await getT('validation');

  if (!idSchema.safeParse(params.id).success) {
    return NextResponse.json(
      { error: t('bloodDonors.donorUnavailable') },
      { status: 404, headers: privateHeaders }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: t('bloodDonors.mustSignIn') },
      { status: 401, headers: privateHeaders }
    );
  }

  const ip = getClientIp(request);
  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `donor_contact:${ip}:${params.id}`,
    p_max_count: 5,
    p_window: '1 hour',
  });

  // Fail closed. A rate-limiter outage must never silently disable a
  // privacy control protecting donor phone numbers.
  if (rateLimitError) {
    console.error('donor contact rate-limit check failed:', rateLimitError.message);
    return NextResponse.json(
      { error: t('bloodDonors.contactRetryLater') },
      { status: 503, headers: privateHeaders }
    );
  }

  if (!allowed) {
    return NextResponse.json(
      { error: t('generic.rateLimited') },
      { status: 429, headers: privateHeaders }
    );
  }

  const { data: phone, error } = await supabase.rpc('get_donor_phone', {
    p_donor_id: params.id,
  });

  if (error?.code === 'P4290') {
    return NextResponse.json(
      { error: t('generic.rateLimited') },
      { status: 429, headers: privateHeaders }
    );
  }

  if (error?.code === '42501') {
    return NextResponse.json(
      { error: t('bloodDonors.mustSignIn') },
      { status: 401, headers: privateHeaders }
    );
  }

  if (error) {
    console.error('get_donor_phone RPC failed:', error.message);
    return NextResponse.json(
      { error: t('bloodDonors.contactRetryLater') },
      { status: 503, headers: privateHeaders }
    );
  }

  if (!phone || !donorPhoneSchema.safeParse(phone).success) {
    return NextResponse.json(
      { error: t('bloodDonors.donorUnavailable') },
      { status: 404, headers: privateHeaders }
    );
  }

  if (request.nextUrl.searchParams.get('format') === 'json') {
    return NextResponse.json({ phone }, { headers: privateHeaders });
  }

  return NextResponse.redirect(`tel:${phone}`, { headers: privateHeaders });
}
