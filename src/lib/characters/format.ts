import type { CheckpointId, Ref, SeriesData } from './types.ts';

/** "Ep. 28 · Ch. 74" style label. Empty when the ref carries nothing. */
export function refLabel(ref: Ref | undefined, series?: Pick<SeriesData, 'editions'>): string {
  if (!ref) return '';
  const parts: string[] = [];
  if (ref.ep !== undefined) {
    const edition = ref.ed ? series?.editions?.find(item => item.id === ref.ed)?.label : '';
    parts.push(`${edition ? `${edition} ` : ''}ep. ${ref.ep}`);
  }
  if (ref.ch !== undefined) parts.push(`ch. ${ref.ch}`);
  if (ref.other) parts.push(ref.other);
  return parts.join(' · ').replace(/^./, char => char.toUpperCase());
}

/** Position of a checkpoint in the series' ordered list; -1 for "no spoilers". */
export function checkpointIndex(series: Pick<SeriesData, 'checkpoints'>, id: CheckpointId | undefined): number {
  if (!id) return -1;
  return series.checkpoints.findIndex(checkpoint => checkpoint.id === id);
}

/** Absolute sort key for an anime reference, using edition offsets when a series has several numberings. */
export function animeSeq(ref: Ref | undefined, series: Pick<SeriesData, 'editions'>): number | undefined {
  if (!ref || ref.ep === undefined) return undefined;
  const offset = ref.ed ? series.editions?.find(item => item.id === ref.ed)?.offset ?? 0 : 0;
  return offset + ref.ep;
}

export function chapterNumber(ref: Ref | undefined): number | undefined {
  if (!ref || ref.ch === undefined) return undefined;
  const value = typeof ref.ch === 'number' ? ref.ch : parseFloat(String(ref.ch));
  return Number.isFinite(value) ? value : undefined;
}

export const CONFIDENCE_LABEL = {
  confirmed: 'Confirmed',
  estimate: 'Estimate',
  disputed: 'Differs by medium',
  unknown: 'Unknown',
} as const;

export const ABILITY_KIND_LABEL = {
  innate: 'Innate trait',
  technique: 'Technique',
  domain: 'Domain',
  transformation: 'Transformation',
  weapon: 'Weapon',
  skill: 'Skill',
  'power-up': 'Power-up',
} as const;

export const RELATION_LABEL = {
  family: 'Family',
  friend: 'Friend',
  rival: 'Rival',
  mentor: 'Mentor / student',
  romance: 'Romance',
  ally: 'Ally',
  enemy: 'Enemy',
} as const;
