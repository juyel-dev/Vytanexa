import { requireRole } from '@/lib/supabase/auth-verify';
import { getAppSettings } from '@/lib/app-settings';
import { FooterEditor } from '@/components/god-mode/FooterEditor';

export const dynamic = 'force-dynamic';

export default async function GodFooterPage() {
  await requireRole('super_admin');
  const settings = await getAppSettings();
  const s = settings as unknown as {
    footer_links: { label: string; href: string }[] | null;
    social_links: { facebook?: string; instagram?: string; twitter?: string; youtube?: string } | null;
    contact_phone: string | null;
    contact_email: string | null;
    contact_whatsapp: string | null;
    seo_defaults: { tagline?: string } | null;
  } | null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">ফুটার, সোশ্যাল ও যোগাযোগ</h1>
        <p className="mt-1 text-admin-body text-neutral-500">সরাসরি <code className="rounded bg-neutral-100 px-1">app_settings</code> এ লেখে — super_admin-এর জন্য।</p>
      </div>
      <FooterEditor
        initial={{
          footer_links: s?.footer_links ?? null,
          social_links: s?.social_links ?? null,
          contact_phone: s?.contact_phone ?? null,
          contact_email: s?.contact_email ?? null,
          contact_whatsapp: s?.contact_whatsapp ?? null,
          tagline: (s?.seo_defaults as { tagline?: string } | null)?.tagline ?? '',
        }}
      />
    </div>
  );
}
