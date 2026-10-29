import type { CharacterProfile } from '../../types.ts';

export const monkeyDLuffy: CharacterProfile = {
  slug: 'monkey-d-luffy',
  id: 'luffy',
  series: 'one-piece',
  name: 'Monkey D. Luffy',
  native: 'モンキー・D・ルフィ (Monkī Dī Rufi)',
  aliases: ['Luffy', 'Straw Hat Luffy', 'Straw Hat'],
  role: 'Captain of the Straw Hat Pirates; Devil Fruit user',
  affiliations: ['Straw Hat Pirates', 'Straw Hat Grand Fleet', 'Clan of D.'],
  abilityTags: ['Gomu Gomu no Mi', 'Gear forms', 'Haki', 'Conqueror’s Haki'],
  overview: 'Monkey D. Luffy is the founder and captain of the Straw Hat Pirates. He ate a Devil Fruit that made his body rubber as a child, and he sets out to find the treasure of the late Gol D. Roger and become the Pirate King, which he believes means having the most freedom in the world.',
  facts: [
    { label: 'Birthday', value: 'May 5 (Children’s Day)', confidence: 'confirmed' },
    { label: 'Age', value: '7 at his debut; 17 before the time skip; 19 after', confidence: 'confirmed' },
    { label: 'Height', value: '172 cm before the time skip; 174 cm after', confidence: 'confirmed', ref: { other: 'SBS columns' } },
    { label: 'Bounty', value: '3,000,000,000 berries', confidence: 'estimate', note: 'The latest bounty shown at the time of writing. It changes with new chapters, so check the newest published chapters.' },
    { label: 'Origin', value: 'Foosha Village, East Blue (Dawn Island)', confidence: 'confirmed' },
    { label: 'Family', value: 'Grandson of Garp; his father is a spoiler', confidence: 'confirmed', ref: { ch: 431, ep: 313 }, note: 'Luffy addresses Garp as his grandfather.' },
    { label: 'Debut', value: 'Manga chapter 1; anime episode 1', confidence: 'confirmed' },
    { label: 'Voice actors', value: 'Mayumi Tanaka (Japanese); Colleen Clinkenbeard (English, Funimation)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'Foosha Village and the hat',
      text: 'Luffy is raised in Foosha Village, where the pirate Shanks and his crew pass through. At seven he accidentally eats the Gomu Gomu no Mi, a Devil Fruit that turns his body to rubber and makes him unable to swim. When Shanks leaves, he gives Luffy his straw hat, and Luffy reveals to him that he intends to be the Pirate King.',
      ref: { ch: 1, ep: 4 },
    },
    {
      heading: 'Setting out',
      text: 'At 17 Luffy sets sail alone from East Blue and gathers the Straw Hat Pirates over the early arcs. The Arabasta arc is the first long adventure of the full crew; in it the crew learns that Luffy has a sworn brother named Ace.',
      ref: { ch: 159, ep: 95 },
    },
    {
      heading: 'A family tree full of names',
      text: 'After Enies Lobby, the story reveals who Luffy’s relatives are: Garp is his grandfather, and his father is the revolutionary leader Monkey D. Dragon. Garp had taken him to be raised by Curly Dadan, and the three boys who grew up there, Luffy, Ace and Sabo, became sworn brothers.',
      ref: { ch: 432, ep: 314 },
      spoiler: 'skypiea-enies-lobby',
    },
    {
      heading: 'Marineford',
      text: 'Luffy breaks into Impel Down and then joins the war at Marineford to rescue Ace. The battle takes Ace’s life, and it is the most important event in Luffy’s development before the two-year time skip.',
      ref: { ch: 573, ep: 482 },
      spoiler: 'marineford',
    },
    {
      heading: 'Two years later',
      text: 'After the war, Luffy trains for two years and returns with new skills, including the control of Haki that Rayleigh teaches him. Over the arcs that follow, he and his crew take on several rulers of the New World.',
      ref: { ch: 597, ep: 516 },
      spoiler: 'marineford',
    },
    {
      heading: 'Wano and the awakening',
      text: 'In Wano Country the Straw Hats face an Emperor. During that fight Luffy’s Devil Fruit awakens, and he activates Gear 5 for the first time. Kaidou notes that the awakening shows elements of both Paramecia and Zoan fruits.',
      ref: { ch: 1044, ep: 1071 },
      spoiler: 'wano',
    },
  ],
  personality: [
    {
      heading: 'Freedom first, rules second',
      text: 'Luffy is cheerful, impulsive and endlessly hungry. He believes that the Pirate King has the most freedom in the world, and he judges everything by whether it takes freedom away. That makes him generous to people who are trapped and blunt toward people who trap them, and it is why he is so willing to start a fight on someone else’s behalf.',
      ref: { ch: 507, ep: 400 },
    },
    {
      heading: 'A dream he keeps close',
      text: 'He has said the Pirate King is only the start: there is a further dream that only his crew, family and closest friends know about. The crew hears it in the Egghead era.',
      ref: { ch: 1060, ep: 1088 },
      spoiler: 'wano',
    },
  ],
  development: [
    {
      heading: 'Growing through his brothers’ loss',
      text: 'Luffy’s sense of responsibility for his crew grows most visibly after Marineford, which is when the story shows him thinking about what he can and cannot protect. The two-year time skip is the author’s hinge: it separates a captain who wins by force of will from one who also trains deliberately.',
      spoiler: 'marineford',
    },
  ],
  motivations: [
    'Finding the treasure of Gol D. Roger and becoming the Pirate King.',
    'Protecting his crew and his brothers.',
    'Having the most freedom in the world.',
  ],
  abilities: [
    {
      id: 'gomu-gomu', name: 'Gomu Gomu no Mi', native: 'ゴムゴムの実', kind: 'innate', system: 'devil-fruit',
      summary: 'A Devil Fruit that makes Luffy’s body elastic like rubber. It gives him a wide range of stretching attacks and immunity to some kinds of damage, like electricity.',
      strengths: ['Elastic stretching and bouncing attacks.', 'Resistance to blunt force and electricity.'],
      limits: ['Luffy cannot swim, as with any Devil Fruit user.', 'Seawater and seastone weaken him.'],
      introduced: { ch: 1, ep: 4 }, confidence: 'confirmed',
    },
    {
      id: 'haki', name: 'Haki', native: '覇気', kind: 'skill', system: 'haki',
      summary: 'Luffy uses Armament and Observation Haki, and he also has the rare Conqueror’s Haki, which the Kuja note he used in his fight at Amazon Lily.',
      strengths: ['Armament Haki lets him hit opponents that can’t normally be hit.', 'Conqueror’s Haki can overpower others’ will.'],
      limits: ['It takes training and uses up his spirit.'],
      introduced: { ch: 597, ep: 516 }, confidence: 'confirmed', spoiler: 'marineford',
      evolution: 'Rayleigh explains Haki and trains Luffy in it. Later in Wano, he learns new applications of Armament Haki from Hyōgorō.',
    },
    {
      id: 'gear-second', name: 'Gear Second', kind: 'transformation', order: 1, system: 'devil-fruit',
      summary: 'Luffy pumps blood through his body to speed up his movements.',
      strengths: ['Large increase in speed and strength.'],
      limits: ['Strains Luffy’s body.'],
      introduced: { ch: 387, ep: 272 }, confidence: 'confirmed', spoiler: 'skypiea-enies-lobby',
    },
    {
      id: 'gear-third', name: 'Gear Third', kind: 'transformation', order: 2, system: 'devil-fruit',
      summary: 'Luffy inflates a limb to a giant size by blowing air into his bones.',
      strengths: ['Gigantic, heavy attacks.'],
      limits: ['Temporarily leaves Luffy’s body shrunken afterwards.'],
      introduced: { ch: 403, ep: 288 }, confidence: 'confirmed', spoiler: 'skypiea-enies-lobby',
    },
    {
      id: 'gear-fourth', name: 'Gear Fourth', kind: 'transformation', order: 3, system: 'devil-fruit',
      summary: 'After the time skip, Luffy fills his body with air and coats it with Armament Haki. Chapter 784 demonstrates the form’s effects.',
      strengths: ['Combines power, speed and Haki.'],
      limits: ['Has a limited duration, after which Luffy is left without use of his power for a while.'],
      introduced: { ch: 783, ep: 725 }, confidence: 'confirmed', spoiler: 'new-world',
    },
    {
      id: 'gear-fifth', name: 'Gear Fifth', kind: 'transformation', order: 4, system: 'devil-fruit',
      summary: 'Luffy’s Devil Fruit awakens and he activates Gear 5 for the first time in chapter 1044. Kaidou points out that the awakening has elements of both Paramecia and Zoan fruits.',
      strengths: ['An awakened state that extends the fruit’s effects beyond his body.'],
      limits: ['The state is physically draining.'],
      introduced: { ch: 1044, ep: 1071 }, confidence: 'confirmed', spoiler: 'wano',
    },
  ],
  battles: [
    {
      id: 'marineford', title: 'The war at Marineford', opponents: ['The Marines', 'Akainu'], outcome: 'Luffy loses his brother Ace.',
      summary: 'Luffy enters the war to rescue Ace and fights his way to the execution platform. Ace takes an attack meant for him.',
      ref: { ch: 573, ep: 482 }, event: 'ace-death', spoiler: 'marineford',
    },
    {
      id: 'wano-awakening', title: 'Wano: the awakening', opponents: ['Kaidou'], outcome: 'The fight turns when Luffy’s Devil Fruit awakens.',
      summary: 'Luffy activates Gear 5 for the first time against Kaidou.',
      ref: { ch: 1044, ep: 1071 }, event: 'gear-fifth', spoiler: 'wano',
    },
    {
      id: 'enies-lobby', title: 'Enies Lobby', opponents: ['World Government agents'], outcome: 'The Straw Hats rescue Robin.',
      summary: 'Luffy shows Gear Second and Gear Third as the crew storms a government fortress.',
      ref: { ch: 387, ep: 272 }, event: 'gear-second', spoiler: 'skypiea-enies-lobby',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Luffy is alive in all published material. The series is ongoing, so this reflects the chapters and episodes covered at the verification date.',
    events: [],
  },
  adaptation: [
    { topic: 'Where Gear 5 appears', anime: 'Episode 1071.', manga: 'Chapter 1044.', spoiler: 'wano' },
    { topic: 'Ace’s death', anime: 'The anime softens the death: Ace’s necklace breaks and he is covered in less blood.', manga: 'The necklace stays intact and the injury is shown with more blood and smoke.', spoiler: 'marineford' },
  ],
  appearances: [
    { medium: 'manga', title: 'One Piece', detail: 'Protagonist, from chapter 1.' },
    { medium: 'anime', title: 'One Piece', detail: 'Episodes 1–1155 and ongoing', animeSlug: 'one-piece' },
    { medium: 'film', title: 'One Piece Film: Red', detail: 'Uses Gear 5 in the film.' },
  ],
  unconfirmed: [
    'Luffy’s “further dream” beyond the Pirate King title is not stated in the sources used here.',
  ],
  faq: [
    { question: 'What is Gear 5?', answer: 'It is the form Luffy takes when his Devil Fruit awakens, first shown in manga chapter 1044 and anime episode 1071.', spoiler: 'wano' },
    { question: 'Who are Luffy’s brothers?', answer: 'Luffy has two sworn brothers, Ace and Sabo, who grew up with him. Ace’s fate is a major spoiler.', spoiler: 'marineford' },
    { question: 'Is Luffy the strongest character in One Piece?', answer: 'The story does not give a fixed scale, and the answer changes across arcs. AnimeSparks does not rank characters by power.' },
  ],
  related: ['portgas-d-ace'],
  articleKeys: ['Luffy'],
  seo: {
    title: 'Monkey D. Luffy: Gear Forms, Haki and Timeline (Spoiler-Safe)',
    description: 'Monkey D. Luffy explained with verified episode and chapter references: the Gear forms, Haki, his family and a spoiler-protected tracker, anime vs. manga.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Manga chapters 1–1125 and anime episodes 1–1155',
    sources: [
      { name: 'One Piece manga by Eiichiro Oda (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'One Piece anime (Toei Animation), episodes 1–1155', covers: 'Episode numbers.' },
      { name: 'One Piece Wiki on Fandom, “Monkey D. Luffy”, “Gear Second/Third/Fourth/Fifth”', url: 'https://onepiece.fandom.com/wiki/Monkey_D._Luffy', covers: 'Chapter and episode citations, birthday, ages and heights; no text copied.' },
    ],
  },
};
