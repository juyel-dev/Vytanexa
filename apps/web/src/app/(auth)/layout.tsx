/**
 * (auth) route group layout — VYTANEXA-BLUEPRINT.md § S02 § 3.1
 * "(auth)/ ... [no navbar]". Covers /onboarding, /auth/login,
 * /auth/verify.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-white">{children}</div>;
}
