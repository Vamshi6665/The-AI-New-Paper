'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NewspaperView } from './NewspaperView';
import { useSpeech } from '@/lib/use-speech';
import { PAPER_PX, type PaperSize } from '@/features/paper/sizes';
import type { Edition } from '@/types/edition';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  edition?: Edition;
  warnings?: string[];
}

const SUGGESTIONS = [
  "Tomorrow I have chest day at the gym at 6 with a 3000 calorie plan, I need to go to the grocery store, then to my sister's place in the evening, and I want to watch a movie at night.",
  "It's Sarah's birthday tomorrow — call her at 8 PM, pick up a cake, finish my slides, and go for a run in the morning.",
  'Today: deep work till noon, lunch with Alex at 1, dentist at 4, then laundry and pay the electric bill.',
];

export function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Good morning. Tell me what your day looks like — type it, or tap the mic and just talk. I’ll plan it in detail and set it as your personal newspaper, on one page.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeech(
    useCallback((t: string) => setInput((cur) => (cur ? `${cur.trimEnd()} ${t}` : t)), [])
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  // auto-grow the composer
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input, speech.interim]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    if (speech.listening) speech.stop();
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, timezone: TZ }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Something went wrong');
      setMsgs((m) => [
        ...m,
        { role: 'assistant', text: data.reply, edition: data.edition as Edition, warnings: data.warnings },
      ]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', text: `I couldn't build that one — ${e instanceof Error ? e.message : 'try again'}.` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function stopAndBuild() {
    const full = `${input} ${speech.interim}`.trim();
    speech.stop();
    send(full);
  }

  const showSuggestions = msgs.length === 1 && !busy;
  const live = speech.listening;

  return (
    <div className="chat">
      <div className="thread">
        {msgs.map((m, i) => (
          <div key={i} className={`turn ${m.role}`}>
            {m.role === 'assistant' && <div className="avatar">DE</div>}
            <div className="bubble-wrap">
              <div className={`bubble ${m.role}`}>{m.text}</div>
              {m.warnings && m.warnings.length > 0 && (
                <div className="warnings">
                  {m.warnings.map((w, j) => (
                    <div key={j}>· {w}</div>
                  ))}
                </div>
              )}
              {m.edition && <EditionCard edition={m.edition} />}
            </div>
          </div>
        ))}
        {busy && (
          <div className="turn assistant">
            <div className="avatar">DE</div>
            <div className="building">
              <div className="bd-row">
                <span className="bd-spin" />
                <span className="bd-label">Building your edition</span>
              </div>
              <div className="bd-steps">
                <span className="bd-step s1">reading</span>
                <span className="bd-step s2">planning</span>
                <span className="bd-step s3">composing</span>
                <span className="bd-step s4">setting type</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {showSuggestions && (
        <div className="suggestions no-print">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="sugg" onClick={() => send(s)} type="button">
              {s}
            </button>
          ))}
        </div>
      )}

      {speech.error && (
        <div className="voice-error no-print" role="alert">
          {speech.error}
        </div>
      )}

      <div className={`composer no-print${live ? ' is-live' : ''}`}>
        {live && (
          <div className="live-row" aria-live="polite">
            <span className="wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="live-label">Listening…</span>
            <span className="live-text">{speech.interim || 'say your day in your own words'}</span>
          </div>
        )}
        <div className="comp-row">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="What’s happening today? e.g. gym at 7, meeting at 10, call mom tonight…"
            disabled={busy}
            aria-label="Describe your day"
          />
          {speech.supported && (
            <button
              type="button"
              className={`mic${live ? ' on' : ''}`}
              onClick={() => (live ? speech.stop() : speech.start())}
              disabled={busy}
              aria-pressed={live}
              aria-label={live ? 'Stop listening' : 'Speak your day'}
              title={live ? 'Stop listening' : 'Speak your day'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
          )}
          <button
            className="send"
            onClick={() => (live ? stopAndBuild() : send(input))}
            disabled={busy || !(input.trim() || speech.interim)}
            type="button"
          >
            {busy ? 'Building' : live ? 'Stop & build' : 'Build edition'}
            {!busy && (
              <span className="send-arrow" aria-hidden="true">
                →
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditionCard({ edition }: { edition: Edition }) {
  const [size, setSize] = useState<PaperSize>('letter');
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Print through a dedicated off-screen sheet at true page size, so the output is
  // the finished one-page paper regardless of the on-screen layout.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(async () => {
        await document.fonts?.ready;
        window.print();
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  async function downloadPdf() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/chat/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edition, paperSize: size }),
      });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      if (blob.type !== 'application/pdf' || blob.size < 1000) throw new Error('pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${edition.masthead.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${edition.editionDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setErr('PDF engine is not available here — opening the print dialog instead (choose “Save as PDF”).');
      setPrinting(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="edition-card">
      <div className="ec-bar no-print">
        <span className="ec-label">{edition.masthead}</span>
        <div className="ec-tools">
          <select value={size} onChange={(e) => setSize(e.target.value as PaperSize)} aria-label="Paper size">
            <option value="letter">Letter</option>
            <option value="a4">A4</option>
          </select>
          <button onClick={() => setPrinting(true)} type="button" data-testid="print-btn">
            Print
          </button>
          <button onClick={downloadPdf} disabled={busy} type="button" className="solid" data-testid="pdf-btn">
            {busy ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </div>
      {err && <div className="ec-err no-print">{err}</div>}
      <div className="ec-paper">
        <NewspaperView edition={edition} size={size} />
      </div>
      {printing && <PrintSheet edition={edition} size={size} />}
    </div>
  );
}

function PrintSheet({ edition, size }: { edition: Edition; size: PaperSize }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div id="print-root">
      <style dangerouslySetInnerHTML={{ __html: `@page{size:${PAPER_PX[size].css};margin:0}` }} />
      <NewspaperView edition={edition} size={size} scale={false} />
    </div>,
    document.body
  );
}
