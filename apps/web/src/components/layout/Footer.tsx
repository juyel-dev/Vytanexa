import { createClient } from '@/lib/supabase/server';

type FooterLink = { label: string; href: string };
type SocialLinks = Record<string, string>;

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  youtube: 'YouTube',
};

/**
 * Footer — VYTANEXA-BLUEPRINT.md § S04 Footer
 * Fully admin-controlled via the `app_settings` singleton row
 * (social_links, footer_links, contact_*) — this component renders
 * whatever the Admin Panel's Footer Editor (ADMIN-PANEL-SPEC.md § A08)
 * writes, with zero hardcoded content beyond the brand name/tagline
 * fallback for a completely fresh install.
 */
export async function Footer() {
  const supabase = createClient();

  const { data: settings } = await supabase
    .from('app_settings')
    .select('app_name, social_links, footer_links, contact_phone, contact_email')
    .eq('id', 1)
    .single();

  const socialLinks = (settings?.social_links as SocialLinks | null) ?? {};
  const footerLinks = (settings?.footer_links as FooterLink[] | null) ?? [];
  const hasSocial = Object.values(socialLinks).some(Boolean);

  return (
    <footer className="mt-6 border-t border-neutral-200 bg-white px-4 py-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
          V
        </div>
        <span className="font-bengali-display text-[15px] font-bold text-brand-600">
          {settings?.app_name ?? 'Vytanexa'}
        </span>
      </div>
      <p className="text-[13px] text-neutral-500">আপনার স্বাস্থ্য, আপনার সংযোগ</p>

      {hasSocial && (
        <div className="mt-3 flex gap-3">
          {Object.entries(socialLinks)
            .filter(([, url]) => Boolean(url))
            .map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-neutral-500 underline"
              >
                {SOCIAL_LABELS[key] ?? key}
              </a>
            ))}
        </div>
      )}

      {footerLinks.length > 0 && (
        <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-neutral-600">
          {footerLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      )}

      {(settings?.contact_phone || settings?.contact_email) && (
        <div className="mt-4 space-y-0.5 text-[12px] text-neutral-500">
          {settings.contact_phone && <p>📞 {settings.contact_phone}</p>}
          {settings.contact_email && <p>✉️ {settings.contact_email}</p>}
        </div>
      )}

      <p className="mt-4 border-t border-neutral-100 pt-3 text-[11px] text-neutral-400">
        © {new Date().getFullYear()} {settings?.app_name ?? 'Vytanexa'}. All rights reserved.
      </p>
    </footer>
  );
}
