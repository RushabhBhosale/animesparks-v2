import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRegistry } from '../../src/lib/characters/registry.ts';
import { PROFILES, SERIES } from '../../src/lib/characters/data/index.ts';
import { completenessProblems, integrityErrors } from '../../src/lib/characters/validate.ts';
import { castGraph, egoGraph, familyForest, familyTree } from '../../src/lib/characters/graph.ts';
import { orderingsDiffer, releaseOrdered, storyOrdered } from '../../src/lib/characters/timeline.ts';
import { checkpointIndex, refLabel } from '../../src/lib/characters/format.ts';
import { searchText } from '../../src/lib/characters/search.ts';
import type { CharacterProfile, SeriesData } from '../../src/lib/characters/types.ts';

const registry = buildRegistry();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe('character data', () => {
  it('publishes every shipped profile (none is silently skipped as incomplete)', () => {
    assert.deepEqual(registry.skipped, []);
    assert.equal(registry.profiles.length, PROFILES.length);
    assert.ok(registry.profiles.length >= 10, 'the initial release needs 10-15 profiles');
  });

  it('has resolvable references everywhere', () => {
    assert.deepEqual(integrityErrors(SERIES, PROFILES), []);
  });

  it('gives each series hub at least two profiles', () => {
    for (const hub of registry.hubs) assert.ok(hub.profiles.length >= 2, hub.slug);
    for (const series of registry.series) assert.ok(series.profiles.length >= 1);
  });

  it('keeps slugs unique and lowercase', () => {
    const slugs = PROFILES.map(profile => profile.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs) assert.match(slug, /^[a-z0-9-]+$/);
  });

  it('keeps SEO titles and descriptions unique across profiles', () => {
    const titles = PROFILES.map(profile => profile.seo.title);
    const descriptions = PROFILES.map(profile => profile.seo.description);
    assert.equal(new Set(titles).size, titles.length);
    assert.equal(new Set(descriptions).size, descriptions.length);
  });

  it('asks for a verification date no later than today', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const profile of PROFILES) assert.ok(profile.meta.verifiedAt <= today, profile.slug);
  });
});

describe('validation catches broken data', () => {
  const base = (): { series: SeriesData[]; profiles: CharacterProfile[] } => ({ series: clone(SERIES), profiles: clone(PROFILES) });

  it('rejects an unknown checkpoint', () => {
    const { series, profiles } = base();
    profiles[0].biography[0].spoiler = 'does-not-exist';
    assert.match(integrityErrors(series, profiles).join('\n'), /unknown checkpoint/);
  });

  it('rejects relationships to people who are not in the cast', () => {
    const { series, profiles } = base();
    series[0].relationships[0].b = 'nobody';
    assert.match(integrityErrors(series, profiles).join('\n'), /unknown character nobody/);
  });

  it('rejects timeline events without an episode or chapter reference', () => {
    const { series, profiles } = base();
    series[0].timeline[0].anime = undefined;
    series[0].timeline[0].manga = undefined;
    assert.match(integrityErrors(series, profiles).join('\n'), /no episode or chapter reference/);
  });

  it('rejects abilities that cite missing battles or power systems', () => {
    const { series, profiles } = base();
    profiles[0].abilities[0].battles = ['nope'];
    profiles[0].abilities[1].system = 'nope';
    const errors = integrityErrors(series, profiles).join('\n');
    assert.match(errors, /missing battle nope/);
    assert.match(errors, /unknown power system nope/);
  });

  it('does not publish a thin profile', () => {
    const { series, profiles } = base();
    const thin = profiles[0];
    thin.biography = thin.biography.slice(0, 1);
    thin.abilities = [];
    assert.ok(completenessProblems(thin, series[0]).length >= 2);
    const result = buildRegistry(series, profiles);
    assert.ok(result.skipped.some(item => item.slug === thin.slug));
    assert.ok(!result.bySlug.has(thin.slug));
    // Cast links to the unpublished profile are dropped so no page links to a 404.
    assert.equal(result.seriesBySlug.get(thin.series)!.cast.find(member => member.id === thin.id)!.profile, undefined);
  });

  it('throws when references are inconsistent', () => {
    const { series, profiles } = base();
    profiles[0].related = ['ghost'];
    assert.throws(() => buildRegistry(series, profiles), /inconsistent/);
  });
});

