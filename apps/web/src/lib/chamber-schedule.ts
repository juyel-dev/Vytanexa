/**
 * Chamber Schedule Logic — VYTANEXA-BLUEPRINT.md § S07 Tab 2 "Schedule
 * Grouping Algorithm (Reference)". Pure functions, no I/O — easy to
 * reason about and reuse (also needed by S06's "আজ উপলব্ধ" availability
 * chip once that's wired to real chamber data).
 */

export type ScheduleEntry = { day: string; open: string; close: string };

const DAY_ORDER = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS_BN: Record<string, string> = {
  sat: 'শনি',
  sun: 'রবি',
  mon: 'সোম',
  tue: 'মঙ্গল',
  wed: 'বুধ',
  thu: 'বৃহঃ',
  fri: 'শুক্র',
};

export type GroupedSchedule = { days: string[]; daysLabel: string; open: string; close: string };

/** Groups consecutive/matching days with identical open+close times. */
export function groupSchedule(schedule: ScheduleEntry[]): GroupedSchedule[] {
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
      daysLabel: days.map((d) => DAY_LABELS_BN[d]).join(', '),
      open,
      close,
    };
  });
}

export function getClosedDaysLabel(schedule: ScheduleEntry[]): string | null {
  const openDays = new Set(schedule.map((s) => s.day));
  const closedDays = DAY_ORDER.filter((d) => !openDays.has(d));
  if (closedDays.length === 0) return null;
  return closedDays.map((d) => DAY_LABELS_BN[d]).join(', ') + ' বন্ধ';
}

export type ChamberStatus =
  | { status: 'open_now'; closesAt: string }
  | { status: 'opens_later'; opensAt: string }
  | { status: 'closed'; nextOpenDay: string | null };

const JS_DAY_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Live open/closed status computed against the current time. */
export function getChamberStatus(
  schedule: ScheduleEntry[],
  now: Date = new Date()
): ChamberStatus {
  const todayKey = JS_DAY_TO_KEY[now.getDay()]!;
  const todayEntry = schedule.find((s) => s.day === todayKey);
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (!todayEntry) {
    for (let i = 1; i <= 7; i++) {
      const key = JS_DAY_TO_KEY[(now.getDay() + i) % 7]!;
      if (schedule.some((s) => s.day === key)) {
        return { status: 'closed', nextOpenDay: DAY_LABELS_BN[key]! };
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
        return { status: 'closed', nextOpenDay: DAY_LABELS_BN[key]! };
      }
    }
    return { status: 'closed', nextOpenDay: null };
  }
  return { status: 'open_now', closesAt: todayEntry.close };
}
