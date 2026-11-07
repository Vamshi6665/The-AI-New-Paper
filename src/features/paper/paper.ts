import { openWindows, fmtLen, clockOf } from '@/features/editions/windows';
import type { Edition, EditionItem } from '@/types/edition';
import { PAPER_PX, type PaperSize } from './sizes';

/**
 * ONE source of truth for the printed page. Returns the paper's markup as an
 * escaped HTML string; React renders it on screen and Playwright renders it to
 * PDF, so what you read is exactly what you print.
 */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]!);

const GROUP_TAG: Record<EditionItem['group'], string> = {
  fitness: 'Fitness',
  celebration: 'Celebrate',
  appointment: 'Appointment',
  work: 'Work',
  task: 'To-do',
  social: 'Social',
  leisure: 'Unwind',
};

interface Card {
  html: string;
  weight: number; // rough height estimate for column balancing
}

const labelMin = (label: string): number => {
  const m = label.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3] === 'PM') h += 12;
  return h * 60 + Number(m[2]);
};
const fmtMin = (m: number): string => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(x / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(x % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

function picks(i: EditionItem): string {
  const s = i.brief.suggestions;
  if (!s || !s.length) return '';
  return `<div class="sub cap">${esc(i.brief.suggestionsLabel ?? 'Suggestions')}</div><ul class="picks">${s
    .map((x) => `<li><b>${esc(x.title)}</b><span>${esc(x.note)}</span></li>`)
    .join('')}</ul>`;
}

function pill(i: EditionItem): string {
  if (i.suggested) return `~${esc(i.timeLabel)}`;
  return i.exact ? esc(i.timeLabel) : i.timeLabel === 'Anytime' ? '' : esc(i.timeLabel);
}

function chips(i: EditionItem): string {
  if (!i.brief.metrics.length) return '';
  return `<div class="chips">${i.brief.metrics
    .map((m) => `<div class="chip"><i>${esc(m.label)}</i><b>${esc(m.value)}</b></div>`)
    .join('')}</div>`;
}

function checklist(items: string[], two = false): string {
  if (!items.length) return '';
  return `<ul class="ck${two ? ' two' : ''}">${items.map((c) => `<li>${esc(c.charAt(0).toUpperCase() + c.slice(1))}</li>`).join('')}</ul>`;
}

const STEP_RE = /^(.*?) · (\d+ min) — (.*)$/;
function exercise(steps: string[]): string {
  return `<div class="ex">${steps
    .map((s) => {
      const m = STEP_RE.exec(s);
      if (m) return `<div class="rx"><b>${esc(m[1])}</b><i>${esc(m[2])}</i><span>${esc(m[3])}</span></div>`;
      const [a, ...rest] = s.split(' — ');
      return rest.length
        ? `<div><span>${esc(a)}</span><span>${esc(rest.join(' — '))}</span></div>`
        : `<div><span>${esc(s)}</span></div>`;
    })
    .join('')}</div>`;
}

function numbered(steps: string[]): string {
  return `<ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
}

function head(kicker: string, i: EditionItem): string {
  const p = pill(i);
  return `<div class="card-k cap"><span>${esc(kicker)}</span>${p ? `<span class="pill">${p}</span>` : ''}</div>`;
}

function fitnessCard(i: EditionItem, d: number): Card {
  const pack = d >= 2 ? [] : i.brief.checklist;
  return {
    weight: 6 + i.brief.steps.length * 1.2 + pack.length * 0.5,
    html: `<section class="card dark">${head('Health & Fitness', i)}
      <h3 class="p-title">${esc(i.title)}</h3>
      ${d >= 2 ? '' : `<p class="blurb">${esc(i.brief.blurb)}</p>`}
      ${chips(i)}
      ${exercise(d >= 1 ? i.brief.steps.slice(0, 5) : i.brief.steps)}
      ${pack.length ? `<div class="sub cap">Pack</div>${checklist(pack, true)}` : ''}
    </section>`,
  };
}

const RING = ['#1f5c4a', '#26231e', '#948c78', '#cfc5ad', '#7fb09c'];

function fuelCard(e: Edition): Card | null {
  const c = e.plan.calories;
  if (!c) return null;
  let acc = 0;
  const segs = c.meals
    .map((m, k) => {
      const from = acc;
      acc += (m.kcal / c.meals.reduce((a, b) => a + b.kcal, 0)) * 100;
      return `${RING[k % RING.length]} ${from.toFixed(1)}% ${acc.toFixed(1)}%`;
    })
    .join(',');
  return {
    weight: 8 + c.meals.length * 2.2,
    html: `<section class="card"><div class="card-k cap"><span>Fuel plan</span><span>${c.source === 'you' ? 'Your target' : 'Suggested'}</span></div>
      <div class="fuel">
        <div class="ring" style="background:conic-gradient(${segs})"><div><b>${c.target.toLocaleString('en-US')}</b><small>KCAL</small></div></div>
        <div class="meals">${c.meals
          .map(
            (m, k) =>
              `<div><i style="background:${RING[k % RING.length]}"></i><span>${esc(m.name)} <u>${esc(m.time)}</u><em>${esc(m.idea)}</em></span><span class="k">${m.kcal}</span></div>`
          )
          .join('')}</div>
      </div>
      <p class="note">${esc(c.note)} Protein ≈ ${c.protein} g. General guide, adjust to your needs.</p>
    </section>`,
  };
}

function waterCard(e: Edition): Card {
  return {
    weight: 5,
    html: `<section class="card"><div class="card-k cap"><span>Hydration</span><span>${e.plan.waterLiters} L · ${e.plan.waterGlasses} × 250 ml</span></div>
      <div class="glasses">${'<i></i>'.repeat(e.plan.waterGlasses)}</div>
      <p class="note">Tick a glass each time you drink. Front-load the morning.</p></section>`,
  };
}

function detailCard(kicker: string, i: EditionItem, d: number): Card {
  const steps = d >= 2 ? i.brief.steps.slice(0, 2) : d >= 1 ? i.brief.steps.slice(0, 3) : i.brief.steps;
  const list = d >= 2 ? i.brief.checklist.slice(0, 3) : i.brief.checklist;
  return {
    weight: 5 + steps.length * 1.1 + list.length * 0.9 + (i.brief.suggestions?.length ?? 0) * 1.6,
    html: `<section class="card">${head(kicker, i)}
      <h3 class="p-title">${esc(i.title)}</h3>
      ${d >= 2 ? '' : `<p class="blurb">${esc(i.brief.blurb)}</p>`}
      ${chips(i)}
      ${numbered(steps)}
      ${picks(i)}
      ${list.length ? `<div class="sub cap">${i.group === 'appointment' ? 'Bring' : i.group === 'social' ? 'Take along' : 'Prepare'}</div>${checklist(list)}` : ''}
    </section>`,
  };
}

function celebrationCard(items: EditionItem[], d: number): Card {
  const lead = items.find((i) => i.category === 'birthday') ?? items[0]!;
  const prep = items.filter((i) => i !== lead);
  const prepList = prep.map((p) => `${p.title}${p.exact ? ` — ${p.timeLabel}` : ''}`);
  const list = [...lead.brief.checklist, ...prepList];
  const steps = d >= 2 ? lead.brief.steps.slice(0, 2) : d >= 1 ? lead.brief.steps.slice(0, 3) : lead.brief.steps;
  return {
    weight: 6 + steps.length * 1.1 + list.length * 0.9,
    html: `<section class="card">${head('Celebrations', lead)}
      <h3 class="p-title">${esc(lead.title)}</h3>
      ${d >= 2 ? '' : `<p class="blurb">${esc(lead.brief.blurb)}</p>`}
      ${chips(lead)}
      ${numbered(steps)}
      <div class="sub cap">Prep list</div>${checklist(list)}
    </section>`,
  };
}

function todoCard(items: EditionItem[], d: number): Card {
  const rows = items
    .map((i) => {
      const own = i.brief.checklist.length;
      return `<div style="margin-top:.5em"><div class="card-k cap"><span style="color:var(--ink)">${esc(i.title)}</span><span style="color:var(--mute)">${esc(i.brief.metrics[0] ? i.brief.metrics[0].value : '')}</span></div>
        ${d >= 1 ? '' : `<p class="blurb">${esc(i.brief.blurb)}</p>`}
        ${own ? checklist(i.brief.checklist, own > 4) : numbered(i.brief.steps.slice(0, d >= 1 ? 2 : 3))}</div>`;
    })
    .join('');
  const lines = items.reduce((n, i) => n + 2 + (i.brief.checklist.length ? Math.ceil(i.brief.checklist.length / 2) : 3), 0);
  return {
    weight: 3 + lines * 1.05,
    html: `<section class="card"><div class="card-k cap"><span>To-do bulletin</span><span>${items.length} to clear</span></div>${rows}</section>`,
  };
}

function openCard(e: Edition): Card | null {
  const w = openWindows(e.items).sort((x, y) => y.len - x.len).slice(0, 3).sort((x, y) => x.from - y.from);
  if (!w.length) return null;
  const hint = (len: number) => (len >= 180 ? 'Deep work, study or a long errand' : len >= 90 ? 'Errands, calls or a walk' : 'A meal, a stretch or a reset');
  return {
    weight: 4 + w.length * 2.6,
    html: `<section class="card"><div class="card-k cap"><span>Open windows</span><span>${w.length} free</span></div>
      <div class="win">${w
        .map((x) => `<div><b>${esc(clockOf(x.from))} – ${esc(clockOf(x.to))}</b><i>${esc(fmtLen(x.len))}</i><span>${esc(hint(x.len))}</span></div>`)
        .join('')}</div></section>`,
  };
}

function windDownCard(e: Edition): Card {
  const lights = labelMin(e.plan.lightsOut);
  const sleepMin = labelMin(e.plan.wake) + 24 * 60 - lights;
  const rows: [string, string][] = [
    [fmtMin(lights - 60), 'Screens off, lights low'],
    [fmtMin(lights - 45), 'Lay out tomorrow’s clothes and bag'],
    [fmtMin(lights - 30), 'Write three good things from today'],
    [fmtMin(lights - 15), '5 min stretch and slow breathing'],
    [e.plan.lightsOut, 'Phone on charge, away from the bed'],
  ];
  const sleep = `${e.plan.wake} wake-up leaves about ${Math.round(sleepMin / 6) / 10} h of sleep.${sleepMin < 420 ? ' A short night: a lighter evening would help.' : ''}`;
  return {
    weight: 4 + rows.length * 1.4,
    html: `<section class="card dark"><div class="card-k cap"><span>Evening wind-down</span><span class="pill">${esc(e.plan.lightsOut)}</span></div>
      <div class="ex">${rows.map(([t, l]) => `<div><span>${esc(l)}</span><span>${esc(t)}</span></div>`).join('')}</div>
      <p class="blurb" style="margin-top:.5em">${esc(sleep)}</p></section>`,
  };
}

function timeParts(i: EditionItem): string {
  if (!i.exact && !i.suggested) {
    return i.timeLabel === 'Anytime' ? '<div class="tl-t soft">Any time</div>' : `<div class="tl-t soft">${esc(i.timeLabel)}</div>`;
  }
  const [t, m] = i.timeLabel.split(' ');
  return `<div class="tl-t${i.suggested ? ' sug' : ''}">${i.suggested ? '~' : ''}${esc(t)}<small>${esc(m)}</small></div>`;
}

function timeline(items: EditionItem[]): string {
  if (!items.length) return '<div class="tl-empty">An open day — nothing is booked yet.</div>';
  return items
    .map((i) => {
      const span = i.startTime && i.endTime ? mins(i.endTime) - mins(i.startTime) : 0;
      const detail = [
        span > 0 ? `${fmtLen(span)}${i.endLabel ? ` · until ${i.endLabel}` : ''}` : '',
        i.location ?? '',
        i.person && !/for/i.test(i.brief.metrics.map((m) => m.label).join()) ? `with ${i.person}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return `<div class="tl-row${i.priority === 'high' ? ' hi' : ''}">${timeParts(i)}<div class="tl-b"><b>${esc(i.title)}</b>${
        detail ? `<span class="tl-d">${esc(detail)}</span>` : ''
      }<span class="tag">${GROUP_TAG[i.group]}${i.suggested ? ' · suggested slot' : ''}</span></div></div>`;
    })
    .join('');
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** A 24-hour-style strip from wake to lights-out: when things happen, at a glance. */
function dayBar(e: Edition): string {
  const parse = labelMin;
  const a = Math.floor(parse(e.plan.wake) / 60) * 60;
  let z = Math.ceil(parse(e.plan.lightsOut) / 60) * 60;
  if (z <= a) z += 24 * 60;
  const span = z - a;
  const pct = (m: number) => Math.max(0, Math.min(100, ((m - a) / span) * 100));
  const exact = e.items.filter((i) => i.startTime);
  const blocks = exact
    .map((i) => {
      const s0 = mins(i.startTime!);
      const dur = i.endTime ? Math.max(15, mins(i.endTime) - s0) : i.group === 'fitness' ? 60 : i.group === 'appointment' ? 45 : 30;
      return `<i class="blk g-${i.group}${i.suggested ? ' sug' : ''}" style="left:${pct(s0).toFixed(2)}%;width:${Math.max(1.2, (dur / span) * 100).toFixed(2)}%" title="${esc(i.title)}"></i>`;
    })
    .join('');
  const ticks: string[] = [];
  for (let m = a; m <= z; m += 180) {
    const h = (m / 60) % 24;
    const lab = `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
    ticks.push(`<span style="left:${pct(m).toFixed(2)}%">${lab}</span>`);
  }
  return `<div class="p-daybar"><div class="track">${blocks}</div><div class="ticks">${ticks.join('')}</div></div>`;
}

/** A write-in pad that absorbs leftover height so every column ends flush with the page. */
function fill(title: string): string {
  return `<div class="p-fill"><div class="p-h cap">${esc(title)}</div><div class="lines"></div></div>`;
}

function stats(e: Edition): string {
  const lenOf = (i: EditionItem) => (i.startTime && i.endTime ? mins(i.endTime) - mins(i.startTime) : 0);
  const train = e.items.filter((i) => i.group === 'fitness').reduce((a, i) => a + lenOf(i), 0);
  const open = openWindows(e.items).reduce((a, w) => a + w.len, 0);
  const tiles: [string, string, string][] = [[String(e.items.length), 'Items', '']];
  if (train) tiles.push([train % 60 ? String(train) : String(train / 60), 'Workout', train % 60 ? 'min' : 'h']);
  if (e.plan.calories) tiles.push([e.plan.calories.target.toLocaleString('en-US'), 'Kcal goal', '']);
  tiles.push([String(e.plan.waterLiters), 'Water', 'L']);
  if (open >= 60) tiles.push([String(Math.round(open / 6) / 10), 'Open time', 'h']);
  const dayEnd = e.items.filter((i) => i.endTime).map((i) => mins(i.endTime!)).sort((a, b) => a - b).pop();
  if (dayEnd) tiles.push([clockOf(dayEnd).replace(' ', ''), 'Day ends', '']);
  return `<div class="p-stats">${tiles
    .map(([v, l, u]) => `<div class="p-stat"><b>${esc(v)}${u ? `<small>${esc(u)}</small>` : ''}</b><span>${esc(l)}</span></div>`)
    .join('')}</div>`;
}

export function paperHtml(e: Edition, size: PaperSize = 'letter'): string {
  const px = PAPER_PX[size];
  const by = (g: EditionItem['group']) => e.items.filter((i) => i.group === g);

  // density: the more is on the page, the less each card repeats, so type stays readable
  const n = e.items.length;
  const d = n > 12 ? 2 : n > 8 ? 1 : 0;

  const cards: Card[] = [];
  by('fitness').forEach((i) => cards.push(fitnessCard(i, d)));
  const fuel = fuelCard(e);
  if (fuel) cards.push(fuel);
  const cel = by('celebration');
  if (cel.length) cards.push(celebrationCard(cel, d));
  by('appointment').forEach((i) => cards.push(detailCard('Appointment', i, d)));
  by('social').forEach((i) => cards.push(detailCard('Family & Social', i, d)));
  by('leisure').forEach((i) => cards.push(detailCard(/movie|film/i.test(i.title) ? 'Movie night' : 'Unwind', i, d)));
  by('work').forEach((i) => cards.push(detailCard(i.category === 'meeting' ? 'Work · Meeting' : 'Deep work', i, d)));
  const tasks = by('task');
  if (tasks.length) cards.push(todoCard(tasks, d));
  cards.push(waterCard(e));
  const oc = openCard(e);
  if (oc) cards.push(oc);
  if (n <= 10) cards.push(windDownCard(e));

  // balance three columns by estimated height; column 0 starts with the timeline
  const cols: Card[][] = [[], [], []];
  const load = [n * 3.4 + 9, 0, 0];
  [...cards]
    .sort((a, b) => b.weight - a.weight)
    .forEach((c) => {
      let k = 0;
      for (let j = 1; j < 3; j++) if (load[j]! < load[k]!) k = j;
      cols[k]!.push(c);
      load[k] = load[k]! + c.weight;
    });
  const order = new Map(cards.map((c, i) => [c, i]));
  const tag = (c: Card) => c.html.replace('<section class="card', `<section data-i="${order.get(c)}" class="card`);
  cols.forEach((col) => col.sort((a, b) => order.get(a)! - order.get(b)!));

  const m = e.masthead;
  const mastClass = m.length > 38 ? 'xlong' : m.length > 24 ? 'long' : '';
  const reminders = e.items.filter((i) => i.reminder || i.priority === 'high');
  const editor = e.sections.find((s) => s.type === 'editorsNote')?.items?.[0]?.lines[0] ?? '';

  return `<div class="paper" data-size="${size}" style="--pw:${px.w}px;--ph:${px.h}px">
  <header class="p-mast">
    <div class="p-mast-top cap"><span>Vol. ${String(e.editionNo).padStart(3, '0')} · Personal Edition</span><span>${esc(e.dateDisplay)}</span></div>
    <h1 class="${mastClass}">${esc(m)}</h1>
    <div class="p-rhythm">
      <div><span class="cap">Wake</span><b>${esc(e.plan.wake)}</b></div>
      <div><span class="cap">First move</span><b>${esc(e.plan.firstMove ?? '—')}</b></div>
      <div><span class="cap">Last item</span><b>${esc(e.plan.lastItem ?? '—')}</b></div>
      <div><span class="cap">Lights out</span><b>${esc(e.plan.lightsOut)}</b></div>
      <div><span class="cap">On the page</span><b>${e.items.length} item${e.items.length === 1 ? '' : 's'}</b></div>
    </div>
  </header>

  <section class="p-top">
    <div class="p-lead"><div class="kick cap">Your say</div><h2>${esc(e.leadHeadline)}</h2><p>${esc(e.leadBody)}</p></div>
    ${
      e.quote
        ? `<aside class="p-quote"><q>${esc(e.quote.text)}</q><cite class="cap">— ${esc(e.quote.author)}</cite></aside>`
        : ''
    }
  </section>

  ${dayBar(e)}
  ${stats(e)}

  <main class="p-body">
    <div class="p-col"><div class="p-h cap">Run of day</div>${timeline(e.items)}${cols[0]!.map(tag).join('')}${fill('Three wins for today')}</div>
    <div class="p-col">${cols[1]!.map(tag).join('')}${fill('Notes')}</div>
    <div class="p-col">${cols[2]!.map(tag).join('')}${fill('Next up')}</div>
  </main>

  <footer class="p-foot">
    <p>${esc(editor)}</p>
    <div class="rem">${
      reminders.length
        ? `<div class="cap" style="color:var(--steel);margin-bottom:.3em">Do not forget</div>` +
          reminders
            .slice(0, 4)
            .map((r) => `<div><b>${esc(r.reminder ?? r.timeLabel)}</b> — ${esc(r.title)}</div>`)
            .join('')
        : ''
    }</div>
  </footer>
  <div class="p-bar cap"><span>${esc(m)}</span><span>Made with The Daily Edition</span></div>
</div>`;
}
