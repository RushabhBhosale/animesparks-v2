// The first `limit` items of a stable sort, without sorting everything. A full
// sort of a few hundred candidates costs thousands of comparator calls, which
// is slow while the isolate is still cold; this makes one comparison per item
// plus a few insertions.

export function topK<T>(items: Iterable<T>, limit: number, compare: (a: T, b: T) => number): T[] {
  if (limit <= 0) return [];
  const best: T[] = [];
  for (const item of items) {
    if (best.length === limit && compare(item, best[limit - 1]) >= 0) continue;
    // Stop after the last element that is not greater than `item`, so ties keep input order.
    let at = best.length;
    while (at > 0 && compare(item, best[at - 1]) < 0) at--;
    best.splice(at, 0, item);
    if (best.length > limit) best.pop();
  }
  return best;
}
