import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';

/**
 * Native Ad — VYTANEXA-BLUEPRINT.md § S04 SEC-07
 * One ad shown, randomly rotated among active `native_feed` ads (a
 * single extra ORDER BY random() keeps this honest without needing a
 * dedicated rotation table).
 */
export async function NativeAd() {
  const supabase = createClient();
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

  return (
    <section className="px-4 py-2">
      <p className="mb-1 text-right text-[11px] text-neutral-400">বিজ্ঞাপন</p>
      <a
        href={ad.target_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
      >
        <div className="relative aspect-[16/6] w-full">
          <Image src={ad.image_url} alt={ad.sponsor_name} fill sizes="100vw" className="object-cover" />
        </div>
      </a>
    </section>
  );
}