describe('spoiler protection', () => {
  // Words that announce a major outcome. They may appear in spoiler-tagged content only.
  const LOUD = /\b(dies|died|dead|deceased|revived|resurrect\w*|unsealed|defeated|disintegrat\w+|killed (?:by|in)|(?:is|was|gets) killed|prison realm|death(?! ?[- ]?(?:painting|match|game)))\b/i;

  it('keeps outcome words out of content that is visible by default', () => {
    const offenders: string[] = [];
    const check = (where: string, text: string | undefined, spoiler?: string) => { if (!spoiler && text && LOUD.test(text)) offenders.push(`${where}: ${text.slice(0, 90)}`); };
    for (const profile of PROFILES) {
      check(`${profile.slug} overview`, profile.overview);
      profile.facts.forEach(fact => check(`${profile.slug} fact ${fact.label}`, `${fact.value} ${fact.note || ''}`, fact.spoiler));
      for (const group of [profile.biography, profile.personality, profile.development]) group.forEach(block => check(`${profile.slug} block ${block.heading}`, block.text, block.spoiler));
      profile.motivations.forEach(text => check(`${profile.slug} motivation`, text));
      profile.abilities.forEach(ability => check(`${profile.slug} ability ${ability.id}`, [ability.summary, ...ability.strengths, ...ability.limits, ability.evolution].join(' '), ability.spoiler));
      profile.battles.forEach(battle => check(`${profile.slug} battle ${battle.id}`, `${battle.title} ${battle.outcome} ${battle.summary}`, battle.spoiler));
      profile.faq.forEach(item => check(`${profile.slug} faq`, `${item.question} ${item.answer}`, item.spoiler));
      profile.adaptation.forEach(note => check(`${profile.slug} adaptation`, `${note.anime} ${note.manga}`, note.spoiler));
      check(`${profile.slug} seo`, `${profile.seo.title} ${profile.seo.description}`);
    }
    for (const series of SERIES) {
      series.timeline.forEach(event => check(`${series.slug} event ${event.id}`, `${event.title} ${event.summary}`, event.spoiler));
      series.relationships.forEach(item => {
        check(`${series.slug} relationship ${item.id}`, item.summary, item.spoiler);
      });
      series.arcs.forEach(arc => check(`${series.slug} arc ${arc.id}`, arc.summary, arc.spoiler));
    }
    assert.deepEqual(offenders, []);
  });

  it('indexes checkpoints in order', () => {
    const series = SERIES[0];
    assert.equal(checkpointIndex(series, undefined), -1);
    assert.equal(checkpointIndex(series, series.checkpoints[2].id), 2);
    assert.equal(checkpointIndex(series, 'missing'), -1);
  });

  it('gives every profile with a death-like status a spoiler gate on the status', () => {
    for (const profile of PROFILES) {
      const grim = profile.status.manga.state !== 'alive' || profile.status.anime.state !== 'alive';
      if (grim) assert.ok(profile.status.spoiler, `${profile.slug}: non-living status must be spoiler-gated`);
    }
  });
});

