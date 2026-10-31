import type { SeriesData } from '../../types.ts';

// Verified 2026-10-31 from the manga and the 2011 anime and the Hunterpedia's
// citations (see data/characters/SOURCES.md). Episode numbers follow the 2011
// anime (148 episodes); the 1999 series is numbered separately and is not used.
// The arc chapter and episode ranges are the ones the Hunterpedia lists.
export const hunterXHunter: SeriesData = {
  slug: 'hunter-x-hunter',
  title: 'Hunter x Hunter',
  short: 'Hunter x Hunter',
  articleNames: ['Hunter x Hunter', 'Hunter × Hunter'],
  toolKeys: { franchise: 'hunter-x-hunter', manga: 'hunter-x-hunter', anime: ['hunter-x-hunter-2011'] },
  intro: 'Yoshihiro Togashi’s Hunter x Hunter follows a boy who becomes a Hunter to find his father. The 2011 anime covers the manga up to chapter 339 and the end of the Chimera Ant arc and the Hunter election; the manga continues beyond it, so these profiles keep the two apart. Spoilers follow the story’s arcs.',
  coverage: {
    manga: 'Chapters 1–345 for the characters covered here; later chapters are not covered',
    anime: 'The 2011 series, episodes 1–148',
    asOf: '2026-10-31',
  },
  checkpoints: [
    { id: 'hunter-exam', label: 'Hunter Exam (2011 episodes 1–26)', covers: 'Manga chapters 1–43.' },
    { id: 'heavens-arena', label: 'Heavens Arena (episodes 27–36)', covers: 'Manga chapters 44–63.' },
    { id: 'yorknew', label: 'Yorknew City (episodes 37–58)', covers: 'Manga chapters 64–119.' },
    { id: 'greed-island', label: 'Greed Island (episodes 59–75)', covers: 'Manga chapters 120–185.' },
    { id: 'chimera-ant', label: 'Chimera Ant (episodes 76–136)', covers: 'Manga chapters 186–318.' },
    { id: 'election', label: 'Hunter Chairman Election (episodes 137–148)', covers: 'Manga chapters 319–339.' },
    { id: 'dark-continent', label: 'Manga: after the election', covers: 'Manga chapters 340 onward, which the 2011 anime does not cover.' },
  ],
  arcs: [
    { id: 'hunter-exam', name: 'Hunter Exam', anime: { start: 1, end: 26 }, manga: { start: 1, end: 43 }, summary: 'Gon takes the Hunter Exam and meets his friends.' },
    { id: 'heavens-arena', name: 'Heavens Arena', anime: { start: 27, end: 36 }, manga: { start: 44, end: 63 }, summary: 'Gon and Killua fight their way up a tower and learn Nen.', spoiler: 'hunter-exam' },
    { id: 'yorknew', name: 'Yorknew City', anime: { start: 37, end: 58 }, manga: { start: 64, end: 119 }, summary: 'The friends cross paths with the Phantom Troupe at an auction.', spoiler: 'heavens-arena' },
    { id: 'greed-island', name: 'Greed Island', anime: { start: 59, end: 75 }, manga: { start: 120, end: 185 }, summary: 'Gon and Killua play a game that may lead to Gon’s father.', spoiler: 'yorknew' },
    { id: 'chimera-ant', name: 'Chimera Ant', anime: { start: 76, end: 136 }, manga: { start: 186, end: 318 }, summary: 'A new species of ant threatens a country.', spoiler: 'greed-island' },
    { id: 'election', name: 'Hunter Chairman Election', anime: { start: 137, end: 148 }, manga: { start: 319, end: 339 }, summary: 'The Hunter Association chooses a new chairman.', spoiler: 'chimera-ant' },
  ],
  powerSystems: [
    {
      id: 'nen', name: 'Nen',
      summary: 'A skill that uses the user’s life energy, called aura, for combat. Its basics are four principles, and users are sorted into types such as Enhancement and Transmutation.',
      rules: ['The four major principles include Ten and Zetsu, which control aura.', 'Each user has a Nen type that decides their special abilities.'],
      limits: ['Aura is limited, and using it too freely can leave the user drained.'],
      introduced: { ch: 47 },
    },
  ],
  cast: [
    { id: 'gon', name: 'Gon Freecss', profile: 'gon-freecss' },
    { id: 'killua', name: 'Killua Zoldyck', profile: 'killua-zoldyck' },
    { id: 'ging', name: 'Ging Freecss' },
    { id: 'mito', name: 'Mito Freecss' },
    { id: 'hisoka', name: 'Hisoka Morow' },
    { id: 'illumi', name: 'Illumi Zoldyck' },
    { id: 'alluka', name: 'Alluka Zoldyck' },
    { id: 'kite', name: 'Kite' },
    { id: 'neferpitou', name: 'Neferpitou' },
    { id: 'wing', name: 'Wing' },
  ],
  relationships: [
    {
      id: 'gon-killua', a: 'gon', b: 'killua', type: 'friend', roles: { a: 'best friend', b: 'best friend' },
      summary: 'Gon and Killua meet at the Hunter Exam and become best friends.',
      evolution: [
        { stage: 'First talk', text: 'Gon talks with Killua about why he wants to be a Hunter as the two run through the exam’s first phase.', ref: { ch: 7 } },
        { stage: 'A runaway', text: 'Killua tells Gon he ran away from his family of assassins.', ref: { ch: 13 } },
        { stage: 'Friends', text: 'Killua says that what he wants above all is to be Gon’s friend and live like a normal kid.', ref: { ch: 36 } },
      ],
    },
    {
      id: 'ging-gon', a: 'ging', b: 'gon', type: 'family', kin: 'parent', roles: { a: 'father', b: 'son' },
      summary: 'Ging is Gon’s father, and finding him is why Gon becomes a Hunter.',
      evolution: [
        { stage: 'The reason', text: 'Gon decides to get a Hunter License to learn what made his father choose that life over being a parent.', ref: { ch: 1 } },
        { stage: 'Ging’s box', text: 'Mito gives Gon a box left by Ging, which holds a cassette with Ging’s voice.', ref: { ch: 64 }, spoiler: 'heavens-arena' },
        { stage: 'Ging’s promise', text: 'Ging tells Gon that he will wait for him.', ref: { ch: 335 }, spoiler: 'election' },
      ],
    },
    {
      id: 'mito-gon', a: 'mito', b: 'gon', type: 'family', kin: 'guardian', roles: { a: 'foster mother', b: 'ward' },
      summary: 'Mito raises Gon on Whale Island, and Gon knows her as his aunt.',
      evolution: [{ stage: 'Home', text: 'Mito gives Gon the box Ging left and tells him about her childhood with Ging.', ref: { ch: 64 }, spoiler: 'heavens-arena' }],
    },
    {
      id: 'gon-hisoka', a: 'gon', b: 'hisoka', type: 'rival', roles: { a: 'rookie', b: 'magician' },
      summary: 'Hisoka takes an interest in Gon at the Hunter Exam and spares him, and the two later fight in the Heavens Arena.',
      evolution: [
        { stage: 'The exam', text: 'Hisoka spares Gon and his friends and becomes interested in Gon.', ref: { ch: 9 } },
        { stage: 'The fight', text: 'Gon slips into Hisoka’s blind spot and punches him in the face, earning two points.', ref: { ch: 61 }, spoiler: 'heavens-arena' },
      ],
    },
    {
      id: 'gon-kite', a: 'kite', b: 'gon', type: 'mentor', roles: { a: 'Hunter', b: 'protégé' },
      summary: 'Kite is a Hunter who knew Gon’s father and works with Gon and Killua.',
      evolution: [
        { stage: 'Reunion', text: 'Kite explains that he has been on Greed Island at Ging’s request.', ref: { ch: 185 }, spoiler: 'greed-island' },
        { stage: 'A promise', text: 'Gon says he came to Neferpitou to restore Kite.', ref: { ch: 273 }, spoiler: 'chimera-ant' },
      ],
    },
    {
      id: 'illumi-killua', a: 'illumi', b: 'killua', type: 'family', kin: 'sibling', roles: { a: 'older brother', b: 'younger brother' },
      summary: 'Illumi is Killua’s older brother, a member of the family of assassins Killua ran away from.',
      evolution: [
        { stage: 'The needles', text: 'At the Hunter Exam a man called Gittarackur removes his needles and turns out to be Killua’s older brother, Illumi.', ref: { ch: 35 } },
      ],
    },
    {
      id: 'alluka-killua', a: 'alluka', b: 'killua', type: 'family', kin: 'sibling', roles: { a: 'younger sister', b: 'older brother' },
      summary: 'Alluka is Killua’s younger sister, who is kept confined in the Zoldyck estate.',
      evolution: [
        { stage: 'The room', text: 'Silva takes Killua to the room where Alluka is confined, and Killua is allowed to meet her.', ref: { ch: 321 }, spoiler: 'election' },
        { stage: 'The healing', text: 'Alluka heals Gon and releases a large wave of energy.', ref: { ch: 333 }, spoiler: 'election' },
      ],
      spoiler: 'election',
    },
  ],
  timeline: [
    { id: 'gon-sets-out', title: 'Gon decides to become a Hunter', summary: 'Gon sets out to get a Hunter License so that he can find his father, Ging.', kind: 'milestone', characters: ['gon', 'mito', 'ging'], when: 'Start of the story', storyOrder: 10, manga: { ch: 1 }, anime: { ep: 1 }, arc: 'hunter-exam' },
    { id: 'hisoka-spares-gon', title: 'Hisoka spares Gon', summary: 'At the Hunter Exam, Gon saves Leorio from Hisoka, who takes an interest in him and spares them.', kind: 'milestone', characters: ['gon', 'hisoka'], when: 'The Hunter Exam', storyOrder: 20, manga: { ch: 9 }, arc: 'hunter-exam' },
    { id: 'killua-runaway', title: 'Killua tells Gon he ran away from home', summary: 'Killua tells Gon he ran away from his family of assassins, and Netero offers the two boys licenses.', kind: 'milestone', characters: ['killua', 'gon'], when: 'The Hunter Exam', storyOrder: 25, manga: { ch: 13 }, arc: 'hunter-exam' },
    { id: 'gon-passes-hanzo', title: 'Gon passes the exam against Hanzo', summary: 'Gon refuses to give in against Hanzo, who forfeits the battle, making Gon the first applicant to pass the 287th Hunter Exam.', kind: 'battle', characters: ['gon'], when: 'The Hunter Exam', storyOrder: 30, manga: { ch: 33 }, arc: 'hunter-exam' },
    { id: 'illumi-reveal', title: 'Gittarackur is revealed to be Illumi', summary: 'Gittarackur removes his needles and turns out to be Killua’s older brother.', kind: 'reveal', characters: ['illumi', 'killua', 'gon'], when: 'The Hunter Exam', storyOrder: 32, manga: { ch: 35 }, arc: 'hunter-exam' },
    { id: 'zoldyck-rescue', title: 'Gon goes to the Zoldyck estate', summary: 'Gon and his friends go to the Zoldyck estate for Killua, who leaves it behind.', kind: 'milestone', characters: ['gon', 'killua'], when: 'After the Hunter Exam', storyOrder: 35, manga: { ch: 39 }, arc: 'hunter-exam' },
    { id: 'wing-nen', title: 'Wing teaches Gon and Killua Nen', summary: 'Wing shows the two boys the true Nen, a skill using life energy for combat.', kind: 'milestone', characters: ['gon', 'killua', 'wing'], when: 'Heavens Arena', storyOrder: 40, manga: { ch: 47 }, arc: 'heavens-arena', spoiler: 'hunter-exam' },
    { id: 'gon-hits-hisoka', title: 'Gon hits Hisoka', summary: 'In the Heavens Arena, Gon slips into Hisoka’s blind spot and punches him in the face, earning two points.', kind: 'battle', characters: ['gon', 'hisoka'], when: 'Heavens Arena', storyOrder: 45, manga: { ch: 61 }, arc: 'heavens-arena', spoiler: 'heavens-arena' },
    { id: 'gons-box', title: 'Gon gets his father’s box', summary: 'On Whale Island Mito gives Gon a box left by Ging; its memory card turns out to belong to the game Greed Island.', kind: 'milestone', characters: ['gon', 'mito', 'ging', 'killua'], when: 'Whale Island', storyOrder: 50, manga: { ch: 64 }, arc: 'yorknew', spoiler: 'heavens-arena' },
    { id: 'gon-nobunaga', title: 'Gon beats Nobunaga', summary: 'In Yorknew City, Gon snaps and activates his Nen against Nobunaga of the Phantom Troupe.', kind: 'battle', characters: ['gon', 'killua'], when: 'Yorknew City', storyOrder: 55, manga: { ch: 91 }, arc: 'yorknew', spoiler: 'yorknew' },
    { id: 'killua-machi', title: 'Killua tries to free Gon from Machi', summary: 'In Yorknew City, Killua tries to set Gon free by attacking Machi, but she blocks his claws and restrains him.', kind: 'battle', characters: ['killua', 'gon'], when: 'Yorknew City', storyOrder: 57, manga: { ch: 113 }, arc: 'yorknew', spoiler: 'yorknew' },
    { id: 'killua-hunter', title: 'Killua passes the 288th Hunter Exam', summary: 'Netero declares Killua the only applicant to have passed the 288th Hunter Exam without other trials.', kind: 'milestone', characters: ['killua'], when: 'Greed Island', storyOrder: 58, manga: { ch: 148 }, arc: 'greed-island', spoiler: 'yorknew' },
    { id: 'gon-meets-kite', title: 'Gon and Killua reach Kite', summary: 'Gon and Killua are taken to Kite, who explains he has been on Greed Island at Ging’s request.', kind: 'milestone', characters: ['gon', 'killua', 'kite'], when: 'After Greed Island', storyOrder: 60, manga: { ch: 185 }, arc: 'greed-island', spoiler: 'greed-island' },
    { id: 'gon-knuckle', title: 'Gon fights Knuckle', summary: 'Gon uses Rock, Paper and a jajanken attack against Knuckle.', kind: 'battle', characters: ['gon'], when: 'The Chimera Ant arc', storyOrder: 65, manga: { ch: 206 }, arc: 'chimera-ant', spoiler: 'chimera-ant' },
    { id: 'gon-vows', title: 'Gon challenges Neferpitou', summary: 'Gon states his purpose and challenges Neferpitou, and says he came to restore Kite.', kind: 'milestone', characters: ['gon', 'neferpitou', 'kite'], when: 'The Chimera Ant arc', storyOrder: 70, manga: { ch: 273 }, arc: 'chimera-ant', spoiler: 'chimera-ant' },
    { id: 'killua-thunderbolt', title: 'Killua stops Youpi with Thunderbolt', summary: 'Killua paralyzes Youpi with Thunderbolt just as he is about to attack Knuckle, giving Knuckle an opening.', kind: 'battle', characters: ['killua'], when: 'The Chimera Ant arc', storyOrder: 71, manga: { ch: 280 }, arc: 'chimera-ant', spoiler: 'chimera-ant' },
    { id: 'killua-godspeed', title: 'Killua uses Godspeed', summary: 'Killua dodges a clone of a Royal Guard member with Godspeed.', kind: 'battle', characters: ['killua'], when: 'The Chimera Ant arc', storyOrder: 72, manga: { ch: 302 }, arc: 'chimera-ant', spoiler: 'chimera-ant' },
    { id: 'gon-transformation', title: 'Gon’s transformation', summary: 'Gon unleashes all his anger and sorrow and his physical strength, Nen abilities and aura rise immensely.', kind: 'transformation', characters: ['gon', 'neferpitou', 'killua'], when: 'The Chimera Ant arc', storyOrder: 75, manga: { ch: 306 }, arc: 'chimera-ant', spoiler: 'chimera-ant' },
    { id: 'gon-coma', title: 'Gon is left comatose', summary: 'Gon falls unconscious, and Killua carries him to the Extermination Team. He is put in a hospital in a comatose state.', kind: 'milestone', characters: ['gon', 'killua'], when: 'The Chimera Ant arc', storyOrder: 78, manga: { ch: 309 }, arc: 'chimera-ant', spoiler: 'chimera-ant' },
    { id: 'killua-alluka', title: 'Killua meets Alluka', summary: 'Silva takes Killua to the room where Alluka is confined, and Killua is allowed to meet his sister.', kind: 'reveal', characters: ['killua', 'alluka'], when: 'The election', storyOrder: 80, manga: { ch: 321 }, arc: 'election', spoiler: 'election' },
    { id: 'alluka-heals', title: 'Alluka heals Gon', summary: 'As Alluka heals Gon, she releases an energy wave so powerful that everyone near the Hunter Association building feels it.', kind: 'milestone', characters: ['alluka', 'gon', 'killua'], when: 'The election', storyOrder: 82, manga: { ch: 333 }, arc: 'election', spoiler: 'election' },
    { id: 'gon-loses-aura', title: 'Gon cannot use his aura', summary: 'After talking with Ging, Gon finds that he cannot use his aura.', kind: 'transformation', characters: ['gon', 'ging'], when: 'After the election', storyOrder: 85, manga: { ch: 344 }, spoiler: 'dark-continent' },
  ],
  faq: [
    { question: 'Which Hunter x Hunter anime should I watch?', answer: 'The 2011 anime follows the manga more closely than the 1999 series. It covers manga chapters 1–339 in 148 episodes.' },
  ],
};
