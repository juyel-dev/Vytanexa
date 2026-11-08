import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/push/subscribe — register (or refresh) this device for Web Push.
 * Open to anonymous devices on purpose: emergency alerts must reach people
 * who never signed in. The RPC links the row to auth.uid() when present.
 */
const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2048).startsWith('https://'),
    keys: z.object({
      p256dh: z.string().min(20).max(256),
      auth: z.string().min(8).max(128),
    }),
  }),
  locale: z.enum(['bn', 'en', 'hi']).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });

  const { subscription, locale } = parsed.data;
  const supabase = createClient();
  const { data, error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.keys.p256dh,
    p_auth: subscription.keys.auth,
    p_locale: locale,
    p_user_agent: request.headers.get('user-agent') ?? undefined,
  });

  if (error) {
    console.error('register_push_subscription failed:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (data === 'rate_limited') return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  if (data !== 'ok') return NextResponse.json({ error: data }, { status: 400 });
  return NextResponse.json({ success: true });
}
