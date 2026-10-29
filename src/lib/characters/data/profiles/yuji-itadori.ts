import type { CharacterProfile } from '../../types.ts';

export const yujiItadori: CharacterProfile = {
  slug: 'yuji-itadori',
  id: 'yuji',
  series: 'jujutsu-kaisen',
  name: 'Yuji Itadori',
  native: '虎杖悠仁 (Itadori Yūji)',
  aliases: ['Itadori', 'Sukuna’s vessel'],
  role: 'First-year student at Tokyo Jujutsu High and Sukuna’s vessel',
  affiliations: ['Tokyo Jujutsu High'],
  abilityTags: ['Black Flash', 'Superhuman strength', 'Vessel of Sukuna'],
  overview: 'Yuji Itadori is the protagonist of Jujutsu Kaisen: a high-school athlete with exceptional physical ability who swallows a cursed finger to save a classmate and ends up sharing his body with the King of Curses. The story follows what he decides to do with a life that was supposed to be forfeit.',
  facts: [
    { label: 'Birthday', value: 'March 20', confidence: 'confirmed', ref: { other: 'Official Fanbook' } },
    { label: 'Age', value: '15 when the story begins', confidence: 'confirmed', ref: { other: 'Official Fanbook' } },
    { label: 'Height', value: '173 cm (5 ft 8 in)', confidence: 'confirmed', ref: { other: 'Volume 1 profile' } },
    { label: 'Affiliation', value: 'Tokyo Jujutsu High (first-year)', confidence: 'confirmed' },
    { label: 'Family', value: 'Raised by his grandfather Wasuke; his parentage is a spoiler', confidence: 'confirmed', ref: { ch: 1, ep: 1 } },
    { label: 'Cursed technique', value: 'None of his own, at the start', confidence: 'confirmed', ref: { ch: 12 }, note: 'Gojo tells Yuji early on that he cannot use a technique.' },
    { label: 'Vessel of', value: 'Ryomen Sukuna', confidence: 'confirmed', ref: { ch: 1, ep: 1 } },
    { label: 'Debut', value: 'Manga chapter 1, anime episode 1', confidence: 'confirmed' },
    { label: 'Voice actors', value: 'Junya Enoki (Japanese); Adam McArthur (English)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'A high-schooler with unusual strength',
      text: 'Yuji lives with his grandfather in Sendai and belongs to the Occult Research Club for convenience, even though he is the school’s best at sports. His grandfather’s dying advice, to help others and to die surrounded by people, is the line he repeats whenever he needs a reason to act.',
      ref: { ch: 1, ep: 1 },
    },
    {
      heading: 'The finger',
      text: 'When Megumi Fushiguro arrives at Yuji’s school looking for a cursed object, Yuji’s club has already broken its seal, and a curse targets Megumi. To give himself enough cursed energy to rescue Megumi, Yuji eats the object, one of Sukuna’s twenty fingers. That incarnates Sukuna in his body. Yuji takes control back within seconds, which is why the jujutsu world does not simply kill him on the spot.',
      ref: { ch: 1, ep: 1 },
    },
    {
      heading: 'Joining Jujutsu High',
      text: 'Gojo stops Yuji’s execution and puts him in the first-year class with Megumi and Nobara Kugisaki. Yuji is told he cannot use a cursed technique, so his first lessons go to cursed-energy control and hand-to-hand fighting, and he learns his limits quickly: he is physically strong enough to be useful, but he is also the one fighting with Sukuna just under his skin.',
      ref: { ch: 12 },
    },
    {
      heading: 'His death and return',
      text: 'In chapter 9 Sukuna tears out Yuji’s heart to stop Yuji from taking his body back. Yuji dies, but in Sukuna’s domain the two make a deal and Yuji wakes up in the morgue in chapter 11 with no memory of its terms. The records list him as dead for a time, so that Gojo can train him in secret.',
      ref: { ch: 11, ep: 6 },
      spoiler: 'season-1',
    },
    {
      heading: 'Shibuya',
      text: 'Yuji enters Shibuya as part of the rescue effort for Gojo. When he is pushed to the edge, Sukuna takes control of his body, and the toll on the people of Shibuya becomes the weight Yuji carries into every later arc.',
      spoiler: 'season-2',
    },
    {
      heading: 'The Culling Game',
      text: 'After Shibuya the Culling Game turns the rest of the story into a search for ways to stop Sukuna. Late in the Culling Game Sukuna moves into Megumi’s body, which changes Yuji’s goal from containing Sukuna to getting his friend back.',
      spoiler: 'culling-game',
      ref: { ch: 216 },
    },
    {
      heading: 'The final fight',
      text: 'Yuji, with the sorcerers who remain, fights Sukuna in Shinjuku. In chapter 267 a Black Flash breaks the fight open, and in chapter 268 Sukuna dies. Yuji survives, as does Megumi, and the manga ends with Yuji back in an ordinary mission with Megumi and Nobara.',
      spoiler: 'finale',
      ref: { ch: 268 },
    },
  ],
  personality: [
    {
      heading: 'Kind, direct and hard to rattle',
      text: 'Yuji is cheerful and unguarded. He trusts quickly, eats everything, and is not afraid to look foolish in front of the people he is trying to help. What stands out is that he keeps the same warmth in fights, and that he does not treat Sukuna as a monster to be hated but as someone he is stuck with.',
    },
    {
      heading: 'Where the cheerfulness breaks',
      text: 'The series puts Yuji under steady pressure: he lives with a being that wants to kill the people he loves. The story shows his guilt over deaths he could not prevent, and the times he asks Sukuna for help and is refused cost him more than a defeat does.',
      spoiler: 'season-1',
      ref: { ch: 27, ep: 12 },
    },
  ],
  development: [
    {
      heading: 'From borrowed reasons to his own',
      text: 'Yuji begins acting out of his grandfather’s words, not because he has a goal of his own. The long arc of the series moves him to a conviction he can state himself: in the final stretch he explains to Sukuna how his thinking about what his life is for has changed. The author uses Sukuna, an opponent who cannot be moved by that speech, to show that Yuji’s change matters to him rather than to his enemy.',
      spoiler: 'finale',
      ref: { ch: 265 },
    },
  ],
  motivations: [
    'Helping others, as his grandfather asked.',
    'Not letting Sukuna hurt the people around him.',
    'Rescuing Megumi from Sukuna and ending the cycle of curses.',
  ],
  abilities: [
    {
      id: 'physical', name: 'Exceptional physical ability', kind: 'innate',
      summary: 'Yuji can throw a lead ball far enough to bend a soccer goalpost and cover 50 metres in about three seconds before any jujutsu training.',
      strengths: ['Makes him an unusually strong fighter without cursed energy.', 'A foundation for Black Flash, which rewards precise timing of strikes.'],
      limits: ['Physical strength alone does not hurt higher-grade curses, so he depends on cursed-energy reinforcement.'],
      introduced: { ch: 1, ep: 1 }, confidence: 'confirmed',
    },
    {
      id: 'vessel', name: 'Vessel of Sukuna', kind: 'innate',
      summary: 'Yuji can survive Sukuna’s presence and the swallowing of Sukuna’s fingers, and he can take his body back after Sukuna takes control.',
      strengths: ['The reason the jujutsu world needs him alive.', 'Allows him to contain Sukuna while Sukuna is supposed to be sealed.'],
      limits: ['Sukuna can take control for short stretches.', 'Each additional finger strengthens Sukuna.'],
      introduced: { ch: 1, ep: 1 }, confidence: 'confirmed',
    },
    {
      id: 'black-flash', name: 'Black Flash', native: '黒閃 (Kokusen)', kind: 'skill', system: 'black-flash',
      summary: 'A strike in which cursed energy lands within a hair of the impact and flashes black. Yuji’s ability to land it repeatedly becomes one of his signature skills.',
      strengths: ['Raises the damage of a hit well above normal.', 'In the final fight Yuji lands it several times, which the story shows strengthening his control.'],
      limits: ['Depends on near-perfect timing.'],
      introduced: { ch: 48, ep: 19 }, confidence: 'confirmed',
    },
    {
      id: 'blood-manipulation', name: 'Blood manipulation (Convergence and Piercing Blood)', kind: 'technique',
      summary: 'After absorbing Death Painting wombs, Yuji is engraved with blood manipulation, the technique used by Choso, whom he calls his brother.',
      strengths: ['Piercing Blood fires compressed blood at high speed.'],
      limits: ['Yuji was not yet able to perform the full Convergence when first shown.'],
      introduced: { ch: 256 }, confidence: 'confirmed', spoiler: 'shinjuku',
    },
    {
      id: 'shrine', name: 'Shrine and Dismantle', native: '御廚子 / 解', kind: 'technique',
      summary: 'After landing a Black Flash on Sukuna, Yuji draws out Sukuna’s own cursed technique, engraved in his body. He uses a variant of Dismantle on the boundary between Sukuna’s soul and Megumi’s.',
      strengths: ['Used with a binding vow, it separates Sukuna and Megumi’s souls more precisely than a punch.'],
      limits: ['Yuji’s version is different from Sukuna’s and was first limited to touch.'],
      introduced: { ch: 263 }, confidence: 'confirmed', spoiler: 'shinjuku',
    },
  ],
  battles: [
    {
      id: 'vs-sukuna-ch9', title: 'Yuji vs. Sukuna for control', opponents: ['Ryomen Sukuna'], outcome: 'Yuji takes his body back, then dies; the two meet in Sukuna’s domain.',
      summary: 'Sukuna takes over Yuji’s body to fight Megumi, who loses several shikigami before Yuji retakes control. Sukuna tears out Yuji’s heart to stop him.',
      ref: { ch: 9, ep: 5 }, event: 'yuji-revival', spoiler: 'season-1',
    },
    {
      id: 'vs-mahito', title: 'Yuji vs. Mahito', opponents: ['Mahito'], outcome: 'Sukuna intervenes against Mahito; Mahito survives.',
      summary: 'Yuji finds the curse who killed Junpei Yoshino, and the fight ends with Sukuna wounding Mahito after Mahito touches his soul.',
      ref: { ch: 30, ep: 13 }, spoiler: 'season-1',
    },
    {
      id: 'final', title: 'Yuji and allies vs. Sukuna', opponents: ['Ryomen Sukuna'], outcome: 'Sukuna is defeated and dies in chapter 268.',
      summary: 'In Shinjuku a team of sorcerers fights Sukuna for Megumi’s body. Yuji’s Black Flash in chapter 267 ends the fight.',
      ref: { ch: 267 }, event: 'sukuna-defeated', spoiler: 'finale',
    },
  ],
  status: {
    manga: { state: 'alive', label: 'Alive' },
    anime: { state: 'alive', label: 'Alive' },
    summary: 'Yuji survives the story. He does die once, in chapter 9, and is revived in chapter 11 with the records listing him as dead for a time.',
    spoiler: 'finale',
    events: [
      {
        id: 'death-and-revival', kind: 'revival', title: 'Killed by Sukuna, then revived',
        cause: 'Sukuna removes Yuji’s heart to stop Yuji taking back his body.',
        circumstances: 'After the fight with Megumi, Yuji dies in chapter 9. In Sukuna’s domain the two fight, Sukuna offers a deal, and Yuji wakes up in the college morgue in chapter 11 with no memory of the terms.',
        significance: 'It establishes the contract between Yuji and Sukuna, and the college keeps Yuji officially dead so Gojo can train him.',
        anime: { ep: 6 }, manga: { ch: 11 }, spoiler: 'season-1',
      },
    ],
  },
  adaptation: [
    { topic: 'How far the anime goes', anime: 'Yuji’s story reaches the middle of the Culling Game (episode 59, manga chapter 181).', manga: 'The manga continues through the Shinjuku fight to the finale in chapter 271.', spoiler: 'finale' },
  ],
  appearances: [
    { medium: 'manga', title: 'Jujutsu Kaisen', detail: 'Protagonist, from chapter 1.' },
    { medium: 'anime', title: 'Jujutsu Kaisen seasons 1–3', detail: 'Episodes 1–59', animeSlug: 'jujutsu-kaisen' },
  ],
  unconfirmed: [
    'The story does not describe what Yuji does after the final chapter beyond a mission with Megumi and Nobara.',
  ],
  faq: [
    { question: 'Does Yuji die in Jujutsu Kaisen?', answer: 'He dies once, in chapter 9, and is brought back in chapter 11. He survives the story.', spoiler: 'season-1' },
    { question: 'Can Yuji use a cursed technique?', answer: 'He has none of his own at the start. Gojo tells him so early in the story. Later chapters show him using techniques engraved into him; those are spoilers for the late manga.' },
    { question: 'What is Black Flash and does Yuji use it?', answer: 'It is a strike in which cursed energy lands almost exactly with the impact and flashes black. Yuji lands it several times, and the final fight turns on it.' },
  ],
  related: ['gojo-satoru', 'megumi-fushiguro', 'ryomen-sukuna'],
  articleKeys: ['Itadori'],
  seo: {
    title: 'Yuji Itadori: Abilities, Sukuna Deal and Timeline (Spoiler-Safe)',
    description: 'Yuji Itadori explained with verified chapter and episode references: his strength, Black Flash, the deal with Sukuna, relationships and a spoiler-protected tracker.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Manga chapters 1–271 (complete) and anime episodes 1–59',
    sources: [
      { name: 'Jujutsu Kaisen manga by Gege Akutami (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'Jujutsu Kaisen anime (MAPPA), episodes 1–59', covers: 'Episode numbers and mapping.' },
      { name: 'Jujutsu Kaisen Wiki on Fandom, “Yuji Itadori” and subpages', url: 'https://jujutsu-kaisen.fandom.com/wiki/Yuji_Itadori', covers: 'Chapter and episode citations used for cross-checking; no text copied.' },
      { name: 'Jujutsu Kaisen Official Fanbook (cited by the wiki)', covers: 'Birthday and age.' },
    ],
  },
};
