// Parse-free search over a build-time index. Parsing a 1 MB JSON array and then
// scanning thousands of objects is slow on a cold isolate (V8 runs it in the
// interpreter), which is what the Workers free-plan CPU limit measures. Here the
// index is one text line per entry, so candidate lines are found with native
// string search and only the top hits are ever JSON-parsed. Candidates are
// ranked by the same scoreEntry() as searchIndex(), so results are identical.

import { compactKey, expandQuery, searchTokens } from './normalize.ts';
import { scoreEntry, type SearchableEntry } from './search.ts';
import { topK } from './top-k.ts';

const FIELD = '\u0001';
const BODY = '\u0002';
const clean = (value: string) => value.replace(/[\u0001\u0002\r\n]/g, ' ');

/**
 * One line per entry: `slug FIELD key FIELD title-words FIELD rank FIELD title BODY json`.
 * The JSON is the entry without its search key (what the API returns).
 */
export function encodeLines<T extends SearchableEntry & { s: string }>(entries: T[]): string {
  return entries.map(entry => {
    const { k, ...publicEntry } = entry;
    const header = [clean(entry.s), clean(k), searchTokens(entry.t).join(' '), entry.r ?? '', clean(entry.t)].join(FIELD);
    return `${header}${BODY}${JSON.stringify(publicEntry)}`;
  }).join('\n');
}

export class LineIndex<T extends { s: string }> {
  private readonly text: string;

  constructor(text: string) {
    this.text = text;
  }

  private lineEnd(from: number) {
    const end = this.text.indexOf('\n', from);
    return end < 0 ? this.text.length : end;
  }

  /** Start offsets of every line whose header (not its JSON body) contains `needle`. */
  private linesContaining(needle: string, into: Set<number>) {
    const { text } = this;
    let from = 0;
    for (;;) {
      const at = text.indexOf(needle, from);
      if (at < 0) return;
      const start = text.lastIndexOf('\n', at) + 1;
      if (at < text.indexOf(BODY, start)) into.add(start);
      from = this.lineEnd(at) + 1;
    }
  }

  private rank(starts: Iterable<number>, query: string, tokens: string[], limit: number) {
    const { text } = this;
    const hits: Array<{ start: number; end: number; body: number; title: string; score: number }> = [];
    for (const start of starts) {
      const body = text.indexOf(BODY, start);
      const header = text.slice(start, body);
      // Cheap native pre-check: a match needs the whole query, or every word, in the header.
      if (!header.includes(query) && !(tokens.length > 1 && tokens.every(token => header.includes(token)))) continue;
      const [, key, , rank, title] = header.split(FIELD);
      const score = scoreEntry({ t: title, k: key, r: rank ? Number(rank) : undefined }, query, tokens);
      if (score > 0) hits.push({ start, end: this.lineEnd(body), body, title, score });
    }
    return topK(hits, limit, (a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }

  search(rawQuery: string, limit = 8): Array<Omit<T, 'k'>> {
    const { text } = this;
    const raw = rawQuery.slice(0, 100);
    const query = expandQuery(raw);
    if (query.length < 2) return [];
    const tokens = searchTokens(raw).map(compactKey).filter(token => token.length > 1);
    const toEntries = (hits: Array<{ body: number; end: number }>) => hits.map(hit => JSON.parse(text.slice(hit.body + 1, hit.end)));

    // Titles that start with the query (or equal it) score at least 500; titles that only contain
    // it score at most 499. When enough of the former exist, the rest cannot change the top hits.
    const leading = new Set<number>();
    this.linesContaining(FIELD + query, leading);
    this.linesContaining('|' + query, leading);
    const sorted = (set: Set<number>) => [...set].sort((a, b) => a - b);
    const top = this.rank(sorted(leading), query, tokens, limit);
    if (top.length === limit && top[limit - 1].score >= 500) return toEntries(top);

    // A title matches by containing the whole query, or (with several words) every word;
    // both imply the line contains the query / the first word.
    const starts = new Set(leading);
    this.linesContaining(query, starts);
    if (tokens.length > 1) this.linesContaining(tokens[0], starts);
    return toEntries(this.rank(sorted(starts), query, tokens, limit));
  }

  bySlug(slug: string): Omit<T, 'k'> | undefined {
    const { text } = this;
    if (!slug || /[\u0001\u0002\r\n]/.test(slug)) return undefined;
    const prefix = `${slug}${FIELD}`;
    const start = text.startsWith(prefix) ? 0 : text.indexOf(`\n${prefix}`) + 1;
    // indexOf() = -1 yields start 0, which is only valid when the first line matched.
    if (start === 0 && !text.startsWith(prefix)) return undefined;
    return JSON.parse(text.slice(text.indexOf(BODY, start) + 1, this.lineEnd(start)));
  }
}
