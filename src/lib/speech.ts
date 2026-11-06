/**
 * Voice-transcript cleanup. Speech recognition returns "7 a.m.", "seven thirty",
 * "half past six" and no punctuation. Normalize those into the forms the
 * extractor understands, and split run-on speech at natural joins.
 */
const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const W = Object.keys(WORDS).join('|');
const MINS: Record<string, string> = { fifteen: '15', thirty: '30', 'forty five': '45', 'forty-five': '45', 'oh five': '05', 'oh ten': '10' };

export function normalizeSpeech(input: string): string {
  let t = ` ${input.replace(/\s+/g, ' ').trim()} `;
  // "half past seven" -> 7:30, "quarter past six" -> 6:15
  t = t.replace(new RegExp(`\\bhalf past (${W})\\b`, 'gi'), (_m, w: string) => `${WORDS[w.toLowerCase()]}:30`);
  t = t.replace(new RegExp(`\\bquarter past (${W})\\b`, 'gi'), (_m, w: string) => `${WORDS[w.toLowerCase()]}:15`);
  // "seven thirty" -> 7:30
  t = t.replace(
    new RegExp(`\\b(${W})\\s+(fifteen|thirty|forty[ -]five|oh five|oh ten)\\b`, 'gi'),
    (_m, w: string, mm: string) => `${WORDS[w.toLowerCase()]}:${MINS[mm.toLowerCase()]}`
  );
  // "at seven" / "by six" -> digits, only after a time-introducing word
  t = t.replace(
    new RegExp(`\\b(at|by|around|until|till|before|after|from|to) (${W})\\b(?! (?:people|items|things|times|minutes|hours|kg|pounds))`, 'gi'),
    (_m, pre: string, w: string) => `${pre} ${WORDS[w.toLowerCase()]}`
  );
  // "7 a.m." / "7 p.m." / "7am" spacing
  t = t.replace(/\b(\d{1,2}(?::\d{2})?)\s*([ap])\.?\s?m\.?/gi, (_m, n: string, ap: string) => `${n} ${ap.toLowerCase()}m`);
  t = t.replace(/\b(\d{1,2}(?::\d{2})?) o'?clock\b/gi, '$1');
  t = t.replace(/\bhalf an hour\b/gi, '30 minutes');
  return t.trim();
}
