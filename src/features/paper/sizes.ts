export type PaperSize = 'letter' | 'a4';
/** CSS px at 96dpi */
export const PAPER_PX: Record<PaperSize, { w: number; h: number; css: string }> = {
  letter: { w: 816, h: 1056, css: 'Letter' },
  a4: { w: 794, h: 1123, css: 'A4' },
};
