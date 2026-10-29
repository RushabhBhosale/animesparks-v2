import type { SeriesData } from '../../types.ts';

// Facts verified 2026-10-29 against the manga/anime and cross-checked with the
// Jujutsu Kaisen Wiki's chapter/episode citations (see data/characters/SOURCES.md).
// Episode numbers are series-wide: season 2 episode 1 is episode 25.
export const jujutsuKaisen: SeriesData = {
  slug: 'jujutsu-kaisen',
  title: 'Jujutsu Kaisen',
  short: 'Jujutsu Kaisen',
  articleNames: ['Jujutsu Kaisen'],
  toolKeys: { franchise: 'jujutsu-kaisen', manga: 'jujutsu-kaisen', arc: 'jujutsu-kaisen', anime: ['jujutsu-kaisen', 'jujutsu-kaisen-season-2', 'jujutsu-kaisen-the-culling-game-part-1'] },
  intro: 'Gege Akutami’s Jujutsu Kaisen follows sorcerers who fight curses born from human fear and resentment. The manga ran in Weekly Shonen Jump from 2018 and finished at chapter 271 in 2024, which means the anime and the manga are now years apart: the anime has reached the middle of the Culling Game, and the manga has already told the whole story. These profiles keep the two apart. Anything that happens after the anime’s last episode is folded away behind the spoiler selector.',
  coverage: {
    manga: 'Complete: chapters 1–271 (main series), plus the Jujutsu Kaisen 0 prequel',
    anime: 'Seasons 1–3 (episodes 1–59, up to manga chapter 181); Culling Game Part 2 announced without a date',
    asOf: '2026-10-29',
  },
  checkpoints: [
    { id: 'season-1', label: 'Season 1 (episodes 1–24)', covers: 'Fearsome Womb, Kyoto Goodwill Event and the Death Painting setup, manga chapters 1–63.' },
    { id: 'season-2', label: 'Season 2 (episodes 25–47)', covers: 'Gojo’s past, the Shibuya Incident and its aftermath, up to manga chapter 136.' },
    { id: 'season-3', label: 'Season 3 (episodes 48–59)', covers: 'Culling Game Part 1 as animated, up to manga chapter 181.' },
    { id: 'culling-game', label: 'Manga chapters 182–220', covers: 'The rest of the Culling Game, manga chapters 182–220.' },
    { id: 'gojo-sukuna', label: 'Manga chapters 221–236', covers: 'Manga chapters 221–236.' },
    { id: 'shinjuku', label: 'Manga chapters 237–264', covers: 'Manga chapters 237–264.' },
    { id: 'finale', label: 'Manga chapters 265–271 (finale)', covers: 'Manga chapters 265–271, the end of the story.' },
  ],
  arcs: [
    { id: 'fearsome-womb', name: 'Fearsome Womb', anime: { start: 1, end: 8 }, summary: 'Yuji Itadori swallows a finger of Ryomen Sukuna and joins Tokyo Jujutsu High.' },
    { id: 'vs-mahito', name: 'Vs. Mahito', anime: { start: 9, end: 13 }, summary: 'Yuji, Nobara and Nanami face the curse Mahito, who can reshape souls.' },
    { id: 'kyoto-goodwill', name: 'Kyoto Goodwill Event', anime: { start: 14, end: 21 }, summary: 'The Tokyo and Kyoto schools hold their exchange tournament, interrupted by curse users.' },
    { id: 'death-painting', name: 'Death Painting', anime: { start: 22, end: 24 }, summary: 'Three Death Painting Wombs are stolen and the fight with Choso begins.' },
    { id: 'hidden-inventory', name: 'Gojo’s Past (Hidden Inventory / Premature Death)', anime: { start: 25, end: 29 }, manga: { start: 65, end: 79 }, summary: 'A flashback to 2006, when Gojo and Geto were students.' },
    { id: 'shibuya', name: 'Shibuya Incident', anime: { start: 31, end: 47 }, summary: 'On 31 October 2018 Kenjaku’s plan to seal Gojo in Shibuya Station goes into motion.' },
    { id: 'culling-game', name: 'Culling Game', anime: { start: 48, end: 59 }, summary: 'Kenjaku turns Japan’s colonies into a death-match arena.' },
    { id: 'shinjuku', name: 'Shinjuku Showdown', manga: { start: 222, end: 271 }, summary: 'The final confrontation with Sukuna, which the anime has not reached.', spoiler: 'gojo-sukuna' },
  ],
  powerSystems: [
    {
      id: 'cursed-energy', name: 'Cursed energy',
      summary: 'Negative emotion that leaks from humans becomes cursed energy. Curses are made of it, and sorcerers learn to channel it, so the same fuel powers both sides of the fight.',
      rules: ['Sorcerers reinforce their bodies with cursed energy to hit harder and survive more.', 'Each person’s cursed energy is limited, so reserves are a real constraint in long fights.', 'Reverse cursed technique turns cursed energy into positive energy, which heals.'],
      limits: ['Output has to be shaped by skill; raw reserves do not guarantee control.'],
      introduced: { ch: 1, ep: 1 },
    },
    {
      id: 'domain-expansion', name: 'Domain Expansion',
      summary: 'A barrier that traps targets in the caster’s innate domain, where the caster’s technique is guaranteed to hit.',
      rules: ['Domains guarantee the effect of the caster’s technique on everyone inside.', 'A domain can be countered by another domain, by domain amplification or by simple domain.', 'Casting one burns out the caster’s cursed technique for a short while.'],
      limits: ['Most sorcerers can cast a domain only once before the technique burns out.', 'Barrierless domains trade a stronger effect for a weaker enclosure.'],
      introduced: { ch: 15, ep: 7 },
    },
    {
      id: 'black-flash', name: 'Black Flash',
      summary: 'A strike that lands cursed energy within a hair of impact distorts space and flashes black, multiplying the blow’s power.',
      rules: ['The cursed energy must hit within 0.000001 seconds of the physical impact.', 'Landing one is said to leave the user in a state of heightened cursed-energy control.'],
      limits: ['It cannot be forced on demand; the timing is the whole difficulty.'],
      introduced: { ch: 48, ep: 19 },
    },
  ],
  cast: [
    { id: 'gojo', name: 'Satoru Gojo', profile: 'gojo-satoru' },
    { id: 'yuji', name: 'Yuji Itadori', profile: 'yuji-itadori' },
    { id: 'megumi', name: 'Megumi Fushiguro', profile: 'megumi-fushiguro' },
    { id: 'sukuna', name: 'Ryomen Sukuna', profile: 'ryomen-sukuna' },
    { id: 'geto', name: 'Suguru Geto' },
    { id: 'toji', name: 'Toji Fushiguro' },
    { id: 'kenjaku', name: 'Kenjaku' },
    { id: 'yuta', name: 'Yuta Okkotsu' },
    { id: 'nobara', name: 'Nobara Kugisaki' },
    { id: 'tsumiki', name: 'Tsumiki Fushiguro' },
    { id: 'choso', name: 'Choso' },
    { id: 'jogo', name: 'Jogo' },
    { id: 'mahito', name: 'Mahito' },
    { id: 'wasuke', name: 'Wasuke Itadori' },
    { id: 'hana', name: 'Hana Kurusu' },
  ],
  relationships: [
    {
      id: 'gojo-yuji', a: 'gojo', b: 'yuji', type: 'mentor', roles: { a: 'teacher', b: 'student' },
      summary: 'Gojo stops Yuji’s execution at the start of the story and becomes his teacher.',
      evolution: [
        { stage: 'The execution that was postponed', text: 'In chapter 2 Gojo explains that Yuji is to be executed once he has swallowed all twenty of Sukuna’s fingers, then argues for the delay: Yuji’s use is as a vessel, and Gojo wants to see how he handles it.', ref: { ch: 2, ep: 1 } },
        { stage: 'Teaching Domain Expansion', text: 'Gojo takes Yuji to face Jogo and shows him a domain from the inside, a lesson Yuji could not have had from anyone else.', ref: { ch: 15, ep: 7 } },
        { stage: 'After Shibuya', text: 'Gojo is sealed in the Prison Realm while Yuji is carrying the weight of the Shibuya deaths, and Yuji’s determination to free him drives much of the Culling Game.', spoiler: 'season-2', ref: { ch: 90, ep: 33 } },
        { stage: 'Letting go of his dream', text: 'Before the Shinjuku fight, Gojo tells Yuji he hopes the next generation will go further than him. Yuji carries that talk into the final fight.', spoiler: 'gojo-sukuna', ref: { ch: 271 } },
      ],
    },
    {
      id: 'gojo-megumi', a: 'gojo', b: 'megumi', type: 'mentor', roles: { a: 'guardian and teacher', b: 'student' },
      summary: 'Gojo stepped in after Megumi’s parents were gone and taught him at Tokyo Jujutsu High.',
      evolution: [
        { stage: 'The guardian', text: 'Gojo had the college look after Megumi and his stepsister Tsumiki instead of letting Megumi go to the Zenin clan.', ref: { ch: 210 }, spoiler: 'culling-game' },
        { stage: 'The teacher', text: 'Megumi is one of the first-year students Gojo teaches at Tokyo Jujutsu High.', ref: { ch: 3, ep: 2 } },
      ],
    },
    {
      id: 'gojo-geto', a: 'gojo', b: 'geto', type: 'friend', roles: { a: 'best friend', b: 'best friend' },
      summary: 'Gojo and Geto were classmates and close friends who parted ways over what jujutsu is for.',
      evolution: [
        { stage: 'Students', text: 'The Hidden Inventory arc shows the two as the school’s strongest pair in 2006.', ref: { ch: 69, ep: 26 } },
        { stage: 'The parting', text: 'Geto leaves the jujutsu world and Gojo later kills him. The prequel Jujutsu Kaisen 0 tells that story.', ref: { other: 'Jujutsu Kaisen 0' } },
        { stage: 'Shibuya', text: 'Kenjaku uses Geto’s body to seal Gojo in the Prison Realm, putting Gojo’s lost friend in front of him at the worst moment.', spoiler: 'season-2', ref: { ch: 90, ep: 33 } },
      ],
    },
    {
      id: 'gojo-sukuna', a: 'gojo', b: 'sukuna', type: 'enemy', roles: { a: 'rival', b: 'rival' },
      summary: 'The strongest living sorcerer and the strongest curse ever recorded meet three times: a brief test in chapter 2, a taunt in chapter 3, and a final fight.',
      evolution: [
        { stage: 'First meeting', text: 'Sukuna takes control of Yuji’s body for ten seconds in front of Gojo, who tests Yuji’s will, and Yuji takes the body back.', ref: { ch: 2, ep: 1 } },
        { stage: 'The Shinjuku fight', text: 'After Gojo is unsealed, he fights Sukuna on 24 December 2018. The fight runs from chapter 223 to 236 and has a decisive result.', spoiler: 'gojo-sukuna', ref: { ch: 223 } },
      ],
    },
    {
      id: 'gojo-toji', a: 'gojo', b: 'toji', type: 'enemy', roles: { a: 'target', b: 'assassin' },
      summary: 'In 2006 Toji Fushiguro nearly kills Gojo, and the wound pushes Gojo into mastering reverse cursed technique.',
      evolution: [
        { stage: 'First fight', text: 'Toji impales Gojo, who survives by reinforcing his body.', ref: { ch: 71, ep: 27 } },
        { stage: 'Rematch', text: 'Gojo returns having learned reverse cursed technique and kills Toji.', ref: { ch: 74, ep: 28 } },
      ],
      spoiler: 'season-2',
    },
    {
      id: 'gojo-kenjaku', a: 'gojo', b: 'kenjaku', type: 'enemy', roles: { a: 'target', b: 'planner' },
      summary: 'Kenjaku builds the Shibuya Incident around a single goal: take Gojo out of the fight.',
      evolution: [
        { stage: 'The seal', text: 'Using Geto’s body, Kenjaku seals Gojo inside the Prison Realm.', ref: { ch: 90, ep: 33 } },
      ],
      spoiler: 'season-2',
    },
    {
      id: 'gojo-yuta', a: 'gojo', b: 'yuta', type: 'mentor', roles: { a: 'teacher', b: 'student' },
      summary: 'Gojo was Yuta’s teacher, and Yuta later inherits his position.',
      evolution: [
        { stage: 'Preparing a successor', text: 'Before the Shinjuku fight, Gojo discusses a last-resort plan with Yuta in case he dies, and Yuta tells him bluntly that he will take over.', ref: { ch: 223 }, spoiler: 'gojo-sukuna' },
        { stage: 'Fighting in his place', text: 'In the final stretch of the Shinjuku fight, Yuta turns out to be fighting Sukuna from inside Gojo’s body.', ref: { ch: 261 }, spoiler: 'shinjuku' },
      ],
      spoiler: 'culling-game',
    },
    {
      id: 'yuji-sukuna', a: 'yuji', b: 'sukuna', type: 'enemy', roles: { a: 'vessel', b: 'resident curse' },
      summary: 'Sukuna lives inside Yuji, and the two speak inside Yuji’s innate domain.',
      evolution: [
        { stage: 'Swallowing the finger', text: 'Yuji eats a finger to save Megumi and Sukuna wakes up in him.', ref: { ch: 1, ep: 1 } },
        { stage: 'The deal', text: 'After Sukuna rips out Yuji’s heart, the two meet in Sukuna’s domain, where Sukuna offers to bring Yuji back in exchange for a minute of control whenever Yuji chants. Yuji is revived without remembering the terms.', ref: { ch: 11, ep: 6 } },
        { stage: 'No longer a vessel', text: 'Sukuna moves to a new body, and the story from then on is Yuji’s attempt to take him down.', ref: { ch: 216 }, spoiler: 'culling-game' },
      ],
    },
    {
      id: 'yuji-megumi', a: 'yuji', b: 'megumi', type: 'friend', roles: { a: 'classmate', b: 'classmate' },
      summary: 'Megumi saves Yuji in chapter 1 and then spends the story pushing back against him, and fighting beside him.',
      evolution: [
        { stage: 'Competitive classmates', text: 'After the Kyoto event Megumi tells Yuji he will surpass him.', ref: { ch: 53, ep: 21 } },
        { stage: 'A body to save', text: 'Sukuna takes Megumi’s body, and the question the story asks changes from stopping Sukuna to saving his friend.', ref: { ch: 216 }, spoiler: 'culling-game' },
      ],
    },
    {
      id: 'yuji-nobara', a: 'yuji', b: 'nobara', type: 'friend', roles: { a: 'classmate', b: 'classmate' },
      summary: 'Yuji, Megumi and Nobara form the first-year team.',
      evolution: [{ stage: 'First-years', text: 'The trio are classmates from the first weeks of the story.', ref: { ch: 3, ep: 2 } }],
    },
    {
      id: 'yuji-choso', a: 'choso', b: 'yuji', type: 'family', kin: 'sibling', roles: { a: 'older brother', b: 'younger brother' },
      summary: 'Choso, a Death Painting, considers Yuji his younger brother. Yuji later introduces Choso as his older brother.',
      evolution: [
        { stage: 'An enemy at first', text: 'Choso appears as an opponent in the Death Painting arc.', ref: { ep: 22 } },
        { stage: 'A brother', text: 'Yuji introduces Choso as his older brother.', ref: { ch: 144 }, spoiler: 'season-3' },
        { stage: 'The cost', text: 'Choso protects Yuji from Sukuna’s Divine Flame at the cost of his own life.', ref: { ch: 259 }, spoiler: 'shinjuku' },
      ],
    },
    {
      id: 'yuji-wasuke', a: 'wasuke', b: 'yuji', type: 'family', kin: 'parent', roles: { a: 'grandfather', b: 'grandson' },
      summary: 'Wasuke raised Yuji. His dying wish — that Yuji die surrounded by people — shapes Yuji’s choices.',
      evolution: [{ stage: 'The last words', text: 'Wasuke’s advice at his deathbed is the reason Yuji tries to help others.', ref: { ch: 1, ep: 1 } }],
    },
    {
      id: 'megumi-tsumiki', a: 'tsumiki', b: 'megumi', type: 'family', kin: 'sibling', roles: { a: 'stepsister', b: 'stepbrother' },
      summary: 'Tsumiki is Megumi’s stepsister, and his reason for becoming a sorcerer.',
      evolution: [
        { stage: 'Family', text: 'Their parents married when Megumi was in elementary school.', ref: { ch: 210 }, spoiler: 'culling-game' },
        { stage: 'The Culling Game', text: 'Rescuing her is what pushes Megumi to keep advancing his Ten Shadows Technique during the Culling Game.', ref: { other: 'Culling Game arc' }, spoiler: 'season-3' },
      ],
    },
    {
      id: 'megumi-toji', a: 'toji', b: 'megumi', type: 'family', kin: 'parent', roles: { a: 'father', b: 'son' },
      summary: 'Toji, an assassin known as the Sorcerer Killer, is Megumi’s father.',
      evolution: [{ stage: 'A last piece of information', text: 'With his dying words, Toji tells Gojo that Megumi will be sold to the Zenin clan, leaving Gojo to decide what to do with that.', ref: { ch: 75, ep: 28 } }],
      spoiler: 'season-2',
    },
    {
      id: 'megumi-sukuna', a: 'sukuna', b: 'megumi', type: 'enemy', roles: { a: 'possessor', b: 'host' },
      summary: 'Sukuna wants Megumi’s Ten Shadows Technique and ends up wearing his body.',
      evolution: [
        { stage: 'First threat', text: 'Sukuna fights Megumi for control of Yuji’s body.', ref: { ch: 9, ep: 5 } },
        { stage: 'The switch', text: 'Kenjaku brings Sukuna to Megumi’s body in the Culling Game.', ref: { ch: 216 }, spoiler: 'culling-game' },
        { stage: 'The soul fights back', text: 'While Sukuna fights Gojo, Megumi’s soul carries the burden of Mahoraga’s adaptation.', ref: { ch: 229 }, spoiler: 'gojo-sukuna' },
      ],
    },
  ],
  timeline: [
    { id: 'hidden-inventory', title: 'Hidden Inventory: Gojo and Geto protect Riko Amanai', summary: 'Two students serve as bodyguards for a Star Plasma Vessel; the mission ends in Gojo’s first brush with death.', kind: 'arc', characters: ['gojo', 'geto', 'toji'], when: 'Summer 2006', storyOrder: 10, anime: { ep: 25 }, manga: { ch: 65 }, arc: 'hidden-inventory', spoiler: 'season-2' },
    { id: 'gojo-rct', title: 'Gojo masters reverse cursed technique and defeats Toji', summary: 'After Toji nearly kills him, Gojo learns reverse cursed technique, which unlocks Red and Hollow Purple.', kind: 'transformation', characters: ['gojo', 'toji'], when: 'Summer 2006', storyOrder: 20, anime: { ep: 28 }, manga: { ch: 74 }, arc: 'hidden-inventory', spoiler: 'season-2' },
    { id: 'geto-parting', title: 'Geto leaves the jujutsu world', summary: 'The gap between Gojo and Geto leads to a final fight that Jujutsu Kaisen 0 tells in full.', kind: 'milestone', characters: ['gojo', 'geto'], when: 'December 2017', storyOrder: 30, anime: { other: 'Jujutsu Kaisen 0 film' }, manga: { other: 'Jujutsu Kaisen 0' }, spoiler: 'season-1' },
    { id: 'yuji-swallows-finger', title: 'Yuji swallows Sukuna’s finger', summary: 'To save Megumi from a curse, Yuji eats a finger of the King of Curses and wakes Sukuna inside himself.', kind: 'milestone', characters: ['yuji', 'megumi', 'sukuna'], when: '2018', storyOrder: 40, anime: { ep: 1 }, manga: { ch: 1 }, arc: 'fearsome-womb' },
    { id: 'execution-delayed', title: 'Gojo postpones Yuji’s execution', summary: 'Gojo explains that Yuji is to be executed after the last finger, then argues for a delay.', kind: 'milestone', characters: ['gojo', 'yuji', 'sukuna'], when: '2018', storyOrder: 50, anime: { ep: 1 }, manga: { ch: 2 }, arc: 'fearsome-womb' },
    { id: 'yuji-revival', title: 'Yuji dies and is revived', summary: 'Sukuna takes control of Yuji’s body, tears out his heart to stop him from taking it back, and Yuji dies in chapter 9. In Sukuna’s domain Sukuna offers a deal, and Yuji wakes up in the morgue in chapter 11 with no memory of the terms.', kind: 'death', characters: ['yuji', 'sukuna', 'megumi'], when: '2018', storyOrder: 60, anime: { ep: 5 }, manga: { ch: 9 }, arc: 'fearsome-womb', spoiler: 'season-1' },
    { id: 'gojo-vs-jogo', title: 'Gojo shows Yuji a domain from inside', summary: 'Gojo takes Yuji to face the special-grade curse Jogo and uses Unlimited Void.', kind: 'battle', characters: ['gojo', 'yuji'], when: '2018', storyOrder: 70, anime: { ep: 7 }, manga: { ch: 15 }, arc: 'fearsome-womb' },
    { id: 'shibuya-seal', title: 'Gojo is sealed in the Prison Realm', summary: 'On 31 October 2018 Kenjaku, using Geto’s body, seals Gojo in the Prison Realm.', kind: 'death', characters: ['gojo', 'geto', 'kenjaku'], when: '31 October 2018', storyOrder: 90, anime: { ep: 33 }, manga: { ch: 90 }, arc: 'shibuya', spoiler: 'season-2' },
    { id: 'culling-game-start', title: 'The Culling Game begins', summary: 'Kenjaku turns ten colonies into a death-match arena, and Megumi enters the game to save Tsumiki.', kind: 'arc', characters: ['yuji', 'megumi', 'kenjaku', 'tsumiki'], when: 'November 2018', storyOrder: 100, anime: { ep: 48 }, arc: 'culling-game', spoiler: 'season-3' },
    { id: 'sukuna-takes-megumi', title: 'Sukuna moves into Megumi’s body', summary: 'After Yuji eats the last finger, Kenjaku takes Sukuna to Megumi’s body.', kind: 'transformation', characters: ['sukuna', 'megumi', 'yuji'], when: 'December 2018', storyOrder: 110, manga: { ch: 216 }, arc: 'culling-game', spoiler: 'culling-game' },
    { id: 'gojo-unsealed', title: 'Gojo is unsealed', summary: 'Gojo leaves the Prison Realm, and the Shinjuku showdown is set for the 24th.', kind: 'reveal', characters: ['gojo', 'sukuna'], when: 'December 2018', storyOrder: 120, manga: { ch: 221 }, arc: 'culling-game', spoiler: 'culling-game' },
    { id: 'gojo-vs-sukuna', title: 'Gojo vs. Sukuna', summary: 'The strongest sorcerer and the King of Curses fight on 24 December 2018.', kind: 'battle', characters: ['gojo', 'sukuna', 'megumi'], when: '24 December 2018', storyOrder: 130, manga: { ch: 223 }, arc: 'shinjuku', spoiler: 'gojo-sukuna' },
    { id: 'gojo-death', title: 'Gojo is killed by Sukuna', summary: 'Sukuna adapts the world-cutting slash to cut through Infinity and defeats Gojo at the end of chapter 236.', kind: 'death', characters: ['gojo', 'sukuna'], when: '24 December 2018', storyOrder: 140, manga: { ch: 236 }, arc: 'shinjuku', spoiler: 'gojo-sukuna' },
    { id: 'choso-death', title: 'Choso dies protecting Yuji', summary: 'Choso shields Yuji from Sukuna’s Divine Flame.', kind: 'death', characters: ['choso', 'yuji', 'sukuna'], when: '25 December 2018', storyOrder: 150, manga: { ch: 259 }, arc: 'shinjuku', spoiler: 'shinjuku' },
    { id: 'yuta-in-gojo', title: 'Yuta fights in Gojo’s body', summary: 'The figure that looks like Gojo turns out to be Yuta, whose brain was moved into Gojo’s body with Kenjaku’s technique.', kind: 'reveal', characters: ['yuta', 'gojo', 'sukuna', 'yuji'], when: '25 December 2018', storyOrder: 160, manga: { ch: 261 }, arc: 'shinjuku', spoiler: 'shinjuku' },
    { id: 'sukuna-defeated', title: 'Sukuna is defeated', summary: 'Yuji’s Black Flash in chapter 267 ends the fight, and Sukuna dies in chapter 268 after refusing Yuji’s offer to let him live inside him.', kind: 'death', characters: ['yuji', 'sukuna', 'megumi'], when: '25 December 2018', storyOrder: 170, manga: { ch: 268 }, arc: 'shinjuku', spoiler: 'finale' },
  ],
  faq: [
    { question: 'Has the Jujutsu Kaisen anime caught up with the manga?', answer: 'No. The manga ended at chapter 271 in 2024, while the anime has covered chapters 1–181 across three seasons. A fourth season, Culling Game Part 2, was announced without a release date.' },
    { question: 'Where should I start reading the manga after the anime?', answer: 'Begin at chapter 182, where season 3 stops. The AnimeSparks manga chapter finder lists the exact chapters each episode adapts.' },
  ],
};
