/**
 * Auto-fit: scale the paper's type (everything is in em) so the content fills
 * exactly one page — big and airy for a light day, tighter for a packed one.
 * Plain JS only (no TS helpers, no outer references): `FIT_SCRIPT` stringifies
 * this function so the server-rendered PDF page runs the identical logic.
 */
export function fitPaper(el: HTMLElement): number {
  const body = el.querySelector('.p-body') as HTMLElement | null;
  if (!body) return 1;
  const overflows = (): boolean => {
    if (el.scrollHeight > el.clientHeight + 1) return true;
    const cols = body.children;
    for (let i = 0; i < cols.length; i++) {
      if ((cols[i] as HTMLElement).scrollHeight > body.clientHeight + 1) return true;
    }
    return false;
  };
  // 1) balance: place cards (longest first) into the shortest column, measured for real,
  //    so the three columns end at nearly the same height and no area is left blank.
  const bodyEl = body as HTMLElement;
  if (!bodyEl.getAttribute('data-balanced')) {
    bodyEl.setAttribute('data-balanced', '1');
    el.style.setProperty('--s', '1');
    const cols: HTMLElement[] = [];
    for (let i = 0; i < body.children.length; i++) cols.push(body.children[i] as HTMLElement);
    const load = cols.map((c) => {
      let h = 0;
      for (let i = 0; i < c.children.length; i++) {
        const x = c.children[i] as HTMLElement;
        if (!x.classList.contains('card') && !x.classList.contains('p-fill')) h += x.offsetHeight;
      }
      return h;
    });
    const cards: { node: HTMLElement; h: number; idx: number }[] = [];
    cols.forEach((c) => {
      const mine = c.querySelectorAll(':scope > .card');
      for (let i = 0; i < mine.length; i++) {
        const node = mine[i] as HTMLElement;
        cards.push({ node, h: node.offsetHeight + 10, idx: Number(node.getAttribute('data-i')) });
      }
    });
    const placed: { node: HTMLElement; idx: number }[][] = cols.map(() => []);
    cards
      .slice()
      .sort((a, b) => b.h - a.h)
      .forEach((c) => {
        let k = 0;
        for (let j = 1; j < cols.length; j++) if (load[j]! < load[k]!) k = j;
        placed[k]!.push(c);
        load[k] = load[k]! + c.h;
      });
    cols.forEach((c, k) => {
      const fillEl = c.querySelector(':scope > .p-fill');
      placed[k]!
        .sort((a, b) => a.idx - b.idx)
        .forEach((p) => c.insertBefore(p.node, fillEl));
    });
  }

  // 2) fit: the largest type scale at which nothing overflows
  let lo = 0.5;
  let hi = 1.5;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    el.style.setProperty('--s', String(mid));
    if (overflows()) hi = mid;
    else lo = mid;
  }
  el.style.setProperty('--s', String(lo));
  // 3) a write-in pad too small to be useful is hidden rather than shown as a stub
  const pads = body.querySelectorAll('.p-fill');
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i] as HTMLElement;
    pad.style.visibility = 'visible';
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    if (pad.clientHeight < fs * 3.4) pad.style.visibility = 'hidden';
  }
  return lo;
}

export const FIT_SCRIPT = `window.__fitPaper=${fitPaper.toString()};`;
