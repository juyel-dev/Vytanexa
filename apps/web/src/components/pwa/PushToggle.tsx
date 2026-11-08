'use client';

import { useT } from '@vytanexa/i18n/client';
import { usePushNotifications } from '@/lib/use-push';

/**
 * Turn Web Push alerts on/off for this device. `compact` hides the
 * description (used inside the Settings list); the full card is shown on
 * the notifications page. Renders nothing while detecting or when the
 * deployment has no VAPID key (nothing the user can do about it).
 */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const t = useT('pwa.push');
  const { state, error, enable, disable } = usePushNotifications();

  if (state === 'loading' || state === 'unconfigured') return null;

  const message =
    state === 'unsupported'
      ? t('unsupported')
      : state === 'needs-install'
        ? t('iosNeedsInstall')
        : state === 'blocked'
          ? t('blocked')
          : error
            ? t('error')
            : null;

  const actionable = state === 'off' || state === 'on' || state === 'working';

  return (
    <div className="border-b border-neutral-100 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-neutral-900">🔔 {t('title')}</p>
          {!compact && <p className="mt-0.5 text-[12px] text-neutral-500">{t('desc')}</p>}
          {message && (
            <p role="status" className="mt-1 text-[12px] text-neutral-500">
              {message}
            </p>
          )}
        </div>
        {actionable && (
          <button
            type="button"
            disabled={state === 'working'}
            onClick={state === 'on' ? disable : enable}
            className={`shrink-0 rounded-md px-3 py-2 text-[13px] font-semibold disabled:opacity-50 ${
              state === 'on'
                ? 'border border-neutral-200 text-neutral-700'
                : 'bg-brand-600 text-white'
            }`}
          >
            {state === 'on' ? t('disable') : t('enable')}
          </button>
        )}
      </div>
    </div>
  );
}
