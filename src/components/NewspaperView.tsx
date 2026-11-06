'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Edition } from '@/types/edition';
import { paperHtml } from '@/features/paper/paper';
import { PAPER_CSS } from '@/features/paper/paper-css';
import { fitPaper } from '@/features/paper/fit';
import { PAPER_PX, type PaperSize } from '@/features/paper/sizes';

/**
 * The on-screen paper. It renders the SAME markup the PDF uses (paperHtml) and
 * fits it to exactly one page, then scales the sheet to the available width.
 */
export function NewspaperView({
  edition,
  size = 'letter',
  scale = true,
}: {
  edition: Edition;
  size?: PaperSize;
  scale?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const px = PAPER_PX[size];

  // fit type to the page whenever content/size changes, and again once fonts land
  useLayoutEffect(() => {
    const p = sheet.current?.querySelector('.paper') as HTMLElement | null;
    if (p) fitPaper(p);
  }, [edition, size]);
  useEffect(() => {
    const p = () => sheet.current?.querySelector('.paper') as HTMLElement | null;
    document.fonts?.ready.then(() => {
      const el = p();
      if (el) fitPaper(el);
    });
  }, [edition, size]);

  // scale the fixed-size sheet to its container (screen only)
  useEffect(() => {
    if (!scale) return;
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(Math.min(1, el.clientWidth / px.w)));
    ro.observe(el);
    setK(Math.min(1, el.clientWidth / px.w));
    return () => ro.disconnect();
  }, [px.w, scale]);

  return (
    <div ref={wrap} className="paper-wrap" style={scale ? { height: px.h * k } : undefined}>
      <style dangerouslySetInnerHTML={{ __html: PAPER_CSS }} />
      <div
        ref={sheet}
        className="paper-scale"
        style={scale ? { width: px.w, transform: `scale(${k})`, transformOrigin: 'top left' } : undefined}
        dangerouslySetInnerHTML={{ __html: paperHtml(edition, size) }}
      />
    </div>
  );
}
