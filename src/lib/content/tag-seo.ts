import type { ArticleCard } from './types';

const minimumCoverage = 3;

// When two labels point to the exact same articles, retain the clearest
// subject label as the indexable archive. Other labels stay available to
// readers and crawlers can follow their links, but they do not compete in
// search or the XML sitemap.
const preferredLabels = new Map([
  ['jojo\'s bizarre adventure|steel ball run', 'Steel Ball Run'],
  ['future rudeus|oldeus|rudeus greyrat', 'Rudeus Greyrat'],
  ['cursed energy|power system', 'Cursed Energy'],
]);

function folded(value: string) {
  return value.toLocaleLowerCase('en');
}

export function tagIndexability(tags: string[], articles: ArticleCard[]) {
  const membership = new Map<string, string[]>();
  for (const tag of tags) {
    membership.set(tag, articles
      .filter(article => article.tags?.some(value => folded(value) === folded(tag)))
      .map(article => article.sanityId)
      .sort());
  }

  const groups = new Map<string, string[]>();
  for (const [tag, ids] of membership) {
    if (ids.length < minimumCoverage) continue;
    const signature = [...new Set(ids)].join('|');
    const labels = groups.get(signature) || [];
    labels.push(tag);
    groups.set(signature, labels);
  }

  const indexable = new Set<string>();
  for (const labels of groups.values()) {
    const groupKey = labels.map(folded).sort().join('|');
    const preferred = preferredLabels.get(groupKey);
    const representative = labels.find(tag => tag === preferred) || labels[0];
    if (representative) indexable.add(representative);
  }

  return new Map(tags.map(tag => [tag, indexable.has(tag)]));
}

export function isTagIndexable(tag: string, tags: string[], articles: ArticleCard[]) {
  return tagIndexability(tags, articles).get(tag) === true;
}
