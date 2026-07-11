/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Supabase Storage origin — replace <project-ref> once the real
    // Supabase project exists (PROJECT-CONTEXT.md § 4, Phase 1)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // next-pwa wiring happens here in Phase 3 (S22) — deliberately not
  // added yet to keep this scaffold commit minimal and verifiable.
};

module.exports = nextConfig;