describe('graphs and timelines', () => {
  const jjk = registry.seriesBySlug.get('jujutsu-kaisen')!;

  it('puts the focus character at the centre of an ego graph and links known profiles', () => {
    const graph = egoGraph('gojo', jjk.cast, jjk.relationships);
    const focus = graph.nodes.find(node => node.focus)!;
    assert.equal(focus.id, 'gojo');
    assert.equal(focus.x, graph.width / 2);
    assert.ok(graph.nodes.some(node => node.id === 'yuji' && node.profile === 'yuji-itadori'));
    assert.ok(graph.edges.every(edge => edge.from.id === 'gojo' || edge.to.id === 'gojo'));
    for (const node of graph.nodes) assert.ok(node.x > 0 && node.x < graph.width && node.y > 0 && node.y < graph.height);
  });

  it('lays out the whole cast without leaving the canvas', () => {
    const graph = castGraph(jjk.cast, jjk.relationships);
    assert.ok(graph.nodes.length >= 4);
    for (const node of graph.nodes) assert.ok(node.x > 0 && node.x < graph.width && node.y > 0 && node.y < graph.height);
  });

  it('builds a layered family tree only when there is a family to draw', () => {
    assert.equal(familyTree('gojo', jjk.cast, jjk.relationships), null);
    const cast = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D', profile: 'd' }];
    const rel = (id: string, a: string, b: string, kin: 'parent' | 'sibling' | 'spouse') => ({ id, a, b, type: 'family' as const, kin, summary: '', evolution: [] });
    const tree = familyTree('c', cast, [rel('1', 'a', 'c', 'parent'), rel('2', 'b', 'c', 'parent'), rel('3', 'a', 'b', 'spouse'), rel('4', 'c', 'd', 'sibling')])!;
    assert.equal(tree.generations, 2);
    const y = (id: string) => tree.nodes.find(node => node.id === id)!.y;
    assert.ok(y('a') < y('c'));
    assert.equal(y('a'), y('b'));
    assert.equal(y('c'), y('d'));
    assert.equal(tree.links.length, 4);
  });

  it('builds a family forest with every relative, profile or not', () => {
    const naruto = registry.seriesBySlug.get('naruto')!;
    const forest = familyForest(naruto.cast, naruto.relationships);
    assert.ok(forest.length >= 2);
    const names = forest.flatMap(tree => tree.nodes.map(node => node.name));
    for (const name of ['Minato Namikaze', 'Kushina Uzumaki', 'Naruto Uzumaki', 'Fugaku Uchiha', 'Mikoto Uchiha', 'Itachi Uchiha', 'Sasuke Uchiha']) assert.ok(names.includes(name), name);
    assert.ok(forest.every(tree => tree.nodes.every(node => !node.focus)));
  });

  it('distinguishes story order from release order', () => {
    assert.ok(orderingsDiffer(jjk.timeline, jjk));
    const story = storyOrdered(jjk.timeline).map(event => event.id);
    const release = releaseOrdered(jjk.timeline, jjk).map(event => event.id);
    // The 2006 flashback happens before the main story but airs in season 2.
    assert.ok(story.indexOf('hidden-inventory') < story.indexOf('yuji-swallows-finger'));
    assert.ok(release.indexOf('hidden-inventory') > release.indexOf('yuji-swallows-finger'));
    // Events that were never animated come after every animated one.
    assert.ok(release.indexOf('gojo-death') > release.indexOf('culling-game-start'));
  });

  it('formats references', () => {
    assert.equal(refLabel({ ep: 28, ch: 74 }), 'Ep. 28 · ch. 74');
    assert.equal(refLabel({ ch: 236 }), 'Ch. 236');
    assert.equal(refLabel(undefined), '');
    assert.equal(refLabel({ ep: 5, ed: 'shippuden' }, { editions: [{ id: 'shippuden', label: 'Shippuden', offset: 1000 }] }), 'Shippuden ep. 5');
  });

  it('builds search text from names, aliases, series and abilities', () => {
    const gojo = registry.bySlug.get('gojo-satoru')!;
    const text = searchText(gojo, jjk);
    for (const word of ['satoru gojo', 'jujutsu kaisen', 'hollow purple', 'tokyo jujutsu high']) assert.ok(text.includes(word), word);
  });
});
