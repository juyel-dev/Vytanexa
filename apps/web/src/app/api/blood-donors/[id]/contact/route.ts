import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/get-client-ip';

/**
 * GET /api/blood-donors/[id]/contact — VYTANEXA-BLUEPRINT.md § S11:
 * "donor phone numbers are never shown in plaintext publicly ...
 * phone revealed via a tap which triggers a tel: intent directly (the
 * number never rendered as visible text, prevents scraping/spam
 * harvesting)."
 *
 * The client renders a plain `<a href="/api/blood-donors/{id}/contact">`
 * — a top-level navigation, not a fetch — so the 302 to a `tel:` URL
 * triggers the device's dialer the same way a normal `tel:` link
 * would, and the phone number never appears in any JSON response body
 * a script could read.
 *
 * Reads via `get_donor_phone()` (migration 0012, SECURITY DEFINER —
 * see that migration's comment for why a plain RLS-scoped query can't
 * do this from apps/web's anon-key-only client). Rate-limited per IP
 * per donor via `check_rate_limit()` to blunt scraping attempts that
 * try every donor id in sequence.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const ip = getClientIp(request);

  const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
    p_key: `donor_contact:${ip}:${params.id}`,
    p_max_count: 5,
    p_window: '1 hour',
  });

  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError.message);
  } else if (!allowed) {
    return NextResponse.json({ error: 'অনেকবার চেষ্টা করা হয়েছে, পরে আবার চেষ্টা করুন' }, {
      status: 429,
    });
  }

  const { data: phone, error } = await supabase.rpc('get_donor_phone', {
    p_donor_id: params.id,
  });

  if (error) {
    console.error('get_donor_phone RPC failed:', error.message);
    return NextResponse.json({ error: 'যোগাযোগের তথ্য পাওয়া যায়নি' }, { status: 500 });
  }
  if (!phone) {
    return NextResponse.json({ error: 'এই দাতা এখন যোগাযোগের জন্য উপলব্ধ নয়' }, { status: 404 });
  }

  return NextResponse.redirect(`tel:${phone}`);
}
