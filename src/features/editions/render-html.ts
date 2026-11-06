import type { Edition, NewspaperSection } from '@/types/edition';

/**
 * Canonical standalone HTML for an edition — used by the server-side PDF path.
 * The React <NewspaperView> renders the SAME document model on screen, so the
 * preview and the PDF are one design, not two (spec §13).
 */

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

function sectionHtml(s: NewspaperSection): string {
  if (s.type === 'agenda') {
    const rows = (s.rows ?? [])
      .map(
        (r) =>
          `<tr><td class="t">${esc(r.time)}</td><td class="e"><b>${esc(r.title)}</b><span>${esc(r.details)}</span></td></tr>`
      )
      .join('');
    const anytime = s.items?.[0];
    const anytimeHtml = anytime
      ? `<div class="anytime"><div class="ah">${esc(anytime.heading ?? 'Anytime Today')}</div>${anytime.lines
          .map((l) => `<div class="al">• ${esc(l)}</div>`)
          .join('')}</div>`
      : '';
    return `<section class="sec"><h2>${esc(s.title)}</h2><table class="agenda">${rows}</table>${anytimeHtml}</section>`;
  }

  if (s.type === 'glance') {
    const lines = s.items?.[0]?.lines ?? [];
    return `<section class="sec glance"><h2>${esc(s.title)}</h2><ul>${lines
      .map((l) => `<li>${esc(l)}</li>`)
      .join('')}</ul></section>`;
  }

  if (s.type === 'editorsNote') {
    return `<section class="sec note"><h2>${esc(s.title)}</h2><p>${esc(s.items?.[0]?.lines[0] ?? '')}</p></section>`;
  }

  // specialized + reminders
  const items = (s.items ?? [])
    .map((it) => {
      const head = it.heading ? `<h3>${esc(it.heading)}</h3>` : '';
      const lines = it.lines.map((l) => `<p>${esc(l)}</p>`).join('');
      const check = it.checklist?.length
        ? `<ul class="check">${it.checklist
            .map((c) => `<li>${c.completed ? '☑' : '☐'} ${esc(c.title)}</li>`)
            .join('')}</ul>`
        : '';
      return `<div class="item">${head}${lines}${check}</div>`;
    })
    .join('');
  return `<section class="sec"><h2>${esc(s.title)}</h2>${items}</section>`;
}

export function renderEditionHtml(
  ed: Edition,
  opts: { paperSize: 'letter' | 'a4' } = { paperSize: 'letter' }
): string {
  const missing =
    ed.missingEventIds.length > 0
      ? `<section class="sec missing"><h2>Also on your schedule</h2><p>These events could not be placed in a section and are listed here so nothing is lost:</p><ul>${ed.missingEventIds
          .map((id) => `<li>Event ${esc(id)}</li>`)
          .join('')}</ul></section>`
      : '';

  const body = ed.sections.map(sectionHtml).join('');

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Libre+Baskerville:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @page { size: ${opts.paperSize}; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Libre Baskerville', Georgia, serif; color: #161616; background: #fff; margin: 0; line-height: 1.5; }
  .edition { max-width: 820px; margin: 0 auto; }
  .mast { text-align: center; border-bottom: 4px double #161616; padding-bottom: 10px; }
  .mast .flags { display: flex; justify-content: space-between; font-family: 'Inter', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #666; padding-bottom: 8px; }
  .mast h1 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 54px; line-height: .9; margin: 0; letter-spacing: -1px; }
  .mast .tag { font-style: italic; font-size: 12px; color: #666; margin-top: 6px; letter-spacing: 1px; }
  .mast .sub { display: flex; justify-content: space-between; font-family: 'Inter', sans-serif; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; border-top: 1.5px solid #161616; border-bottom: 1.5px solid #161616; padding: 6px 2px; margin-top: 10px; color: #444; }
  .quote { text-align: center; font-style: italic; font-size: 14px; color: #333; padding: 12px 0; border-bottom: 1px solid #d8d8d8; }
  .quote span { display: block; font-style: normal; font-family: 'Inter', sans-serif; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #666; margin-top: 4px; }
  .lead { text-align: center; padding: 16px 0 14px; border-bottom: 2px solid #161616; }
  .lead .lcat { font-family: 'Inter', sans-serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #8a1c0a; margin-bottom: 6px; }
  .lead h2 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 32px; line-height: 1; margin: 0; letter-spacing: -.5px; }
  .lead .lbody { font-size: 12px; text-align: left; margin-top: 10px; column-count: 2; column-gap: 20px; }
  .cols { column-count: 2; column-gap: 26px; margin-top: 16px; }
  @media print { .cols { column-count: 2; } }
  .sec { break-inside: avoid; margin-bottom: 16px; border-bottom: 1px solid #d8d8d8; padding-bottom: 12px; }
  .sec h2 { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 17px; margin: 0 0 8px; border-bottom: 2px solid #161616; padding-bottom: 4px; }
  .sec h3 { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 14px; margin: 8px 0 3px; }
  .sec p { font-size: 12px; margin: 0 0 5px; }
  .glance ul { list-style: none; padding: 0; margin: 0; }
  .glance li { font-size: 12px; padding: 2px 0; border-bottom: 1px dotted #d8d8d8; font-family: 'Inter', sans-serif; }
  table.agenda { width: 100%; border-collapse: collapse; }
  table.agenda td { vertical-align: top; padding: 5px 0; border-bottom: 1px solid #e8e8e8; font-size: 12px; }
  table.agenda td.t { width: 78px; font-family: 'Inter', sans-serif; font-weight: 600; color: #161616; white-space: nowrap; }
  table.agenda td.e b { display: block; }
  table.agenda td.e span { color: #666; font-size: 11px; }
  .anytime { margin-top: 8px; }
  .anytime .ah { font-family: 'Inter', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 3px; }
  .anytime .al { font-size: 12px; }
  ul.check { list-style: none; padding: 0; margin: 4px 0 0; }
  ul.check li { font-size: 12px; font-family: 'Inter', sans-serif; padding: 1px 0; }
  .note p { font-style: italic; }
  .missing { border: 1.5px solid #161616; padding: 10px; }
  .foot { border-top: 2px solid #161616; margin-top: 10px; padding-top: 8px; text-align: center; font-family: 'Inter', sans-serif; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #666; }
</style></head>
<body><div class="edition">
  <div class="mast">
    <div class="flags"><span>Personal Edition</span><span>Vol. ${String(ed.editionNo).padStart(3, '0')}</span></div>
    <h1>${esc(ed.masthead)}</h1>
    <div class="tag">${esc(ed.tagline)}</div>
    <div class="sub"><span>${esc(ed.dateDisplay)}</span><span>${ed.sourceEventIds.length} events</span></div>
  </div>
  ${ed.quote ? `<div class="quote">&ldquo;${esc(ed.quote.text)}&rdquo; <span>— ${esc(ed.quote.author)}</span></div>` : ''}
  <div class="lead"><div class="lcat">Your Say</div><h2>${esc(ed.leadHeadline)}</h2>${ed.leadBody ? `<p class="lbody">${esc(ed.leadBody)}</p>` : ''}</div>
  <div class="cols">${body}${missing}</div>
  <div class="foot">${esc(ed.masthead)} · ${esc(ed.dateDisplay)} · Generated ${new Date(ed.generatedAt).toLocaleString('en-US')}</div>
</div></body></html>`;
}
