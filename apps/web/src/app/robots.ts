import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vytanexa.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/account/', '/auth/', '/onboarding'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
