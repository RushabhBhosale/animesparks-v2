import type { CharacterProfile } from '../../types.ts';

export const lightYagami: CharacterProfile = {
  slug: 'light-yagami',
  id: 'light',
  series: 'death-note',
  name: 'Light Yagami',
  native: '夜神月 (Yagami Raito)',
  aliases: ['Light', 'Kira', 'Raito Yagami'],
  role: 'Student who finds the Death Note and becomes Kira',
  affiliations: ['Japanese police task force (as an investigator)'],
  abilityTags: ['Death Note', 'Strategy', 'Deception', 'Intellect'],
  overview: 'Light Yagami is a top student who finds a notebook that kills anyone whose name is written in it. He uses it to punish criminals under the name Kira, and he is then hunted by the detective L. The story is the duel between the two.',
  facts: [
    { label: 'Birthday', value: 'February 28', confidence: 'confirmed' },
    { label: 'Birth year', value: '1986 in the manga; 1989 in the anime', confidence: 'disputed', note: 'The Death Note Wiki lists different birth years for the two versions.' },
    { label: 'Age', value: '17–18 in the first part of the story; 23 after the time skip', confidence: 'confirmed' },
    { label: 'Height', value: '179 cm (5 ft 10½ in)', confidence: 'confirmed' },
    { label: 'Weight', value: '54 kg (119 lb)', confidence: 'confirmed' },
    { label: 'Blood type', value: 'A', confidence: 'confirmed' },
    { label: 'Family', value: 'Father Soichiro, mother Sachiko, younger sister Sayu', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 1, “Boredom”; anime episode 1, “Rebirth”', confidence: 'confirmed', ref: { ch: 1, ep: 1 } },
    { label: 'Voice actors', value: 'Mamoru Miyano (Japanese); Brad Swaile (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'The notebook',
      text: 'Light is a high-school student at the top of his class who is bored with the world. He finds a notebook that the shinigami Ryuk dropped into the human world, tests it, and finds that it works. He decides to use it to rid the world of criminals.',
      ref: { ch: 1, ep: 1 },
    },
    {
      heading: 'The detective L',
      text: 'The police and a detective known only as L begin to hunt Kira. L tests Kira with a televised broadcast, and Light kills the man who appears as L, Lind L. Tailor. Light’s own father, Soichiro, is one of the police officers working with L.',
      ref: { ch: 2, ep: 2 },
    },
    {
      heading: 'Meeting L',
      text: 'Light and L meet in person at the university. L introduces himself, and Light realises that he cannot easily kill the man who suspects him.',
      ref: { ch: 19, ep: 9 },
    },
    {
      heading: 'Misa Amane',
      text: 'Misa Amane and her shinigami Rem enter the story and join Light’s side of the conflict.',
      ref: { ch: 25, ep: 11 },
    },
    {
      heading: 'The end of the first part',
      text: 'The first part ends with the death of L in chapter 59. The story continues with a time skip and a new set of opponents.',
      ref: { ch: 59, ep: 25 },
      spoiler: 'l-death',
    },
    {
      heading: 'The end of the story',
      text: 'The story ends with Light’s death in the final chapter.',
      ref: { ch: 108, ep: 37 },
      spoiler: 'finale',
    },
  ],
  personality: [
    {
      heading: 'Brilliant and sure he is right',
      text: 'Light is a top student who is confident in his intellect and in his sense of justice. The Death Note lets him act on it, and he comes to believe that he is making a better world.',
      ref: { ch: 1, ep: 1 },
    },
    {
      heading: 'A skilled liar',
      text: 'Light is an excellent actor. Under suspicion from L and the police, he keeps up the appearance of an ordinary student and a loyal son, and the Death Note Wiki rates his acting and social skills at the top of its scale.',
      ref: { ch: 19, ep: 9 },
    },
  ],
  development: [
    {
      heading: 'From a bored student to a self-styled god',
      text: 'The story shows Light’s growth step by step: from testing the notebook, to hiding it from L, to treating himself as the judge of the world. In the later chapters another character, Teru Mikami, calls him “God”, and the story’s final chapters turn on what Light has become.',
      spoiler: 'finale',
    },
  ],
  motivations: [
    'Creating a new world without criminals.',
    'Avoiding capture by L and the police.',
    'Protecting his family and himself.',
  ],
  abilities: [
    {
      id: 'death-note', name: 'The Death Note', native: 'デスノート', kind: 'weapon', system: 'death-note',
      summary: 'A notebook that kills anyone whose name is written in it. Light finds it in chapter 1 and uses it to kill criminals.',
      strengths: ['Kills from any distance without being seen.', 'The writer can specify how it happens.'],
      limits: ['He must know the person’s face and name.'],
      introduced: { ch: 1, ep: 1 }, confidence: 'confirmed',
    },
    {
      id: 'strategy', name: 'Strategy and intellect', kind: 'skill',
      summary: 'Light plans several steps ahead. He responds to L’s test by killing the decoy, and he keeps his actions looking like an ordinary student’s.',
      strengths: ['Long-term planning.', 'Fast responses to traps.'],
      limits: ['His plans depend on L not seeing through them.'],
      introduced: { ch: 2, ep: 2 }, confidence: 'confirmed',
    },
    {
      id: 'deception', name: 'Deception', kind: 'skill',
      summary: 'Light plays the role of a loyal student and son while he is Kira. He keeps this up when L meets him in person.',
      strengths: ['Convincing acting under pressure.'],
      limits: ['Each lie has to be maintained.'],
      introduced: { ch: 19, ep: 9 }, confidence: 'confirmed',
    },
  ],
  battles: [
    {
      id: 'broadcast', title: 'The televised test', opponents: ['L'], outcome: 'Light kills the man who appears as L.',
      summary: 'L goes on air as a decoy to provoke Kira. Light kills the decoy, Lind L. Tailor, which tells L that Kira can kill from afar.',
      ref: { ch: 2, ep: 2 }, event: 'l-broadcast',
    },
    {
      id: 'university', title: 'Light and L meet', opponents: ['L'], outcome: 'Neither reveals his hand.',
      summary: 'Light and L meet face to face at the university. L introduces himself, and the two begin a game of suspicion.',
      ref: { ch: 19, ep: 9 }, event: 'light-l-meet',
    },
    {
      id: 'end-of-l', title: 'The end of the first part', opponents: ['L'], outcome: 'L dies and the first part of the story ends.',
      summary: 'The duel between Light and L ends with L’s death at the end of the first part.',
      ref: { ch: 59, ep: 25 }, event: 'l-dies', spoiler: 'l-death',
    },
  ],
  status: {
    manga: { state: 'deceased', label: 'Deceased' },
    anime: { state: 'deceased', label: 'Deceased' },
    summary: 'Light dies at the end of the series, in chapter 108 of the manga and episode 37 of the anime.',
    spoiler: 'finale',
    events: [
      { id: 'light-death', kind: 'death', title: 'Light dies', circumstances: 'Light dies at the end of the series.', significance: 'It ends the story and the duel that began in the first part.', manga: { ch: 108 }, anime: { ep: 37 }, spoiler: 'finale' },
    ],
  },
  adaptation: [
    { topic: 'Birth year', anime: 'Light is born in 1989.', manga: 'Light is born in 1986.' },
  ],
  appearances: [
    { medium: 'manga', title: 'Death Note', detail: 'Protagonist, chapters 1–108.' },
    { medium: 'anime', title: 'Death Note', detail: 'Episodes 1–37', animeSlug: 'death-note' },
    { medium: 'film', title: 'Death Note film series', detail: 'Appears in Death Note and Death Note: The Last Name; the films change parts of the story.' },
  ],
  unconfirmed: [],
  faq: [
    { question: 'Who is Kira?', answer: 'Kira is the name Light Yagami gives himself when he starts killing criminals with the Death Note.' },
    { question: 'How does Light meet L?', answer: 'L approaches Light in person at the university and introduces himself, in manga chapter 19 and anime episode 9.' },
    { question: 'How does Death Note end?', answer: 'Light dies at the end of the series, in manga chapter 108 and anime episode 37.', spoiler: 'finale' },
  ],
  related: ['l-death-note'],
  articleKeys: ['Light Yagami', 'Kira'],
  seo: {
    title: 'Light Yagami: Death Note, Kira and Timeline (Spoiler-Safe)',
    description: 'Light Yagami explained with verified episode and chapter references: the Death Note, his duel with L, his ability and a spoiler-protected status tracker.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–108 and anime episodes 1–37',
    sources: [
      { name: 'Death Note manga by Tsugumi Ohba and Takeshi Obata (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Death Note anime (Madhouse)', covers: 'Episode numbers.' },
      { name: 'Death Note Wiki on Fandom, “Light Yagami” and its chapter and episode pages', url: 'https://deathnote.fandom.com/wiki/Light_Yagami', covers: 'Birthday, ages, height, weight, debut chapter and episode, and the chapter and episode of each event; no text copied.' },
    ],
  },
};
