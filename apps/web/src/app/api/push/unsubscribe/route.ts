import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/** POST /api/push/unsubscribe — forget this device (user turned alerts off). */
const schema = z.object({ endpoint: z.string().url().max(2048) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_endpoint' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.rpc('unregister_push_subscription', { p_endpoint: parsed.data.endpoint });
  if (error) {
    console.error('unregister_push_subscription failed:', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
