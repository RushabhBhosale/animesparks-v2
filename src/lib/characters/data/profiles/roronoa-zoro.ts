import type { CharacterProfile } from '../../types.ts';

export const roronoaZoro: CharacterProfile = {
  slug: 'roronoa-zoro',
  id: 'zoro',
  series: 'one-piece',
  name: 'Roronoa Zoro',
  native: 'ロロノア・ゾロ (Roronoa Zoro)',
  aliases: ['Zoro', 'Pirate Hunter Zoro', 'Zolo'],
  role: 'Swordsman of the Straw Hat Pirates and the first to join Luffy’s crew',
  affiliations: ['Straw Hat Pirates', 'Straw Hat Grand Fleet'],
  abilityTags: ['Three Sword Style', 'Swordsmanship', 'Asura', 'Enma'],
  overview: 'Roronoa Zoro is the swordsman of the Straw Hat Pirates and the first person to join Luffy’s crew. A former bounty hunter from the East Blue, he fights with three swords and wants to become the world’s greatest swordsman, a promise he made to a childhood rival.',
  facts: [
    { label: 'Birthday', value: 'November 11', confidence: 'confirmed' },
    { label: 'Age', value: '19 at his debut; 21 after the time skip', confidence: 'confirmed' },
    { label: 'Height', value: '178 cm before the time skip; 181 cm after', confidence: 'confirmed' },
    { label: 'Bounty', value: '1,111,000,000 berries', confidence: 'estimate', note: 'The latest bounty listed on the One Piece Wiki at the verification date. It changes with new chapters.' },
    { label: 'Origin', value: 'East Blue, raised in Shimotsuki Village', confidence: 'confirmed' },
    { label: 'Occupation', value: 'Swordsman and combatant of the Straw Hat Pirates; former bounty hunter', confidence: 'confirmed' },
    { label: 'Blood type', value: 'XF', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 3; anime episode 1 (as listed by the One Piece Wiki)', confidence: 'confirmed', ref: { ch: 3, ep: 1 } },
    { label: 'Voice actors', value: 'Kazuya Nakai (Japanese); Christopher R. Sabat (English, Funimation)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'A promise in a dojo',
      text: 'Zoro grows up in Shimotsuki Village, where he trains at a dojo and loses again and again to a girl named Kuina. After Kuina’s 2,000th win, the two promise each other that they will become the world’s greatest swordsmen. Kuina does not live to keep the promise, so Zoro takes up her sword, Wado Ichimonji, and builds his own Three Sword Style around it.',
      ref: { ch: 5, ep: 19 },
    },
    {
      heading: 'Pirate Hunter',
      text: 'Zoro makes his name as a bounty hunter in the East Blue, where he is known as the Pirate Hunter. When Luffy meets him, he is a prisoner at a Marine base. Luffy frees him, and Zoro becomes the first member of the Straw Hat crew.',
      ref: { ch: 5, ep: 2 },
    },
    {
      heading: 'The duel with Mihawk',
      text: 'Zoro learns that the world’s greatest swordsman is Dracule Mihawk and goes looking for him. At the Baratie he challenges Mihawk to a duel, and he is beaten. Mihawk leaves him alive and tells him to grow stronger and surpass him, which becomes the goal Zoro measures himself by.',
      ref: { ch: 52, ep: 24 },
    },
    {
      heading: 'Thriller Bark and Sabaody',
      text: 'On Thriller Bark, Zoro defeats the legendary samurai Ryuma and takes his sword. At the Sabaody Archipelago, he and the crew face the Warlord Bartholomew Kuma, a fight that scatters the crew.',
      ref: { ch: 467, ep: 362 },
      spoiler: 'marineford',
    },
    {
      heading: 'Dressrosa and Wano',
      text: 'In Dressrosa Zoro is intercepted by Pica. In Wano Country he is allowed to visit the grave of the samurai Ryuma, and during the raid on Onigashima he gains some control over the sword Enma.',
      ref: { ch: 954, ep: 955 },
      spoiler: 'wano',
    },
    {
      heading: 'Egghead',
      text: 'On Egghead Zoro fights the CP0 agent Rob Lucci and proves equal to him in single combat.',
      ref: { ch: 1110, ep: 1144 },
      spoiler: 'egghead',
    },
  ],
  personality: [
    {
      heading: 'Calm, blunt and goal-driven',
      text: 'Zoro is calm in a fight and blunt in conversation. His goal is to become the world’s greatest swordsman, and he treats every duel as a measure of how far he still has to go.',
      ref: { ch: 5, ep: 19 },
    },
    {
      heading: 'A terrible sense of direction',
      text: 'Zoro is famously unable to find his way. He loses his way on his own when he sets out to find Mihawk, and he gets lost again in Wano Country.',
      ref: { ch: 8, ep: 4 },
    },
    {
      heading: 'Luffy’s right hand',
      text: 'Other characters treat Zoro as Luffy’s right-hand man. Bartolomeo calls him the crew’s first mate, and Queen says that Zoro and Sanji are seen as Luffy’s right hand.',
      ref: { ch: 995, ep: 1008 },
      spoiler: 'wano',
    },
  ],
  development: [
    {
      heading: 'From lone swordsman to one of the crew’s three pillars',
      text: 'Zoro starts as a swordsman with a private promise. Over the story his strength is measured against people far above him, from Mihawk at the Baratie to Lucci on Egghead, and the crew counts him with Luffy and Sanji as its strongest fighters, a group Nami calls the “Monster Trio”.',
      ref: { ch: 455, ep: 349 },
      spoiler: 'marineford',
    },
  ],
  motivations: [
    'Becoming the world’s greatest swordsman and surpassing Mihawk.',
    'Keeping the promise he made to Kuina.',
    'Helping Luffy become the Pirate King.',
  ],
  abilities: [
    {
      id: 'three-sword-style', name: 'Three Sword Style', native: '三刀流 (Santōryū)', kind: 'technique',
      summary: 'Zoro fights with a sword in each hand and a third held in his mouth. He developed the style after losing Kuina.',
      strengths: ['Wide-reaching attacks that cover many directions at once.', 'Lets him fight several opponents together.'],
      limits: ['Needs good control of all three swords.'],
      introduced: { ch: 5, ep: 19 }, confidence: 'confirmed',
    },
    {
      id: 'wado-ichimonji', name: 'Wado Ichimonji', native: '和道一文字', kind: 'weapon',
      summary: 'The sword that belonged to Kuina. Zoro carries it as one of his swords and holds it in his mouth.',
      strengths: ['A treasured sword with a personal meaning for Zoro.'],
      limits: ['Its value to Zoro is sentimental more than a power gain.'],
      introduced: { ch: 5, ep: 19 }, confidence: 'confirmed',
    },
    {
      id: 'shusui', name: 'Shusui', native: '秋水', kind: 'weapon',
      summary: 'The sword of the legendary samurai Ryuma, which Zoro takes on Thriller Bark.',
      strengths: ['A famous blade tied to the samurai of Wano Country.'],
      limits: ['Its later fate is tied to the Wano arc.'],
      introduced: { ch: 467, ep: 362 }, confidence: 'confirmed', spoiler: 'marineford',
    },
    {
      id: 'asura', name: 'Asura', native: '阿修羅', kind: 'technique',
      summary: 'A technique Zoro uses at the Sabaody Archipelago, where he turns his three-sword stance into a show of overwhelming power.',
      strengths: ['A large burst of power in a fight.'],
      limits: ['Zoro uses it in a few key fights rather than all the time.'],
      introduced: { ch: 507, ep: 401 }, confidence: 'confirmed', spoiler: 'marineford',
    },
    {
      id: 'enma', name: 'Enma', native: '閻魔', kind: 'weapon', system: 'haki',
      summary: 'A sword Zoro gains control over in Wano Country, where it gives off a flame-like aura during the raid on Onigashima.',
      strengths: ['Lets him draw out a flame-like aura.'],
      limits: ['It strains Zoro to control, as the fight on Onigashima shows.'],
      introduced: { ch: 1002, ep: 1017 }, confidence: 'confirmed', spoiler: 'wano',
    },
  ],
  battles: [
    {
      id: 'mihawk', title: 'Zoro vs. Dracule Mihawk', opponents: ['Dracule Mihawk'], outcome: 'Zoro loses and is spared.',
      summary: 'Zoro challenges the world’s greatest swordsman at the Baratie. Mihawk defeats him and tells him to surpass him.',
      ref: { ch: 52, ep: 24 }, event: 'mihawk-duel',
    },
    {
      id: 'mr-1', title: 'Zoro vs. Mr. 1', opponents: ['Mr. 1'], outcome: 'Zoro defeats Mr. 1.',
      summary: 'In Arabasta, Zoro fights an agent who can turn his body to steel and learns to cut what he could not before.',
      ref: { ch: 178, ep: 110 }, event: 'zoro-mr-1',
    },
    {
      id: 'ryuma', title: 'Zoro vs. Ryuma', opponents: ['Ryuma'], outcome: 'Zoro defeats the legendary samurai.',
      summary: 'On Thriller Bark, Zoro faces the legendary samurai Ryuma and takes his sword.',
      ref: { ch: 467, ep: 362 }, event: 'zoro-ryuma', spoiler: 'marineford',
    },
    {
      id: 'lucci', title: 'Zoro vs. Rob Lucci', opponents: ['Rob Lucci'], outcome: 'Zoro proves equal to Lucci in single combat.',
      summary: 'On Egghead, Zoro fights the CP0 agent Rob Lucci.',
      ref: { ch: 1110, ep: 1144 }, event: 'zoro-lucci', spoiler: 'egghead',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Zoro is alive in all published material. The series is ongoing, so this reflects the chapters and episodes covered at the verification date.',
    events: [],
  },
  adaptation: [],
  appearances: [
    { medium: 'manga', title: 'One Piece', detail: 'Main character, from chapter 3.' },
    { medium: 'anime', title: 'One Piece', detail: 'Episodes 1–1155 and ongoing', animeSlug: 'one-piece' },
  ],
  unconfirmed: [
    'Zoro’s rematch with Dracule Mihawk, the goal he set at the Baratie, has not happened in the chapters covered here.',
  ],
  faq: [
    { question: 'What swords does Zoro use?', answer: 'Zoro uses the Three Sword Style: one sword in each hand and one in his mouth. Wado Ichimonji, the sword that belonged to Kuina, is one of them, and he also carries Shusui, which he takes from Ryuma on Thriller Bark.' },
    { question: 'Why is Zoro always getting lost?', answer: 'His poor sense of direction is a running joke from the start. He gets lost while searching for Mihawk and again in Wano Country.' },
    { question: 'Did Zoro ever beat Mihawk?', answer: 'Not in the chapters covered here. He loses their duel at the Baratie in manga chapter 52, and Mihawk tells him to surpass him.' },
  ],
  related: ['monkey-d-luffy', 'sanji', 'nami'],
  articleKeys: ['Zoro', 'Roronoa Zoro'],
  seo: {
    title: 'Roronoa Zoro: Three Sword Style, Swords and Timeline (Spoiler-Safe)',
    description: 'Roronoa Zoro explained with verified episode and chapter references: Three Sword Style, his swords, the duel with Mihawk and a spoiler-protected timeline.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–1125 and anime episodes 1–1155',
    sources: [
      { name: 'One Piece manga by Eiichiro Oda (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'One Piece anime (Toei Animation)', covers: 'Episode numbers.' },
      { name: 'One Piece Wiki on Fandom, “Roronoa Zoro” and its History and Abilities pages', url: 'https://onepiece.fandom.com/wiki/Roronoa_Zoro', covers: 'Chapter and episode citations, birthday, ages, heights and bounty; no text copied.' },
    ],
  },
};
