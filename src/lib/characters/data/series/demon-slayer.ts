import type { SeriesData } from '../../types.ts';

// Verified 2026-10-29 from the manga and anime and the Kimetsu no Yaiba
// Wiki's citations (see data/characters/SOURCES.md). Anime episodes use the
// wiki's series-wide numbering: season 1 is 1–26, the Mugen Train arc 27–33,
// the Entertainment District arc 34–44, the Swordsmith Village arc 45–55 and
// the Hashira Training arc 56–63.
export const demonSlayer: SeriesData = {
  slug: 'demon-slayer',
  title: 'Demon Slayer: Kimetsu no Yaiba',
  short: 'Demon Slayer',
  articleNames: ['Demon Slayer: Kimetsu no Yaiba', 'Demon Slayer'],
  toolKeys: { franchise: 'demon-slayer-kimetsu-no-yaiba', manga: 'demon-slayer', anime: ['demon-slayer-kimetsu-no-yaiba', 'demon-slayer-kimetsu-no-yaiba-mugen-train-arc', 'demon-slayer-kimetsu-no-yaiba-entertainment-district-arc', 'demon-slayer-kimetsu-no-yaiba-swordsmith-village-arc', 'demon-slayer-kimetsu-no-yaiba-hashira-training-arc'] },
  intro: 'Koyoharu Gotouge’s Demon Slayer follows a boy who hunts demons so that his demon sister can become human again. The manga ended at chapter 205. The anime has covered it up to the Hashira Training arc and the first Infinity Castle film, and the rest is still to come, so these profiles keep the anime and manga apart and fold later events behind the spoiler selector.',
  coverage: {
    manga: 'Complete: chapters 1–205',
    anime: 'Season 1, the Mugen Train arc, Entertainment District, Swordsmith Village and Hashira Training arcs (episodes 1–63), plus the first Infinity Castle film; Part 2 has no confirmed date',
    asOf: '2026-10-29',
  },
  checkpoints: [
    { id: 'season-1', label: 'Season 1 (episodes 1–26)', covers: 'Manga chapters 1–54.' },
    { id: 'mugen-train', label: 'Mugen Train arc (episodes 27–33)', covers: 'Manga chapters 54–66.' },
    { id: 'district-village', label: 'Entertainment District and Swordsmith Village (episodes 34–55)', covers: 'Manga chapters 67–127.' },
    { id: 'hashira-training', label: 'Hashira Training arc (episodes 56–63)', covers: 'Manga chapters 128–139.' },
    { id: 'infinity-castle', label: 'Infinity Castle, film Part 1 and its chapters', covers: 'The start of the Infinity Castle arc, from manga chapter 140.' },
    { id: 'finale', label: 'Manga: the rest of the story', covers: 'The remainder of the manga, through chapter 205.' },
  ],
  arcs: [
    { id: 'mugen-train', name: 'Mugen Train', anime: { start: 27, end: 33 }, manga: { start: 54, end: 66 }, summary: 'Tanjiro and the Flame Hashira board a train where demons are killing passengers.', spoiler: 'season-1' },
    { id: 'entertainment-district', name: 'Entertainment District', anime: { start: 34, end: 44 }, manga: { start: 67, end: 97 }, summary: 'Tanjiro’s team joins a Sound Hashira in a red-light district.', spoiler: 'mugen-train' },
    { id: 'swordsmith-village', name: 'Swordsmith Village', anime: { start: 45, end: 55 }, manga: { start: 98, end: 127 }, summary: 'Upper Rank demons attack the village where swords are forged.', spoiler: 'district-village' },
    { id: 'hashira-training', name: 'Hashira Training', anime: { start: 56, end: 63 }, manga: { start: 128, end: 139 }, summary: 'The Hashira train the corps for the coming fight.', spoiler: 'district-village' },
  ],
  powerSystems: [
    {
      id: 'breathing', name: 'Breathing Styles',
      summary: 'Demon slayers use special breathing to flood their bodies with oxygen and perform sword forms. Each style has its own set of forms, named for its element.',
      rules: ['Total Concentration Breathing is the base technique.', 'Each Breathing Style has numbered forms taught by a master.', 'Demon Slayer Marks appear on some users and sharply raise their power for a short time.'],
      limits: ['Demons regenerate unless their neck is cut or they are exposed to sunlight.', 'The Marks are said to cost the user years of their life.'],
      introduced: { ch: 1, ep: 1 },
    },
  ],
  cast: [
    { id: 'tanjiro', name: 'Tanjiro Kamado', profile: 'tanjiro-kamado' },
    { id: 'rengoku', name: 'Kyojuro Rengoku', profile: 'kyojuro-rengoku' },
    { id: 'nezuko', name: 'Nezuko Kamado' },
    { id: 'akaza', name: 'Akaza' },
    { id: 'muzan', name: 'Muzan Kibutsuji' },
    { id: 'enmu', name: 'Enmu' },
    { id: 'senjuro', name: 'Senjuro Rengoku' },
    { id: 'shinjuro', name: 'Shinjuro Rengoku' },
    { id: 'tanjuro', name: 'Tanjuro Kamado' },
    { id: 'kie', name: 'Kie Kamado' },
  ],
  relationships: [
    {
      id: 'tanjiro-nezuko', a: 'tanjiro', b: 'nezuko', type: 'family', kin: 'sibling', roles: { a: 'older brother', b: 'younger sister' },
      summary: 'Tanjiro’s whole journey is built around Nezuko, who is turned into a demon after their family is attacked.',
      evolution: [{ stage: 'The promise', text: 'Tanjiro vows to turn Nezuko back into a human and to hunt demons, and later swears to defeat Muzan.', ref: { ch: 1, ep: 1 } }],
    },
    {
      id: 'tanjuro-tanjiro', a: 'tanjuro', b: 'tanjiro', type: 'family', kin: 'parent', roles: { a: 'father', b: 'son' },
      summary: 'Tanjuro is Tanjiro’s father; a technique Tanjiro uses is tied to his inheritance.',
      evolution: [{ stage: 'The Transparent World', text: 'Tanjiro can access the Transparent World, like his father, while in the marked state.', ref: { ch: 151 }, spoiler: 'infinity-castle' }],
    },
    {
      id: 'kie-tanjiro', a: 'kie', b: 'tanjiro', type: 'family', kin: 'parent', roles: { a: 'mother', b: 'son' },
      summary: 'Kie is Tanjiro’s mother.',
      evolution: [{ stage: 'The family', text: 'Tanjiro’s family is attacked at the start of the story.', ref: { ch: 1, ep: 1 } }],
    },
    {
      id: 'kie-nezuko', a: 'kie', b: 'nezuko', type: 'family', kin: 'parent', roles: { a: 'mother', b: 'daughter' },
      summary: 'Kie is Nezuko’s mother.',
      evolution: [{ stage: 'The family', text: 'Nezuko is the only family member left alive besides Tanjiro.', ref: { ch: 1, ep: 1 } }],
    },
    {
      id: 'tanjuro-kie', a: 'tanjuro', b: 'kie', type: 'family', kin: 'spouse', roles: { a: 'husband', b: 'wife' },
      summary: 'Tanjuro and Kie are the parents of the Kamado children.',
      evolution: [{ stage: 'The Kamado family', text: 'Their family is the one attacked in chapter 1.', ref: { ch: 1, ep: 1 } }],
    },
    {
      id: 'tanjiro-muzan', a: 'tanjiro', b: 'muzan', type: 'enemy', roles: { a: 'hunter', b: 'progenitor' },
      summary: 'Muzan Kibutsuji is the Demon King, and the target of Tanjiro’s long hunt.',
      evolution: [
        { stage: 'The vow', text: 'Tanjiro swears to defeat Muzan at the start of the story.', ref: { ch: 1, ep: 1 } },
        { stage: 'Muzan’s last gamble', text: 'As a last attempt to live on, Muzan turns Tanjiro into a demon.', ref: { ch: 201 }, spoiler: 'finale' },
      ],
    },
    {
      id: 'tanjiro-rengoku', a: 'rengoku', b: 'tanjiro', type: 'mentor', roles: { a: 'Flame Hashira', b: 'junior' },
      summary: 'Rengoku fights alongside Tanjiro on the Mugen Train, and his example stays with him.',
      evolution: [
        { stage: 'On the train', text: 'Rengoku’s fight at the end of the arc has a deep effect on Tanjiro, who keeps pushing on through whatever he faces.', ref: { ch: 66, ep: 33 }, spoiler: 'mugen-train' },
        { stage: 'Facing the same demon', text: 'In the Infinity Castle, Tanjiro recognises the demon who killed Rengoku and charges him screaming his name.', ref: { ch: 148 }, spoiler: 'infinity-castle' },
      ],
    },
    {
      id: 'rengoku-akaza', a: 'rengoku', b: 'akaza', type: 'enemy', roles: { a: 'hashira', b: 'upper rank' },
      summary: 'Akaza, Upper Rank Three, is the demon who fights Rengoku at the end of the Mugen Train arc.',
      evolution: [
        { stage: 'The fight', text: 'Akaza overwhelms Rengoku with powerful attacks while Rengoku holds on and refuses to give up.', ref: { ch: 64 }, spoiler: 'mugen-train' },
        { stage: 'His respect', text: 'Akaza acknowledges Rengoku’s abilities.', ref: { ch: 81 }, spoiler: 'mugen-train' },
      ],
      spoiler: 'mugen-train',
    },
    {
      id: 'rengoku-senjuro', a: 'rengoku', b: 'senjuro', type: 'family', kin: 'sibling', roles: { a: 'older brother', b: 'younger brother' },
      summary: 'Senjuro is Kyojuro Rengoku’s younger brother.',
      evolution: [{ stage: 'A brother’s belief', text: 'Rengoku tells Senjuro that he is different from him because he has a big brother who believes in him.', ref: { ch: 54 } }],
    },
    {
      id: 'shinjuro-rengoku', a: 'shinjuro', b: 'rengoku', type: 'family', kin: 'parent', roles: { a: 'father', b: 'son' },
      summary: 'Shinjuro Rengoku, the previous Flame Hashira, is Kyojuro’s father.',
      evolution: [{ stage: 'The inheritance', text: 'Kyojuro inherits the Flame Hashira role from his father.', ref: { ch: 45 } }],
    },
    {
      id: 'shinjuro-senjuro', a: 'shinjuro', b: 'senjuro', type: 'family', kin: 'parent', roles: { a: 'father', b: 'son' },
      summary: 'Shinjuro is also Senjuro’s father.',
      evolution: [{ stage: 'The Rengoku family', text: 'The Rengoku family has a long line of Flame Hashira.', ref: { ch: 45 } }],
    },
  ],
  timeline: [
    { id: 'family-attack', title: 'The Kamado family is attacked', summary: 'Tanjiro returns home to find his family dead and Nezuko turned into a demon.', kind: 'milestone', characters: ['tanjiro', 'nezuko'], when: 'Taisho era, winter', storyOrder: 10, anime: { ep: 1 }, manga: { ch: 1 }, spoiler: 'season-1' },
    { id: 'rengoku-debut', title: 'Rengoku appears', summary: 'The Flame Hashira first appears in the story.', kind: 'milestone', characters: ['rengoku'], when: 'Before the Mugen Train', storyOrder: 20, anime: { ep: 21 }, manga: { ch: 44 } },
    { id: 'mugen-train', title: 'The Mugen Train arc', summary: 'Tanjiro and his friends board a train where passengers are going missing, together with the Flame Hashira.', kind: 'arc', characters: ['tanjiro', 'rengoku', 'enmu'], when: 'Taisho era', storyOrder: 30, anime: { ep: 27 }, manga: { ch: 54 }, arc: 'mugen-train', spoiler: 'season-1' },
    { id: 'rengoku-death', title: 'Rengoku dies fighting Akaza', summary: 'After defeating Enmu, Rengoku faces Upper Rank Three, Akaza, and dies in the fight.', kind: 'death', characters: ['rengoku', 'akaza', 'tanjiro'], when: 'The Mugen Train arc', storyOrder: 40, anime: { ep: 33 }, manga: { ch: 66 }, arc: 'mugen-train', spoiler: 'mugen-train' },
    { id: 'hinokami-kagura-district', title: 'Tanjiro uses Hinokami Kagura in the Entertainment District', summary: 'Tanjiro combines Water Breathing and Hinokami Kagura in the fight to save Hinatsuru from Gyutaro.', kind: 'battle', characters: ['tanjiro'], when: 'The Entertainment District arc', storyOrder: 50, manga: { ch: 90 }, arc: 'entertainment-district', spoiler: 'district-village' },
    { id: 'demon-slayer-mark', title: 'Tanjiro shows the Demon Slayer Mark', summary: 'During the Swordsmith Village arc, Tanjiro shows the Mark briefly and becomes one of the first Demon Slayers to kill an Upper Rank.', kind: 'transformation', characters: ['tanjiro'], when: 'The Swordsmith Village arc', storyOrder: 60, manga: { ch: 101 }, arc: 'swordsmith-village', spoiler: 'district-village' },
    { id: 'akaza-rematch', title: 'Tanjiro faces Akaza in the Infinity Castle', summary: 'Tanjiro recognises the demon who killed Rengoku and charges at him.', kind: 'battle', characters: ['tanjiro', 'akaza', 'rengoku'], when: 'The Infinity Castle arc', storyOrder: 70, manga: { ch: 148 }, spoiler: 'infinity-castle' },
    { id: 'tanjiro-demon', title: 'Muzan turns Tanjiro into a demon', summary: 'As a last attempt to live on, Muzan transforms Tanjiro.', kind: 'transformation', characters: ['tanjiro', 'muzan'], when: 'The final battle', storyOrder: 80, manga: { ch: 201 }, spoiler: 'finale' },
    { id: 'tanjiro-human', title: 'Tanjiro returns to human form', summary: 'Tanjiro is human again, though changed.', kind: 'reveal', characters: ['tanjiro'], when: 'After the final battle', storyOrder: 90, manga: { ch: 203 }, spoiler: 'finale' },
  ],
  clans: [
    { id: 'kamado', name: 'Kamado family', summary: 'Tanjiro and Nezuko’s family, charcoal sellers whose attack opens the story.', traits: [{ text: 'A fire-based dance passed down in the family.', spoiler: 'mugen-train' }], members: ['tanjuro', 'kie', 'tanjiro', 'nezuko'] },
    { id: 'rengoku', name: 'Rengoku family', summary: 'A line of Flame Hashira: Shinjuro, Kyojuro and Senjuro Rengoku.', traits: [{ text: 'The Flame Breathing style is handed down the line.' }], members: ['shinjuro', 'rengoku', 'senjuro'] },
  ],
  familyGuide: {
    seo: { title: 'Demon Slayer Family Tree: Kamado and Rengoku Families', description: 'An interactive Demon Slayer family tree of the Kamado and Rengoku families, with spoiler-protected connections and links to character profiles.' },
    intro: [
      'Demon Slayer is driven by two families: the Kamado siblings whose loss starts the story, and the Rengoku line of Flame Hashira that Tanjiro meets on the Mugen Train.',
      'This explorer shows the family ties recorded in the manga. It is deliberately small because only verified relatives are included; other families, such as the Ubuyashiki, will be added once their ties are checked.',
    ],
    faq: [
      { question: 'Who is in the Kamado family?', answer: 'Tanjiro, Nezuko and their parents Tanjuro and Kie are shown in the tree.' },
      { question: 'Is Rengoku’s family a line of Hashira?', answer: 'Yes. His father Shinjuro held the Flame Hashira role before him.' },
    ],
  },
  faq: [
    { question: 'Where should I start reading the Demon Slayer manga after the anime?', answer: 'The Hashira Training arc ends at chapter 139, so continue from chapter 140. The AnimeSparks manga chapter finder lists each episode’s chapters.' },
  ],
};
