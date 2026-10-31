import type { CharacterProfile } from '../../types.ts';

export const nezukoKamado: CharacterProfile = {
  slug: 'nezuko-kamado',
  id: 'nezuko',
  series: 'demon-slayer',
  name: 'Nezuko Kamado',
  native: '竈門禰豆子 (Kamado Nezuko)',
  aliases: ['Nezuko', 'The Chosen Demon'],
  role: 'Tanjiro’s younger sister, who is turned into a demon but keeps her humanity',
  affiliations: ['Demon Slayer Corps'],
  abilityTags: ['Exploding Blood', 'Regeneration', 'Sunlight immunity', 'Demon strength'],
  overview: 'Nezuko Kamado is Tanjiro’s younger sister. When their family is attacked she is turned into a demon, but she does not attack people and resists her hunger. She travels with Tanjiro as he looks for a way to make her human again.',
  facts: [
    { label: 'Birthday', value: 'December 28', confidence: 'confirmed' },
    { label: 'Age', value: '12 at the start of the story (14 by the later arcs)', confidence: 'confirmed', note: 'The Demon Slayer Wiki lists her as 12 physically and 14 chronologically.' },
    { label: 'Height', value: '153 cm (5 ft 0 in)', confidence: 'confirmed' },
    { label: 'Weight', value: '45 kg', confidence: 'confirmed' },
    { label: 'Race', value: 'Human, turned into a demon, human again by the end of the manga', confidence: 'confirmed', spoiler: 'finale' },
    { label: 'Affiliation', value: 'Demon Slayer Corps (formerly)', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 1; anime episode 1', confidence: 'confirmed', ref: { ch: 1, ep: 1 } },
    { label: 'Voice actors', value: 'Akari Kito (Japanese); Abby Trott (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'The family attack',
      text: 'Nezuko is the second child of the Kamado family. When Tanjiro comes back from selling charcoal, most of the family has been killed and Nezuko has been turned into a demon. Giyu Tomioka gives her a bamboo muzzle, tied with red cloth, to keep her from biting people.',
      ref: { ch: 1, ep: 1 },
    },
    {
      heading: 'Traveling with Tanjiro',
      text: 'Nezuko goes with Tanjiro when he joins the Demon Slayer Corps. She sleeps for much of the day, and she shields Tanjiro and others from the demons they meet. The Corps tests her: when the Wind Hashira Sanemi Shinazugawa tries to lure her into biting his arm, she turns away.',
      ref: { ch: 47 },
      spoiler: 'season-1',
    },
    {
      heading: 'Mount Natagumo',
      text: 'On Mount Natagumo, Nezuko shows her Blood Demon Art, Exploding Blood: she expels her blood and turns it into flames that burn demons.',
      ref: { ch: 40 },
      spoiler: 'season-1',
    },
    {
      heading: 'Swordsmith Village',
      text: 'During her fight with the demon Hantengu, Nezuko develops immunity to sunlight, which lets her move around in the sun.',
      ref: { ch: 127, ep: 55 },
      spoiler: 'district-village',
    },
    {
      heading: 'Becoming human again',
      text: 'By the end of the manga, Nezuko is human again. Her hair keeps its flame-orange tips, a feature her descendant Toko later inherits.',
      ref: { ch: 204 },
      spoiler: 'finale',
    },
  ],
  personality: [
    {
      heading: 'A responsible older sister',
      text: 'As a human, Nezuko was a responsible older sister who put her younger siblings’ needs first. She does not hesitate to step into harm’s way to protect her friends, both as a human and as a demon.',
      ref: { ch: 1 },
    },
    {
      heading: 'Willpower over instinct',
      text: 'Nezuko’s defining trait is her willpower: she refuses to attack humans even though she is a demon and is starving. The Wind Hashira’s test shows it clearly.',
      ref: { ch: 47 },
      spoiler: 'season-1',
    },
  ],
  development: [
    {
      heading: 'The demon who chooses not to be one',
      text: 'The story gives Nezuko a place of her own. She is not just someone Tanjiro protects: her Blood Demon Art, her regeneration and her immunity to sunlight all grow as the story does, and each one is a reason the Corps accepts her.',
      spoiler: 'district-village',
    },
  ],
  motivations: [
    'Protecting Tanjiro and the people around her.',
    'Resisting her demon hunger and refusing to hurt humans.',
    'Becoming human again and going home.',
  ],
  abilities: [
    {
      id: 'exploding-blood', name: 'Exploding Blood', native: '爆血 (Bakketsu)', kind: 'technique',
      summary: 'Nezuko’s Blood Demon Art. She expels her blood, and by clenching her fist she turns it into pink-crimson flames that burn demons.',
      strengths: ['Flames that harm demons.', 'Her fire can make a Nichirin sword glow.'],
      limits: ['It uses her own blood.'],
      introduced: { ch: 40 }, confidence: 'confirmed', spoiler: 'season-1',
    },
    {
      id: 'regeneration', name: 'Regeneration', kind: 'innate',
      summary: 'Like other demons, Nezuko can regrow body parts. In the Entertainment District she pulls her limbs back together through streams of blood.',
      strengths: ['Recovers from serious injuries.'],
      limits: ['She is hurt by sunlight until the Swordsmith Village arc.'],
      introduced: { ch: 84 }, confidence: 'confirmed', spoiler: 'district-village',
    },
    {
      id: 'sunlight-immunity', name: 'Sunlight immunity', kind: 'power-up', order: 1,
      summary: 'During her fight with Hantengu, Nezuko develops immunity to sunlight, so she can be active whether or not she is in the sun.',
      strengths: ['No longer needs to hide from the sun.'],
      limits: ['It appears only late in the story.'],
      introduced: { ch: 127, ep: 55 }, confidence: 'confirmed', spoiler: 'district-village',
    },
  ],
  battles: [
    {
      id: 'natagumo', title: 'Mount Natagumo', opponents: ['The demons of Mount Natagumo'], outcome: 'Nezuko uses Exploding Blood against the demons.',
      summary: 'Nezuko shows her Blood Demon Art for the first time on Mount Natagumo.',
      ref: { ch: 40 }, event: 'nezuko-exploding-blood', spoiler: 'season-1',
    },
    {
      id: 'hantengu', title: 'Nezuko vs. Hantengu', opponents: ['Hantengu'], outcome: 'Nezuko develops sunlight immunity.',
      summary: 'In the Swordsmith Village, Nezuko faces the demon Hantengu and gains immunity to the sun.',
      ref: { ch: 127, ep: 55 }, event: 'nezuko-sunlight', spoiler: 'district-village',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive and human at the end of the main story' },
    anime: { state: 'alive', label: 'Alive (a demon in the episodes aired)' },
    summary: 'Nezuko is alive at the end of the main story and human again by chapter 204. In the anime she is still a demon in the episodes aired so far.',
    spoiler: 'finale',
    events: [],
  },
  adaptation: [
    { topic: 'Where her sunlight immunity appears', anime: 'Episode 55 of the Swordsmith Village arc.', manga: 'Chapter 127.', spoiler: 'district-village' },
  ],
  appearances: [
    { medium: 'manga', title: 'Demon Slayer: Kimetsu no Yaiba', detail: 'Main character, chapters 1–205.' },
    { medium: 'anime', title: 'Demon Slayer: Kimetsu no Yaiba', detail: 'Episodes 1–63 and the Infinity Castle film', animeSlug: 'demon-slayer-kimetsu-no-yaiba' },
  ],
  unconfirmed: [
    'What happens to Nezuko in the anime after the first Infinity Castle film has not aired.',
  ],
  faq: [
    { question: 'Why does Nezuko wear a bamboo muzzle?', answer: 'Giyu Tomioka gives her a bamboo muzzle tied with red cloth in the first chapter, to keep her from biting people after she becomes a demon.' },
    { question: 'What is Nezuko’s Blood Demon Art?', answer: 'Exploding Blood. She expels her blood and turns it into flames that burn demons.', spoiler: 'season-1' },
    { question: 'Does Nezuko become human again?', answer: 'Yes. By chapter 204 of the manga she is human again.', spoiler: 'finale' },
  ],
  related: ['tanjiro-kamado', 'kyojuro-rengoku'],
  articleKeys: ['Nezuko'],
  seo: {
    title: 'Nezuko Kamado: Blood Demon Art, Sunlight and Timeline (Spoiler-Safe)',
    description: 'Nezuko Kamado explained with verified episode and chapter references: Exploding Blood, regeneration, sunlight immunity and a spoiler-protected status tracker.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–205 and anime episodes 1–63',
    sources: [
      { name: 'Demon Slayer manga by Koyoharu Gotouge (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Demon Slayer anime (ufotable)', covers: 'Episode numbers.' },
      { name: 'Kimetsu no Yaiba Wiki on Fandom, “Nezuko Kamado”', url: 'https://kimetsu-no-yaiba.fandom.com/wiki/Nezuko_Kamado', covers: 'Chapter and episode citations, birthday, age, height and weight; no text copied.' },
    ],
  },
};
