// Tier list model shared by the editor UI and tests.

export interface TierItem {
  slug: string;
  title: string;
  poster?: string;
}

export interface Tier {
  id: string;
  name: string;
  color: string;
  items: string[];
}

export interface TierList {
  title: string;
  tiers: Tier[];
  /** Added but not yet ranked. */
  pool: string[];
  items: Record<string, TierItem>;
  updatedAt: string;
}

export const DEFAULT_TIERS: Array<Pick<Tier, 'name' | 'color'>> = [
  { name: 'S', color: '#e8192c' },
  { name: 'A', color: '#f08a24' },
  { name: 'B', color: '#e3c53b' },
  { name: 'C', color: '#7bbf4a' },
  { name: 'D', color: '#4a8fd9' },
];

export const MAX_TIERS = 10;
export const MAX_ITEMS = 100;

export function newTierList(now: string): TierList {
  return {
    title: 'My anime tier list',
    tiers: DEFAULT_TIERS.map((tier, index) => ({ ...tier, id: `tier-${index}`, items: [] })),
    pool: [],
    items: {},
    updatedAt: now,
  };
}

export function itemCount(list: TierList): number {
  return Object.keys(list.items).length;
}

export function addItem(list: TierList, item: TierItem, now: string): TierList {
  if (list.items[item.slug] || itemCount(list) >= MAX_ITEMS) return list;
  return { ...list, items: { ...list.items, [item.slug]: item }, pool: [...list.pool, item.slug], updatedAt: now };
}

export function removeItem(list: TierList, slug: string, now: string): TierList {
  const items = { ...list.items };
  delete items[slug];
  return {
    ...list,
    items,
    pool: list.pool.filter(value => value !== slug),
    tiers: list.tiers.map(tier => ({ ...tier, items: tier.items.filter(value => value !== slug) })),
    updatedAt: now,
  };
}

/** Moves an item to a tier ('pool' for unranked) at an index (end when omitted). */
export function moveItem(list: TierList, slug: string, target: string, index: number | undefined, now: string): TierList {
  if (!list.items[slug]) return list;
  const strip = (values: string[]) => values.filter(value => value !== slug);
  const insert = (values: string[]) => {
    const copy = strip(values);
    const at = index === undefined ? copy.length : Math.max(0, Math.min(index, copy.length));
    copy.splice(at, 0, slug);
    return copy;
  };
  return {
    ...list,
    pool: target === 'pool' ? insert(list.pool) : strip(list.pool),
    tiers: list.tiers.map(tier => ({ ...tier, items: tier.id === target ? insert(tier.items) : strip(tier.items) })),
    updatedAt: now,
  };
}

export function addTier(list: TierList, now: string): TierList {
  if (list.tiers.length >= MAX_TIERS) return list;
  const id = `tier-${Date.parse(now) || list.tiers.length}-${list.tiers.length}`;
  return { ...list, tiers: [...list.tiers, { id, name: 'New', color: '#8d8d8d', items: [] }], updatedAt: now };
}

/** Removing a tier sends its items back to the unranked pool. */
export function removeTier(list: TierList, id: string, now: string): TierList {
  const tier = list.tiers.find(item => item.id === id);
  if (!tier || list.tiers.length <= 1) return list;
  return { ...list, tiers: list.tiers.filter(item => item.id !== id), pool: [...list.pool, ...tier.items], updatedAt: now };
}

export function moveTier(list: TierList, id: string, direction: -1 | 1, now: string): TierList {
  const index = list.tiers.findIndex(tier => tier.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.tiers.length) return list;
  const tiers = [...list.tiers];
  [tiers[index], tiers[target]] = [tiers[target], tiers[index]];
  return { ...list, tiers, updatedAt: now };
}

export function isValidColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** Restores a stored list, discarding anything malformed. */
export function restoreTierList(input: unknown, now: string): TierList {
  const raw = input as Partial<TierList> | null;
  if (!raw || !Array.isArray(raw.tiers) || typeof raw.items !== 'object' || !raw.items) return newTierList(now);
  const items: Record<string, TierItem> = {};
  for (const [slug, item] of Object.entries(raw.items).slice(0, MAX_ITEMS)) {
    if (item && typeof item.title === 'string' && /^[a-z0-9-]{1,120}$/.test(slug)) items[slug] = { slug, title: item.title, poster: item.poster };
  }
  const placed = new Set<string>();
  const keep = (values: unknown) => (Array.isArray(values) ? values : []).filter((slug): slug is string => typeof slug === 'string' && Boolean(items[slug]) && !placed.has(slug) && Boolean(placed.add(slug)));
  const tiers = raw.tiers.slice(0, MAX_TIERS).map((tier, index) => ({
    id: typeof tier?.id === 'string' ? tier.id : `tier-${index}`,
    name: typeof tier?.name === 'string' ? tier.name.slice(0, 24) : '?',
    color: typeof tier?.color === 'string' && isValidColor(tier.color) ? tier.color : '#8d8d8d',
    items: keep(tier?.items),
  }));
  const pool = keep(raw.pool);
  for (const slug of Object.keys(items)) if (!placed.has(slug)) pool.push(slug);
  return { title: typeof raw.title === 'string' ? raw.title.slice(0, 80) : 'My anime tier list', tiers: tiers.length ? tiers : newTierList(now).tiers, pool, items, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now };
}
