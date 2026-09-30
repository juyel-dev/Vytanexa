/**
 * Support WhatsApp number (digits only, with country code, no '+').
 * There is no DB setting for it yet, so it comes from
 * NEXT_PUBLIC_SUPPORT_WHATSAPP. When unset, callers must HIDE the
 * WhatsApp CTA rather than link to a bare `https://wa.me/` (which just
 * opens WhatsApp's landing page — a dead-end for the user).
 */
export const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '');
