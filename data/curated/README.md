# Curated tool data

Editorial facts the providers don't supply live here as JSON, one file per series or franchise. **Every folder ships empty on purpose.** Nothing appears on the site until a record has sources and a named reviewer.

| Folder | Collection | Used by |
| --- | --- | --- |
| `watch-orders/` | `toolWatchOrders` | Watch Order Guide: chronological and beginner orders |
| `filler/` | `toolFillerLists` | Filler Checker: manga canon, anime canon, mixed and filler (replaces MAL flags) |
| `manga-mappings/` | `toolMangaMappings` | Manga Finder: episode → chapter, where to continue |
| `arcs/` | `toolArcs` | Arc Explorer |
| `schedule-notices/` | `toolScheduleNotices` | Release Calendar: verified delays and breaks |

Every file needs:

```json
"sources": [{ "name": "Official site / publisher / reference", "url": "https://..." }],
"verification": { "status": "verified", "verifiedBy": "Editor name", "verifiedAt": "2026-10-17" }
```

`status` is `verified`, `needs-review` or `unverified`. Only `verified` records are rendered. Slugs are AnimeSparks slugs: franchise slugs appear in `/tools/anime-watch-order/<slug>`, and anime slugs in the `data-entry` attributes of a watch-order page or in the `?anime=` parameter of a Binge Calculator link.

## Shapes

**watch-orders/<franchise>.json**

```json
{ "franchise": "bakemonogatari",
  "orders": { "chronological": { "summary": "Spoiler-free note", "entries": [{ "anime": "kizumonogatari-part-1-tekketsu" }, { "anime": "bakemonogatari", "optional": false, "episodes": "1-15", "note": "..." }] } },
  "sources": [...], "verification": {...} }
```

**filler/<anime>.json:** ranges must be ordered and must not overlap. Types: `manga-canon`, `anime-canon`, `mixed`, `filler`, `recap`.

```json
{ "slug": "naruto-shippuden", "ranges": [{ "start": 1, "end": 56, "type": "manga-canon" }, { "start": 57, "end": 71, "type": "filler" }], "sources": [...], "verification": {...} }
```

**manga-mappings/<anime>.json**

```json
{ "slug": "frieren-beyond-journeys-end", "ranges": [{ "episodeStart": 1, "episodeEnd": 1, "chapterStart": 1, "chapterEnd": 2 }],
  "continueFromChapter": 61, "continueNote": "Optional context", "sources": [...], "verification": {...} }
```

**arcs/<anime>.json:** summaries must be spoiler-safe (max 400 characters).

```json
{ "slug": "one-piece", "arcs": [{ "name": "Romance Dawn", "episodeStart": 1, "episodeEnd": 3, "classification": "canon", "summary": "...", "articleSlug": "optional-blog-slug" }], "sources": [...], "verification": {...} }
```

**schedule-notices/<anime>-<date>.json:** shown in the calendar on and after `date`.

```json
{ "slug": "one-piece", "date": "2026-10-19", "text": "No episode this week (sports broadcast).", "sources": [...], "verification": {...} }
```

## Workflow

1. Add or edit a file in a pull request so the change is reviewed.
2. `npm run tools:import-curated` validates every file against the live slugs without writing anything.
3. `npm run tools:import-curated -- --apply` writes them to MongoDB.
4. The scheduled rebuild picks up the change. Verified watch orders and filler lists make their pages indexable.
