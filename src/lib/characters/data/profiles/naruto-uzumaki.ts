import type { CharacterProfile } from '../../types.ts';

export const narutoUzumaki: CharacterProfile = {
  slug: 'naruto-uzumaki',
  id: 'naruto',
  series: 'naruto',
  name: 'Naruto Uzumaki',
  native: 'うずまきナルト (Uzumaki Naruto)',
  aliases: ['Naruto', 'Number One Hyperactive Knucklehead Ninja'],
  role: 'Konoha ninja, Team 7 member and jinchūriki of the Nine-Tails',
  affiliations: ['Konohagakure', 'Team 7'],
  abilityTags: ['Shadow Clone Technique', 'Rasengan', 'Sage Mode', 'Nine-Tails chakra'],
  overview: 'Naruto Uzumaki is a young ninja from Konohagakure who is ostracised for what is sealed inside him and sets out to become Hokage, the leader the whole village will have to acknowledge. The series follows him from a prankster at the Academy to the person other ninja look to when the world goes to war.',
  facts: [
    { label: 'Birthday', value: 'October 10', confidence: 'confirmed', ref: { ch: 382 } },
    { label: 'Age', value: '12–13 in Part I; 15–17 in Part II (Shippuden)', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Height', value: '145.3 cm in Part I; 166 cm in Part II', confidence: 'confirmed', ref: { other: 'Databooks' } },
    { label: 'Village', value: 'Konohagakure (Hidden Leaf)', confidence: 'confirmed' },
    { label: 'Team', value: 'Team 7, led by Kakashi Hatake', confidence: 'confirmed', ref: { ch: 4 } },
    { label: 'Parents', value: 'Minato Namikaze and Kushina Uzumaki', confidence: 'confirmed', ref: { ch: 382 }, spoiler: 'akatsuki' },
    { label: 'Bijū', value: 'Jinchūriki of the Nine-Tailed Fox (Kurama)', confidence: 'confirmed', ref: { ch: 2 } },
    { label: 'Debut', value: 'Manga chapter 1; Naruto episode 1', confidence: 'confirmed' },
    { label: 'Voice actors', value: 'Junko Takeuchi (Japanese); Maile Flanagan (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'An outcast with a dream',
      text: 'Naruto grows up in Konoha ignored or resented by its residents, who have been told never to speak of the Nine-Tailed Fox that attacked the village on the day he was born. The Third Hokage forbids anyone from mentioning it, hoping the next generation will not inherit their parents’ hatred. Naruto’s pranks are a way of getting noticed, and his dream of becoming Hokage is the dream of being acknowledged.',
      ref: { ch: 2 },
    },
    {
      heading: 'Team 7',
      text: 'After graduating, Naruto is placed on Team 7 with Sasuke Uchiha and Sakura Haruno under Kakashi Hatake. In chapter 4 he tells Kakashi that he intends to become the greatest Hokage. Their first long mission, the Land of Waves arc, and the Chūnin Exams that follow introduce most of the cast and the rivalry with Sasuke that runs through the rest of the series.',
      ref: { ch: 4, ep: 4 },
    },
    {
      heading: 'Training with Jiraiya',
      text: 'Part I ends with Sasuke leaving the village. Naruto spends the next two and a half years training with Jiraiya, one of the legendary Sannin, and returns in Shippuden with stronger taijutsu, larger shadow clones and the Rasengan. The training also changes how he deals with Kurama, whose power he must learn to control instead of relying on.',
      ref: { ch: 288 },
      spoiler: 'part-1',
    },
    {
      heading: 'Pain’s assault and the war',
      text: 'Part II brings Naruto into direct conflict with the Akatsuki. After Jiraiya’s death, Naruto speaks with his father Minato and listens to Nagato’s story, which pushes him to work out how to break the cycle of hatred. Through the Fourth Shinobi World War he trains with Killer B, learns to control Kurama’s power, and becomes capable of facing the reincarnated Kage.',
      ref: { ch: 448 },
      spoiler: 'pain-summit',
    },
    {
      heading: 'The end of the war',
      text: 'In the last stretch Naruto and Sasuke face the final enemy together and then fight each other. The manga closes with an epilogue showing where the next generation stands.',
      ref: { ch: 696 },
      spoiler: 'finale',
    },
  ],
  personality: [
    {
      heading: 'Loud, stubborn and generous',
      text: 'Naruto is impulsive and boastful, and he never accepts that something is impossible. He says that he will not quit and that he will still become Hokage even if he is stuck as a genin for the rest of his life. What makes him unusual in the series is that he reacts to rejection by extending friendship, and the story keeps rewarding that choice.',
      ref: { ch: 43 },
    },
    {
      heading: 'Hatred versus understanding',
      text: 'The Sage of Six Paths later tells Naruto that his kindness is a gift that lets him save Kurama from its hatred. That is the most useful single description of how the author uses him: Naruto’s defining skill is understanding enemies, not defeating them.',
      ref: { ch: 693 },
      spoiler: 'finale',
    },
  ],
  development: [
    {
      heading: 'From wanting acknowledgement to wanting to protect',
      text: 'The goal never changes, but its reason does. Naruto’s early wish to be Hokage is a wish for acknowledgement. By the war, he wants to protect the people close to him, which Tobi attributes to the “Will of Fire”. The shift is visible in how he fights: he spends the second half of the series trying to persuade enemies rather than only beating them.',
      ref: { ch: 462 },
      spoiler: 'pain-summit',
    },
  ],
  motivations: [
    'Becoming Hokage so the village acknowledges him.',
    'Bringing Sasuke back to Konoha.',
    'Breaking the cycle of hatred that Nagato’s story shows him.',
  ],
  abilities: [
    {
      id: 'jinchuriki', name: 'Jinchūriki of the Nine-Tails', kind: 'innate', system: 'chakra',
      summary: 'The Nine-Tailed Fox, Kurama, is sealed inside Naruto. This gives him unusually large chakra reserves, and the fox’s power leaks into his own.',
      strengths: ['Very large chakra reserves.', 'Access to Kurama’s chakra when Naruto draws on it.'],
      limits: ['Kurama’s hatred can overwhelm Naruto’s control if he relies on it carelessly.'],
      introduced: { ch: 2 }, confidence: 'confirmed',
    },
    {
      id: 'shadow-clone', name: 'Shadow Clone Technique', native: '影分身の術', kind: 'technique', system: 'chakra',
      summary: 'Naruto creates physical clones of himself. Because of his reserves he can make hundreds, and often uses them in large numbers to overwhelm opponents.',
      strengths: ['Overwhelms opponents by numbers.', 'Clones can train, gather information and gather natural energy.'],
      limits: ['Each clone splits Naruto’s chakra between them.', 'A clone dispels when it takes a hard enough hit.'],
      introduced: { ch: 75 }, confidence: 'confirmed',
    },
    {
      id: 'rasengan', name: 'Rasengan', native: '螺旋丸', kind: 'technique', system: 'chakra',
      summary: 'A spinning sphere of chakra that Naruto drives into an opponent. At first he needs a shadow clone to form the sphere.',
      strengths: ['Delivers concentrated, high-impact damage at close range.'],
      limits: ['Naruto originally needed a shadow clone to shape it, and it takes time to perform.'],
      introduced: { other: 'Search for Tsunade arc (episodes 81–100)' }, evolution: 'Over time Naruto develops larger versions and learns to perform them faster. By the Fourth Shinobi World War he can form it unaided with a single hand or in both hands at once.',
      confidence: 'confirmed',
    },
    {
      id: 'sage-mode', name: 'Sage Mode', native: '仙人モード', kind: 'power-up', order: 1,
      summary: 'Naruto gathers natural energy to enhance his strength and techniques. A complete Sage Mode shows an orange pigment around his eyes and toad-like pupils.',
      strengths: ['Raises physical prowess and the strength of his techniques.'],
      limits: ['He originally needs shadow clones to gather the natural energy, and can make no more than five without breaking focus.'],
      introduced: { ch: 418 }, confidence: 'confirmed', spoiler: 'pain-summit',
    },
    {
      id: 'nine-tails-mode', name: 'Nine-Tails Chakra Mode', kind: 'transformation', order: 2,
      summary: 'Naruto wears a cloak of Kurama’s chakra that he can access instantly and hold for much longer than Sage Mode. In the final battles he can also manifest Kurama as an avatar.',
      strengths: ['Instant access and long duration compared to earlier states.', 'The Kurama avatar can match the size of other constructs in the final fight.'],
      limits: ['In the early forms, Naruto struggled to keep control; by the war’s end he reaches the first version without losing his mentality.'],
      introduced: { ch: 695 }, confidence: 'confirmed', spoiler: 'finale',
    },
  ],
  battles: [
    {
      id: 'valley-of-the-end', title: 'Naruto vs. Sasuke at the Valley of the End', opponents: ['Sasuke Uchiha'], outcome: 'Sasuke wins the fight and leaves for Orochimaru.',
      summary: 'Naruto catches up with Sasuke on the Valley of the End and fights him to bring him home.',
      ref: { ch: 229, ep: 133 }, event: 'valley-of-the-end', spoiler: 'part-1',
    },
    {
      id: 'chunin-exams', title: 'The Chūnin Exams', opponents: ['various'], outcome: 'Naruto makes progress through the exams, and the arc ends in the attack on Konoha.',
      summary: 'A tournament arc in which Naruto grows from a joke into someone others take seriously.',
      ref: { ch: 34, ep: 20 }, event: 'chunin-exams',
    },
    {
      id: 'final-battle', title: 'Naruto vs. Sasuke: the final battle', opponents: ['Sasuke Uchiha'], outcome: 'The fight ends with both of them having used everything they have.',
      summary: 'After the war, Naruto and Sasuke fight with their strongest forms.',
      ref: { ch: 696, ep: 476, ed: 'shippuden' }, event: 'final-battle', spoiler: 'finale',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Naruto survives the original story. He is a jinchūriki and is in danger many times, but no death is shown in the manga or in Naruto and Shippuden.',
    events: [],
  },
  adaptation: [
    { topic: 'Filler', anime: 'Large parts of both anime series are anime-original. They do not change the main plot.', manga: 'Chapters 1–700 contain the full story.' },
  ],
  appearances: [
    { medium: 'manga', title: 'Naruto', detail: 'Protagonist, chapters 1–700.' },
    { medium: 'anime', title: 'Naruto', detail: 'Episodes 1–220', animeSlug: 'naruto' },
    { medium: 'anime', title: 'Naruto: Shippuden', detail: 'Episodes 1–500', animeSlug: 'naruto-shippuden' },
  ],
  unconfirmed: [
    'The sequel series continues Naruto’s story after the epilogue; this profile covers only the original manga and the two anime series.',
  ],
  faq: [
    { question: 'Is Naruto the strongest character in the series?', answer: 'The story does not give a fixed scale. Different arcs show Naruto against very different opponents, and AnimeSparks does not rank characters by power.' },
    { question: 'What is a jinchūriki?', answer: 'A person who holds a tailed beast sealed inside them. Naruto holds the Nine-Tailed Fox, Kurama.' },
    { question: 'Who are Naruto’s parents?', answer: 'Minato Namikaze, the Fourth Hokage, and Kushina Uzumaki. The identity of his father is revealed in Shippuden.', spoiler: 'akatsuki' },
  ],
  related: ['sasuke-uchiha', 'itachi-uchiha'],
  articleKeys: ['Naruto Uzumaki'],
  seo: {
    title: 'Naruto Uzumaki: Abilities, Sage Mode and Timeline (Spoiler-Safe)',
    description: 'Naruto Uzumaki explained with verified episode and chapter references: jinchūriki powers, Rasengan, Sage Mode, relationships and a spoiler-protected tracker.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Naruto manga chapters 1–700 and the anime Naruto and Naruto: Shippuden',
    sources: [
      { name: 'Naruto manga by Masashi Kishimoto (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Naruto and Naruto: Shippuden anime (Studio Pierrot)', covers: 'Episode numbers and arc ranges.' },
      { name: 'Narutopedia, “Naruto Uzumaki”', url: 'https://naruto.fandom.com/wiki/Naruto_Uzumaki', covers: 'Chapter and episode citations used for cross-checking; no text copied.' },
    ],
  },
};
