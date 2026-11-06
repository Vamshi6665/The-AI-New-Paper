import type { Edition } from '@/types/edition';
import { paperHtml } from '@/features/paper/paper';
import { PAPER_CSS, FONT_LINK } from '@/features/paper/paper-css';
import { FIT_SCRIPT } from '@/features/paper/fit';
import { PAPER_PX, type PaperSize } from '@/features/paper/sizes';

/**
 * Standalone document for the server-side PDF. It embeds the exact same paper
 * markup, stylesheet and fit logic the browser uses, so PDF == screen == print.
 */
export function renderEditionHtml(edition: Edition, opts: { paperSize?: PaperSize } = {}): string {
  const size: PaperSize = opts.paperSize ?? 'letter';
  const px = PAPER_PX[size];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${edition.masthead.replace(/[<>&]/g, '')} — ${edition.dateDisplay}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_LINK}">
<style>
@page{size:${px.css};margin:0}
html,body{margin:0;padding:0;background:#fff}
${PAPER_CSS}
</style></head><body>
${paperHtml(edition, size)}
<script>${FIT_SCRIPT}
(function(){var p=document.querySelector('.paper');if(!p)return;
function go(){window.__fitPaper(p);document.documentElement.setAttribute('data-fit','1')}
go();if(document.fonts&&document.fonts.ready){document.fonts.ready.then(go)}})();
</script></body></html>`;
}
