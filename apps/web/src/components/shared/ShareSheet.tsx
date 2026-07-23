'use client';

import { useState } from 'react';
import { MessageCircle, Copy, Share2, Check } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';

/**
 * Share Sheet — VYTANEXA-BLUEPRINT.md § S07 "Share Sheet" (reused by
 * S08 hospitals, S09 symptoms later — generic by design, not doctor-
 * specific).
 */
export function ShareSheet({
  open,
  onClose,
  title,
  subtitle,
  url,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  const whatsappText = encodeURIComponent(`${title} - ${subtitle}\n${url}\n\nVytanexa-এ দেখুন`);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: subtitle, url }).catch(() => {});
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-3 border-b border-neutral-100 pb-3">
        <p className="text-[14px] font-semibold text-neutral-900">{title}</p>
        <p className="text-[12px] text-neutral-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 py-2"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-life-50 text-life-600">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="text-[11px] text-neutral-600">WhatsApp</span>
        </a>

        <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 py-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
            {copied ? <Check className="h-5 w-5 text-life-600" /> : <Copy className="h-5 w-5" />}
          </span>
          <span className="text-[11px] text-neutral-600">{copied ? 'কপি হয়েছে' : 'কপি'}</span>
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button onClick={handleNativeShare} className="flex flex-col items-center gap-1.5 py-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
              <Share2 className="h-5 w-5" />
            </span>
            <span className="text-[11px] text-neutral-600">আরো...</span>
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
