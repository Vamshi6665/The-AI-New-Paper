'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Minimal typings for the Web Speech API (not in lib.dom for all targets). */
interface SRAlt {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlt;
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRCtor = new () => SRInstance;

function getCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser’s address bar, then try again.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in your browser settings, then try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Voice needs an internet connection in this browser.',
};

/**
 * Push-to-talk dictation. Final phrases are streamed to `onFinal` as they are
 * recognised; the in-progress phrase is exposed as `interim` for live display.
 * Recognition keeps going through short pauses until `stop()` is called.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<SRInstance | null>(null);
  const want = useRef(false);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => {
      want.current = false;
      rec.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    setInterim('');
    want.current = true;
    const r = new Ctor();
    r.lang = navigator.language || 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) cb.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      want.current = false;
      setError(ERRORS[e.error] ?? 'Voice input stopped unexpectedly. You can still type.');
    };
    r.onend = () => {
      // browsers end a session after a silence; keep listening until told to stop
      if (want.current) {
        try {
          r.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
      setInterim('');
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError('Could not start the microphone.');
    }
  }, []);

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, interim, error, start, stop };
}
