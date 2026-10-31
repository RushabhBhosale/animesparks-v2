import type { CharacterProfile } from '../../types.ts';

export const sanji: CharacterProfile = {
  slug: 'sanji',
  id: 'sanji',
  series: 'one-piece',
  name: 'Sanji',
  native: 'サンジ (Sanji)',
  aliases: ['Black Leg Sanji', 'Sanji Vinsmoke', 'Cook of the Straw Hats'],
  role: 'Cook and kicking fighter of the Straw Hat Pirates',
  affiliations: ['Straw Hat Pirates', 'Straw Hat Grand Fleet'],
  abilityTags: ['Black Leg Style', 'Diable Jambe', 'Sky Walk', 'Observation Haki'],
  overview: 'Sanji is the cook of the Straw Hat Pirates and one of its strongest fighters. Raised at the floating restaurant Baratie, he never fights with his hands, uses only his legs, and wants to find the legendary sea called the All Blue.',
  facts: [
    { label: 'Birthday', value: 'March 2', confidence: 'confirmed' },
    { label: 'Age', value: '19 at his debut; 21 after the time skip', confidence: 'confirmed' },
    { label: 'Height', value: '177 cm before the time skip; 180 cm after', confidence: 'confirmed' },
    { label: 'Bounty', value: '1,032,000,000 berries', confidence: 'estimate', note: 'The latest bounty listed on the One Piece Wiki at the verification date. It changes with new chapters.' },
    { label: 'Origin', value: 'North Blue (Germa Kingdom)', confidence: 'confirmed', spoiler: 'new-world' },
    { label: 'Occupation', value: 'Cook; former sous chef at the Baratie', confidence: 'confirmed' },
    { label: 'Blood type', value: 'S (RH-)', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 43; anime episode 20', confidence: 'confirmed', ref: { ch: 43, ep: 20 } },
    { label: 'Voice actors', value: 'Hiroaki Hirata (Japanese); Eric Vale (English, Funimation)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'The Baratie',
      text: 'The Straw Hats meet Sanji at the Baratie, a floating restaurant where he works as a cook under its owner, Zeff. His past with Zeff goes back to the wreck of a ship called the Orbit, which Zeff’s pirate crew attacked.',
      ref: { ch: 43, ep: 20 },
    },
    {
      heading: 'Joining the crew',
      text: 'After the Baratie arc, Sanji leaves the restaurant and joins the Straw Hats as their cook. At Arlong Park he fights alongside the crew and defeats the fish-man Kuroobi.',
      ref: { ch: 86, ep: 39 },
    },
    {
      heading: 'Sabaody and the time skip',
      text: 'At the Sabaody Archipelago, Sanji uses his Diable Jambe technique against the Warlord Bartholomew Kuma. The story later reveals that during the two-year time skip he lived in the Kamabakka Kingdom, where he trained and developed his Sky Walk and Observation Haki.',
      ref: { ch: 635, ep: 555 },
      spoiler: 'new-world',
    },
    {
      heading: 'The Vinsmoke family',
      text: 'In the Whole Cake Island arc, Sanji’s past is revealed: he was born into the Vinsmoke Family, the ruling family of the Germa Kingdom, as the third son of Vinsmoke Judge. His sister Reiju tries to persuade him to take up his royal life again.',
      ref: { ch: 813, ep: 763 },
      spoiler: 'new-world',
    },
    {
      heading: 'Wano',
      text: 'In Wano Country Sanji fights Queen of the Beasts Pirates with a new form of his Diable Jambe called Ifrit Jambe.',
      ref: { ch: 1034, ep: 1061 },
      spoiler: 'wano',
    },
  ],
  personality: [
    {
      heading: 'A gentleman, and a chef first',
      text: 'Sanji is gallant to women and refuses to hit them, and he is fiercely protective of food. He is angry when anyone wastes it, and he is the crew’s cook above all else.',
      ref: { ch: 43, ep: 20 },
    },
    {
      heading: 'Who he is beyond his family',
      text: 'The Vinsmoke family wanted a different life for him. Sanji refuses it, and the story treats his cooking and his crew as the life he chose.',
      ref: { ch: 833, ep: 793 },
      spoiler: 'new-world',
    },
  ],
  development: [
    {
      heading: 'From cook to one of the crew’s three pillars',
      text: 'Sanji begins as a cook with a kicking style. Over the story, the crew counts him with Luffy and Zoro as its strongest fighters, and he develops new techniques in the Kamabakka Kingdom and in Wano Country.',
      spoiler: 'wano',
    },
  ],
  motivations: [
    'Finding the All Blue, the legendary sea where all the world’s fish meet.',
    'Cooking for the crew and for anyone who is hungry.',
    'Protecting his friends, and women in particular.',
  ],
  abilities: [
    {
      id: 'black-leg-style', name: 'Black Leg Style', native: '黒足 (Kuro Ashi)', kind: 'technique',
      summary: 'A fighting style that uses only Sanji’s legs, because a cook must protect his hands.',
      strengths: ['Fast, powerful kicks.', 'Lets him fight without risking his hands.'],
      limits: ['He fights only with his legs by choice.'],
      introduced: { ch: 43, ep: 20 }, confidence: 'confirmed',
    },
    {
      id: 'diable-jambe', name: 'Diable Jambe', native: 'ディアブル・ジャンブ', kind: 'technique',
      summary: 'Sanji’s leg heats up until it burns, and he fights with flaming kicks. He uses a form of it, Flambage Shot, against Kuma at Sabaody.',
      strengths: ['Flaming kicks with great damage.'],
      limits: ['It strains his leg to use.'],
      introduced: { ch: 507, ep: 401 }, confidence: 'confirmed', spoiler: 'marineford',
    },
    {
      id: 'sky-walk', name: 'Sky Walk', kind: 'skill',
      summary: 'Sanji kicks off the air itself to move through the sky. He develops it during his two years in the Kamabakka Kingdom.',
      strengths: ['Moves through the air in a fight.'],
      limits: ['It takes a great deal of kicking to keep up.'],
      introduced: { ch: 635, ep: 555 }, confidence: 'confirmed', spoiler: 'new-world',
    },
    {
      id: 'observation-haki', name: 'Observation Haki', native: '見聞色の覇気', kind: 'skill', system: 'haki',
      summary: 'Sanji is an extremely skilled user of Observation Haki, which is his specialty. He trained it during his time in the Kamabakka Kingdom.',
      strengths: ['Senses attacks and enemies before they strike.'],
      limits: ['It takes training and uses up his spirit.'],
      introduced: { ch: 862, ep: 832 }, confidence: 'confirmed', spoiler: 'new-world',
    },
    {
      id: 'ifrit-jambe', name: 'Ifrit Jambe', kind: 'power-up', order: 1,
      summary: 'A new form of Sanji’s Diable Jambe that he uses against Queen in Wano Country.',
      strengths: ['A stronger form of his flaming kicks.'],
      limits: ['It is physically demanding.'],
      introduced: { ch: 1034, ep: 1061 }, confidence: 'confirmed', spoiler: 'wano',
    },
  ],
  battles: [
    {
      id: 'kuroobi', title: 'Sanji vs. Kuroobi', opponents: ['Kuroobi'], outcome: 'Sanji defeats the fish-man Kuroobi.',
      summary: 'At Arlong Park, Sanji takes on Kuroobi of the Arlong Pirates while the rest of the crew fights.',
      ref: { ch: 86, ep: 39 }, event: 'arlong-park-battle',
    },
    {
      id: 'kuma', title: 'Sanji and the crew vs. Kuma', opponents: ['Bartholomew Kuma'], outcome: 'The crew cannot stop Kuma at Sabaody.',
      summary: 'Sanji uses a Flambage Shot of his Diable Jambe against the Warlord at the Sabaody Archipelago.',
      ref: { ch: 507, ep: 401 }, event: 'sabaody-kuma', spoiler: 'marineford',
    },
    {
      id: 'queen', title: 'Sanji vs. Queen', opponents: ['Queen'], outcome: 'Sanji hits Queen with Ifrit Jambe.',
      summary: 'In Wano Country, Sanji shouts at Queen for striking a woman and unleashes his new technique.',
      ref: { ch: 1034, ep: 1061 }, event: 'sanji-ifrit', spoiler: 'wano',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Sanji is alive in all published material. The series is ongoing, so this reflects the chapters and episodes covered at the verification date.',
    events: [],
  },
  adaptation: [],
  appearances: [
    { medium: 'manga', title: 'One Piece', detail: 'Main character, from chapter 43.' },
    { medium: 'anime', title: 'One Piece', detail: 'Episodes 1–1155 and ongoing', animeSlug: 'one-piece' },
  ],
  unconfirmed: [
    'Whether Sanji finds the All Blue has not been settled in the chapters covered here.',
  ],
  faq: [
    { question: 'Why does Sanji only fight with his legs?', answer: 'Sanji is a cook, and he protects his hands to keep cooking. His Black Leg Style uses only his legs.' },
    { question: 'What is Diable Jambe?', answer: 'A technique where Sanji’s leg burns with heat so his kicks are flaming. He first uses it at the Sabaody Archipelago, and a new form, Ifrit Jambe, appears in Wano Country.', spoiler: 'wano' },
    { question: 'Is Sanji a prince?', answer: 'He is the third son of Vinsmoke Judge, ruler of the Germa Kingdom. This is revealed in the Whole Cake Island arc.', spoiler: 'new-world' },
  ],
  related: ['monkey-d-luffy', 'roronoa-zoro', 'nami'],
  articleKeys: ['Sanji'],
  seo: {
    title: 'Sanji: Black Leg Style, Diable Jambe and Timeline (Spoiler-Safe)',
    description: 'Sanji explained with verified episode and chapter references: Black Leg Style, Diable Jambe, Sky Walk, his family and a spoiler-protected timeline.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–1125 and anime episodes 1–1155',
    sources: [
      { name: 'One Piece manga by Eiichiro Oda (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'One Piece anime (Toei Animation)', covers: 'Episode numbers.' },
      { name: 'One Piece Wiki on Fandom, “Sanji” and its History and Abilities pages', url: 'https://onepiece.fandom.com/wiki/Sanji', covers: 'Chapter and episode citations, birthday, ages, heights and bounty; no text copied.' },
    ],
  },
};
