// Integrity and completeness checks. Integrity errors fail the build (a broken
// reference would silently drop links). Completeness decides whether a profile
// is published at all: thin profiles never become indexable pages.

import type { CharacterProfile, Ref, SeriesData } from './types.ts';

export const MIN = {
  overview: 120, facts: 7, biography: 3, personality: 2, development: 1, motivations: 2,
  abilities: 3, battles: 2, appearances: 2, sources: 3, faq: 3, relationships: 2, events: 3,
} as const;

const hasRef = (ref: Ref | undefined) => Boolean(ref && (ref.ep !== undefined || ref.ch !== undefined || ref.other));
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function completenessProblems(profile: CharacterProfile, series: SeriesData): string[] {
  const problems: string[] = [];
  const need = (ok: boolean, message: string) => { if (!ok) problems.push(message); };
  need(profile.overview.length >= MIN.overview, `overview shorter than ${MIN.overview} characters`);
  need(profile.facts.length >= MIN.facts, `fewer than ${MIN.facts} quick facts`);
  need(profile.facts.some(fact => fact.confidence === 'confirmed'), 'no confirmed quick fact');
  need(profile.biography.length >= MIN.biography, `fewer than ${MIN.biography} biography blocks`);
  need(profile.personality.length >= MIN.personality, `fewer than ${MIN.personality} personality blocks`);
  need(profile.development.length >= MIN.development, 'no development section');
  need(profile.motivations.length >= MIN.motivations, `fewer than ${MIN.motivations} motivations`);
  need(profile.abilities.length >= MIN.abilities, `fewer than ${MIN.abilities} abilities`);
  need(profile.battles.length >= MIN.battles, `fewer than ${MIN.battles} battles`);
  need(profile.appearances.length >= MIN.appearances, `fewer than ${MIN.appearances} appearances`);
  need(profile.meta.sources.length >= MIN.sources, `fewer than ${MIN.sources} sources`);
  need(profile.faq.length >= MIN.faq, `fewer than ${MIN.faq} FAQ entries`);
  need(isDate(profile.meta.verifiedAt) && isDate(profile.meta.publishedAt), 'missing verification date');
  need(profile.related.length >= 1, 'no related characters');
  need(Boolean(profile.status.summary) && Boolean(profile.status.manga.label) && Boolean(profile.status.anime.label), 'incomplete status record');
  need(series.relationships.filter(item => item.a === profile.id || item.b === profile.id).length >= MIN.relationships, `fewer than ${MIN.relationships} relationships`);
  need(series.timeline.filter(item => item.characters.includes(profile.id)).length >= MIN.events, `fewer than ${MIN.events} timeline events`);
  need(profile.seo.title.length <= 70 && profile.seo.description.length >= 90 && profile.seo.description.length <= 170, 'SEO title/description out of range');
  return problems;
}

