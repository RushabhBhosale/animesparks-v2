import type { CharacterProfile } from '../../types.ts';

export const nami: CharacterProfile = {
  slug: 'nami',
  id: 'nami',
  series: 'one-piece',
  name: 'Nami',
  native: 'ナミ (Nami)',
  aliases: ['Cat Burglar Nami', 'Nami the navigator'],
  role: 'Navigator of the Straw Hat Pirates and a former thief',
  affiliations: ['Straw Hat Pirates', 'Straw Hat Grand Fleet'],
  abilityTags: ['Navigation', 'Clima-Tact', 'Weather science', 'Thunderbolt Tempo'],
  overview: 'Nami is the navigator of the Straw Hat Pirates. A thief from the East Blue who grew up with a dream of mapping the whole world, she joins Luffy’s crew and charts its course across the Grand Line with a weather staff called the Clima-Tact.',
  facts: [
    { label: 'Birthday', value: 'July 3', confidence: 'confirmed' },
    { label: 'Age', value: '18 at her debut; 20 after the time skip', confidence: 'confirmed' },
    { label: 'Height', value: '169 cm before the time skip; 170 cm after', confidence: 'confirmed' },
    { label: 'Bounty', value: '366,000,000 berries', confidence: 'estimate', note: 'The latest bounty listed on the One Piece Wiki at the verification date. It changes with new chapters.' },
    { label: 'Origin', value: 'East Blue (Conomi Islands, raised in Cocoyasi Village)', confidence: 'confirmed' },
    { label: 'Occupation', value: 'Navigator; thief; former officer of the Arlong Pirates', confidence: 'confirmed' },
    { label: 'Blood type', value: 'X', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 8 (a cover appearance in chapter 1); anime episode 1 (as listed by the One Piece Wiki)', confidence: 'confirmed', ref: { ch: 8, ep: 1 } },
    { label: 'Voice actors', value: 'Akemi Okamura (Japanese); Luci Christian (English, Funimation)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'Bell-mère and Nojiko',
      text: 'Nami is found as a baby by Nojiko and then by Bell-mère, a wounded Marine officer, who brings both children home to Cocoyasi Village and adopts them. The three live as a family.',
      ref: { ch: 77, ep: 35 },
    },
    {
      heading: 'Arlong’s takeover',
      text: 'The fish-man pirate Arlong takes over the Conomi Islands and arrives at Cocoyasi Village while Nami and Nojiko watch from hiding. Nami’s later life as a thief is shaped by what Arlong did to her village.',
      ref: { ch: 77, ep: 35 },
    },
    {
      heading: 'Joining the Straw Hats',
      text: 'Nami first meets Luffy near the start of the story, and she joins his crew at the end of the Arlong Park arc. She becomes its navigator, and from then on she keeps the ship on course with her skill with weather and sea.',
      ref: { ch: 8 },
    },
    {
      heading: 'Into the Grand Line',
      text: 'Nami’s navigation gets the Going Merry up the rapids of Reverse Mountain and into the Grand Line, where ordinary compasses do not work.',
      ref: { ch: 102, ep: 62 },
    },
    {
      heading: 'Whole Cake Island',
      text: 'During the Whole Cake Island arc Usopp gives Nami a new Clima-Tact. She uses the staff’s Thunderbolt Tempo, and her weather egg, against the Big Mom Pirates’ forces and Big Mom’s homie Zeus.',
      ref: { ch: 822, ep: 776 },
      spoiler: 'new-world',
    },
  ],
  personality: [
    {
      heading: 'Money, maps and loyalty',
      text: 'Nami is clever and quick to bargain, and she loves money and treasure. Her cold side hides a deep loyalty to her crew and to her family in Cocoyasi Village.',
      ref: { ch: 77, ep: 35 },
    },
    {
      heading: 'A navigator’s confidence',
      text: 'In a crew of fighters, Nami is the one other characters praise for skill, and she values that. Her work is reading the weather and the sea, and the crew trusts her calls.',
      ref: { ch: 820, ep: 772 },
      spoiler: 'new-world',
    },
  ],
  development: [
    {
      heading: 'From thief to navigator',
      text: 'Nami starts out distrusting pirates and working alone. By the Whole Cake Island arc she is also a fighter, with a weapon and techniques of her own rather than only maps and bargains.',
      ref: { ch: 837 },
      spoiler: 'new-world',
    },
  ],
  motivations: [
    'Drawing a map of the entire world.',
    'Protecting her family and the people of Cocoyasi Village.',
    'Keeping the Straw Hats alive and on course.',
  ],
  abilities: [
    {
      id: 'navigation', name: 'Navigation and weather reading', kind: 'skill',
      summary: 'Nami reads the sea and the weather, charts the course and warns the crew of storms.',
      strengths: ['Accurate reading of the sea and sky.', 'Keeps the crew on course through the Grand Line.'],
      limits: ['She is not a front-line fighter, and most of her work is done before and between fights.'],
      introduced: { ch: 102, ep: 62 }, confidence: 'confirmed',
    },
    {
      id: 'clima-tact', name: 'Clima-Tact', native: 'クリマ・タクト', kind: 'weapon',
      summary: 'A staff that Nami uses to make and control weather. Usopp builds her a new, upgraded Clima-Tact during the Whole Cake Island arc.',
      strengths: ['Creates clouds and lightning to attack at range.', 'Gives her weather attacks she can aim.'],
      limits: ['Depends on the staff and on the weather around her.'],
      introduced: { ch: 822, ep: 776 }, confidence: 'confirmed', spoiler: 'new-world',
    },
    {
      id: 'thunderbolt-tempo', name: 'Thunderbolt Tempo', native: 'サンダーボルト＝テンポ', kind: 'technique',
      summary: 'A lightning attack Nami strikes with the Clima-Tact. She uses it on Big Mom’s homie Brûlée during the Whole Cake Island arc.',
      strengths: ['A strong strike that can bring an enemy to the ground.'],
      limits: ['It relies on the Clima-Tact and the weather it summons.'],
      introduced: { ch: 837 }, confidence: 'confirmed', spoiler: 'new-world',
    },
    {
      id: 'weather-egg', name: 'Weather egg', kind: 'skill',
      summary: 'Nami uses a weather egg to build a cloud and summon a storm. In Whole Cake Island, the homie Zeus eats her egg, making the cloud grow huge and stormy.',
      strengths: ['Lets her create a large storm.'],
      limits: ['It can be used against her, as Zeus shows when he eats the egg.'],
      introduced: { ch: 875, ep: 846 }, confidence: 'confirmed', spoiler: 'new-world',
    },
  ],
  battles: [
    {
      id: 'arlong-park', title: 'Arlong Park', opponents: ['Arlong Pirates'], outcome: 'Nami is freed from Arlong’s control.',
      summary: 'Nami’s home is under the control of the Arlong Pirates. The Straw Hats fight them at Arlong Park to free it.',
      ref: { ch: 88, ep: 40 }, event: 'arlong-park-battle',
    },
    {
      id: 'brulee', title: 'Nami vs. Brûlée', opponents: ['Charlotte Brûlée'], outcome: 'Nami strikes Brûlée down with Thunderbolt Tempo.',
      summary: 'In Whole Cake Island, Nami hits Big Mom’s daughter Brûlée with a lightning strike from her Clima-Tact.',
      ref: { ch: 837 }, event: 'nami-whole-cake', spoiler: 'new-world',
    },
    {
      id: 'zeus-storm', title: 'Nami and the Big Mom chase', opponents: ['Zeus', 'Big Mom'], outcome: 'Nami’s storm helps the crew escape.',
      summary: 'Zeus, riding with Big Mom, catches up to the crew, and Nami builds a storm out of her weather egg.',
      ref: { ch: 872, ep: 842 }, event: 'nami-whole-cake', spoiler: 'new-world',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Nami is alive in all published material. The series is ongoing, so this reflects the chapters and episodes covered at the verification date.',
    events: [],
  },
  adaptation: [],
  appearances: [
    { medium: 'manga', title: 'One Piece', detail: 'Main character, from chapter 8.' },
    { medium: 'anime', title: 'One Piece', detail: 'Episodes 1–1155 and ongoing', animeSlug: 'one-piece' },
  ],
  unconfirmed: [
    'Whether Nami finishes her map of the whole world has not been settled in the chapters covered here.',
  ],
  faq: [
    { question: 'What does Nami do on the Straw Hat crew?', answer: 'She is the navigator. She reads the sea and weather, charts the course through the Grand Line and warns the crew of storms.' },
    { question: 'What weapon does Nami use?', answer: 'The Clima-Tact, a staff that lets her make and control weather. Usopp gives her a new version during the Whole Cake Island arc.', spoiler: 'new-world' },
    { question: 'Who raised Nami?', answer: 'Bell-mère, a Marine officer who adopted Nami and her older sister Nojiko in Cocoyasi Village.' },
  ],
  related: ['monkey-d-luffy', 'roronoa-zoro', 'sanji'],
  articleKeys: ['Nami'],
  seo: {
    title: 'Nami: Clima-Tact, Navigation and Timeline (Spoiler-Safe)',
    description: 'Nami explained with verified episode and chapter references: her Clima-Tact, Thunderbolt Tempo, her past in Cocoyasi Village and a spoiler-protected timeline.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–1125 and anime episodes 1–1155',
    sources: [
      { name: 'One Piece manga by Eiichiro Oda (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'One Piece anime (Toei Animation)', covers: 'Episode numbers.' },
      { name: 'One Piece Wiki on Fandom, “Nami” and its History page', url: 'https://onepiece.fandom.com/wiki/Nami', covers: 'Chapter and episode citations, birthday, ages, heights and bounty; no text copied.' },
    ],
  },
};
