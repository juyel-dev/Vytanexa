import { createClient } from '@/lib/supabase/server';
import { getT } from '@vytanexa/i18n/server';
import { NativeAdClient } from './NativeAdClient';

/**
 * Native Ad — VYTANEXA-BLUEPRINT.md § S04 SEC-07
 * One ad shown, randomly rotated among active `native_feed` ads (a
 * single extra ORDER BY random() keeps this honest without needing a
 * dedicated rotation table). Impression+click tracking lives in the
 * client wrapper (NativeAdClient) — needs useEffect/onClick, which a
 * Server Component can't carry.
 */
export async function NativeAd() {
  const supabase = createClient();
  const t = await getT('home.nativeAd');
  const today = new Date().toISOString().slice(0, 10);

  const { data: ads, error } = await supabase
    .from('ads')
    .select('id, image_url, target_url, sponsor_name')
    .eq('placement', 'native_feed')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .limit(10);

  if (error || !ads || ads.length === 0) {
    if (error) console.error('NativeAd query failed:', error.message);
    return null;
  }

  const ad = ads[Math.floor(Math.random() * ads.length)]!;

  return <NativeAdClient ad={ad} label={t('label')} />;
}
