import type { CharacterProfile } from '../../types.ts';

export const sasukeUchiha: CharacterProfile = {
  slug: 'sasuke-uchiha',
  id: 'sasuke',
  series: 'naruto',
  name: 'Sasuke Uchiha',
  native: 'うちはサスケ (Uchiha Sasuke)',
  aliases: ['Sasuke'],
  role: 'Konoha ninja, Team 7 member and the last Uchiha with a Sharingan',
  affiliations: ['Konohagakure', 'Team 7', 'Uchiha clan'],
  abilityTags: ['Sharingan', 'Chidori', 'Mangekyō Sharingan', 'Rinnegan', 'Kenjutsu'],
  overview: 'Sasuke Uchiha is Naruto’s teammate and rival and the survivor of the Uchiha clan. He is driven by a single goal for most of the series: killing his older brother, Itachi. The story follows what he does with that goal and with what he learns about the people he is fighting.',
  facts: [
    { label: 'Birthday', value: 'July 23', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Age', value: '12–13 in Part I; 16–17 in Part II', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Height', value: '150.8 cm in Part I; 168 cm in Part II', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Clan', value: 'Uchiha, with the Sharingan bloodline trait', confidence: 'confirmed' },
    { label: 'Team', value: 'Team 7, led by Kakashi Hatake', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 1; Naruto episode 1', confidence: 'confirmed' },
    { label: 'Voice actors', value: 'Noriaki Sugiyama (Japanese); Yuri Lowenthal (English)', confidence: 'confirmed' },
    { label: 'Spouse and child', value: 'Sakura Haruno; daughter Sarada', confidence: 'confirmed', ref: { ch: '700+6' }, spoiler: 'finale' },
  ],
  biography: [
    {
      heading: 'The last Uchiha',
      text: 'Sasuke is the younger son of the Uchiha clan’s head, and the only member left with a Sharingan after his older brother Itachi destroys the clan when Sasuke is seven. He treats the Academy as a step toward revenge, and he is the top student in his class when Naruto’s story begins.',
    },
    {
      heading: 'Team 7',
      text: 'Sasuke is placed on a team with Naruto and Sakura Haruno under Kakashi, who also carries a Sharingan. The Land of Waves and Chūnin Exams arcs introduce his speed, his Sharingan and the Chidori, and a rivalry with Naruto that is half competition, half friendship.',
      ref: { ep: 4 },
    },
    {
      heading: 'Leaving Konoha',
      text: 'After the Chūnin Exams, Sasuke turns to Orochimaru, who promises him the strength to beat Itachi. He tells Sakura before he leaves that revenge is his purpose of living. Naruto and the rest of the village’s young ninja are sent to bring him back, and the arc ends at the Valley of the End.',
      ref: { ch: 181 },
      spoiler: 'part-1',
    },
    {
      heading: 'The fight with Itachi',
      text: 'After three years of training with Orochimaru, Sasuke can physically incapacitate opponents before they react. He leaves Orochimaru and confronts Itachi in a fight that decides what Sasuke believes about his family. The fight ends with Itachi’s death. What Sasuke learns afterwards sends him in a different direction: he decides to destroy Konoha, and with it the system that he believes took his brother from him.',
      ref: { ch: 401, ep: 141, ed: 'shippuden' },
      spoiler: 'brothers',
    },
    {
      heading: 'Danzō and the Kage Summit',
      text: 'Sasuke’s revenge now targets those who ordered the massacre. He strikes down Danzō Shimura and sacrifices Karin to do it, and tries to kill members of Team 7 when they stand in his way.',
      ref: { ch: 480 },
      spoiler: 'pain-summit',
    },
    {
      heading: 'The war and the final fight',
      text: 'In the Fourth Shinobi World War, Sasuke hears the full truth about Itachi from Itachi himself and decides to protect the village his brother protected. After the war, he and Naruto fight a last battle, and in the epilogue Sasuke sets out on a journey of redemption, later marries Sakura and has a daughter, Sarada.',
      ref: { ch: 590 },
      spoiler: 'finale',
    },
  ],
  personality: [
    {
      heading: 'Cold, proud and driven',
      text: 'Sasuke is composed to the point of hostility and treats strength as the only thing that matters. He admits to Sakura that he made a choice for revenge over a team that he could have chosen instead. The coldness is also a symptom of grief: the story keeps returning to the child who adored his brother.',
      ref: { ch: 181 },
    },
    {
      heading: 'Analytical in battle',
      text: 'Sasuke is described as analytical: he reads a fight and takes risks that usually pay off, which earns him praise from Minato and Madara. The same quality makes him more dangerous as an enemy than his raw power suggests.',
      ref: { ch: 639 },
      spoiler: 'war',
    },
  ],
  development: [
    {
      heading: 'A rival who is also a mirror',
      text: 'Kishimoto sets Sasuke up as Naruto’s opposite: a gifted outcast who answers rejection with hatred. That makes the long argument between them a contest between two responses to the same loneliness, and the story only resolves it in the final battle.',
      spoiler: 'finale',
    },
  ],
  motivations: [
    'Avenging his clan by killing Itachi.',
    'Becoming strong enough to do it.',
    'Later, protecting the village that Itachi protected.',
  ],
  abilities: [
    {
      id: 'sharingan', name: 'Sharingan', native: '写輪眼', kind: 'innate', system: 'sharingan',
      summary: 'The Uchiha clan’s eye technique, which lets Sasuke read and copy techniques and see through genjutsu.',
      strengths: ['Reads opponents’ movements.', 'Copies many techniques after seeing them.'],
      limits: ['Consumes chakra to keep active.'],
      introduced: { other: 'Land of Waves arc (episodes 1–19)' }, confidence: 'confirmed',
    },
    {
      id: 'chidori', name: 'Chidori and lightning techniques', native: '千鳥', kind: 'technique', system: 'chakra',
      summary: 'Sasuke concentrates lightning chakra into his hand. In Part II he uses its principles for long-range techniques such as throwable needles and extendable swords.',
      strengths: ['A fast, high-damage strike.', 'Channels lightning into his sword and shuriken.'],
      limits: ['Close range for the original Chidori.'],
      introduced: { ch: 389 }, confidence: 'confirmed',
    },
    {
      id: 'kenjutsu', name: 'Uchiha Style Kenjutsu', kind: 'skill',
      summary: 'After training with Orochimaru, Sasuke starts using a sword and develops his own style, wielding it skillfully in either hand.',
      strengths: ['Fast resheathing and use in both hands.'],
      limits: ['Depends on his speed, which has to keep up with his opponent’s.'],
      introduced: { ch: 346 }, confidence: 'confirmed', spoiler: 'part-1',
    },
    {
      id: 'mangekyo', name: 'Mangekyō Sharingan', native: '万華鏡写輪眼', kind: 'transformation', system: 'sharingan', order: 1,
      summary: 'Sasuke’s advanced Sharingan, awakened after a personal loss. With his right eye he can use Amaterasu and shape its black flames with Kagutsuchi.',
      strengths: ['Amaterasu’s black flames burn almost anything.', 'Kagutsuchi lets him shape the flames, which makes him more skilled with them than Itachi was.'],
      limits: ['Heavy use damages his eyesight.'],
      introduced: { ch: 414 }, confidence: 'confirmed', spoiler: 'brothers',
    },
    {
      id: 'eternal-mangekyo', name: 'Eternal Mangekyō Sharingan', kind: 'transformation', system: 'sharingan', order: 2,
      summary: 'A rare form that reduces chakra cost and removes the strain on his sight and body from long use.',
      strengths: ['Lower chakra drain and no damage to his sight from extended use.'],
      limits: ['A rare form that is only available after a specific event.'],
      introduced: { ch: 657 }, confidence: 'confirmed', spoiler: 'finale',
    },
    {
      id: 'rinnegan', name: 'Rinnegan', native: '輪廻眼', kind: 'transformation', order: 3,
      summary: 'Awakened after Sasuke receives a share of the Sage of Six Paths’ chakra. It lets him attract others, trap enemies with Chibaku Tensei and absorb chakra.',
      strengths: ['Gravity-based abilities, chakra absorption and seeing invisible targets.'],
      limits: ['It only awakens after a specific event late in the story.'],
      introduced: { ch: 677 }, confidence: 'confirmed', spoiler: 'finale',
    },
  ],
  battles: [
    {
      id: 'valley-of-the-end', title: 'Sasuke vs. Naruto at the Valley of the End', opponents: ['Naruto Uzumaki'], outcome: 'Sasuke wins and leaves for Orochimaru.',
      summary: 'The fight that ends Part I: Naruto tries to bring Sasuke back, and Sasuke refuses.',
      ref: { ch: 229, ep: 133 }, event: 'valley-of-the-end', spoiler: 'part-1',
    },
    {
      id: 'vs-itachi', title: 'Sasuke vs. Itachi', opponents: ['Itachi Uchiha'], outcome: 'Itachi dies at the end of the fight.',
      summary: 'A long fight in which Itachi uses the techniques of his Mangekyō and Sasuke draws on what Orochimaru gave him.',
      ref: { ch: 401, ep: 141, ed: 'shippuden' }, event: 'brothers-fight', spoiler: 'brothers',
    },
    {
      id: 'vs-danzo', title: 'Sasuke vs. Danzō', opponents: ['Danzō Shimura'], outcome: 'Sasuke defeats Danzō.',
      summary: 'Sasuke strikes at one of the men who ordered the Uchiha massacre, with a heavy cost to his companions.',
      ref: { ch: 480 }, spoiler: 'pain-summit',
    },
    {
      id: 'final-battle', title: 'Sasuke vs. Naruto: the final battle', opponents: ['Naruto Uzumaki'], outcome: 'A fight to a conclusion that settles their bond.',
      summary: 'After the war the two fight with the full strength of their late-story forms.',
      ref: { ch: 696, ep: 476, ed: 'shippuden' }, event: 'final-battle', spoiler: 'finale',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Sasuke survives the story. He is injured badly in his last fight with Naruto, but both live to the epilogue.',
    spoiler: 'finale',
    events: [],
  },
  adaptation: [
    { topic: 'Filler', anime: 'Both anime series insert original episodes between major arcs.', manga: 'Chapters 1–700 contain the full story.' },
  ],
  appearances: [
    { medium: 'manga', title: 'Naruto', detail: 'Deuteragonist, chapters 1–700.' },
    { medium: 'anime', title: 'Naruto', detail: 'Episodes 1–220', animeSlug: 'naruto' },
    { medium: 'anime', title: 'Naruto: Shippuden', detail: 'Episodes 1–500', animeSlug: 'naruto-shippuden' },
  ],
  unconfirmed: [
    'The Boruto sequel continues Sasuke’s story after the epilogue; this profile covers only the original manga and the two anime series.',
  ],
  faq: [
    { question: 'Why does Sasuke leave Konoha?', answer: 'He wants the power to kill his brother Itachi, and he believes Orochimaru can give him that. He tells Sakura before leaving that revenge is his purpose of living.', spoiler: 'part-1' },
    { question: 'What is the Sharingan?', answer: 'The Uchiha clan’s eye technique. It lets the user read and copy techniques, and the advanced Mangekyō form unlocks stronger abilities at the cost of sight.' },
    { question: 'Does Sasuke kill Itachi?', answer: 'Sasuke fights Itachi in Shippuden. The fight ends with Itachi’s death, and it is not the end of Itachi’s part in the story.', spoiler: 'brothers' },
  ],
  related: ['naruto-uzumaki', 'itachi-uchiha'],
  articleKeys: ['Sasuke'],
  seo: {
    title: 'Sasuke Uchiha: Abilities, Sharingan and Timeline (Spoiler-Safe)',
    description: 'Sasuke Uchiha explained with verified episodes and chapters: the Sharingan, Chidori, Mangekyō, relationships with Naruto and Itachi, and a spoiler-protected tracker.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Naruto manga chapters 1–700 and the anime Naruto and Naruto: Shippuden',
    sources: [
      { name: 'Naruto manga by Masashi Kishimoto (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Naruto and Naruto: Shippuden anime (Studio Pierrot)', covers: 'Episode numbers and arc ranges.' },
      { name: 'Narutopedia, “Sasuke Uchiha”', url: 'https://naruto.fandom.com/wiki/Sasuke_Uchiha', covers: 'Chapter and episode citations, databook figures; no text copied.' },
    ],
  },
};
