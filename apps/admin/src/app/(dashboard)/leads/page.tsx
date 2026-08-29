import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { LeadsManager } from '@/components/leads/LeadsManager';

export const dynamic = 'force-dynamic';

type SP = { status?: string; doctor?: string; q?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const status = (searchParams.status ?? 'new').trim();
  const doctorFilter = (searchParams.doctor ?? '').trim();
  const q = (searchParams.q ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const perPage = 25;

  // dropdown: doctors that have leads (distinct)
  const { data: leadDoctors } = await supabase.from('leads').select('doctor_id').limit(500);
  const docIds = [...new Set((leadDoctors ?? []).map((r) => (r as { doctor_id: string }).doctor_id))];
  let doctorMap = new Map<string, string>();
  let doctorOpts: { id: string; name: string }[] = [];
  if (docIds.length > 0) {
    const { data: docs } = await supabase.from('doctors').select('id, name_translations, slug').in('id', docIds);
    for (const d of docs ?? []) {
      const t = (d as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
      const name = (t?.bn || t?.en || (d as { slug: string }).slug) as string;
      doctorMap.set((d as { id: string }).id, name);
      doctorOpts.push({ id: (d as { id: string }).id, name });
    }
  }

  // counts per status for tabs
  const statuses: string[] = ['new', 'contacted', 'completed', 'cancelled'];
  const counts = new Map<string, number>();
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', s as never);
      counts.set(s, count ?? 0);
    })
  );

  // main query
  let query = supabase.from('leads').select('id, doctor_id, chamber_id, patient_name, patient_phone, preferred_time, message, status, created_at, contacted_at', { count: 'exact' });

  if (status !== 'all' && statuses.includes(status)) query = query.eq('status', status as never);
  if (doctorFilter) query = query.eq('doctor_id', doctorFilter);
  if (q) {
    const esc = q.replace(/%/g, '\\%');
    query = query.or(`patient_name.ilike.%${esc}%,patient_phone.ilike.%${esc}%`);
  }

  query = query.order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1);

  const { data: leads, count, error } = await query;

  if (error) return <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-6 text-admin-body text-emergency-700">লিড লোড করা যায়নি: {error.message}</div>;

  // enrich with doctor/chamber names
  const leadDoctorIds = [...new Set((leads ?? []).map((l) => (l as { doctor_id: string }).doctor_id))];
  const chamberIds = [...new Set((leads ?? []).map((l) => (l as { chamber_id: string | null }).chamber_id).filter(Boolean) as string[])];
  const chamberMap = new Map<string, string>();
  if (chamberIds.length > 0) {
    const { data: chs } = await supabase.from('chambers').select('id, chamber_name').in('id', chamberIds);
    for (const c of chs ?? []) chamberMap.set((c as { id: string }).id, (c as { chamber_name: string }).chamber_name);
  }
  // ensure doctorMap has all needed (if filtered differently)
  if (leadDoctorIds.some((id) => !doctorMap.has(id))) {
    const missing = leadDoctorIds.filter((id) => !doctorMap.has(id));
    const { data: moreDocs } = await supabase.from('doctors').select('id, name_translations, slug').in('id', missing);
    for (const d of moreDocs ?? []) {
      const t = (d as { name_translations: { bn?: string; en?: string } | null; slug: string }).name_translations;
      doctorMap.set((d as { id: string }).id, (t?.bn || t?.en || (d as { slug: string }).slug) as string);
    }
  }

  const enriched = (leads ?? []).map((l) => ({
    ...(l as object),
    doctor_name: doctorMap.get((l as { doctor_id: string }).doctor_id) ?? '—',
    chamber_name: (l as { chamber_id: string | null }).chamber_id ? (chamberMap.get((l as { chamber_id: string }).chamber_id) ?? '—') : '—',
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">লিড ইনবক্স</h1>
        <p className="mt-1 text-admin-body text-neutral-500">নতুন → যোগাযোগ → সম্পন্ন/বাতিল — রোগীর history-তেও প্রতিফলিত হয়।</p>
      </div>
      <LeadsManager leads={enriched as never} total={count ?? 0} page={page} perPage={perPage} counts={Object.fromEntries(counts) as never} doctorOpts={doctorOpts} currentFilters={{ status, doctor: doctorFilter, q }} />
    </div>
  );
}
