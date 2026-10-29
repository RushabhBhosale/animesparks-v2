import type { CharacterProfile } from '../../types.ts';

export const tanjiroKamado: CharacterProfile = {
  slug: 'tanjiro-kamado',
  id: 'tanjiro',
  series: 'demon-slayer',
  name: 'Tanjiro Kamado',
  native: '竈門炭治郎 (Kamado Tanjirō)',
  aliases: ['Tanjiro'],
  role: 'Demon Slayer Corps member and Nezuko’s older brother',
  affiliations: ['Demon Slayer Corps'],
  abilityTags: ['Water Breathing', 'Hinokami Kagura', 'Demon Slayer Mark', 'Keen sense of smell'],
  overview: 'Tanjiro Kamado is a kind-hearted coal seller whose family is attacked by a demon and whose younger sister Nezuko is turned into one. He joins the Demon Slayer Corps to find a way to make her human again and to hunt the demon responsible.',
  facts: [
    { label: 'Birthday', value: 'July 14', confidence: 'confirmed', ref: { other: 'Official Twitter account' } },
    { label: 'Age', value: '13 in chapter 1; 15 after the early arcs; 16 by chapter 204', confidence: 'confirmed' },
    { label: 'Height', value: '165 cm (5 ft 5 in)', confidence: 'confirmed' },
    { label: 'Weight', value: '61 kg', confidence: 'confirmed' },
    { label: 'Occupation', value: 'Coal burner (former); Demon Slayer', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 1; anime episode 1', confidence: 'confirmed' },
    { label: 'Voice actors', value: 'Natsuki Hanae (Japanese); Zach Aguilar (English)', confidence: 'confirmed' },
  ],
  biography: [
    { heading: 'The attack', text: 'Tanjiro supports his family by selling charcoal. When he returns from town one day, most of the family has been killed and his sister Nezuko has become a demon. He vows to turn her back into a human and to hunt demons, and later swears to defeat Muzan, the Demon King.', ref: { ch: 1, ep: 1 } },
    { heading: 'Becoming a demon slayer', text: 'Tanjiro trains in Water Breathing under a retired slayer and joins the Demon Slayer Corps. Nezuko travels with him, asleep in a box he carries on his back. The Mugen Train arc teams him with the Flame Hashira, and it is the point at which the story starts to ask what the cost of this life is.', ref: { ch: 54, ep: 27 } },
    { heading: 'The Entertainment District and Swordsmith Village', text: 'In the Entertainment District Tanjiro combines Water Breathing with Hinokami Kagura to save a woman from the demon Gyutaro. In the Swordsmith Village arc he shows the Demon Slayer Mark and becomes one of the first demon slayers to kill an Upper Rank.', ref: { ch: 101 }, spoiler: 'mugen-train' },
    { heading: 'The Infinity Castle', text: 'Tanjiro meets the demon who killed Rengoku and charges him, screaming the demon’s name. During that fight he reaches the Transparent World, as his father could.', ref: { ch: 151 }, spoiler: 'infinity-castle' },
    { heading: 'The final battle', text: 'In the finale, as a last attempt to live on, Muzan turns Tanjiro into a demon in chapter 201. Tanjiro becomes human again, though marked by the experience, and the manga closes with an epilogue set long after.', ref: { ch: 201 }, spoiler: 'finale' },
  ],
  personality: [
    { heading: 'Compassionate to the end', text: 'Tanjiro feels for the demons he kills. After a fight he often mourns them, and he uses a painless technique on a demon who is so filled with despair that she would rather die by his blade. The series treats this empathy as his defining strength rather than a weakness.', ref: { ep: 44 }, spoiler: 'district-village' },
    { heading: 'Determined and stubborn', text: 'He never gives up on Nezuko or on anyone he is protecting, and his sense of duty is as strong as his kindness.' },
  ],
  development: [
    { heading: 'A hero defined by what he refuses', text: 'The author makes Tanjiro’s quest personal and then tests it with every arc: each defeated demon forces him to decide how to treat an enemy who was once human. By the end the question is turned on Tanjiro himself, when the story makes him the one who is turned.', spoiler: 'finale' },
  ],
  motivations: ['Turning Nezuko back into a human.', 'Defeating Muzan Kibutsuji.', 'Protecting people from demons.'],
  abilities: [
    { id: 'smell', name: 'Keen sense of smell', kind: 'innate', summary: 'Tanjiro can detect demons, emotions and openings by smell.', strengths: ['Tracks demons and finds their weak points.'], limits: ['Can be overwhelmed by strong odours.'], introduced: { ch: 1, ep: 1 }, confidence: 'confirmed' },
    { id: 'water-breathing', name: 'Water Breathing', native: '水の呼吸', kind: 'technique', system: 'breathing', summary: 'The sword style Tanjiro first learns, built around fluid forms.', strengths: ['Flexible forms for many situations.'], limits: ['A single style cannot answer every demon.'], introduced: { ch: 1, ep: 1 }, confidence: 'confirmed' },
    { id: 'hinokami-kagura', name: 'Hinokami Kagura', native: 'ヒノカミ神楽', kind: 'technique', system: 'breathing', summary: 'A fire-based dance passed down in Tanjiro’s family. He combines it with Water Breathing in the Entertainment District.', strengths: ['Powerful against strong demons.'], limits: ['Taxing to use for long.'], introduced: { ch: 90 }, confidence: 'confirmed', spoiler: 'mugen-train' },
    { id: 'mark', name: 'Demon Slayer Mark', kind: 'power-up', order: 1, system: 'breathing', summary: 'A mark that appears in the Swordsmith Village arc and raises his power for a short time.', strengths: ['Sharply raised power.'], limits: ['Short duration.'], introduced: { ch: 101 }, confidence: 'confirmed', spoiler: 'district-village' },
    { id: 'transparent-world', name: 'Transparent World', kind: 'power-up', order: 2, summary: 'While in the marked state Tanjiro can see the body’s inner structure, like his father.', strengths: ['Perceives an opponent’s anatomy.'], limits: ['Hard to hold constantly.'], introduced: { ch: 151 }, confidence: 'confirmed', spoiler: 'infinity-castle' },
  ],
  battles: [
    { id: 'entertainment-district', title: 'Tanjiro vs. Gyutaro', opponents: ['Gyutaro'], outcome: 'Tanjiro saves Hinatsuru, using Hinokami Kagura with Water Breathing.', summary: 'A fight in the Entertainment District that tests his two techniques.', ref: { ch: 90 }, event: 'hinokami-kagura-district', spoiler: 'mugen-train' },
    { id: 'akaza', title: 'Tanjiro vs. Akaza', opponents: ['Akaza'], outcome: 'A fight in the Infinity Castle.', summary: 'Tanjiro faces the demon who killed Rengoku.', ref: { ch: 148 }, event: 'akaza-rematch', spoiler: 'infinity-castle' },
  ],
  status: {
    manga: { state: 'other', label: 'Survives; briefly turned into a demon' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Tanjiro survives the final battle. Muzan turns him into a demon in chapter 201, and he becomes human again in chapter 203.',
    spoiler: 'finale',
    events: [
      { id: 'demon', kind: 'transformation', title: 'Turned into a demon by Muzan', cause: 'Muzan’s blood.', circumstances: 'As a last attempt to live on, Muzan transforms Tanjiro in the final battle.', significance: 'It is the story’s last major twist for him.', manga: { ch: 201 }, spoiler: 'finale', adaptation: 'Not animated.' },
      { id: 'human', kind: 'revival', title: 'Returns to human form', circumstances: 'Tanjiro is human again, with lasting changes.', significance: 'It resolves the transformation.', manga: { ch: 203 }, spoiler: 'finale', adaptation: 'Not animated.' },
    ],
  },
  adaptation: [{ topic: 'Where the anime stops', anime: 'The anime covers the story up to the Hashira Training arc and the first Infinity Castle film.', manga: 'The manga ends at chapter 205.', spoiler: 'finale' }],
  appearances: [
    { medium: 'manga', title: 'Demon Slayer: Kimetsu no Yaiba', detail: 'Protagonist, chapters 1–205.' },
    { medium: 'anime', title: 'Demon Slayer: Kimetsu no Yaiba', detail: 'Episodes 1–63 and the Infinity Castle film', animeSlug: 'demon-slayer-kimetsu-no-yaiba' },
  ],
  unconfirmed: ['What happens in the anime after the first Infinity Castle film has not aired.'],
  faq: [
    { question: 'Why does Tanjiro fight demons?', answer: 'To turn his sister Nezuko back into a human and to defeat Muzan, who destroyed their family.' },
    { question: 'What is Hinokami Kagura?', answer: 'A fire dance passed down in Tanjiro’s family, shown in the Entertainment District arc (manga chapter 90).', spoiler: 'mugen-train' },
    { question: 'Does Tanjiro become a demon?', answer: 'In the manga, briefly, in chapter 201. He returns to human form in chapter 203.', spoiler: 'finale' },
  ],
  related: ['kyojuro-rengoku'],
  articleKeys: ['Tanjiro'],
  seo: { title: 'Tanjiro Kamado: Breathing Styles, Marks and Timeline (Spoiler-Safe)', description: 'Tanjiro Kamado explained with verified episode and chapter references: Water Breathing, Hinokami Kagura, the Demon Slayer Mark and a spoiler-protected tracker.' },
  meta: {
    publishedAt: '2026-10-29', verifiedAt: '2026-10-29', coverage: 'Manga chapters 1–205 and anime episodes 1–63',
    sources: [
      { name: 'Demon Slayer manga by Koyoharu Gotouge (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Demon Slayer anime (ufotable)', covers: 'Episode numbers.' },
      { name: 'Kimetsu no Yaiba Wiki on Fandom, “Tanjiro Kamado”', url: 'https://kimetsu-no-yaiba.fandom.com/wiki/Tanjiro_Kamado', covers: 'Chapter citations, birthday, age and height; no text copied.' },
    ],
  },
};
