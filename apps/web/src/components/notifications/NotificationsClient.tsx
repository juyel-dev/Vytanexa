'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Info, MessageCircle } from 'lucide-react';
import { formatRelativeTimeBn, useResolvedLocale } from '@/lib/i18n-client';
import { safeHref } from '@/lib/safe-url';
import { useT } from '@vytanexa/i18n/client';

const STORAGE_KEY = 'vytanexa_read_notification_ids';

type Notification = {
  id: string;
  type: 'general' | 'emergency' | 'personal';
  title: string;
  body: string;
  target_url: string | null;
  created_at: string;
};

const TYPE_ICON = { general: Info, emergency: AlertTriangle, personal: MessageCircle };

/**
 * Notifications Center — VYTANEXA-BLUEPRINT.md § S20. Read-state:
 * signed-in users' server-known read IDs (from `notification_reads`)
 * merged with, for guests, `localStorage.read_notification_ids[]` —
 * read client-side on mount since there's no server-side way to know
 * a guest's device-local read state. Tapping an unread notification
 * marks it read (both mechanisms, whichever applies) and navigates to
 * `target_url` if present; a notification with no target just marks
 * read in place (spec: "informational only").
 */
export function NotificationsClient({
  notifications,
  initialReadIds,
  isSignedIn,
}: {
  notifications: Notification[];
  initialReadIds: string[];
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const t = useT('notifications');
  const locale = useResolvedLocale();
  const [readIds, setReadIds] = useState<Set<string>>(new Set(initialReadIds));

  useEffect(() => {
    if (isSignedIn) return; // signed-in read-state already came from the server
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      const stored = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
      setReadIds((prev) => new Set([...prev, ...stored]));
    } catch {
      // malformed localStorage value — treat as empty rather than crashing
    }
  }, [isSignedIn]);

  const markRead = async (id: string) => {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));

    if (isSignedIn) {
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      }).catch(() => {});
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...stored, id])]));
      } catch {
        // localStorage unavailable (private browsing etc.) — read-state
        // just won't persist across visits, not a crash
      }
    }
  };

  const handleTap = (n: Notification) => {
    markRead(n.id);
    // target_url is admin free text: only same-site paths / http(s) / tel / mailto.
    const href = safeHref(n.target_url);
    if (!href) return;
    if (href.startsWith('/')) router.push(href);
    else window.location.assign(href);
  };

  const markAllRead = async () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(new Set(allIds));

    if (isSignedIn) {
      fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: allIds }),
      }).catch(() => {});
    } else {
      try {
        // Merge, don't overwrite: ids read earlier that have since scrolled
        // past the 50-item window must stay remembered.
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...stored, ...allIds])].slice(-500)));
      } catch {
        // best-effort
      }
    }
  };

  const hasUnread = notifications.some((n) => !readIds.has(n.id));

  return (
    <div className="pb-8">
      {notifications.length > 0 && (
        <div className="flex justify-end border-b border-neutral-100 px-4 py-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={!hasUnread}
            className="text-[13px] font-semibold text-brand-600 disabled:text-neutral-300"
          >
            {t('markAllRead')}
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-neutral-400">{t('emptyState')}</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {notifications.map((n) => {
            const isUnread = !readIds.has(n.id);
            const Icon = TYPE_ICON[n.type];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleTap(n)}
                className={`flex w-full items-start gap-2.5 px-4 py-3.5 text-left ${
                  isUnread ? 'bg-brand-50/50' : ''
                }`}
              >
                {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    n.type === 'emergency' ? 'text-emergency-600' : 'text-brand-600'
                  } ${isUnread ? '' : 'ml-[10px]'}`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[14px] ${isUnread ? 'font-semibold text-neutral-900' : 'font-normal text-neutral-600'}`}
                  >
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-neutral-500">{n.body}</p>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {formatRelativeTimeBn(n.created_at, locale)}
                  </p>
                </div>
              </button>
            );
          })}
          <p className="py-6 text-center text-[13px] text-neutral-400">{t('noMoreNotifications')}</p>
        </div>
      )}
    </div>
  );
}
