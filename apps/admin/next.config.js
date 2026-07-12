/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Deploy target: admin.vytanexa.app subdomain (ADMIN-PANEL-SPEC.md § A02)
  // — never the main consumer domain. Configured at the Vercel project
  // level in Phase 6, not here.
};

module.exports = nextConfig;
