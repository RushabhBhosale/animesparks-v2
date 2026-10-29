import type { CharacterProfile } from '../../types.ts';

export const portgasDAce: CharacterProfile = {
  slug: 'portgas-d-ace',
  id: 'ace',
  series: 'one-piece',
  name: 'Portgas D. Ace',
  native: 'ポートガス・D・エース (Pōtogasu Dī Ēsu)',
  aliases: ['Ace', 'Fire Fist Ace'],
  role: 'Whitebeard Pirates commander and Luffy’s sworn older brother',
  affiliations: ['Whitebeard Pirates', 'Spade Pirates (former)'],
  abilityTags: ['Mera Mera no Mi', 'Logia', 'Conqueror’s Haki'],
  overview: 'Portgas D. Ace is Luffy’s older sworn brother, a pirate who left his own crew to join the Whitebeard Pirates and eats the fire-based Mera Mera no Mi. He is introduced in the Arabasta arc as a name the Straw Hats have never heard, and his story becomes one of the most-discussed in the series.',
  facts: [
    { label: 'Birthday', value: 'January 1', confidence: 'confirmed', ref: { other: 'SBS, volume 48' }, note: 'Taken from his name: Ace is the first card in the deck.' },
    { label: 'Height', value: '185 cm (6 ft 1 in), at age 20', confidence: 'confirmed', ref: { other: 'SBS, volume 48' } },
    { label: 'Devil Fruit', value: 'Mera Mera no Mi (a Logia-type fire fruit)', confidence: 'confirmed' },
    { label: 'Affiliation', value: 'Whitebeard Pirates; formerly the Spade Pirates', confidence: 'confirmed', ref: { ch: 552, ep: 461 } },
    { label: 'Sworn brothers', value: 'Luffy and Sabo', confidence: 'confirmed', ref: { ch: 585, ep: 496 }, spoiler: 'marineford' },
    { label: 'Parents', value: 'Gol D. Roger and Portgas D. Rouge', confidence: 'confirmed', ref: { ch: 550, ep: 459 }, spoiler: 'marineford' },
    { label: 'Age at death', value: '20', confidence: 'confirmed', ref: { other: 'SBS, volume 48' }, spoiler: 'marineford' },
    { label: 'First named in the story', value: 'Manga chapter 159; anime episode 95', confidence: 'confirmed' },
    { label: 'Voice actors', value: 'Toshio Furukawa (Japanese); Chris Cason (English, Funimation)', confidence: 'confirmed' },
  ],
  biography: [
    {
      heading: 'Luffy’s brother',
      text: 'The Straw Hats first hear of Ace during the Arabasta arc, when they learn that Luffy has a sworn older brother. Ace is a pirate who left the Spade Pirates he founded and joined Whitebeard’s crew, and Luffy’s admiration for him is open: he tells people Ace is his brother, and Ace tells everyone he meets about Luffy’s reckless adventures.',
      ref: { ch: 159, ep: 95 },
    },
    {
      heading: 'Chasing Blackbeard',
      text: 'Ace spends the period before Marineford hunting Marshall D. Teach, Blackbeard, a former Whitebeard Pirate. In chapter 441 he warns Blackbeard that he will make Whitebeard the Pirate King. Ace loses and is delivered to the Marines, and in chapter 526 Luffy’s allies learn that Ace is among the new prisoners of Impel Down.',
      ref: { ch: 441, ep: 325 },
      spoiler: 'skypiea-enies-lobby',
    },
    {
      heading: 'The truth about his father',
      text: 'At Marineford, Sengoku reveals that Ace’s father is Gol D. Roger, the Pirate King, and his mother is Portgas D. Rouge. Garp later recalls that Roger had asked him to adopt Ace. Whitebeard says Ace had turned down an invitation to join the Seven Warlords of the Sea.',
      ref: { ch: 550, ep: 459 },
      spoiler: 'marineford',
    },
    {
      heading: 'Marineford and his death',
      text: 'The Marines intend to execute Ace at Marineford, and a war breaks out over it. Ace is freed, but when Admiral Akainu turns on Luffy, Ace puts himself in front of Luffy and takes the attack. He dies of the wound, an event that the story treats as the turning point of its first half.',
      ref: { ch: 573, ep: 482 },
      spoiler: 'marineford',
    },
    {
      heading: 'After Ace',
      text: 'Ace appears again only in flashbacks, such as the one in which he shares sake cups with Luffy and Sabo and in a flashback with Luffy and Makino. His Mera Mera no Mi is later returned to circulation, which is the term the story uses for a fruit that reappears after its owner’s death.',
      ref: { ch: 585, ep: 496 },
      spoiler: 'marineford',
    },
  ],
  personality: [
    {
      heading: 'Easygoing, proud and protective',
      text: 'Ace is relaxed to the point of falling asleep mid-conversation, and fiercely loyal to the people he has chosen as family. He is dismissive toward Luffy to the point of spitting on him in front of the Marines, and then asks Jinbe to look after him in case he dies.',
      ref: { ch: 582, ep: 493 },
      spoiler: 'marineford',
    },
    {
      heading: 'A man who wants to be Whitebeard’s son',
      text: 'He refuses an invitation to join the Seven Warlords and instead remains with Whitebeard, whom he has said he wants to make Pirate King. His drive comes from wanting to prove his own worth.',
      ref: { ch: 552, ep: 461 },
      spoiler: 'marineford',
    },
  ],
  development: [
    {
      heading: 'A character built to be lost',
      text: 'Ace is introduced late in the first half of the story and given an unusually strong set of relationships, then removed. The story uses his loss to move Luffy from the freedom of a young pirate to the weight of a captain, which is why Ace is one of the most commonly cited “turning points” of the series.',
      spoiler: 'marineford',
    },
  ],
  motivations: [
    'Proving his own worth.',
    'Making Whitebeard the Pirate King.',
    'Protecting his younger brother Luffy.',
  ],
  abilities: [
    {
      id: 'mera-mera', name: 'Mera Mera no Mi', native: 'メラメラの実', kind: 'innate', system: 'devil-fruit',
      summary: 'A Logia-type Devil Fruit that lets Ace create, control and become fire.',
      strengths: ['Fire attacks, including projectiles and large flames.', 'As a Logia, physical attacks pass through his body.'],
      limits: ['Cannot swim, like all Devil Fruit users.', 'Armament Haki and seastone still affect him.'],
      introduced: { other: 'Arabasta arc (episodes 92–130)' }, confidence: 'confirmed',
    },
    {
      id: 'conquerors-haki', name: 'Conqueror’s Haki', native: '覇王色の覇気', kind: 'skill', system: 'haki',
      summary: 'Ace is shown to have Conqueror’s Haki. In a flashback, he knocks out the Bluejam Pirates members with it.',
      strengths: ['Can overpower and knock out groups of opponents.'],
      limits: ['It takes training and uses up spirit.'],
      introduced: { ch: 587, ep: 501 }, confidence: 'confirmed', spoiler: 'marineford',
    },
    {
      id: 'command', name: 'Command and leadership', kind: 'skill',
      summary: 'Ace founded and captained the Spade Pirates before joining Whitebeard’s crew, where he holds command of a division.',
      strengths: ['Earns the loyalty of crews he leads or joins.'],
      limits: ['Not a combat technique: the story shows it through his relationships, not through fights.'],
      introduced: { ch: 552, ep: 461 }, confidence: 'confirmed', spoiler: 'marineford',
    },
  ],
  battles: [
    {
      id: 'vs-blackbeard', title: 'Ace and Blackbeard', opponents: ['Marshall D. Teach'], outcome: 'Ace loses and is delivered to the Marines.',
      summary: 'Ace pursues Teach and warns him at the end of the Enies Lobby aftermath, then ends up in Impel Down.',
      ref: { ch: 526, ep: 422 }, event: 'ace-captured', spoiler: 'marineford',
    },
    {
      id: 'marineford', title: 'The war at Marineford', opponents: ['The Marines'], outcome: 'Ace is freed during the war, then killed.',
      summary: 'The war that begins with Ace’s execution ends with his death.',
      ref: { ch: 573, ep: 482 }, event: 'ace-death', spoiler: 'marineford',
    },
  ],
  status: {
    manga: { state: 'deceased', label: 'Deceased' },
    anime: { state: 'deceased', label: 'Deceased' },
    summary: 'Ace dies at Marineford while protecting Luffy from Admiral Akainu’s attack. He is not revived. He appears afterward only in flashbacks.',
    spoiler: 'marineford',
    events: [
      {
        id: 'ace-death', kind: 'death', title: 'Killed by Akainu at Marineford',
        cause: 'Admiral Akainu’s attack strikes through him.',
        circumstances: 'Ace sacrifices his own life to protect Luffy during the war at Marineford, in chapter 573 (episode 482).',
        significance: 'It is the central loss of the first half of the story and shapes Luffy’s decisions after the time skip.',
        anime: { ep: 482 }, manga: { ch: 573 }, spoiler: 'marineford',
        adaptation: 'The anime softens the scene: Ace’s beaded necklace breaks and he is covered in less blood, with the smoke from the wound omitted. In the manga and the specials, the necklace stays intact.',
      },
    ],
  },
  adaptation: [
    { topic: 'The death scene', anime: 'Ace’s necklace breaks and one bead rolls to Whitebeard’s foot; there is less blood.', manga: 'The necklace stays intact and the wound is shown with more blood.', spoiler: 'marineford' },
  ],
  appearances: [
    { medium: 'manga', title: 'One Piece', detail: 'First named in chapter 159; killed in the Marineford arc, with later flashbacks.' },
    { medium: 'anime', title: 'One Piece', detail: 'Episodes 95–489 and flashbacks', animeSlug: 'one-piece' },
  ],
  unconfirmed: [
    'Ace’s exact bounty and the precise date of his birth beyond January 1 are not covered here.',
  ],
  faq: [
    { question: 'Who are Ace’s parents?', answer: 'Gol D. Roger, the Pirate King, and Portgas D. Rouge, as revealed at Marineford.', spoiler: 'marineford' },
    { question: 'Does Ace die in One Piece?', answer: 'Yes, at Marineford in manga chapter 573 and anime episode 482. He protects Luffy from Admiral Akainu’s attack.', spoiler: 'marineford' },
    { question: 'What Devil Fruit does Ace have?', answer: 'The Mera Mera no Mi, a Logia-type fruit that lets him create and become fire.' },
  ],
  related: ['monkey-d-luffy'],
  articleKeys: ['Portgas D. Ace'],
  seo: {
    title: 'Portgas D. Ace: Mera Mera no Mi, Parents and Fate (Spoiler-Safe)',
    description: 'Portgas D. Ace explained with verified episodes and chapters: the Mera Mera no Mi, his parents, relationships and a spoiler-protected status tracker.',
  },
  meta: {
    publishedAt: '2026-10-29',
    verifiedAt: '2026-10-29',
    coverage: 'Manga chapters 1–1125 and anime episodes 1–1155',
    sources: [
      { name: 'One Piece manga by Eiichiro Oda (Shueisha)', covers: 'Chapters cited throughout.' },
      { name: 'One Piece anime (Toei Animation), episodes 1–1155', covers: 'Episode numbers.' },
      { name: 'One Piece Wiki on Fandom, “Portgas D. Ace”', url: 'https://onepiece.fandom.com/wiki/Portgas_D._Ace', covers: 'Chapter and episode citations, SBS figures and adaptation differences; no text copied.' },
    ],
  },
};
