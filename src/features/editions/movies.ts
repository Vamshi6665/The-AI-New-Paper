/**
 * Movie-night picks. Two sources:
 *  1. LIVE (optional): TMDB "now playing / popular" fetched server-side when
 *     TMDB_API_KEY is set (see src/server/movies.ts) — these are genuinely recent.
 *  2. CURATED (always available): well-loved films by mood, rotated by date so
 *     the paper does not repeat itself. This list is static (titles through 2025):
 *     it is a taste guide, not a "what's in theatres" feed.
 */
export interface Movie {
  title: string;
  note: string;
}

export type Mood = 'cosy' | 'family' | 'thrill' | 'laugh' | 'epic';

const POOL: Record<Mood, Movie[]> = {
  cosy: [
    { title: 'About Time (2013)', note: 'warm, funny, quietly moving' },
    { title: 'The Intern (2015)', note: 'easy feel-good comedy-drama' },
    { title: 'Paddington 2 (2017)', note: 'pure comfort for any age' },
    { title: 'Soul (2020)', note: 'gentle, beautiful, thoughtful' },
    { title: 'The Grand Budapest Hotel (2014)', note: 'stylish and charming caper' },
    { title: 'Little Miss Sunshine (2006)', note: 'bittersweet family road trip' },
  ],
  family: [
    { title: 'Inside Out 2 (2024)', note: 'big feelings, big laughs' },
    { title: 'The Wild Robot (2024)', note: 'tender, gorgeous animation' },
    { title: 'Coco (2017)', note: 'music, family, a good cry' },
    { title: 'Spider-Man: Across the Spider-Verse (2023)', note: 'dazzling and fast' },
    { title: 'Wicked (2024)', note: 'big musical spectacle' },
    { title: 'Paddington 2 (2017)', note: 'everyone ends up smiling' },
  ],
  thrill: [
    { title: 'Knives Out (2019)', note: 'a clever, fun whodunit' },
    { title: 'Prisoners (2013)', note: 'tense, dark, gripping' },
    { title: 'Gone Girl (2014)', note: 'twisty psychological thriller' },
    { title: 'Sinners (2025)', note: 'stylish, atmospheric horror-drama' },
    { title: 'Nightcrawler (2014)', note: 'sharp, unsettling night-city thriller' },
  ],
  laugh: [
    { title: 'Hot Fuzz (2007)', note: 'razor-sharp action comedy' },
    { title: 'Superbad (2007)', note: 'raucous coming-of-age laughs' },
    { title: 'The Nice Guys (2016)', note: 'buddy-noir with great banter' },
    { title: 'Game Night (2018)', note: 'a proper group-watch comedy' },
    { title: 'Challengers (2024)', note: 'sexy, stylish, tense' },
  ],
  epic: [
    { title: 'Dune: Part Two (2024)', note: 'huge scale, best on a big screen' },
    { title: 'Interstellar (2014)', note: 'space, time, and feelings' },
    { title: 'Arrival (2016)', note: 'thoughtful, emotional sci-fi' },
    { title: 'Oppenheimer (2023)', note: 'gripping three-hour epic' },
    { title: 'Mission: Impossible – The Final Reckoning (2025)', note: 'big, loud, fun action' },
  ],
};

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** pick `n` distinct films for a mood, rotated by a seed (e.g. the date) */
export function pickMovies(mood: Mood, seed: string, n = 3): Movie[] {
  const pool = POOL[mood];
  const start = hash(seed) % pool.length;
  return Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[(start + i) % pool.length]!);
}

/** mix of moods for a social, family evening */
export function pickMixed(moods: Mood[], seed: string): Movie[] {
  const out: Movie[] = [];
  moods.forEach((m, i) => {
    const pick = pickMovies(m, seed + i, 1)[0]!;
    if (!out.some((x) => x.title === pick.title)) out.push(pick);
  });
  return out;
}
