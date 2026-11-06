'use client';

import { useEffect, useRef, useState } from 'react';
import { NewspaperView } from './NewspaperView';
import type { Edition } from '@/types/edition';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  edition?: Edition;
  warnings?: string[];
}

const SUGGESTIONS = [
  'Tomorrow I have a gym session at 7, a project meeting at 10, a doctor at 3, and I need to buy groceries.',
  "It's Sarah's birthday tomorrow — remind me to call her at 8 PM. Also finish my slides and pick up a cake.",
  'Today: deep work till noon, lunch with Alex at 1, dentist at 4, then laundry and pay the electric bill.',
];

export function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      text: "Good morning. Tell me what your day looks like — in plain words, however it comes out — and I'll set it as your personal newspaper. Try one of the examples below, or just start typing.",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
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
        {
          role: 'assistant',
          text: `I couldn't build that one — ${e instanceof Error ? e.message : 'try again'}.`,
        },
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

  const showSuggestions = msgs.length === 1 && !busy;

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
                <span className="bd-step s2">parsing</span>
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

      <div className="composer no-print">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="What's happening today? e.g. gym at 7, meeting at 10, call mom tonight…"
          disabled={busy}
        />
        <button className="send" onClick={() => send(input)} disabled={busy || !input.trim()} type="button">
          {busy ? 'Building' : 'Build edition'}
          {!busy && (
            <span className="send-arrow" aria-hidden="true">
              →
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function EditionCard({ edition }: { edition: Edition }) {
  const [paperSize, setPaperSize] = useState<'letter' | 'a4'>('letter');
  const [busy, setBusy] = useState(false);

  async function downloadPdf() {
    setBusy(true);
    try {
      const res = await fetch('/api/chat/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edition, paperSize }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${edition.masthead.replace(/\s+/g, '-').toLowerCase()}-${edition.editionDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.print();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="edition-card">
      <div className="ec-bar no-print">
        <span className="ec-label">{edition.masthead}</span>
        <div className="ec-tools">
          <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as 'letter' | 'a4')}>
            <option value="letter">Letter</option>
            <option value="a4">A4</option>
          </select>
          <button onClick={() => window.print()} type="button">
            ⎙ Print
          </button>
          <button onClick={downloadPdf} disabled={busy} type="button">
            ↓ PDF
          </button>
        </div>
      </div>
      <div className="ec-paper">
        <NewspaperView edition={edition} />
      </div>
    </div>
  );
}
