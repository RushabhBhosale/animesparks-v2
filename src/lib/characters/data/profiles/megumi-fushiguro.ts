import type { CharacterProfile } from '../../types.ts';

export const megumiFushiguro: CharacterProfile = {
  slug: 'megumi-fushiguro',
  id: 'megumi',
  series: 'jujutsu-kaisen',
  name: 'Megumi Fushiguro',
  native: '伏黒恵 (Fushiguro Megumi)',
  aliases: ['Fushiguro', 'Megumi'],
  role: 'First-year sorcerer and wielder of the Ten Shadows Technique',
  affiliations: ['Tokyo Jujutsu High', 'Zenin clan (by blood)'],
  abilityTags: ['Ten Shadows Technique', 'Shikigami', 'Domain Expansion'],
  overview: 'Megumi Fushiguro is the first-year who finds Yuji Itadori and brings him into the jujutsu world. He inherits the Zenin clan’s prized Ten Shadows Technique, summoning shikigami from his own shadow, and the series gradually shows how much the people around him matter to the way he fights.',
  facts: [
    { label: 'Birthday', value: 'December 22', confidence: 'confirmed', ref: { other: 'Official Fanbook' } },
    { label: 'Age', value: '16 by December 2018', confidence: 'confirmed', ref: { ch: 222 } },
    { label: 'Height', value: '175 cm (5 ft 9 in)', confidence: 'confirmed', ref: { other: 'Volume 1 profile' } },
    { label: 'Grade', value: 'Grade 2', confidence: 'confirmed' },
    { label: 'Cursed technique', value: 'Ten Shadows Technique, inherited through the Zenin clan', confidence: 'confirmed' },
    { label: 'Family', value: 'Stepsister Tsumiki Fushiguro', confidence: 'confirmed' },
    { label: 'Father', value: 'Toji Fushiguro', confidence: 'confirmed', spoiler: 'season-2' },
    { label: 'Debut', value: 'Manga chapter 1; anime episode 1', confidence: 'confirmed' },
    { label: 'Voice actors', value: 'Yuma Uchida (Japanese); Robbie Daymond (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'Background',
      text: 'Megumi grew up with his older stepsister Tsumiki, who often scolded him for the fights he kept getting into at junior high. He enrolled at Tokyo Jujutsu High as a Grade 2 sorcerer with an unusually valuable inherited technique.',
      ref: { ch: 59 },
    },
    {
      heading: 'Finding Yuji',
      text: 'Megumi is sent to a school to recover Sukuna’s finger and ends up fighting a curse in the school with Yuji, who swallows the finger to help. His first plan is to kill Yuji to exorcise Sukuna, which is the standard way to deal with a vessel. Gojo turns up in chapter 2 and decides to test Yuji instead.',
      ref: { ch: 2, ep: 1 },
    },
    {
      heading: 'Shibuya',
      text: 'During the Shibuya Incident, Megumi rescues Maki, Naobito and Nanami from a sure-hit domain by entering it and opening a hole in the barrier. A little later Haruta Shigemo slashes him across the back; he is badly hurt, but he survives.',
      ref: { ch: 114, ep: 40 },
      spoiler: 'season-2',
    },
    {
      heading: 'The Culling Game',
      text: 'Megumi’s goal in the Culling Game is rescuing Tsumiki. He pushes the applications of the Ten Shadows Technique further, infiltrating a fight club to gather information on one of the players, and relying less on the shikigami he regards as a last resort.',
      spoiler: 'season-3',
    },
    {
      heading: 'Sukuna’s new body',
      text: 'In chapter 216 Kenjaku brings Sukuna to Megumi, and Sukuna moves into Megumi’s body. For the next 50 chapters Megumi’s soul survives underneath, bearing the burden of Mahoraga’s adaptation while Sukuna fights Gojo and, later, Yuji.',
      ref: { ch: 216 },
      spoiler: 'culling-game',
    },
    {
      heading: 'Freed',
      text: 'Yuji’s final plan is aimed at separating Sukuna from Megumi’s soul. After Sukuna’s defeat, Megumi is alive and standing with Shoko at the grave she prepared for Tsumiki, and he returns to ordinary missions with Yuji and Nobara.',
      ref: { ch: 270 },
      spoiler: 'finale',
    },
  ],
  personality: [
    {
      heading: 'Reserved, analytical, competitive',
      text: 'Megumi reads situations quickly and chooses the least risky route. He is blunt with Yuji, and after the Kyoto Goodwill Event he tells Yuji that he will surpass him, which says as much about his own insecurity as about Yuji’s growth.',
      ref: { ch: 53, ep: 21 },
    },
    {
      heading: 'Who he chooses to save',
      text: 'Megumi has a stated habit of helping people he judges worth helping, rather than everyone, and the story keeps testing whether that stance holds when the person at risk is his stepsister or his friends. He has no loyalty to the Zenin clan and treats Tsumiki as his family.',
    },
  ],
  development: [
    {
      heading: 'A technique that depends on imagination',
      text: 'The pattern across the series is that Megumi improves when he stops treating his last resort as the answer and lets his imagination work on his shadows, using shikigami for support, tracking and escape rather than only as attackers. The story presents this as growth in how he thinks, not just in how much cursed energy he has.',
    },
  ],
  motivations: [
    'Protecting his stepsister Tsumiki.',
    'Proving that he can stand beside Yuji and Nobara.',
    'Staying out of the Zenin clan’s plans for his technique.',
  ],
  abilities: [
    {
      id: 'ten-shadows', name: 'Ten Shadows Technique', native: '十種影法術', kind: 'technique',
      summary: 'Megumi summons shikigami from his shadow by forming hand signs. The roster of shikigami available to him grows as the story goes on.',
      strengths: ['Versatile: tracking, support, escape and offence.'],
      limits: ['A shikigami that is destroyed is gone for good.', 'The strongest shikigami carry a cost to Megumi himself.'],
      introduced: { ch: 9, ep: 5 }, evolution: 'Later chapters show Megumi inventing new uses for the shadows themselves, such as the Rabbit Escape diversion.', confidence: 'confirmed',
    },
    {
      id: 'mahoraga', name: 'Eight-Handled Sword Divergent Sila Divine General Mahoraga', native: '八握剣異戒神将魔虚羅', kind: 'technique',
      summary: 'A shikigami that adapts to whatever damages it. For Megumi it is a last resort, because summoning it is tied to risking his life.',
      strengths: ['Becomes immune to attacks it has taken once.', 'Described in the story as the strongest shikigami.'],
      limits: ['Summoning it is a last resort for Megumi.', 'Its adaptation needs time and repeated exposure.'],
      introduced: { ch: 9, ep: 5 }, confidence: 'confirmed',
    },
    {
      id: 'chimera-shadow-garden', name: 'Domain Expansion: Chimera Shadow Garden', native: '領域展開「嵌合暗翳庭」', kind: 'domain', system: 'domain-expansion',
      summary: 'Megumi’s domain, first shown in an unfinished form in the Death Painting arc.',
      strengths: ['Shows Megumi reaching the domain stage early.'],
      limits: ['The first use lacks a complete barrier.'],
      introduced: { ch: 58, ep: 23 }, confidence: 'confirmed',
    },
    {
      id: 'rabbit-escape', name: 'Rabbit Escape', kind: 'technique',
      summary: 'A swarm of rabbit shikigami used as a diversion.',
      strengths: ['Buys time or masks Megumi’s movement.'],
      limits: ['A distraction rather than an attack.'],
      introduced: { ch: 156, ep: 53 }, confidence: 'confirmed', spoiler: 'season-3',
    },
  ],
  battles: [
    {
      id: 'vs-sukuna-ch9', title: 'Megumi vs. Sukuna (in Yuji’s body)', opponents: ['Ryomen Sukuna'], outcome: 'Megumi loses several shikigami and is saved when Yuji takes his body back.',
      summary: 'Sukuna toys with Megumi’s shikigami and shows that he finds the technique interesting, until Yuji regains control.',
      ref: { ch: 9, ep: 5 }, spoiler: 'season-1',
    },
    {
      id: 'vs-haruta', title: 'Megumi vs. Haruta Shigemo', opponents: ['Haruta Shigemo'], outcome: 'Megumi is slashed across the back but survives.',
      summary: 'In Shibuya, exhausted after rescuing others from a domain, Megumi is struck by a surprise attack.',
      ref: { ch: 114, ep: 40 }, spoiler: 'season-2',
    },
    {
      id: 'soul-vs-sukuna', title: 'Megumi’s soul vs. Sukuna', opponents: ['Ryomen Sukuna'], outcome: 'Megumi’s soul holds on until Yuji reaches it.',
      summary: 'Under Sukuna’s control, Megumi’s soul carries Mahoraga’s adaptation during the Gojo fight, and later uses shadows to hold Sukuna long enough for Yuji to strike.',
      ref: { ch: 229 }, event: 'gojo-vs-sukuna', spoiler: 'shinjuku',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive (freed from Sukuna)' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Megumi survives the manga. Sukuna uses his body from chapter 216 until he is separated in the final fight, and Megumi is seen alive in chapters 270 and 271.',
    spoiler: 'culling-game',
    events: [
      {
        id: 'shibuya-injury', kind: 'near-death', title: 'Slashed by Haruta Shigemo',
        cause: 'A cut across the back.', circumstances: 'Exhausted after protecting his allies, Megumi is hit in Shibuya but keeps fighting.',
        significance: 'It is a close call, not a death, and shows the cost of his rescue.',
        anime: { ep: 40 }, manga: { ch: 114 }, spoiler: 'season-2',
      },
      {
        id: 'possession', kind: 'body-swap', title: 'Sukuna takes Megumi’s body',
        cause: 'Kenjaku moves Sukuna to a new vessel.', circumstances: 'In the Culling Game, Sukuna switches vessels and says he simply liked Megumi’s face more.',
        significance: 'Megumi’s body becomes Sukuna’s for the rest of the story, and Yuji’s mission becomes saving him.',
        manga: { ch: 216 }, spoiler: 'culling-game',
        adaptation: 'Not animated: season 3 covers up to chapter 181.',
      },
    ],
  },
  adaptation: [
    { topic: 'Sukuna’s possession of Megumi', anime: 'Not reached; the anime stops at chapter 181.', manga: 'Happens in chapter 216.', spoiler: 'culling-game' },
  ],
  appearances: [
    { medium: 'manga', title: 'Jujutsu Kaisen', detail: 'Main character, from chapter 1.' },
    { medium: 'anime', title: 'Jujutsu Kaisen seasons 1–3', detail: 'Episodes 1–59', animeSlug: 'jujutsu-kaisen' },
  ],
  unconfirmed: [
    'How strong Mahoraga would be without any adaptation time has never been stated.',
  ],
  faq: [
    { question: 'What is Megumi’s cursed technique?', answer: 'The Ten Shadows Technique, a Zenin clan technique that summons shikigami from shadows. Megumi inherited it through his father.' },
    { question: 'Is Megumi related to Toji?', answer: 'Yes. Toji Fushiguro, the assassin Gojo fights in the 2006 flashback, is Megumi’s father.', spoiler: 'season-2' },
    { question: 'Does Megumi die in Jujutsu Kaisen?', answer: 'No. Sukuna takes over Megumi’s body in the late manga, but Megumi survives and is seen alive in the final chapters.', spoiler: 'culling-game' },
  ],
  related: ['yuji-itadori', 'gojo-satoru', 'ryomen-sukuna'],
  articleKeys: ['Fushiguro'],
  seo: {
    title: 'Megumi Fushiguro: Ten Shadows, Mahoraga and Status (Spoiler-Safe)',
    description: 'Megumi Fushiguro explained with verified chapters and episodes: the Ten Shadows Technique, Mahoraga, his family, relationships and a spoiler-protected status tracker.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Manga chapters 1–271 (complete) and anime episodes 1–59',
    sources: [
      { name: 'Jujutsu Kaisen manga by Gege Akutami (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Jujutsu Kaisen anime (MAPPA), episodes 1–59', covers: 'Episode numbers and mapping.' },
      { name: 'Jujutsu Kaisen Wiki on Fandom, “Megumi Fushiguro” and “Ten Shadows Technique”', url: 'https://jujutsu-kaisen.fandom.com/wiki/Megumi_Fushiguro', covers: 'Chapter and episode citations used for cross-checking; no text copied.' },
      { name: 'Jujutsu Kaisen Official Fanbook (cited by the wiki)', covers: 'Birthday.' },
    ],
  },
};
