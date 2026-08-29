/**
 * StatusBadge — ADMIN-PANEL-SPEC.md § A01 "Core Component Additions".
 * Consistent color-coded pill used everywhere. Defaults match the
 * spec: pending=accent, verified/approved=life, rejected/suspended=
 * emergency/neutral. Pass `color` to override for ad-hoc statuses.
 */
export type StatusColor = 'pending' | 'verified' | 'approved' | 'rejected' | 'suspended' | 'neutral' | 'active' | 'inactive' | 'draft' | 'open' | 'resolved' | 'dismissed';

const COLOR_MAP: Record<StatusColor, { dot: string; text: string; ring: string }> = {
  pending:    { dot: 'bg-accent-500',  text: 'text-accent-700',  ring: 'ring-accent-200' },
  verified:   { dot: 'bg-life-600',    text: 'text-life-700',    ring: 'ring-life-200' },
  approved:   { dot: 'bg-life-600',    text: 'text-life-700',    ring: 'ring-life-200' },
  rejected:   { dot: 'bg-emergency-600', text: 'text-emergency-700', ring: 'ring-emergency-200' },
  suspended:  { dot: 'bg-neutral-500', text: 'text-neutral-700', ring: 'ring-neutral-200' },
  neutral:    { dot: 'bg-neutral-400', text: 'text-neutral-600', ring: 'ring-neutral-200' },
  active:     { dot: 'bg-life-600',    text: 'text-life-700',    ring: 'ring-life-200' },
  inactive:   { dot: 'bg-neutral-400', text: 'text-neutral-600', ring: 'ring-neutral-200' },
  draft:      { dot: 'bg-neutral-400', text: 'text-neutral-600', ring: 'ring-neutral-200' },
  open:       { dot: 'bg-emergency-600', text: 'text-emergency-700', ring: 'ring-emergency-200' },
  resolved:   { dot: 'bg-life-600',    text: 'text-life-700',    ring: 'ring-life-200' },
  dismissed:  { dot: 'bg-neutral-400', text: 'text-neutral-600', ring: 'ring-neutral-200' },
};

export function StatusBadge({ status, label, color }: { status?: StatusColor; label: string; color?: StatusColor }) {
  const c = COLOR_MAP[color ?? status ?? 'neutral'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[12px] font-medium ${c.text} ring-1 ${c.ring}`}
      aria-label={label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden />
      {label}
    </span>
  );
}