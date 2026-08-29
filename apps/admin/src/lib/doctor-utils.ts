/**
 * Doctor helpers — display names, status labels, slug helpers.
 * No server-only import so form auto-slug can run in the browser.
 */
import type { Database } from '@vytanexa/database';
import { slugify } from './location-utils';

export type VerificationStatus = Database['public']['Enums']['verification_status'];

export const VERIFICATION_LABEL: Record<VerificationStatus, { bn: string; color: 'pending' | 'verified' | 'rejected' | 'suspended' }> = {
  pending: { bn: 'পেন্ডিং', color: 'pending' },
  verified: { bn: 'ভেরিফাইড', color: 'verified' },
  rejected: { bn: 'প্রত্যাখ্যাত', color: 'rejected' },
  suspended: { bn: 'সাসপেন্ডেড', color: 'suspended' },
};

export function doctorName(doc: { name_translations: { bn?: string; en?: string } | null; slug: string }): string {
  const t = doc.name_translations as { bn?: string; en?: string } | null;
  return (t?.bn && t.bn.trim()) || (t?.en && t.en.trim()) || doc.slug;
}

export function doctorSlugBase(nameBn: string, nameEn: string): string {
  return slugify(nameBn || nameEn || '');
}
