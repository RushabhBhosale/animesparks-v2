import type { CharacterProfile } from '../../types.ts';

export const kyojuroRengoku: CharacterProfile = {
  slug: 'kyojuro-rengoku',
  id: 'rengoku',
  series: 'demon-slayer',
  name: 'Kyojuro Rengoku',
  native: '煉獄杏寿郎 (Rengoku Kyōjurō)',
  aliases: ['Rengoku', 'Flame Hashira'],
  role: 'Flame Hashira of the Demon Slayer Corps',
  affiliations: ['Demon Slayer Corps'],
  abilityTags: ['Flame Breathing', 'Ninth Form: Rengoku', 'Swordsmanship'],
  overview: 'Kyojuro Rengoku is the Flame Hashira, one of the nine strongest swordsmen of the Demon Slayer Corps, and the head of a family of Flame Hashira. He appears in the Mugen Train arc as the senior slayer who joins Tanjiro and his friends.',
  facts: [
    { label: 'Birthday', value: 'May 10', confidence: 'confirmed' },
    { label: 'Age', value: '20', confidence: 'confirmed' },
    { label: 'Height', value: '177 cm (5 ft 9¾ in)', confidence: 'confirmed' },
    { label: 'Weight', value: '72 kg', confidence: 'confirmed' },
    { label: 'Rank', value: 'Flame Hashira', confidence: 'confirmed', ref: { ch: 45 } },
    { label: 'Debut', value: 'Manga chapter 44; anime episode 21', confidence: 'confirmed' },
    { label: 'Family', value: 'Father Shinjuro (previous Flame Hashira); younger brother Senjuro', confidence: 'confirmed', ref: { ch: 54 } },
    { label: 'Voice actors', value: 'Satoshi Hino (Japanese); Mark Whitten (English)', confidence: 'confirmed' },
  ],
  biography: [
    { heading: 'A Hashira from a line of Hashira', text: 'Rengoku inherits the Flame Hashira role from his father Shinjuro, and the Rengoku family has produced generations of Flame Hashira. He masters Flame Breathing partly by reading the instruction books left by earlier holders of the role. Before he took his father’s place he had already avenged nine demon slayers lost to the Flute Demon.', ref: { ch: 45 } },
    { heading: 'The Mugen Train', text: 'In the Mugen Train arc Rengoku boards the train where demon slayers have disappeared, and joins Tanjiro, Zenitsu and Inosuke. He fights Enmu, the Lower Rank One demon behind the disappearances, and recognises that, whatever form a demon takes, it always has a weak spot.', ref: { ch: 63, ep: 33 }, spoiler: 'season-1' },
    { heading: 'Akaza and Rengoku’s death', text: 'After the train is saved, the Upper Rank Three demon Akaza attacks. Rengoku holds on against overwhelming attacks, keeping a promise he made to his late mother, but he dies in chapter 66 (anime episode 33). His last words have a profound effect on Tanjiro.', ref: { ch: 66, ep: 33 }, spoiler: 'mugen-train' },
    { heading: 'After Rengoku', text: 'Akaza acknowledges Rengoku’s abilities, and Tanjiro recognises Akaza in the Infinity Castle and charges at him screaming the demon’s name.', ref: { ch: 148 }, spoiler: 'infinity-castle' },
  ],
  personality: [
    { heading: 'Loud, warm and sure of himself', text: 'Rengoku is cheerful, direct and tireless. He tells his younger brother that, unlike him, Senjuro has an older brother who believes in him.', ref: { ch: 54 } },
    { heading: 'Duty to the weak', text: 'He treats his strength as something owed to people who cannot protect themselves, a view that comes from a promise he made to his late mother.', ref: { ch: 64 }, spoiler: 'mugen-train' },
  ],
  development: [
    { heading: 'A senior figure placed to be lost', text: 'Rengoku is built to be the model Tanjiro measures himself against, and the story uses his loss at the end of the arc to give Tanjiro a goal that outlasts it.', spoiler: 'mugen-train' },
  ],
  motivations: ['Protecting people who cannot protect themselves.', 'Living up to his mother’s promise.', 'Training the next generation of slayers.'],
  abilities: [
    { id: 'flame-breathing', name: 'Flame Breathing', native: '炎の呼吸', kind: 'technique', system: 'breathing', summary: 'The style passed down the Rengoku line, taught to him by his father and mastered through the books left by earlier Flame Hashira.', strengths: ['Powerful forms with high-speed dashes.'], limits: ['Relies on aggressive offence.'], introduced: { ch: 45 }, confidence: 'confirmed' },
    { id: 'ninth-form', name: 'Ninth Form: Rengoku', kind: 'technique', system: 'breathing', summary: 'The most powerful Flame Breathing technique: a high stance followed by an extremely high-speed dash at the target.', strengths: ['Used in his final fight in the Mugen Train arc.'], limits: ['A single, committed strike.'], introduced: { ch: 64, ep: 33 }, confidence: 'confirmed', spoiler: 'mugen-train' },
    { id: 'swordsmanship', name: 'Master swordsmanship', kind: 'skill', summary: 'Even before he became Hashira, Rengoku was an exceptional fighter, with speed and reflexes that Tanjiro and Inosuke could not follow.', strengths: ['Speed and reflexes beyond most slayers.'], limits: ['Cannot match a higher-ranked demon’s regeneration.'], introduced: { ch: 45 }, confidence: 'confirmed' },
  ],
  battles: [
    { id: 'vs-enmu', title: 'Rengoku vs. Enmu', opponents: ['Enmu'], outcome: 'Rengoku defeats Enmu.', summary: 'Rengoku works out that Enmu has a weak spot, however he disguises himself.', ref: { ch: 63 }, spoiler: 'season-1' },
    { id: 'vs-akaza', title: 'Rengoku vs. Akaza', opponents: ['Akaza'], outcome: 'Rengoku is killed.', summary: 'Upper Rank Three Akaza overwhelms Rengoku, who refuses to give up.', ref: { ch: 64, ep: 33 }, event: 'rengoku-death', spoiler: 'mugen-train' },
  ],
  status: {
    manga: { state: 'deceased', label: 'Deceased' },
    anime: { state: 'deceased', label: 'Deceased (episode 33 and the Mugen Train film)' },
    summary: 'Rengoku dies in the Mugen Train arc, in manga chapter 66 and anime episode 33. He is not revived.',
    spoiler: 'mugen-train',
    events: [
      { id: 'death', kind: 'death', title: 'Killed by Akaza', cause: 'Wounds from the fight with Upper Rank Three Akaza.', circumstances: 'After defeating Enmu, Rengoku fights Akaza and holds on despite overwhelming attacks, dying in chapter 66.', significance: 'It shapes Tanjiro’s later fights with Akaza and the Hashira’s view of the Upper Ranks.', anime: { ep: 33 }, manga: { ch: 66 }, spoiler: 'mugen-train', adaptation: 'The death is the same in the Mugen Train film and the TV arc.' },
    ],
  },
  adaptation: [{ topic: 'Film and TV versions', anime: 'The arc exists as a film and as a seven-episode TV edition. Rengoku’s fight ends the same way in both.', manga: 'Chapters 54–66.', spoiler: 'mugen-train' }],
  appearances: [
    { medium: 'manga', title: 'Demon Slayer: Kimetsu no Yaiba', detail: 'Debut in chapter 44; killed in chapter 66.' },
    { medium: 'anime', title: 'Demon Slayer: Kimetsu no Yaiba', detail: 'Episodes 21–33', animeSlug: 'demon-slayer-kimetsu-no-yaiba' },
    { medium: 'film', title: 'Demon Slayer: Mugen Train', detail: 'The 2020 film of the arc.' },
  ],
  unconfirmed: ['His birthday and height are stated by the author, but the story does not give any other personal statistics.'],
  faq: [
    { question: 'What does a Flame Hashira do?', answer: 'It is one of the nine top-ranking swordsmen in the Demon Slayer Corps. Rengoku holds the Flame rank, inherited from his father.' },
    { question: 'Which chapter does Rengoku die in?', answer: 'Manga chapter 66, anime episode 33 (the Mugen Train arc).', spoiler: 'mugen-train' },
    { question: 'Who kills Rengoku?', answer: 'Akaza, the Upper Rank Three demon.', spoiler: 'mugen-train' },
  ],
  related: ['tanjiro-kamado'],
  articleKeys: ['Rengoku'],
  seo: { title: 'Kyojuro Rengoku: Flame Breathing and Fate (Spoiler-Safe)', description: 'Kyojuro Rengoku explained with verified chapter and episode references: Flame Breathing, the Ninth Form, his family and a spoiler-protected status tracker.' },
  meta: {
    publishedAt: '2026-10-29', verifiedAt: '2026-10-29', coverage: 'Manga chapters 1–205 and anime episodes 1–63',
    sources: [
      { name: 'Demon Slayer manga by Koyoharu Gotouge (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Demon Slayer anime (ufotable)', covers: 'Episode numbers.' },
      { name: 'Kimetsu no Yaiba Wiki on Fandom, “Kyojuro Rengoku”', url: 'https://kimetsu-no-yaiba.fandom.com/wiki/Kyojuro_Rengoku', covers: 'Chapter citations, birthday, age and height; no text copied.' },
    ],
  },
};
