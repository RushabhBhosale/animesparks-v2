import type { CharacterProfile } from '../../types.ts';

export const killuaZoldyck: CharacterProfile = {
  slug: 'killua-zoldyck',
  id: 'killua',
  series: 'hunter-x-hunter',
  name: 'Killua Zoldyck',
  native: 'キルア＝ゾルディック (Kirua Zorudikku)',
  aliases: ['Killua', 'Kil'],
  role: 'Gon’s best friend and a former member of a family of assassins',
  affiliations: ['Hunter Association'],
  abilityTags: ['Assassin training', 'Thunderbolt', 'Godspeed', 'Transmutation'],
  overview: 'Killua Zoldyck was raised by one of the world’s most feared families of assassins. At eleven he ran away to take the Hunter Exam, where he meets Gon and decides that what he wants most is to be a friend and live like a normal kid.',
  facts: [
    { label: 'Birthday', value: 'July 7', confidence: 'confirmed', note: 'The Hunterpedia lists July 7 for the manga and the 2011 anime, and a different date for the 1999 series.' },
    { label: 'Age', value: '11 at his debut; 13–14 in the later arcs', confidence: 'confirmed' },
    { label: 'Height', value: '158 cm (5 ft 2 in)', confidence: 'estimate', note: 'The Hunterpedia lists this value with an asterisk.' },
    { label: 'Weight', value: '45 kg (99.3 lb)', confidence: 'estimate', note: 'The Hunterpedia lists this value with an asterisk.' },
    { label: 'Nen type', value: 'Transmutation', confidence: 'confirmed', spoiler: 'hunter-exam' },
    { label: 'Family', value: 'The Zoldyck family: father Silva, mother Kikyo, grandfather Zeno and older brothers Illumi and Milluki', confidence: 'confirmed' },
    { label: 'Occupation', value: 'Hunter (rookie); former Zoldyck assassin', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 6; 2011 anime episode 3', confidence: 'confirmed', ref: { ch: 6, ep: 3 } },
    { label: 'Voice actors', value: 'Mariya Ise (Japanese, 2011); Cristina Vee (English, 2011)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'A runaway assassin',
      text: 'Killua is sick of killing. At eleven he rebels against his family, injuring his mother and an older brother, and runs away from home to take the Hunter Exam for fun.',
      ref: { ch: 13 },
    },
    {
      heading: 'The Hunter Exam and Gon',
      text: 'At the exam Killua runs with Gon through the first phase, and he tells him that he ran away from his family. He says that what he wants above all is to be Gon’s friend and live like a normal kid, without killing.',
      ref: { ch: 36 },
    },
    {
      heading: 'Illumi',
      text: 'In the last phase, a man called Gittarackur removes his needles and reveals himself to be Killua’s older brother Illumi. Killua is manipulated into murdering another contestant and fails the exam.',
      ref: { ch: 35 },
    },
    {
      heading: 'The Zoldyck estate',
      text: 'Gon and his friends travel to the Zoldyck estate. Killua opens the Testing Gate to the third door, which weighs 16 tons, and he leaves the estate with his friends.',
      ref: { ch: 39 },
    },
    {
      heading: 'Heavens Arena',
      text: 'Killua stops on the 50th floor of the Heavens Arena so that he can move forward with Gon. Together they learn Nen, and Killua realises that Hisoka has attached Bungee Gum to Gon.',
      ref: { ch: 62 },
      spoiler: 'hunter-exam',
    },
    {
      heading: 'Yorknew City and Greed Island',
      text: 'In Yorknew City Killua tries to set Gon free from the Phantom Troupe, and later in the story he takes the 288th Hunter Exam and passes without other trials. He and Gon then play Greed Island.',
      ref: { ch: 148 },
      spoiler: 'yorknew',
    },
    {
      heading: 'The Chimera Ant arc',
      text: 'In the Chimera Ant arc Killua knocks Gon unconscious so they can retreat, uses Thunderbolt against the Royal Guard member Youpi and dodges attacks with Godspeed. When Gon falls unconscious after his transformation, Killua carries him to the Extermination Team.',
      ref: { ch: 309 },
      spoiler: 'chimera-ant',
    },
    {
      heading: 'Alluka',
      text: 'Silva takes Killua to the room where his younger sister Alluka is confined, and Killua is allowed to meet her.',
      ref: { ch: 321 },
      spoiler: 'election',
    },
  ],
  personality: [
    {
      heading: 'Cool on the outside',
      text: 'Killua is clever and composed, with a sarcastic edge. His family trained him to kill, but he wants a normal life, and the first real friend he makes is Gon.',
      ref: { ch: 36 },
    },
    {
      heading: 'Fear and respect for his family',
      text: 'Outside of his brother Illumi, Killua does not seem to hate or fear any other Zoldyck. He respects his father Silva and his grandfather Zeno.',
      ref: { ch: 326 },
      spoiler: 'election',
    },
  ],
  development: [
    {
      heading: 'From runaway to someone with a home of his own choosing',
      text: 'Killua’s arc is about what he wants to be. He starts as an assassin who wants out, learns to rely on a friend, and later has to decide whether he can trust his own choices when his family has tried to shape them.',
      spoiler: 'election',
    },
  ],
  motivations: [
    'Staying with Gon and being his friend.',
    'Living a normal life, without killing.',
    'Protecting his friends and his younger sister.',
  ],
  abilities: [
    {
      id: 'assassin-training', name: 'Assassin training', kind: 'skill',
      summary: 'Killua was trained from a young age by the Zoldyck family. He can open the Testing Gate to its third door, which weighs 16 tons, and he endured three weeks of torture from his brother.',
      strengths: ['The strength to open a gate weighing 16 tons.'],
      limits: ['He wants to leave the life this training was for.'],
      introduced: { ch: 39 }, confidence: 'confirmed',
    },
    {
      id: 'yo-yos', name: 'Yo-yos', kind: 'weapon',
      summary: 'After passing the 288th Hunter Exam, Killua gets two specially made yo-yos from his brother Milluki.',
      strengths: ['A weapon made to his own order.'],
      limits: ['It is a tool rather than a Nen ability.'],
      introduced: { ch: 148 }, confidence: 'confirmed', spoiler: 'yorknew',
    },
    {
      id: 'thunderbolt', name: 'Thunderbolt', kind: 'technique', system: 'nen',
      summary: 'A Nen attack that lets Killua send lightning through an enemy. He uses it to paralyze Youpi just as he is about to strike Knuckle.',
      strengths: ['Paralyzes an opponent for a moment.'],
      limits: ['It gives an opening rather than finishing a fight.'],
      introduced: { ch: 280 }, confidence: 'confirmed', spoiler: 'chimera-ant',
    },
    {
      id: 'godspeed', name: 'Godspeed', kind: 'technique', system: 'nen',
      summary: 'A speed technique that lets Killua move at the speed of lightning. He uses it to dodge an attack by a clone of a Royal Guard member.',
      strengths: ['Extreme speed.'],
      limits: ['He uses it at key moments rather than all the time.'],
      introduced: { ch: 302 }, confidence: 'confirmed', spoiler: 'chimera-ant',
    },
  ],
  battles: [
    {
      id: 'illumi', title: 'Killua and Illumi', opponents: ['Illumi Zoldyck'], outcome: 'Killua fails the exam.',
      summary: 'Gittarackur removes his needles and reveals that he is Illumi, who questions Killua’s motives and makes him afraid.',
      ref: { ch: 35 }, event: 'illumi-reveal',
    },
    {
      id: 'machi', title: 'Killua vs. Machi', opponents: ['Machi'], outcome: 'Machi blocks him and restrains him.',
      summary: 'In Yorknew City, Killua tries to set Gon free by attacking Machi, but she blocks his claws with her chest muscles.',
      ref: { ch: 113 }, event: 'killua-machi', spoiler: 'yorknew',
    },
    {
      id: 'youpi', title: 'Killua and Youpi', opponents: ['Youpi'], outcome: 'Killua paralyzes Youpi and gives Knuckle an opening.',
      summary: 'Using the invisibility of Meleoron, Killua paralyzes Youpi with Thunderbolt just as he is about to strike Knuckle.',
      ref: { ch: 280 }, event: 'killua-thunderbolt', spoiler: 'chimera-ant',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Killua is alive in all published chapters and episodes.',
    events: [],
  },
  adaptation: [
    { topic: 'Which anime', anime: 'The 2011 anime covers the manga up to chapter 339.', manga: 'The manga continues beyond chapter 339.', spoiler: 'election' },
  ],
  appearances: [
    { medium: 'manga', title: 'Hunter x Hunter', detail: 'Main character, from chapter 6.' },
    { medium: 'anime', title: 'Hunter x Hunter (2011)', detail: 'Episodes 3–148', animeSlug: 'hunter-x-hunter-2011' },
  ],
  unconfirmed: [
    'How Illumi’s influence over Killua ends is not settled in the chapters covered here.',
  ],
  faq: [
    { question: 'Why did Killua run away from home?', answer: 'He was sick of killing, and he rebelled against his family of assassins at eleven. He ran away to take the Hunter Exam.' },
    { question: 'What is Killua’s Nen type?', answer: 'Transmutation. He uses it for Thunderbolt and Godspeed.', spoiler: 'chimera-ant' },
    { question: 'Who is Alluka?', answer: 'Alluka is Killua’s younger sister, who is kept confined in the Zoldyck estate.', spoiler: 'election' },
  ],
  related: ['gon-freecss'],
  articleKeys: ['Killua Zoldyck', 'Killua'],
  seo: {
    title: 'Killua Zoldyck: Godspeed, Thunderbolt and Timeline (Spoiler-Safe)',
    description: 'Killua Zoldyck explained with verified chapter references: his family of assassins, Thunderbolt, Godspeed, his bond with Gon and a spoiler-protected timeline.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–345 and 2011 anime episodes 1–148',
    sources: [
      { name: 'Hunter x Hunter manga by Yoshihiro Togashi (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Hunter x Hunter (2011) anime (Madhouse)', covers: 'Episode numbers.' },
      { name: 'Hunterpedia (Hunter x Hunter Wiki) on Fandom, “Killua Zoldyck”', url: 'https://hunterxhunter.fandom.com/wiki/Killua_Zoldyck', covers: 'Chapter citations, birthday, age, height, weight and the debut chapter and episode; no text copied.' },
    ],
  },
};
