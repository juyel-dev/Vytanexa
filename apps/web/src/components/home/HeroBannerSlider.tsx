import { createClient } from '@/lib/supabase/server';
import { HeroBannerSliderClient } from './HeroBannerSliderClient';

/**
 * Hero Banner Slider — VYTANEXA-BLUEPRINT.md § S04 SEC-02
 * Server Component fetches; interactive carousel behavior lives in
 * the client sub-component (auto-advance/swipe need browser APIs).
 */
export async function HeroBannerSlider() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: ads, error } = await supabase
    .from('ads')
    .select('id, image_url, target_url, sponsor_name')
    .eq('placement', 'homepage_banner')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('display_order', { ascending: true })
    .limit(6);

  if (error) {
    console.error('HeroBannerSlider query failed:', error.message);
    return null;
  }

  if (!ads || ads.length === 0) {
    return null;
  }

  return <HeroBannerSliderClient ads={ads} />;
}
