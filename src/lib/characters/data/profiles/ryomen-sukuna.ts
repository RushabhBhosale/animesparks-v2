import type { CharacterProfile } from '../../types.ts';

export const ryomenSukuna: CharacterProfile = {
  slug: 'ryomen-sukuna',
  id: 'sukuna',
  series: 'jujutsu-kaisen',
  name: 'Ryomen Sukuna',
  native: '両面宿儺 (Ryōmen Sukuna)',
  aliases: ['Sukuna', 'King of Curses', 'The Strongest Sorcerer in History'],
  role: 'Special Grade curse and main antagonist',
  affiliations: ['None (a free-standing curse)'],
  abilityTags: ['Dismantle and Cleave', 'Domain Expansion', 'Malevolent Shrine', 'Ten Shadows Technique'],
  overview: 'Ryomen Sukuna is the King of Curses: a sorcerer from a thousand years ago whose twenty fingers survived him as cursed objects. In Jujutsu Kaisen he returns when Yuji Itadori swallows one, and he spends the story as both an uninvited passenger and the series’ central threat.',
  facts: [
    { label: 'Age', value: 'More than 1,000 years', confidence: 'confirmed', ref: { ch: 3, ep: 2 } },
    { label: 'Aliases', value: 'King of Curses, the Imaginary Demon, the Disgraced One, the strongest sorcerer in history', confidence: 'confirmed' },
    { label: 'Grade', value: 'Special Grade', confidence: 'confirmed' },
    { label: 'Fingers', value: 'Twenty, each a Special Grade cursed object', confidence: 'confirmed', ref: { ch: 2 } },
    { label: 'Affiliation', value: 'None; allied at times with Kenjaku and his own followers', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 1; anime episode 1', confidence: 'confirmed' },
    { label: 'Birthday', value: 'Not given', confidence: 'unknown' },
    { label: 'Height', value: 'Not given', confidence: 'unknown' },
    { label: 'Voice actors', value: 'Junichi Suwabe (Japanese); Ray Chase (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'The King of Curses',
      text: 'A thousand years before the story begins, Sukuna was a sorcerer who killed many of the strongest sorcerers of the golden age of jujutsu. His remains survive as twenty fingers, and since the fingers cannot be destroyed, they are passed through the jujutsu world as Special Grade cursed objects.',
      ref: { ch: 3, ep: 2 },
    },
    {
      heading: 'Inside Yuji',
      text: 'When Yuji eats one finger, Sukuna wakes up in his body. He is arrogant, bored and openly hostile, and he is also constrained: Yuji can take control back, and Sukuna’s strength grows only as Yuji swallows more of the fingers. Gojo explains in chapter 2 that a vessel who consumes all twenty is to be executed, which makes the whole premise a countdown.',
      ref: { ch: 2, ep: 1 },
    },
    {
      heading: 'Awakening in Shibuya',
      text: 'During the Shibuya Incident, with Yuji having swallowed many fingers, Sukuna takes control of the body and shows a fraction of his old power. By the time Yuji has consumed sixteen fingers the cursed energy he gives off is felt across Shibuya, and he overwhelms the special-grade curse Jogo.',
      ref: { ch: 112, ep: 39 },
      spoiler: 'season-2',
    },
    {
      heading: 'A new body',
      text: 'In the Culling Game Kenjaku takes Sukuna from Yuji, and Sukuna moves to Megumi Fushiguro’s body in chapter 216. He later collects the rest of his fingers and replaces the last one with his own mummified body from the Heian era.',
      ref: { ch: 216 },
      spoiler: 'culling-game',
    },
    {
      heading: 'Killing Gojo',
      text: 'On 24 December 2018 Sukuna fights Gojo. The fight uses the Ten Shadows Technique, Mahoraga’s adaptation and a series of domain clashes, and ends when Sukuna adapts his slash to cut through Infinity (chapter 236). He congratulates Gojo as he dies.',
      ref: { ch: 236 },
      spoiler: 'gojo-sukuna',
    },
    {
      heading: 'The end of the King',
      text: 'Yuji defeats Sukuna in the final stretch. After a Black Flash in chapter 267, Sukuna’s body falls apart in chapter 268; Yuji offers him a place inside him, and Sukuna refuses, saying he remains a curse until the end. A closing scene in chapter 271 shows his soul in the passageway for souls, greeted by Mahito.',
      ref: { ch: 268 },
      spoiler: 'finale',
    },
  ],
  personality: [
    {
      heading: 'Contempt, curiosity and a taste for strength',
      text: 'Sukuna treats people as entertainment. He mocks Yuji for relying on him and sadistically refuses to help when Yuji begs for Junpei’s life. He is also genuinely curious about strong opponents, and is impressed by Megumi’s command of his shikigami when the two first fight.',
      ref: { ch: 27, ep: 12 },
    },
    {
      heading: 'A man shunned',
      text: 'The manga hints at the origin of his cruelty. He tells an opponent that he was shunned from an early age, and the closing chapters tie that to his refusal to be moved by Yuji’s compassion. His curiosity about strength survives too: he praises Gojo as the duel ends and congratulates Maki as the first person to give him something to prove.',
      ref: { ch: 237 },
      spoiler: 'shinjuku',
    },
  ],
  development: [
    {
      heading: 'A villain who keeps Yuji honest',
      text: 'Sukuna is written as an antagonist who cannot be reasoned with and cannot be ignored, because he is living in the protagonist’s body. That gives the early chapters a steady pressure: every time Yuji asks Sukuna for help, the cost is visible. By the finale, Yuji’s answer to him is not hatred but an offer that Sukuna refuses, which is what the story uses to show how much Yuji has changed.',
      spoiler: 'finale',
    },
  ],
  motivations: [
    'Regaining his full power by consuming all twenty fingers.',
    'Enjoying strong opponents, which is why he seeks out the strongest sorcerers.',
    'Taking a body of his own: Megumi’s, after Yuji’s.',
  ],
  abilities: [
    {
      id: 'finger-power', name: 'Strength tied to his fingers', kind: 'power-up', order: 1,
      summary: 'Sukuna’s power depends on how many fingers Yuji has swallowed. Incarnated through a single finger he remains dangerous; at sixteen he is awake enough to overwhelm Jogo.',
      strengths: ['Even partly restored, he can defeat cursed spirits that threaten Yuji’s allies.'],
      limits: ['Yuji can take back control of the body.', 'Fewer fingers means lower output.'],
      introduced: { ch: 1, ep: 1 }, confidence: 'confirmed',
    },
    {
      id: 'shibuya-awakening', name: 'Shibuya awakening', kind: 'power-up', order: 2,
      summary: 'After Yuji has consumed sixteen fingers, Sukuna’s cursed energy is felt throughout Shibuya and he overpowers Jogo.',
      strengths: ['A large share of his strength is back.'],
      limits: ['Still working inside Yuji’s body.'],
      introduced: { ch: 112, ep: 39 }, confidence: 'confirmed', spoiler: 'season-2',
    },
    {
      id: 'full-power', name: 'All twenty fingers and his original body', kind: 'power-up', order: 3,
      summary: 'Sukuna eats the rest of his fingers and replaces the last one with his mummified body from the Heian era.',
      strengths: ['The strongest state the story shows him in.'],
      limits: ['Now fighting from Megumi’s body, a different vessel.'],
      introduced: { ch: 222 }, confidence: 'confirmed', spoiler: 'culling-game',
    },
    {
      id: 'dismantle-cleave', name: 'Dismantle and Cleave', native: '解 / 捌', kind: 'technique',
      summary: 'Invisible, high-speed slashes. Dismantle cuts at range; Cleave adjusts its power to the toughness of the target. Together they are Sukuna’s everyday weapons.',
      strengths: ['Can slice cursed spirits, sorcerers and objects, including skyscrapers at high output.', 'Spiderweb applies Cleave across the ground by touch.'],
      limits: ['Cutting power depends on cursed-energy output.'],
      introduced: { ch: 119, ep: 41 }, confidence: 'confirmed',
    },
    {
      id: 'divine-flame', name: 'Divine Flame', native: '竈', kind: 'technique',
      summary: 'Sukuna forms a fire arrow with a chant and fires it at range.',
      strengths: ['Long-range burning attack.'],
      limits: ['Slow, with a narrow range.'],
      introduced: { ch: 115, ep: 40 }, confidence: 'confirmed', spoiler: 'season-2',
    },
    {
      id: 'malevolent-shrine', name: 'Domain Expansion: Malevolent Shrine', kind: 'domain', system: 'domain-expansion',
      summary: 'A barrierless domain: Sukuna’s technique is guaranteed to hit everything within its range.',
      strengths: ['Because it has no closed barrier, it can break a closed domain from the outside.'],
      limits: ['Range and output trade off against each other.'],
      introduced: { ch: 225 }, battles: ['vs-gojo'], confidence: 'confirmed', spoiler: 'gojo-sukuna',
    },
    {
      id: 'ten-shadows-use', name: 'Ten Shadows Technique (borrowed)', kind: 'technique',
      summary: 'In Megumi’s body, Sukuna can use the Ten Shadows Technique, including Mahoraga, Agito and the Great Serpent.',
      strengths: ['Adds a second technique to his own.'],
      limits: ['Mahoraga adapts to attacks over time, so its usefulness in a fight depends on how long it survives.'],
      introduced: { ch: 219 }, battles: ['vs-gojo'], confidence: 'confirmed', spoiler: 'culling-game',
    },
  ],
  battles: [
    {
      id: 'vs-megumi', title: 'Sukuna vs. Megumi', opponents: ['Megumi Fushiguro'], outcome: 'Sukuna defeats Megumi’s shikigami, until Yuji takes back his body.',
      summary: 'The first time Sukuna fights for himself in the story: he is impressed with Megumi’s skill and pushes him into a corner.',
      ref: { ch: 9, ep: 5 }, spoiler: 'season-1',
    },
    {
      id: 'vs-jogo', title: 'Sukuna vs. Jogo', opponents: ['Jogo'], outcome: 'Sukuna overpowers Jogo.',
      summary: 'In Shibuya, with a large part of his strength restored, Sukuna dominates the special-grade curse Jogo.',
      ref: { ch: 112, ep: 39 }, spoiler: 'season-2',
    },
    {
      id: 'vs-gojo', title: 'Sukuna vs. Gojo', opponents: ['Satoru Gojo'], outcome: 'Sukuna kills Gojo in chapter 236.',
      summary: 'A fourteen-chapter fight, ended by Sukuna adapting a slash that cuts through Infinity.',
      ref: { ch: 223 }, event: 'gojo-vs-sukuna', spoiler: 'gojo-sukuna',
    },
    {
      id: 'vs-yuji-team', title: 'Sukuna vs. Yuji and the sorcerers', opponents: ['Yuji Itadori'], outcome: 'Sukuna is defeated and dies in chapter 268.',
      summary: 'A fight that involves Maki, Choso, Kusakabe, Todo, Yuta and others before Yuji ends it.',
      ref: { ch: 267 }, event: 'sukuna-defeated', spoiler: 'finale',
    },
  ],
  status: {
    manga: { state: 'deceased', label: 'Deceased' },
    anime: { state: 'alive', label: 'Alive (inside Yuji)' },
    summary: 'In the manga Sukuna dies in chapter 268. In the anime he is still sealed inside Yuji’s body as of season 3.',
    spoiler: 'finale',
    events: [
      {
        id: 'new-vessel', kind: 'body-swap', title: 'Moves into Megumi’s body',
        circumstances: 'Kenjaku brings Sukuna to Megumi in the Culling Game; Sukuna says he prefers the new face.',
        significance: 'It makes Megumi’s survival part of the climax.',
        manga: { ch: 216 }, spoiler: 'culling-game',
      },
      {
        id: 'death', kind: 'death', title: 'Dies after the final fight',
        cause: 'Yuji’s Black Flash lands in chapter 267; Sukuna’s body deteriorates and disintegrates in chapter 268.',
        circumstances: 'Sukuna’s body falls apart in chapter 268. He turns down Yuji’s offer to take him back as a vessel, then disintegrates.',
        significance: 'He remains a curse to the end; the closing chapters show his soul meeting Mahito.',
        manga: { ch: 268 }, spoiler: 'finale',
        adaptation: 'Not animated.',
      },
    ],
  },
  adaptation: [
    { topic: 'Where the anime leaves Sukuna', anime: 'Inside Yuji; season 3 ends before he moves to Megumi.', manga: 'Sukuna moves to Megumi (chapter 216), kills Gojo (236) and dies in chapter 268.', spoiler: 'finale' },
  ],
  appearances: [
    { medium: 'manga', title: 'Jujutsu Kaisen', detail: 'Main antagonist, from chapter 1.' },
    { medium: 'anime', title: 'Jujutsu Kaisen seasons 1–3', detail: 'Episodes 1–59', animeSlug: 'jujutsu-kaisen' },
  ],
  unconfirmed: [
    'Sukuna’s birth date and height are never stated.',
    'The story does not tell what happens to his soul after the closing scene beyond that meeting.',
  ],
  faq: [
    { question: 'Is Sukuna stronger than Gojo?', answer: 'The story treats them as the two strongest fighters. They fight once, and the result is a spoiler. AnimeSparks does not rank characters by power.' },
    { question: 'How many fingers does Sukuna have?', answer: 'Twenty. Each one is a Special Grade cursed object, and they cannot be destroyed.' },
    { question: 'Does Sukuna die in Jujutsu Kaisen?', answer: 'In the manga, yes, in chapter 268. In the anime he is still alive as of season 3.', spoiler: 'finale' },
  ],
  related: ['yuji-itadori', 'gojo-satoru', 'megumi-fushiguro'],
  articleKeys: ['Sukuna'],
  seo: {
    title: 'Ryomen Sukuna: Abilities, Fingers and Status (Spoiler-Safe)',
    description: 'Ryomen Sukuna explained with verified episodes and chapters: the twenty fingers, Dismantle and Cleave, Malevolent Shrine, and a spoiler-protected status tracker.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Manga chapters 1–271 (complete) and anime episodes 1–59',
    sources: [
      { name: 'Jujutsu Kaisen manga by Gege Akutami (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Jujutsu Kaisen anime (MAPPA), episodes 1–59', covers: 'Episode numbers and mapping.' },
      { name: 'Jujutsu Kaisen Wiki on Fandom, “Sukuna” and subpages', url: 'https://jujutsu-kaisen.fandom.com/wiki/Sukuna', covers: 'Chapter and episode citations used for cross-checking; no text copied.' },
    ],
  },
};
