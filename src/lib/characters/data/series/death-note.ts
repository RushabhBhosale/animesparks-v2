import type { SeriesData } from '../../types.ts';

// Verified 2026-10-31 from the manga and anime and the Death Note Wiki's
// character and chapter/episode pages (see data/characters/SOURCES.md). The
// anime has 37 episodes and the manga 108 chapters. The anime's first part is
// episodes 1–25, which cover manga chapters 1–59.
export const deathNote: SeriesData = {
  slug: 'death-note',
  title: 'Death Note',
  short: 'Death Note',
  articleNames: ['Death Note'],
  toolKeys: { franchise: 'death-note', manga: 'death-note', anime: ['death-note'] },
  intro: 'Tsugumi Ohba and Takeshi Obata’s Death Note follows a student who finds a notebook that kills anyone whose name is written in it, and the detective who sets out to catch him. The manga ran 108 chapters and the anime has 37 episodes, so the whole story is available. Spoilers follow the story’s big turn: the end of the first part.',
  coverage: {
    manga: 'Complete: chapters 1–108',
    anime: 'Complete: episodes 1–37',
    asOf: '2026-10-31',
  },
  checkpoints: [
    { id: 'kira-vs-l', label: 'The duel between Light and L (episodes 1–24)', covers: 'Manga chapters 1–58.' },
    { id: 'l-death', label: 'The end of the first part (episode 25)', covers: 'Manga chapter 59, “Zero”.' },
    { id: 'finale', label: 'The rest of the story (episodes 26–37)', covers: 'Manga chapters 60–108.' },
  ],
  arcs: [
    { id: 'part-1', name: 'Part I', anime: { start: 1, end: 25 }, manga: { start: 1, end: 59 }, summary: 'A student with a Death Note and a detective who hunts him.' },
    { id: 'part-2', name: 'Part II', anime: { start: 26, end: 37 }, manga: { start: 60, end: 108 }, summary: 'The story continues after the end of the first part.', spoiler: 'l-death' },
  ],
  powerSystems: [
    {
      id: 'death-note', name: 'The Death Note',
      summary: 'A notebook that kills any person whose name is written in it. Its rules are written in the notebook itself.',
      rules: ['The writer must have the person’s face in mind while writing the name.', 'The writer can specify the cause of death; otherwise the victim dies of a heart attack after forty seconds.', 'People who touch the notebook can see the shinigami who owns it.'],
      limits: ['A person whose name and face are unknown to the writer cannot be killed with it.'],
      introduced: { ch: 1, ep: 1 },
    },
  ],
  cast: [
    { id: 'light', name: 'Light Yagami', profile: 'light-yagami' },
    { id: 'l', name: 'L', profile: 'l-death-note' },
    { id: 'ryuk', name: 'Ryuk' },
    { id: 'misa', name: 'Misa Amane' },
    { id: 'rem', name: 'Rem' },
    { id: 'soichiro', name: 'Soichiro Yagami' },
    { id: 'sayu', name: 'Sayu Yagami' },
    { id: 'watari', name: 'Watari' },
  ],
  relationships: [
    {
      id: 'light-l', a: 'light', b: 'l', type: 'rival', roles: { a: 'Kira', b: 'detective' },
      summary: 'Light and L are opponents: one uses the Death Note and the other tries to catch him.',
      evolution: [
        { stage: 'The broadcast', text: 'L tests Kira with a televised broadcast, and Light kills the man who appears as L, Lind L. Tailor.', ref: { ch: 2, ep: 2 } },
        { stage: 'Face to face', text: 'Light and L meet in person at the university, where L introduces himself.', ref: { ch: 19, ep: 9 } },
        { stage: 'The end of the first part', text: 'L dies at the end of the first part of the story.', ref: { ch: 59, ep: 25 }, spoiler: 'l-death' },
      ],
    },
    {
      id: 'light-ryuk', a: 'light', b: 'ryuk', type: 'ally', roles: { a: 'owner', b: 'shinigami' },
      summary: 'Ryuk is the shinigami who drops the Death Note into the human world, and he follows Light.',
      evolution: [{ stage: 'The dropped notebook', text: 'Light finds the notebook Ryuk dropped, and Ryuk appears to him.', ref: { ch: 1, ep: 1 } }],
    },
    {
      id: 'soichiro-light', a: 'soichiro', b: 'light', type: 'family', kin: 'parent', roles: { a: 'father', b: 'son' },
      summary: 'Soichiro Yagami is Light’s father and a police officer who works on the Kira case.',
      evolution: [{ stage: 'A father on the case', text: 'Soichiro is introduced as one of the police officers working with L.', ref: { ch: 2, ep: 2 } }],
    },
    {
      id: 'sayu-light', a: 'sayu', b: 'light', type: 'family', kin: 'sibling', roles: { a: 'younger sister', b: 'older brother' },
      summary: 'Sayu is Light’s younger sister.',
      evolution: [{ stage: 'The Yagami family', text: 'Sayu is introduced in the early chapters with the rest of the family.', ref: { ch: 3, ep: 2 } }],
    },
    {
      id: 'light-misa', a: 'light', b: 'misa', type: 'romance', roles: { a: 'partner', b: 'partner' },
      summary: 'Misa Amane is introduced as another person tied to the Death Notes, and she becomes Light’s partner.',
      evolution: [{ stage: 'Misa appears', text: 'Misa Amane and her shinigami Rem first appear in the story.', ref: { ch: 25, ep: 11 } }],
    },
    {
      id: 'l-watari', a: 'watari', b: 'l', type: 'ally', roles: { a: 'assistant', b: 'detective' },
      summary: 'Watari is L’s assistant and supports his investigation.',
      evolution: [{ stage: 'L’s support', text: 'Watari appears with L when the police meet him.', ref: { ch: 2, ep: 2 } }],
    },
  ],
  timeline: [
    { id: 'finds-notebook', title: 'Light finds the Death Note', summary: 'Bored with his life, Light picks up a notebook that Ryuk dropped, and tests it.', kind: 'milestone', characters: ['light', 'ryuk'], when: 'Start of the story', storyOrder: 10, manga: { ch: 1 }, anime: { ep: 1 }, arc: 'part-1' },
    { id: 'l-broadcast', title: 'L’s televised test', summary: 'L goes on television as a decoy, and Light kills the man who appears as L, Lind L. Tailor.', kind: 'battle', characters: ['light', 'l', 'soichiro', 'watari'], when: 'The first weeks of the story', storyOrder: 20, manga: { ch: 2 }, anime: { ep: 2 }, arc: 'part-1' },
    { id: 'light-l-meet', title: 'Light and L meet in person', summary: 'L approaches Light at the university and introduces himself.', kind: 'milestone', characters: ['light', 'l'], when: 'Part I', storyOrder: 30, manga: { ch: 19 }, anime: { ep: 9 }, arc: 'part-1' },
    { id: 'misa-debut', title: 'Misa Amane appears', summary: 'Misa and her shinigami Rem enter the story.', kind: 'milestone', characters: ['misa', 'rem', 'light'], when: 'Part I', storyOrder: 40, manga: { ch: 25 }, anime: { ep: 11 }, arc: 'part-1' },
    { id: 'l-dies', title: 'L dies', summary: 'L dies at the end of the first part of the story.', kind: 'death', characters: ['l', 'light', 'rem'], when: 'End of Part I', storyOrder: 50, manga: { ch: 59 }, anime: { ep: 25 }, arc: 'part-1', spoiler: 'l-death' },
    { id: 'light-dies', title: 'Light dies', summary: 'Light dies at the end of the series.', kind: 'death', characters: ['light', 'ryuk'], when: 'End of Part II', storyOrder: 70, manga: { ch: 108 }, anime: { ep: 37 }, arc: 'part-2', spoiler: 'finale' },
  ],
  faq: [
    { question: 'How long is Death Note?', answer: 'The manga has 108 chapters and the anime has 37 episodes. The anime’s first part, episodes 1–25, covers manga chapters 1–59.' },
  ],
};