/** Integrity: every id, checkpoint and reference must resolve. */
export function integrityErrors(seriesList: SeriesData[], profiles: CharacterProfile[]): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const seriesSlugs = new Set(seriesList.map(item => item.slug));
  for (const profile of profiles) {
    if (slugs.has(profile.slug)) errors.push(`duplicate profile slug ${profile.slug}`);
    slugs.add(profile.slug);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(profile.slug)) errors.push(`${profile.slug}: slug must be lowercase kebab-case`);
  }
  for (const series of seriesList) {
    const where = (text: string) => `${series.slug}: ${text}`;
    const checkpoints = new Set(series.checkpoints.map(item => item.id));
    const spoiler = (id: string | undefined, label: string) => { if (id && !checkpoints.has(id)) errors.push(where(`${label} uses unknown checkpoint "${id}"`)); };
    const cast = new Map(series.cast.map(member => [member.id, member]));
    if (cast.size !== series.cast.length) errors.push(where('duplicate cast ids'));
    if (checkpoints.size !== series.checkpoints.length) errors.push(where('duplicate checkpoint ids'));
    for (const member of series.cast) if (member.profile && !slugs.has(member.profile)) errors.push(where(`cast ${member.id} points at missing profile ${member.profile}`));
    for (const arc of series.arcs) spoiler(arc.spoiler, `arc ${arc.id}`);
    const arcIds = new Set(series.arcs.map(item => item.id));
    const systemIds = new Set(series.powerSystems.map(item => item.id));
    const eventIds = new Set<string>();
    const orders = new Set<number>();
    for (const event of series.timeline) {
      if (eventIds.has(event.id)) errors.push(where(`duplicate event ${event.id}`));
      eventIds.add(event.id);
      if (orders.has(event.storyOrder)) errors.push(where(`event ${event.id} reuses storyOrder ${event.storyOrder}`));
      orders.add(event.storyOrder);
      spoiler(event.spoiler, `event ${event.id}`);
      if (event.arc && !arcIds.has(event.arc)) errors.push(where(`event ${event.id} has unknown arc ${event.arc}`));
      if (!hasRef(event.anime) && !hasRef(event.manga)) errors.push(where(`event ${event.id} has no episode or chapter reference`));
      for (const id of event.characters) if (!cast.has(id)) errors.push(where(`event ${event.id} references unknown character ${id}`));
    }
    const relIds = new Set<string>();
    for (const relation of series.relationships) {
      if (relIds.has(relation.id)) errors.push(where(`duplicate relationship ${relation.id}`));
      relIds.add(relation.id);
      for (const id of [relation.a, relation.b]) if (!cast.has(id)) errors.push(where(`relationship ${relation.id} references unknown character ${id}`));
      if (relation.a === relation.b) errors.push(where(`relationship ${relation.id} connects a character to themselves`));
      if (relation.type === 'family' && !relation.kin) errors.push(where(`family relationship ${relation.id} needs kin`));
      spoiler(relation.spoiler, `relationship ${relation.id}`);
      relation.evolution.forEach(step => spoiler(step.spoiler, `relationship ${relation.id} evolution`));
    }
    for (const profile of profiles.filter(item => item.series === series.slug)) {
      const label = (text: string) => `${profile.slug}: ${text}`;
      if (cast.get(profile.id)?.profile !== profile.slug) errors.push(label(`cast entry ${profile.id} must point back at this profile`));
      for (const fact of profile.facts) spoiler(fact.spoiler, label(`fact ${fact.label}`));
      for (const group of [profile.biography, profile.personality, profile.development]) group.forEach(block => spoiler(block.spoiler, label('block')));
      spoiler(profile.status.spoiler, label('status'));
      profile.status.events.forEach(event => { spoiler(event.spoiler, label(`status event ${event.id}`)); if (!hasRef(event.anime) && !hasRef(event.manga)) errors.push(label(`status event ${event.id} has no episode or chapter reference`)); });
      profile.adaptation.forEach(note => spoiler(note.spoiler, label('adaptation note')));
      profile.faq.forEach(item => spoiler(item.spoiler, label('faq')));
      const battleIds = new Set(profile.battles.map(item => item.id));
      for (const battle of profile.battles) {
        spoiler(battle.spoiler, label(`battle ${battle.id}`));
        if (!hasRef(battle.ref)) errors.push(label(`battle ${battle.id} has no reference`));
        if (battle.event && !eventIds.has(battle.event)) errors.push(label(`battle ${battle.id} points at missing event ${battle.event}`));
      }
      for (const ability of profile.abilities) {
        spoiler(ability.spoiler, label(`ability ${ability.id}`));
        if (!hasRef(ability.introduced)) errors.push(label(`ability ${ability.id} has no introduction reference`));
        if (ability.system && !systemIds.has(ability.system)) errors.push(label(`ability ${ability.id} uses unknown power system ${ability.system}`));
        for (const id of ability.battles || []) if (!battleIds.has(id)) errors.push(label(`ability ${ability.id} cites missing battle ${id}`));
      }
      for (const slug of profile.related) if (!slugs.has(slug) || slug === profile.slug) errors.push(label(`related profile ${slug} is missing`));
    }
    if (!seriesSlugs.has(series.slug)) errors.push(where('series missing'));
  }
  for (const profile of profiles) if (!seriesSlugs.has(profile.series)) errors.push(`${profile.slug}: unknown series ${profile.series}`);
  return errors;
}
