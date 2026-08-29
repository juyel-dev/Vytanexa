import type { Database } from '@vytanexa/database';
import { slugify } from './location-utils';

export type HospitalType = Database['public']['Enums']['hospital_type'];

export const HOSPITAL_TYPE_LABEL: Record<HospitalType, { bn: string; short: string }> = {
  hospital: { bn: 'হাসপাতাল', short: 'Hospital' },
  clinic: { bn: 'ক্লিনিক', short: 'Clinic' },
  diagnostic: { bn: 'ডায়াগনস্টিক', short: 'Diagnostic' },
  nursing_home: { bn: 'নার্সিং হোম', short: 'Nursing Home' },
};

export function hospitalName(h: { name_translations: { bn?: string; en?: string } | null; slug: string }): string {
  const t = h.name_translations as { bn?: string; en?: string } | null;
  return (t?.bn && t.bn.trim()) || (t?.en && t.en.trim()) || h.slug;
}

export function hospitalSlugBase(nameBn: string, nameEn: string): string {
  return slugify(nameBn || nameEn || '');
}

export const FACILITY_OPTIONS = [
  { key: 'icu', bn: 'ICU' },
  { key: 'emergency_24h', bn: 'জরুরি বিভাগ ২৪/৭' },
  { key: 'ambulance', bn: 'অ্যাম্বুলেন্স' },
  { key: 'blood_bank', bn: 'ব্লাড ব্যাংক' },
  { key: 'pharmacy', bn: 'ফার্মেসি' },
  { key: 'lab', bn: 'ল্যাব' },
  { key: 'xray', bn: 'এক্স-রে' },
  { key: 'operation_theatre', bn: 'অপারেশন থিয়েটার' },
] as const;
