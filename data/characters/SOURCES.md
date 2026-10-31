# Character encyclopedia: source notes

Profiles are curated in-repo (`src/lib/characters/data`). Facts were written by AnimeSparks from the manga and anime and cross-checked on 2026-10-29 against fan-wiki citations (chapter/episode pointers, databook figures) read through each wiki's MediaWiki API. No wiki prose is copied. The wikis are CC BY-SA; they were used for verification only.

| Series | Primary | Cross-check |
| --- | --- | --- |
| Jujutsu Kaisen | Manga ch. 1–271, anime ep. 1–59 (MAPPA) | jujutsu-kaisen.fandom.com (Gojo, Yuji, Megumi, Sukuna, Ten Shadows, Prison Realm); Wikipedia character list; Fanbook figures as cited by the wiki; AnimeSparks episode→chapter data in `data/curated/manga-mappings` |
| Naruto | Manga ch. 1–700, Naruto and Shippuden anime | naruto.fandom.com (Naruto, Sasuke, Itachi, Kabuto, Impure World Reincarnation); databook ages/heights as shown on the infoboxes |
| One Piece | Manga, anime ep. 1–1155 | onepiece.fandom.com (Luffy, Ace, Gear pages, Haki); SBS figures |
| Demon Slayer | Manga ch. 1–205, anime ep. 1–63 + Infinity Castle Part 1 | kimetsu-no-yaiba.fandom.com (Tanjiro, Rengoku); search results for the film's release status |
| Hunter x Hunter | Manga ch. 1–345 and the 2011 anime (ep. 1–148, Madhouse) | hunterxhunter.fandom.com (Gon Freecss, Killua Zoldyck, and the arc pages for chapter and episode ranges; the 1999 anime is numbered separately and was not used) |
| Death Note | Manga ch. 1–108, anime ep. 1–37 (Madhouse) | deathnote.fandom.com (Light Yagami, L, and the chapter and episode pages used for each event; the wiki has no inline citations, so chapter/episode numbers were taken from its chapter and episode guide pages) |

Added 2026-10-31: Gon Freecss and Killua Zoldyck (Hunterpedia footnotes, chapter numbers only except the debut episodes), Roronoa Zoro, Nami and Sanji (One Piece Wiki citations from each character's History and Abilities pages), Nezuko Kamado (Kimetsu no Yaiba Wiki reference list), Light Yagami and L (Death Note Wiki). Debut chapters and episodes are the infobox values; where a wiki gave no chapter or episode for a moment, the moment was left out.

Conventions: episode numbers are series-wide. "Shown in" on an ability means the earliest reference verified, not necessarily the first appearance. Ongoing-series values (One Piece bounty) are labelled estimates. Where a number could not be verified it was omitted or marked unknown. Checkpoint labels are chapter/episode ranges, not content descriptions, so the spoiler selector does not itself spoil.

To update: edit the series file (timeline, relationships, checkpoints) and the profile file, bump `meta.verifiedAt`, run `npm test`.
