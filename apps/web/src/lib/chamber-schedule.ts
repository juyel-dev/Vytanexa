/**
 * Chamber Schedule Logic — VYTANEXA-BLUEPRINT.md § S07 Tab 2 "Schedule
 * Grouping Algorithm (Reference)". Pure functions, no I/O — easy to
 * reason about and reuse (also needed by S06's "আজ উপলব্ধ" availability
 * chip once that's wired to real chamber data).
 *
 * Day labels and the "closed" suffix are injected by the caller
 * (resolved from `common.day`/`common.closedSuffix` via `useT()`) rather
 * than hardcoded here, so this stays a pure, environment-agnostic module
 * — it has no way to call a hook itself. Defaults to Bengali labels so
 * any caller that hasn't been updated yet keeps working unchanged.
 */

export type ScheduleEntry = { day: string; open: string; close: string };

const DAY_ORDER = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const DEFAULT_DAY_LABELS: Record<string, string> = {
  sat: 'শনি',
  sun: 'রবি',
  mon: 'সোম',
  tue: 'মঙ্গল',
  wed: 'বুধ',
  thu: 'বৃহঃ',
  fri: 'শুক্র',
};
const DEFAULT_CLOSED_SUFFIX = 'বন্ধ';

export type GroupedSchedule = { days: string[]; daysLabel: string; open: string; close: string };

/** Groups consecutive/matching days with identical open+close times. */
export function groupSchedule(
  schedule: ScheduleEntry[],
  dayLabels: Record<string, string> = DEFAULT_DAY_LABELS
): GroupedSchedule[] {
  const byTime = new Map<string, string[]>();
  for (const day of DAY_ORDER) {
    const entry = schedule.find((s) => s.day === day);
    if (!entry) continue;
    const key = `${entry.open}-${entry.close}`;
    const days = byTime.get(key) ?? [];
    days.push(day);
    byTime.set(key, days);
  }

  return Array.from(byTime.entries()).map(([key, days]) => {
    const [open, close] = key.split('-') as [string, string];
    return {
      days,
      daysLabel: days.map((d) => dayLabels[d]).join(', '),
      open,
      close,
    };
  });
}

export function getClosedDaysLabel(
  schedule: ScheduleEntry[],
  dayLabels: Record<string, string> = DEFAULT_DAY_LABELS,
  closedSuffix: string = DEFAULT_CLOSED_SUFFIX
): string | null {
  const openDays = new Set(schedule.map((s) => s.day));
  const closedDays = DAY_ORDER.filter((d) => !openDays.has(d));
  if (closedDays.length === 0) return null;
  return closedDays.map((d) => dayLabels[d]).join(', ') + ' ' + closedSuffix;
}

export type ChamberStatus =
  | { status: 'open_now'; closesAt: string }
  | { status: 'opens_later'; opensAt: string }
  | { status: 'closed'; nextOpenDay: string | null };

const JS_DAY_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Live open/closed status computed against the current time. */
export function getChamberStatus(
  schedule: ScheduleEntry[],
  now: Date = new Date(),
  dayLabels: Record<string, string> = DEFAULT_DAY_LABELS
): ChamberStatus {
  const todayKey = JS_DAY_TO_KEY[now.getDay()]!;
  const todayEntry = schedule.find((s) => s.day === todayKey);
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (!todayEntry) {
    for (let i = 1; i <= 7; i++) {
      const key = JS_DAY_TO_KEY[(now.getDay() + i) % 7]!;
      if (schedule.some((s) => s.day === key)) {
        return { status: 'closed', nextOpenDay: dayLabels[key]! };
      }
    }
    return { status: 'closed', nextOpenDay: null };
  }

  if (nowTime < todayEntry.open) {
    return { status: 'opens_later', opensAt: todayEntry.open };
  }
  if (nowTime > todayEntry.close) {
    for (let i = 1; i <= 7; i++) {
      const key = JS_DAY_TO_KEY[(now.getDay() + i) % 7]!;
      if (schedule.some((s) => s.day === key)) {
        return { status: 'closed', nextOpenDay: dayLabels[key]! };
      }
    }
    return { status: 'closed', nextOpenDay: null };
  }
  return { status: 'open_now', closesAt: todayEntry.close };
}
