import type { Movie } from '@/features/editions/movies';

/**
 * Optional live movie feed (TMDB). Set TMDB_API_KEY to get genuinely current
 * titles; without it the curated list is used. Short timeout, cached 6 h, and
 * any failure returns null so the page never waits on or breaks because of it.
 */
let cache: { at: number; movies: Movie[] } | null = null;

export async function liveMovies(): Promise<Movie[] | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  if (cache && Date.now() - cache.at < 6 * 3600_000) return cache.movies;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3000);
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1&api_key=${encodeURIComponent(key)}`,
      { signal: ctl.signal, cache: 'no-store' }
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const j = (await res.json()) as { results?: { title?: string; release_date?: string; vote_average?: number; popularity?: number }[] };
    const movies = (j.results ?? [])
      .filter((m) => m.title && (m.vote_average ?? 0) >= 6.3)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 8)
      .map((m) => ({
        title: `${m.title} (${(m.release_date ?? '').slice(0, 4) || 'new'})`,
        note: `now playing · rated ${(m.vote_average ?? 0).toFixed(1)}/10`,
      }));
    if (movies.length === 0) return null;
    cache = { at: Date.now(), movies };
    return movies;
  } catch {
    return null;
  }
}
