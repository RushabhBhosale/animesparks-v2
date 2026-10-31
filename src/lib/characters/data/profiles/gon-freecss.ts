import type { CharacterProfile } from '../../types.ts';

export const gonFreecss: CharacterProfile = {
  slug: 'gon-freecss',
  id: 'gon',
  series: 'hunter-x-hunter',
  name: 'Gon Freecss',
  native: 'ゴン＝フリークス (Gon Furīkusu)',
  aliases: ['Gon'],
  role: 'Young Hunter who sets out to find his father, Ging',
  affiliations: ['Hunter Association'],
  abilityTags: ['Nen', 'Enhancement', 'Jajanken', 'Keen senses'],
  overview: 'Gon Freecss is a boy from Whale Island who becomes a Hunter to find his father, Ging, a famous Hunter who left him behind. He passes the Hunter Exam, makes lifelong friends, and learns Nen, a skill that uses life energy in combat.',
  facts: [
    { label: 'Birthday', value: 'May 5', confidence: 'confirmed' },
    { label: 'Age', value: '11 at his debut; 13–14 in the later arcs', confidence: 'confirmed', note: 'The Hunterpedia notes that the later ages and the timeline do not fully agree.' },
    { label: 'Height', value: '154 cm (5 ft 0.7 in)', confidence: 'estimate', note: 'The Hunterpedia lists this value with an asterisk.' },
    { label: 'Weight', value: '49 kg (108 lb)', confidence: 'estimate', note: 'The Hunterpedia lists this value with an asterisk.' },
    { label: 'Blood type', value: 'B', confidence: 'confirmed' },
    { label: 'Nen type', value: 'Enhancement', confidence: 'confirmed', ref: { ch: 47 }, spoiler: 'hunter-exam' },
    { label: 'Occupation', value: 'Hunter (rookie)', confidence: 'confirmed' },
    { label: 'Debut', value: 'Manga chapter 1; 2011 anime episode 1', confidence: 'confirmed', ref: { ch: 1, ep: 1 } },
    { label: 'Voice actors', value: 'Megumi Han (Japanese, 2011); Erica Mendez (English, 2011)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'Whale Island',
      text: 'Gon grows up on Whale Island, raised by Mito and her mother. He was homeschooled, and a rustic life gave him keener senses than most people. He learns that his father is a Hunter, and decides to get a Hunter License to understand why Ging chose that profession over being a parent.',
      ref: { ch: 1, ep: 1 },
    },
    {
      heading: 'The Hunter Exam',
      text: 'At the 287th Hunter Exam, Gon meets Leorio, Kurapika and Killua. He saves Leorio from the magician Hisoka, who takes an interest in him and spares the group. Gon refuses to give in against Hanzo in the final phase, and Hanzo forfeits, making Gon the first applicant to pass.',
      ref: { ch: 33 },
    },
    {
      heading: 'Rescuing Killua',
      text: 'When Killua’s older brother Illumi forces him out of the exam, Gon and his friends travel to the Zoldyck estate. After they get past the gate and the butlers, Killua leaves the estate with them.',
      ref: { ch: 39 },
    },
    {
      heading: 'Heavens Arena and Nen',
      text: 'Gon and Killua fight their way up the Heavens Arena, where Wing shows them the true Nen. Gon later faces Hisoka there and punches him in the face.',
      ref: { ch: 47 },
      spoiler: 'hunter-exam',
    },
    {
      heading: 'Ging’s box and Greed Island',
      text: 'On Whale Island, Mito gives Gon a box left by Ging. It holds a cassette and a memory card, which Killua recognises as belonging to the game Greed Island.',
      ref: { ch: 64 },
      spoiler: 'heavens-arena',
    },
    {
      heading: 'Yorknew City',
      text: 'In Yorknew City the friends cross paths with the Phantom Troupe. Gon is furious that the troupe does not extend their feelings to others, and he defeats Nobunaga.',
      ref: { ch: 91 },
      spoiler: 'yorknew',
    },
    {
      heading: 'The Chimera Ant arc',
      text: 'After Greed Island, Gon and Killua meet Kite, who takes them on a field expedition that leads them to a Chimera Ant nest. Gon fights Knuckle, and later challenges Neferpitou, saying that he has come to restore Kite.',
      ref: { ch: 273 },
      spoiler: 'chimera-ant',
    },
    {
      heading: 'After the arc',
      text: 'Gon’s transformation leaves him comatose in hospital, and Alluka heals him. Afterwards he finds that he cannot use his aura.',
      ref: { ch: 344 },
      spoiler: 'dark-continent',
    },
  ],
  personality: [
    {
      heading: 'Cheerful, stubborn and curious',
      text: 'Gon is cheerful and curious, and he never gives up. His unwillingness to submit is what wins him the Hunter Exam against a stronger opponent, and it is also what draws Hisoka’s interest.',
      ref: { ch: 33 },
    },
    {
      heading: 'He feels for his friends',
      text: 'Gon never judges Killua for his past. He is angered when people do not feel for others, and he admires strength without sharing Hisoka’s taste for killing.',
      ref: { ch: 91 },
      spoiler: 'yorknew',
    },
  ],
  development: [
    {
      heading: 'A search that turns into a story about growing up',
      text: 'Gon’s goal of finding Ging gives the first arcs their direction. Over the story the focus shifts: the arcs after Greed Island test what Gon is willing to pay for what he cares about, and the manga’s later chapters show the cost.',
      spoiler: 'dark-continent',
    },
  ],
  motivations: [
    'Finding his father, Ging, and understanding why he became a Hunter.',
    'Protecting his friends.',
    'Becoming a stronger Hunter.',
  ],
  abilities: [
    {
      id: 'keen-senses', name: 'Keen senses', kind: 'innate',
      summary: 'Growing up in the wild gave Gon keener senses and higher physical abilities than most people his age.',
      strengths: ['Sharp hearing, sight and smell.', 'Tracks prey and detects danger.'],
      limits: ['They do not help in a fight against much stronger opponents.'],
      introduced: { ch: 64 }, confidence: 'confirmed',
    },
    {
      id: 'ten-zetsu', name: 'Ten and Zetsu', kind: 'skill', system: 'nen',
      summary: 'Two of the four basic Nen principles. Gon enters a state of Zetsu without knowing it, and he performs Ten while meditating on Ging’s abandonment.',
      strengths: ['Basic control of his own aura.'],
      limits: ['Basic principles; they are the foundation rather than an attack.'],
      introduced: { ch: 50 }, confidence: 'confirmed', spoiler: 'hunter-exam',
    },
    {
      id: 'ko', name: 'Ko', kind: 'technique', system: 'nen',
      summary: 'A Nen technique that concentrates aura in one part of the body. Gon strikes a wall with Ko in the Greed Island arc.',
      strengths: ['A strong concentrated strike.'],
      limits: ['It leaves the rest of the body less protected.'],
      introduced: { ch: 138 }, confidence: 'confirmed', spoiler: 'greed-island',
    },
    {
      id: 'jajanken', name: 'Jajanken', native: 'ジャジャン拳', kind: 'technique', system: 'nen',
      summary: 'Gon’s own attack, built around the rock, paper and scissors hand shapes. He charges Rock from a distance and uses Paper to attack Knuckle.',
      strengths: ['A powerful attack that Gon can charge.'],
      limits: ['According to Knuckle, charging the attack and lowering his defenses is a risk.'],
      introduced: { ch: 208 }, confidence: 'confirmed', spoiler: 'chimera-ant',
    },
    {
      id: 'transformation', name: 'Transformation', kind: 'transformation', order: 1, system: 'nen',
      summary: 'Gon’s physical strength, Nen abilities, aura output and aura reserves rise immensely at the height of his anger and sorrow.',
      strengths: ['A huge rise in power.'],
      limits: ['It comes at a terrible cost to Gon himself.'],
      introduced: { ch: 306 }, confidence: 'confirmed', spoiler: 'chimera-ant',
    },
  ],
  battles: [
    {
      id: 'hanzo', title: 'Gon vs. Hanzo', opponents: ['Hanzo'], outcome: 'Hanzo forfeits, and Gon is the first applicant to pass.',
      summary: 'Gon is outmatched in combat but refuses to give in, and Hanzo forfeits. Gon becomes the first applicant to pass the 287th Hunter Exam.',
      ref: { ch: 33 }, event: 'gon-passes-hanzo',
    },
    {
      id: 'hisoka-arena', title: 'Gon vs. Hisoka (Heavens Arena)', opponents: ['Hisoka'], outcome: 'Gon earns two points.',
      summary: 'Gon slips into Hisoka’s blind spot and punches him in the face, earning two points.',
      ref: { ch: 61 }, event: 'gon-hits-hisoka', spoiler: 'heavens-arena',
    },
    {
      id: 'nobunaga', title: 'Gon vs. Nobunaga', opponents: ['Nobunaga'], outcome: 'Gon wins in a fit of rage.',
      summary: 'In Yorknew City, Gon snaps when a Phantom Troupe member shows no feeling for Uvogin’s victims and fights Nobunaga with Nen.',
      ref: { ch: 91 }, event: 'gon-nobunaga', spoiler: 'yorknew',
    },
    {
      id: 'knuckle', title: 'Gon vs. Knuckle', opponents: ['Knuckle'], outcome: 'Gon uses Jajanken against a faster, stronger opponent.',
      summary: 'Gon uses his speed against Knuckle, who proves faster and stronger, and Gon charges a Jajanken attack from a distance.',
      ref: { ch: 206 }, event: 'gon-knuckle', spoiler: 'chimera-ant',
    },
    {
      id: 'neferpitou', title: 'Gon vs. Neferpitou', opponents: ['Neferpitou'], outcome: 'Gon’s transformation raises his power immensely.',
      summary: 'Gon releases all his anger and sorrow against Neferpitou, and his power rises far beyond its usual limit.',
      ref: { ch: 306 }, event: 'gon-transformation', spoiler: 'chimera-ant',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Gon is alive in all published chapters and episodes. After the Chimera Ant arc he is left in a coma and later cannot use his aura.',
    spoiler: 'dark-continent',
    events: [
      { id: 'coma', kind: 'near-death', title: 'Left comatose', circumstances: 'After his transformation Gon falls unconscious and is put in hospital in a comatose state.', significance: 'It is the cost of the transformation.', manga: { ch: 309 }, spoiler: 'chimera-ant' },
      { id: 'aura', kind: 'transformation', title: 'Cannot use his aura', circumstances: 'After talking with Ging, Gon finds that he cannot use his aura.', significance: 'It leaves Gon unable to use Nen in the manga’s later chapters.', manga: { ch: 344 }, spoiler: 'dark-continent' },
    ],
  },
  adaptation: [
    { topic: 'Which anime', anime: 'The 2011 anime covers the manga up to chapter 339 and ends after the Hunter Chairman Election.', manga: 'The manga continues beyond chapter 339.', spoiler: 'election' },
  ],
  appearances: [
    { medium: 'manga', title: 'Hunter x Hunter', detail: 'Protagonist, from chapter 1.' },
    { medium: 'anime', title: 'Hunter x Hunter (2011)', detail: 'Episodes 1–148', animeSlug: 'hunter-x-hunter-2011' },
  ],
  unconfirmed: [
    'Whether Gon recovers his ability to use aura is not settled in the chapters covered here.',
  ],
  faq: [
    { question: 'Why does Gon want to be a Hunter?', answer: 'To find his father, Ging, a famous Hunter, and to learn why he chose that profession over being a parent.' },
    { question: 'What is Gon’s Nen type?', answer: 'Enhancement. His signature attack is Jajanken, built around rock, paper and scissors.', spoiler: 'chimera-ant' },
    { question: 'What happens to Gon in the Chimera Ant arc?', answer: 'Gon transforms, and his power rises far beyond its usual limit. It leaves him in a coma, and later he cannot use his aura.', spoiler: 'dark-continent' },
  ],
  related: ['killua-zoldyck'],
  articleKeys: ['Gon Freecss', 'Gon'],
  seo: {
    title: 'Gon Freecss: Nen, Jajanken and Timeline (Spoiler-Safe)',
    description: 'Gon Freecss explained with verified chapter references: his search for Ging, Nen, Jajanken, his friendship with Killua and a spoiler-protected status tracker.',
  },
  meta: {
    publishedAt: '2026-10-31',
    verifiedAt: '2026-10-31',
    coverage: 'Manga chapters 1–345 and 2011 anime episodes 1–148',
    sources: [
      { name: 'Hunter x Hunter manga by Yoshihiro Togashi (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Hunter x Hunter (2011) anime (Madhouse)', covers: 'Episode numbers.' },
      { name: 'Hunterpedia (Hunter x Hunter Wiki) on Fandom, “Gon Freecss” and its arc pages', url: 'https://hunterxhunter.fandom.com/wiki/Gon_Freecss', covers: 'Chapter citations, birthday, age, height, weight, blood type and arc ranges; no text copied.' },
    ],
  },
};
