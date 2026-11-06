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
  let lo = 0.5;
  let hi = 1.5;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    el.style.setProperty('--s', String(mid));
    if (overflows()) hi = mid;
    else lo = mid;
  }
  el.style.setProperty('--s', String(lo));
  return lo;
}

export const FIT_SCRIPT = `window.__fitPaper=${fitPaper.toString()};`;
