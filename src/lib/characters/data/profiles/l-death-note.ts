import type { CharacterProfile } from '../../types.ts';

export const lDeathNote: CharacterProfile = {
  slug: 'l-death-note',
  id: 'l',
  series: 'death-note',
  name: 'L',
  native: 'L (エル, Eru)',
  aliases: ['L', 'Ryuzaki', 'Hideki Ryuga'],
  role: 'The world’s greatest detective, who hunts Kira',
  affiliations: ['Japanese police task force (as its adviser)'],
  abilityTags: ['Deduction', 'Investigation', 'Decoys', 'Strategy'],
  overview: 'L is a detective whose identity is kept secret from the world. He is called in to catch Kira, the killer who can kill from afar, and he suspects Light Yagami early on. The story is the duel between the two.',
  facts: [
    { label: 'Birthday', value: 'October 31', confidence: 'confirmed' },
    { label: 'Birth year', value: '1979 in the manga; 1982 in the anime', confidence: 'disputed', note: 'The Death Note Wiki lists different birth years for the two versions.' },
    { label: 'Age', value: '24–25', confidence: 'confirmed' },
    { label: 'Height', value: '179 cm (5 ft 10½ in)', confidence: 'estimate', note: 'Listed by the Death Note Wiki as an estimate.' },
    { label: 'Weight', value: '50 kg (110 lb)', confidence: 'estimate', note: 'Listed by the Death Note Wiki as an estimate.' },
    { label: 'Occupation', value: 'Detective', confidence: 'confirmed' },
    { label: 'Blood type', value: 'Unknown', confidence: 'unknown' },
    { label: 'Debut', value: 'Manga chapter 1; anime episode 2, “Confrontation” (as listed by the Death Note Wiki)', confidence: 'confirmed', ref: { ch: 1, ep: 2 }, note: 'He is introduced by name in chapter 2, “L”.' },
    { label: 'Voice actors', value: 'Kappei Yamaguchi (Japanese); Alessandro Juliani (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'The detective',
      text: 'L is a detective known only by a single letter. When the deaths of criminals around the world are traced to a killer called Kira, the police work with L on the case, and he goes on television to test Kira with a decoy, Lind L. Tailor.',
      ref: { ch: 2, ep: 2 },
    },
    {
      heading: 'Facing Light',
      text: 'L suspects early on that Kira is someone in Japan with access to police information. He meets Light Yagami in person at the university and introduces himself as L.',
      ref: { ch: 19, ep: 9 },
    },
    {
      heading: 'The end of the first part',
      text: 'L dies at the end of the first part of the story, in chapter 59. The investigation passes to new people, among them Near, who first appears in the same chapter.',
      ref: { ch: 59, ep: 25 },
      spoiler: 'l-death',
    },
  ],
  personality: [
    {
      heading: 'Eccentric and sharp',
      text: 'L is quiet, odd in his habits and very sharp. He loves sweets, which the Death Note Wiki rates at the top of its scale, and he is not at ease with people, which it rates at the bottom.',
      ref: { ch: 2, ep: 2 },
    },
    {
      heading: 'Willing to take risks',
      text: 'L is willing to put himself on the line. His televised test shows that he will use a decoy to provoke Kira, and he approaches Light directly.',
      ref: { ch: 19, ep: 9 },
    },
  ],
  development: [
    {
      heading: 'An opponent as clever as Light',
      text: 'The author builds L as Light’s equal: he is the one person who can see where Light’s plans lead. The story’s first part is the contest between them, and its end changes what the second part is about.',
      spoiler: 'l-death',
    },
  ],
  motivations: [
    'Catching Kira.',
    'Finding the truth about the Kira killings.',
  ],
  abilities: [
    {
      id: 'deduction', name: 'Deductive reasoning', kind: 'skill',
      summary: 'L works out who Kira is likely to be from small details, and he suspects Light early on.',
      strengths: ['Draws conclusions from limited evidence.'],
      limits: ['He cannot prove his suspicions without evidence.'],
      introduced: { ch: 2, ep: 2 }, confidence: 'confirmed',
    },
    {
      id: 'decoy-test', name: 'The televised test', kind: 'technique',
      summary: 'L puts a decoy, Lind L. Tailor, on television as L to provoke Kira. It shows that Kira can kill from a distance.',
      strengths: ['Draws Kira out and reveals his ability.'],
      limits: ['It costs the life of the decoy.'],
      introduced: { ch: 2, ep: 2 }, confidence: 'confirmed',
    },
    {
      id: 'support', name: 'Resources and support', kind: 'skill',
      summary: 'L works with Watari, his assistant, and with the Japanese police task force that Light’s father is part of.',
      strengths: ['Access to police records and a trusted assistant.'],
      limits: ['He relies on others for fieldwork.'],
      introduced: { ch: 2, ep: 2 }, confidence: 'confirmed',
    },
  ],
  battles: [
    {
      id: 'broadcast', title: 'The televised test', opponents: ['Light Yagami'], outcome: 'L learns that Kira can kill from afar.',
      summary: 'L puts a decoy on air as L. Light kills the decoy, and L learns that Kira can kill from a distance.',
      ref: { ch: 2, ep: 2 }, event: 'l-broadcast',
    },
    {
      id: 'university', title: 'Light and L meet', opponents: ['Light Yagami'], outcome: 'Neither reveals his hand.',
      summary: 'L approaches Light in person and introduces himself, and the two begin a game of suspicion.',
      ref: { ch: 19, ep: 9 }, event: 'light-l-meet',
    },
  ],
  status: {
    manga: { state: 'deceased', label: 'Deceased' },
    anime: { state: 'deceased', label: 'Deceased' },
    summary: 'L dies at the end of the first part of the story, in chapter 59 of the manga and episode 25 of the anime.',
    spoiler: 'l-death',
    events: [
      { id: 'l-death', kind: 'death', title: 'L dies', circumstances: 'L dies at the end of the first part of the story.', significance: 'It ends the first part and changes who Light is up against.', manga: { ch: 59 }, anime: { ep: 25 }, spoiler: 'l-death' },
    ],
  },
  adaptation: [
    { topic: 'Birth and death years', anime: 'L is born in 1982 and dies in 2007.', manga: 'L is born in 1979 and dies in 2004.', spoiler: 'l-death' },
  ],
  appearances: [
    { medium: 'manga', title: 'Death Note', detail: 'Major character, chapters 2–59.' },
    { medium: 'anime', title: 'Death Note', detail: 'Episodes 2–25', animeSlug: 'death-note' },
    { medium: 'film', title: 'L: Change the WorLd', detail: 'A spin-off film with L as its lead.' },
  ],
  unconfirmed: [
    'L’s real name is not given in the manga chapters or anime episodes covered here.',
  ],
  faq: [
    { question: 'Who is L in Death Note?', answer: 'L is a detective whose identity is kept secret. He is called in to catch Kira and suspects Light Yagami early on.' },
    { question: 'When do Light and L meet?', answer: 'They meet in person at the university in manga chapter 19 and anime episode 9.' },
    { question: 'Does L die?', answer: 'Yes. L dies at the end of the first part, in manga chapter 59 and anime episode 25.', spoiler: 'l-death' },
  ],
  related: ['light-yagami'],
  articleKeys: ['L Lawliet', 'Ryuzaki'],
  seo: {
    title: 'L: Death Note’s Detective, Deduction and Timeline (Spoiler-Safe)',
    description: 'L from Death Note explained with verified episode and chapter references: his televised test, his duel with Light, his skills and a spoiler-protected status tracker.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–108 and anime episodes 1–37',
    sources: [
      { name: 'Death Note manga by Tsugumi Ohba and Takeshi Obata (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Death Note anime (Madhouse)', covers: 'Episode numbers.' },
      { name: 'Death Note Wiki on Fandom, “L (character)” and its chapter and episode pages', url: 'https://deathnote.fandom.com/wiki/L_(character)', covers: 'Birthday, age, height, weight, debut chapter and episode, and the chapter and episode of each event; no text copied.' },
    ],
  },
};
