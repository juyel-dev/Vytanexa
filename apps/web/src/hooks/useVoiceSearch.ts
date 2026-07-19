'use client';

import { useCallback, useRef, useState } from 'react';

type VoiceState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

/**
 * Voice Search — VYTANEXA-BLUEPRINT.md § S05 "VOICE SEARCH — Full
 * Overlay". Wraps the browser SpeechRecognition API (webkit-prefixed
 * on most mobile browsers) with the language fallback chain the spec
 * calls for: bn-BD primary, falling back through bn-IN/en-IN on error
 * rather than failing outright for users on browsers with partial
 * Bengali locale support.
 */
export function useVoiceSearch(onResult: (transcript: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const langAttemptRef = useRef(0);

  const LANG_FALLBACKS = ['bn-BD', 'bn-IN', 'en-IN'];

  const start = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setState('unsupported');
      return;
    }

    langAttemptRef.current = 0;
    setTranscript('');
    runRecognition(SpeechRecognitionCtor);

    function runRecognition(Ctor: SpeechRecognitionConstructor) {
      const recognition = new Ctor();
      recognition.lang = LANG_FALLBACKS[langAttemptRef.current] ?? 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setState('listening');

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const text = result?.[0]?.transcript ?? '';
        setTranscript(text);
        if (result?.isFinal) {
          setState('processing');
          onResult(text);
        }
      };

      recognition.onerror = () => {
        if (langAttemptRef.current < LANG_FALLBACKS.length - 1) {
          langAttemptRef.current += 1;
          runRecognition(Ctor);
          return;
        }
        setState('error');
      };

      recognition.onend = () => {
        setState((s) => (s === 'listening' ? 'idle' : s));
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
  }, []);

  return { state, transcript, start, stop };
}

// Minimal ambient types -- SpeechRecognition isn't in lib.dom.d.ts by
// default in every TS lib target, so this hook defines just enough of
// the shape it actually uses rather than pulling in a full @types
// package for one small feature.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionEventLike = {
  results: {
    length: number;
    [index: number]: { [index: number]: { transcript: string }; isFinal: boolean };
  };
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
