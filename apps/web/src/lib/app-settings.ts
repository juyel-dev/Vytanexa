import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';

/**
 * Single public read of app_settings per request (React cache dedupes
 * the layout, generateMetadata and home page, which used to run three
 * separate queries) + Next Data Cache across requests (5 min).
 */
export const getPublicAppSettings = cache(async () => {
  const { data } = await createPublicClient()
    .from('app_settings')
    .select('logo_url, favicon_url, homepage_settings')
    .eq('id', 1)
    .maybeSingle();
  return data as {
    logo_url?: string | null;
    favicon_url?: string | null;
    homepage_settings?: unknown;
  } | null;
});
