'use client';

import { useEffect } from 'react';
import { Mic, X } from 'lucide-react';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

/**
 * Voice Search Overlay — VYTANEXA-BLUEPRINT.md § S05 "VOICE SEARCH —
 * Full Overlay". Full-screen states: waiting → listening → processing
 * → complete (auto-closes + submits) / error.
 */
export function VoiceSearchOverlay({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (transcript: string) => void;
}) {
  const { state, transcript, start, stop } = useVoiceSearch((text) => {
    onResult(text);
    setTimeout(onClose, 400);
  });

  useEffect(() => {
    if (open) start();
    else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start/stop intentionally not in deps to avoid re-triggering on their identity changes
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex flex-col items-center justify-center bg-neutral-900/85 px-8 text-center">
      <button onClick={onClose} className="absolute right-4 top-4 text-white/70" aria-label="বাতিল">
        <X className="h-6 w-6" />
      </button>

      {state === 'unsupported' ? (
        <p className="text-[15px] text-white">
          ভয়েস সার্চ আপনার ব্রাউজারে সমর্থিত নয়
        </p>
      ) : state === 'error' ? (
        <p className="text-[15px] text-white">শোনা যায়নি। আবার চেষ্টা করুন।</p>
      ) : (
        <>
          <p className="text-[16px] text-white">
            {state === 'listening' ? 'শুনছি...' : state === 'processing' ? 'খোঁজা হচ্ছে...' : 'কথা বলুন...'}
          </p>
          <div
            className={`relative mt-6 flex h-20 w-20 items-center justify-center rounded-full ${
              state === 'listening' ? 'bg-emergency-600' : 'bg-brand-600'
            }`}
          >
            {state === 'listening' && (
              <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
            )}
            <Mic className="h-8 w-8 text-white" />
          </div>
          {transcript && <p className="mt-6 text-[14px] text-brand-200">&ldquo;{transcript}&rdquo;</p>}
          <p className="mt-6 text-[13px] text-white/60">
            বাংলায় বলুন বা English-এ
            <br />
            উদাহরণ: &ldquo;হৃদরোগ ডাক্তার&rdquo;
          </p>
        </>
      )}

      <button onClick={onClose} className="mt-10 text-[14px] text-white/70">
        বাতিল
      </button>
    </div>
  );
}
