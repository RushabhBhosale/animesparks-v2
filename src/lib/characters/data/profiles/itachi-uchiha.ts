import type { CharacterProfile } from '../../types.ts';

export const itachiUchiha: CharacterProfile = {
  slug: 'itachi-uchiha',
  id: 'itachi',
  series: 'naruto',
  name: 'Itachi Uchiha',
  native: 'うちはイタチ (Uchiha Itachi)',
  aliases: ['Itachi', 'Clan Killer Itachi'],
  role: 'Former Konoha Anbu captain and Akatsuki member; Sasuke’s older brother',
  affiliations: ['Konohagakure (former)', 'Akatsuki', 'Uchiha clan'],
  abilityTags: ['Sharingan', 'Mangekyō Sharingan', 'Genjutsu', 'Susanoo', 'Amaterasu'],
  overview: 'Itachi Uchiha is the Uchiha prodigy who destroys his own clan, leaves Konoha as a criminal and joins the Akatsuki, becoming the target of his younger brother Sasuke’s revenge. The series gradually shows that nothing about him is as simple as the first account makes it sound.',
  facts: [
    { label: 'Birthday', value: 'June 9', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Age', value: 'Appears at 17–18 in Part I; 21 in Part II', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Height', value: '175.2 cm in Part I; 178 cm in Part II', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Rank', value: 'Anbu captain (former)', confidence: 'confirmed', ref: { ch: 142 } },
    { label: 'Clan', value: 'Uchiha, with the Sharingan', confidence: 'confirmed' },
    { label: 'Anbu', value: 'Joined at 11; captain at 12 (publicly 13)', confidence: 'confirmed', ref: { ch: 220 } },
    { label: 'Voice actors', value: 'Hideo Ishikawa (Japanese); Crispin Freeman (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'A prodigy raised in wartime',
      text: 'Itachi is the first child of Mikoto and Fugaku Uchiha. At four he saw the casualties of the Third Shinobi World War, which left him a lifelong pacifist, and he trained constantly with the dream of ending fighting for good. He entered the Academy at six, joined the Anbu at 11 and became an Anbu captain at 12. He is also the strongest of the Uchiha of his age.',
      ref: { ch: 400 },
    },
    {
      heading: 'The massacre',
      text: 'Itachi kills nearly everyone in the Uchiha clan on a single night and leaves only Sasuke alive, then leaves Konoha as an international criminal. At first the story presents this as an act of cruelty. He later joins the Akatsuki with his partner Kisame Hoshigaki.',
      ref: { ch: 222 },
    },
    {
      heading: 'Why he did it',
      text: 'The truth, which Tobi tells Sasuke and the story later shows from Itachi’s own side, is that the Uchiha were planning a coup, and Itachi was a double agent reporting to the Third Hokage while trying to prevent civil war. His options were narrowed to two: support the coup and have the whole clan, including Sasuke, killed in the conflict, or accept an order to wipe out the clan first and be allowed to spare Sasuke. He chose his brother. Itachi’s parents told him in their last moments that they were proud of him and asked him to look after Sasuke.',
      ref: { ch: 590 },
      spoiler: 'war',
    },
    {
      heading: 'The last fight',
      text: 'Itachi has a terminal illness that he has hidden for years, and he lives to die by Sasuke’s hand. When Sasuke finally confronts him, Itachi holds back; the story says that he could have killed Sasuke if he wanted to. Itachi dies at the end of the fight in chapter 401, after he touches Sasuke’s forehead, which an official Quiz Book says places a protective Amaterasu seal in Sasuke’s eyes.',
      ref: { ch: 401, ep: 141, ed: 'shippuden' },
      spoiler: 'brothers',
    },
    {
      heading: 'Reanimated',
      text: 'During the Fourth Shinobi World War, Kabuto summons Itachi with the Impure World Reincarnation. A crow carrying Shisui’s eye, which Itachi placed in Naruto, helps him break Kabuto’s control, and Itachi dispels the technique, after which the five Kage hail him as the world’s saviour. The war also gives Itachi one last conversation with Sasuke, in which he says he does not need forgiveness and will always love him.',
      ref: { ch: 590 },
      spoiler: 'war',
    },
  ],
  personality: [
    {
      heading: 'Quiet, patient, willing to carry everything alone',
      text: 'Itachi is soft-spoken and calm, with a deep sense of duty. He takes on every burden himself and believes he needs no help from his comrades, a habit that the story treats as both his strength and his greatest mistake. He is one of the few people in Konoha who bears no grudge against Naruto and shows him kindness whenever they meet.',
      ref: { ch: 582 },
      spoiler: 'war',
    },
    {
      heading: 'Cruel on the surface, on purpose',
      text: 'As a member of the Akatsuki, Itachi is more prone to displays of force and tolerates his partner’s violent habits. All of it lowers the suspicion he faces inside the organisation.',
      ref: { ch: 143 },
      spoiler: 'war',
    },
  ],
  development: [
    {
      heading: 'An unreliable first impression',
      text: 'Itachi is designed as a villain who is revised twice. Part I defines him through what Sasuke believes about him; his death and the war chapters invert that view without removing the massacre itself. The story keeps both facts, that he killed his family and that he did it to protect the village, and asks the reader to hold them together. He also, in the end, admits his flaw: he tried to manipulate Sasuke rather than be honest with him.',
      ref: { ch: 549 },
      spoiler: 'war',
    },
  ],
  motivations: [
    'Preventing a civil war that would destroy Konoha.',
    'Protecting Sasuke.',
    'Keeping the Akatsuki from moving against the village.',
  ],
  abilities: [
    {
      id: 'sharingan', name: 'Sharingan', native: '写輪眼', kind: 'innate', system: 'sharingan',
      summary: 'Itachi awakens it as a child and masters it quickly; his skill at genjutsu with the Sharingan is praised even by Orochimaru.',
      strengths: ['Reads and copies techniques.', 'Genjutsu so subtle that targets may not realise they are caught.'],
      limits: ['Heavy use drains his chakra, and his illness limits his stamina.'],
      introduced: { ch: 222 }, confidence: 'confirmed',
    },
    {
      id: 'genjutsu', name: 'Genjutsu mastery', kind: 'skill', system: 'chakra',
      summary: 'Itachi can cast illusions affecting targets who are on guard, and can perform them by merely pointing at his target.',
      strengths: ['Very hard to detect and counter.'],
      limits: ['Needs a target who is not immune to the Sharingan’s genjutsu.'],
      introduced: { ch: 258 }, confidence: 'confirmed',
    },
    {
      id: 'mangekyo', name: 'Mangekyō Sharingan', native: '万華鏡写輪眼', kind: 'transformation', system: 'sharingan', order: 1,
      summary: 'Awakened after Shisui’s death. Itachi’s Mangekyō gives him Tsukuyomi, Amaterasu and Susanoo.',
      strengths: ['Tsukuyomi traps a target’s mind in an illusory world he controls.', 'Amaterasu ignites black flames that burn almost anything.', 'Susanoo is a spectral warrior that protects him.'],
      limits: ['His eyesight deteriorates with each use; by the end of his life he is nearly blind.', 'Three uses in a day leave him unable to use the Sharingan at all.'],
      introduced: { ch: 222 }, confidence: 'confirmed', spoiler: 'brothers',
      evolution: 'Itachi’s Susanoo is fully formed with the Totsuka Blade and the Yata Mirror, a pairing that makes it close to impregnable.',
    },
    {
      id: 'amaterasu', name: 'Amaterasu', native: '天照', kind: 'technique', system: 'sharingan',
      summary: 'With his right eye, Itachi ignites black flames that burn whatever he looks at, even fire, and can extinguish them at will.',
      strengths: ['Burns almost anything.'],
      limits: ['Costs him eyesight.'],
      introduced: { ch: 390 }, confidence: 'confirmed', spoiler: 'brothers',
    },
    {
      id: 'tsukuyomi', name: 'Tsukuyomi', native: '月読', kind: 'technique', system: 'sharingan',
      summary: 'A genjutsu that traps the target in an illusory world of Itachi’s design, altering their perception of matter, space and time.',
      strengths: ['Can inflict enough mental damage to kill a victim.'],
      limits: ['Costs him eyesight.'],
      introduced: { other: 'Second Databook' }, confidence: 'confirmed', spoiler: 'brothers',
    },
  ],
  battles: [
    {
      id: 'vs-sasuke', title: 'Itachi vs. Sasuke', opponents: ['Sasuke Uchiha'], outcome: 'Itachi dies at the end of the fight.',
      summary: 'Itachi uses his Mangekyō techniques while holding back, and Sasuke draws on everything Orochimaru taught him.',
      ref: { ch: 391, ep: 138, ed: 'shippuden' }, event: 'brothers-fight', spoiler: 'brothers',
    },
    {
      id: 'uchiha-clan', title: 'The Uchiha massacre', opponents: ['The Uchiha clan'], outcome: 'Itachi destroys the clan and spares Sasuke.',
      summary: 'In one night Itachi eliminates the clan, including his parents. He uses the Mangekyō repeatedly and does not tire.',
      ref: { ch: 590 }, event: 'uchiha-massacre', spoiler: 'part-1',
    },
  ],
  status: {
    manga: { state: 'deceased', label: 'Deceased (reanimated during the war)' },
    anime: { state: 'deceased', label: 'Deceased (reanimated during the war)' },
    summary: 'Itachi dies in Shippuden after the fight with Sasuke. He is later reanimated with the Impure World Reincarnation during the war, and the technique releases him, after which he returns to the dead.',
    spoiler: 'brothers',
    events: [
      {
        id: 'death', kind: 'death', title: 'Dies after fighting Sasuke',
        cause: 'A terminal illness, and the injuries of his last fight.',
        circumstances: 'He holds back against Sasuke and dies in chapter 401 once Sasuke has won the fight.',
        significance: 'It is the end of Sasuke’s quest for revenge, and the start of a reversal in how the story presents Itachi.',
        anime: { ep: 141, ed: 'shippuden' }, manga: { ch: 401 }, spoiler: 'brothers',
      },
      {
        id: 'reanimated', kind: 'revival', title: 'Reanimated by the Impure World Reincarnation',
        cause: 'Kabuto’s technique, which brings back the dead under the summoner’s control.',
        circumstances: 'Kabuto summons Itachi for the war. Itachi breaks the control and then dispels the technique.',
        significance: 'It is a temporary revival under someone else’s control, and Itachi uses it to reveal the truth to Sasuke.',
        anime: { ep: 290, ed: 'shippuden' }, manga: { ch: 590 }, spoiler: 'war',
        adaptation: 'The anime shows Kabuto reanimating Itachi earlier, in episode 290, with a summon that fails almost at once; the manga’s sequence is different.',
      },
    ],
  },
  adaptation: [
    { topic: 'Early Edo Tensei appearance', anime: 'Kabuto reincarnates Itachi against Team 7 in episode 290, and the summon fails almost immediately.', manga: 'Itachi’s reanimation arc plays out in the war chapters leading to chapter 590.', spoiler: 'war' },
  ],
  appearances: [
    { medium: 'manga', title: 'Naruto', detail: 'Antagonist and later key figure; flashbacks in chapters 222, 400 and 590.' },
    { medium: 'anime', title: 'Naruto', detail: 'Konoha Crush arc onward', animeSlug: 'naruto' },
    { medium: 'anime', title: 'Naruto: Shippuden', detail: 'Death at episode 141; reanimated in the war arc', animeSlug: 'naruto-shippuden' },
    { medium: 'novel', title: 'Itachi Shinden', detail: 'A novel about his early life and the massacre.' },
  ],
  unconfirmed: [
    'Itachi’s inner reasons are told through flashbacks and the novel Itachi Shinden. This profile treats the manga and anime as canon and the novel as supplementary.',
  ],
  faq: [
    { question: 'Why did Itachi kill the Uchiha clan?', answer: 'To prevent a coup that would have started a war and killed Sasuke too. The details are a major spoiler in the later part of the story.', spoiler: 'war' },
    { question: 'How did Itachi die?', answer: 'He died of a terminal illness after fighting Sasuke in Shippuden episode 141 (chapter 401).', spoiler: 'brothers' },
    { question: 'Is Itachi in Naruto Part I?', answer: 'Yes. He first appears near the end of the Konoha Crush arc (anime episodes 68–80).' },
  ],
  related: ['sasuke-uchiha', 'naruto-uzumaki'],
  articleKeys: ['Itachi'],
  seo: {
    title: 'Itachi Uchiha: Truth, Abilities and Status (Spoiler-Safe)',
    description: 'Itachi Uchiha explained with verified episodes and chapters: the Mangekyō, his relationship with Sasuke, a spoiler-protected status tracker and how the anime differs.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Naruto manga chapters 1–700 and the anime Naruto and Naruto: Shippuden',
    sources: [
      { name: 'Naruto manga by Masashi Kishimoto (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Naruto and Naruto: Shippuden anime (Studio Pierrot)', covers: 'Episode numbers and arc ranges.' },
      { name: 'Narutopedia, “Itachi Uchiha”', url: 'https://naruto.fandom.com/wiki/Itachi_Uchiha', covers: 'Chapter and episode citations, databook figures; no text copied.' },
    ],
  },
};
