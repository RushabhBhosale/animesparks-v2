# AnimeSparks Tools platform

Status: **All 10 tools implemented (Phases 1–4), awaiting review.** Nothing is committed or deployed.

## 1. Current architecture (inspected 2026-10-16)

The brief describes the stack as Next.js. The repository is **Astro 7 on one Cloudflare Worker** (`animesparks-v2`). The older Next.js app (`../animesparks`) is the pre-migration source only.

| Layer | How it works today |
| --- | --- |
| Public pages | Prerendered at build time from a MongoDB snapshot (`src/lib/content/build-data.ts`) and served from Cloudflare Static Assets. Public runtime routes never open MongoDB. |
| Dynamic public routes | `/search`, `/api/search`, listing query variants. They read build-generated JSON assets through `env.ASSETS`, not MongoDB. |
| Admin / publishing | `/admin/*`, `/api/admin/*`, `/api/publishing/*` read and write MongoDB per request. Writes are gated by `ADMIN_WRITES_ENABLED` / `PUBLISHING_WRITES_ENABLED`. |
| Rebuilds | `.github/workflows/animesparks-auto-rebuild.yml` fingerprints published MongoDB content every 10 minutes and rebuilds on change. Deploys only when `ANIMESPARKS_AUTO_DEPLOY_APPROVED=true`. |
| SEO safety | `PUBLIC_DEPLOY_TARGET=production` switches robots to `index, follow`. Non-production hosts get `noindex, nofollow` through the layout and `scripts/guarded-worker.mjs`. `scripts/verify-production-build.mjs` checks robots, canonicals, the sitemap and image dimensions. |
| Design system | `src/styles/site.css`: dark-only editorial look (warm black, red `#e8192c`, Georgia headlines, system UI text, square cards). |
| Ads | `AdUnit.astro` with fixed slot IDs in `src/lib/adsense.ts`; Auto Ads script in the layout (production only). |

### Existing anime data

| Collection | Contents | Reuse |
| --- | --- | --- |
| `animeEntries` (131) | The site owner's personal watched list: title, personal score, year, genres, AniList image URLs. No MAL/AniList IDs, episodes or durations. | Linked to the new catalogue by exact title (+ year check). It is **never modified**. |
| `articles.animeName` (92 distinct values) | Free-text anime name per article. | Used to link tools to related AnimeSparks articles and to seed the catalogue. |

No existing collection holds episode counts, durations, relations, schedules, filler, arcs or manga mappings.

### Tenrai API (verified 2026-10-16)

- `https://api.tenrai.org/v1`, an unofficial MyAnimeList mirror following the Jikan v4 schema (OpenAPI at `/documentation/openapi.json`).
- Public limit: 120 requests/minute and 4/second per IP. `429` carries `Retry-After`. Persistent abuse returns `403` for up to 24 hours.
- Endpoints used: `/top/anime?filter=bypopularity` (limit up to 100), `/seasons/now`, `/anime?q=`, `/anime/{id}/full` (includes relations), `/anime/{id}/episodes` (100/page, includes MAL `filler`/`recap` flags).
- Terms (tenrai.org/terms §3, §5): storing, caching and transforming responses inside our own app is allowed. **Republishing the raw data as an API or bulk mirror is not.** The public JSON assets therefore contain only the fields each tool needs. Credit: MyAnimeList (source) and Tenrai (provider).

## 2. Architecture

```
Tenrai API ──(GitHub Actions, daily, rate-limited)──▶ scripts/tools/sync-tenrai.mjs
                                                        │ provider adapter → neutral model
                                                        ▼
                                              MongoDB Atlas (tool* collections)
                                                        │ build-time read (existing pattern)
                                                        ▼
                         Astro prerender: tool pages + compact JSON indexes (static assets)
                                                        │
                       Worker: /api/tools/* searches the static index (no MongoDB, no Tenrai)
```

- **Tenrai is never called by visitors, pages or the build.** If Tenrai is down, the sync records a failed run and the site keeps serving the last snapshot. If MongoDB is down during a build, the build fails and the previous deployment stays live, which is the existing behaviour.
- `src/lib/tools/providers/tenrai.ts` is the only Tenrai-aware module. It maps Jikan-shaped responses to `ProviderAnime`. Replacing Tenrai means writing one new adapter.
- Search runs server-side over a build-time index, and the browser receives at most 8 results per query.

### New MongoDB collections (additive only)

| Collection | Key | Purpose |
| --- | --- | --- |
| `toolAnime` | `slug` (unique), `externalIds.mal` (unique) | Unified anime record. Includes titles, format, status, episodes, aired episodes, duration, dates, genres, studios, images, relations (provider IDs), links to `animeEntries` / article names, and `provenance { provider, source, fetchedAt }`. |
| `toolFranchises` | `slug` (unique), `anchorMalId` (unique) | Franchise groups derived from MAL relations, with members and main-line/side/recap roles. |
| `toolWatchOrders` | `franchiseSlug + kind` (unique) | **Curated** chronological / beginner orders with `sources[]`, `verification { status, verifiedBy, verifiedAt }`. Only `verified` orders are rendered. |
| `toolSyncRuns` | `startedAt` | One record per sync: status, request counts, errors, counts. |
| `toolSyncState` | `_id` | Title-resolution cache for seeds (prevents re-searching unresolved names daily). |

Slugs are assigned once on insert and never change.

## 3. Data gaps

| Tool | Data needed | Available from Tenrai? | Gap |
| --- | --- | --- | --- |
| Binge Calculator | episodes, duration, airing status, aired count | Yes | None for listed titles. Filler skipping waits for Phase 2 data. |
| Watch Order — release order | relations + air dates | Yes (MAL relations) | None. |
| Watch Order — chronological / beginner | editorial ordering | **No** | **Curated dataset required.** Importer, schema and validation are included. No orders are bundled; none were invented. |
| Filler Checker (P2) | per-episode classification | Partial: MAL `filler`/`recap` flags only | Manga canon / anime canon / mixed need a curated, sourced dataset. |
| Manga Finder (P2) | episode → chapter | **No** | Fully curated. |
| Arc Explorer (P2) | arcs + ranges | **No** | Fully curated. |
| Calendar (P3) | JST broadcast slot, airing dates | Yes (JST broadcast only) | International streaming times are not in Tenrai and must not be inferred from JST. |
| Guessing game (P4) | question bank | No | Curated. |

## 4. Phase plan

**Phase 1 (this change):** data architecture + Tenrai sync, `/tools` hub, Binge Calculator, Watch Order Generator, nav entry, sitemap, tests. Stop for review.
Phase 2: Filler Checker, Manga Finder, Arc Explorer (curated collections + admin editing).
Phase 3: Release Calendar, Watchlist. Phase 4: Recommendations, Tier List, Daily Game.

### SEO rules applied

- Tool pages: unique title/description, production canonical, BreadcrumbList + WebApplication JSON-LD, FAQ, crawlable explanatory copy, related articles.
- Franchise pages are prerendered for every derived franchise. They are `noindex, follow` and stay out of the sitemap **until a verified curated order exists**. A release list built only from relations is not enough unique content to index.
- Query-string states (`?anime=...`) are served by the same static page, whose canonical has no parameters.
- `/api/` is already disallowed in robots.txt. JSON indexes send `X-Robots-Tag: noindex`.
- Existing routes, canonicals, robots, hreflang, sitemap rows, RSS and verification scripts are unchanged except for the added tool rows.

## 5. Phase 1 report (2026-10-17)

### Completed tools

| Tool | Route | State |
| --- | --- | --- |
| Tools hub | `/tools` | Live. Searchable directory with 4 categories. The 8 later tools are listed without links as "In the workshop". |
| Binge Calculator | `/tools/anime-binge-calculator` | Live. Server-side anime search. Episodes and runtime fill in automatically; ongoing series use aired episodes only. Settings: daily hours, days/week, speed, opening/ending skip, start date. Gives finish date, shareable link and native share. Filler skipping stays disabled until Phase 2 supplies verified lists. |
| Watch Order Guide | `/tools/anime-watch-order`, `/tools/anime-watch-order/[slug]` (118 pages) | Live. Franchise search, popular franchises, release order with main/side/recap labels, "main story only" filter, total and remaining watch time, watched checkboxes saved locally. Chronological/beginner tabs appear only for verified curated orders (currently none). |

### Routes created

- Pages: `/tools`, `/tools/anime-binge-calculator`, `/tools/anime-watch-order`, and 118 `/tools/anime-watch-order/{franchise}` pages, all prerendered.
- APIs (Worker, no MongoDB, no Tenrai): `/api/tools/anime-search?q=|slug=`, `/api/tools/franchise-search?q=`. Both cache for 5 minutes and send `noindex`.
- Build-time indexes: `/tools-data/anime-index.json` (762 KB, 2,474 titles) and `/tools-data/franchise-index.json` (67 KB). Only the APIs read them, through `env.ASSETS`; the production Worker returns 404 for direct requests.

### Changes to existing files

| File | Change |
| --- | --- |
| `src/layouts/SiteLayout.astro`, `src/lib/content/locales.ts` | "Tools" / "Herramientas" nav link and footer link. |
| `src/pages/sitemap.xml.ts` | +3 URLs (`/tools`, both tool pages). Franchise pages are added only once verified. |
| `src/pages/sitemap.astro`, `src/pages/route-inventory.json.ts` | Tool routes added. |
| `scripts/guarded-worker.mjs` | `/tools-data/*` returns 404 publicly (same pattern as `/tag-variants/`). |
| `scripts/content-fingerprint.mjs` | Includes tool collections (excluding sync timestamps), so a sync triggers the existing rebuild. The fingerprint is unchanged while those collections are empty. Note: the first scheduled run after merging sees a new fingerprint and rebuilds once. |
| `tsconfig.json` | Excludes `tests/` from `astro check` (the Node test files need no DOM types). |
| `package.json` | `test`, `tools:sync`, `tools:import-curated` scripts. **No new dependencies.** |

Baseline vs. after (production build): 1,038 → 1,159 HTML files. 0 existing pages removed. 0 sitemap URLs removed, 3 added. All existing verification passes: 284 article routes, 69 indexable tags, 5,389 images, secret scan.

### Database changes (production Atlas, additive only)

Collections created: `toolAnime` (2,474 docs), `toolFranchises` (122 docs, 118 active; 4 were superseded when the anchor rule was fixed and are marked `active: false`), `toolSyncRuns` (3), `toolSyncState` (202 seed-resolution entries). `toolWatchOrders` is created empty when the curated importer first runs. Indexes are listed in `scripts/tools/lib.mjs`. **No existing collection was written to.** `animeEntries` and `articles` were read only.

### External API usage

- First full sync: 1,284 Tenrai requests in about 13 minutes, with no 429/5xx/403 responses. The incremental re-sync used 43 requests. Daily cost going forward is roughly 25 catalogue requests, about 90 aired-episode checks for airing shows, and relation refreshes spread over 7 days.
- Requests are throttled to 1 per 600 ms (well under 120/min). `Retry-After` is honoured, failures use exponential backoff with jitter (max 5 retries), and a 403 stops the run. Runs record a status in `toolSyncRuns`, and nothing is deleted on failure.
- `.github/workflows/tools-tenrai-sync.yml` runs daily at 03:17 UTC, **disabled until** the repository variable `TOOLS_SYNC_ENABLED=true` and the secret `TOOLS_SYNC_MONGODB_URI` (a write-capable user scoped to the tool* collections) are set. The existing `MONGODB_URI` secret is documented as read-only.
- Of 202 existing anime names, 175 were linked to catalogue entries by exact title (plus a year check). 27 were left unlinked instead of guessed, for example "SK8", "Nanatsu no Taizai", "Hajime no Ippo" and "Kaguya-sama wa Kokurasetai".

### Missing curated datasets

- **Watch orders:** 0 chronological and 0 beginner orders. Use `data/curated/watch-orders/README.md`. Each verified order makes its franchise page indexable.
- Phase 2+ datasets (filler classification beyond MAL flags, manga chapter mappings, arcs, daily game questions) have not been started.

### Tests performed

- `npm test`: 38 automated tests covering binge maths (rounding, days/week, leap years, validation), duration parsing, slugs, search ranking and aliases, franchise derivation (roles, anchors, caps, alternative versions), watch-time maths for airing/upcoming/movies, the Tenrai adapter against a real response fixture, 429/`Retry-After`, 5xx/network backoff, 404/403 handling, throttling, aired-episode counting, SFW filtering, curated-data validation, seed matching, and localStorage under blocked/corrupt storage.
- `astro check`: 0 errors.
- Production build (`npm run build:production`) passed the existing safety, image and secret checks.
- Browser (local production preview), desktop and 375 px mobile: hub filter; One Piece search → 1,180 aired episodes → 472 h; option changes checked by hand; shared-link restore; watch-order progress and filter persisting across reloads; no horizontal overflow; API edge cases (short/oversized query, unknown slug → 404, `noindex` headers).
- Not tested here: the deployed Worker (no deploy was made), real AdSense fill and CLS, and a build with empty tool collections (the code renders empty states but this was not exercised).

### Remaining limitations

- Franchise names and slugs come from the earliest TV entry, e.g. `bakemonogatari` rather than `monogatari`. Slugs are stable once created, and there is no editorial rename yet.
- "Main/side/recap" labels follow MAL relations. A MAL entry with no sequel link is labelled side story, e.g. *Overlord: The Sacred Kingdom*.
- R+ titles (MAL "mild nudity") stay in lists so franchises are not broken, but their artwork is hidden. Rx titles are excluded.
- Catalogue scope is the 2,000 most popular titles + the current season + related entries + existing AnimeSparks titles. Less popular titles are not searchable yet.
- Tool pages are English only.

## 6. Phases 2–4 and follow-ups (2026-10-17)

| Tool | Route | Data |
| --- | --- | --- |
| Filler Checker | `/tools/anime-filler-checker` + 377 series pages (92 indexable) | MAL per-episode filler/recap flags; curated lists in `toolFillerLists` override them |
| Episode-to-Manga Finder | `/tools/anime-manga-chapter-finder` | Source manga (400) from Tenrai; chapter maps for 29 entries imported from Fandom wikis |
| Arc Explorer | `/tools/anime-arc-explorer` | Arcs for 25 entries imported from Fandom wikis |
| Release Calendar | `/tools/anime-release-calendar` | JST broadcast slots for 98 airing shows, converted to the viewer's timezone |
| Watchlist | `/tools/anime-watchlist` | localStorage; versioned JSON import/export; entries carry `updatedAt` for future sync |
| Recommendations | `/tools/anime-recommendations`, `POST /api/tools/recommend` | Genres/themes/studios + MAL user recommendations (400 titles); deterministic, with reasons |
| Tier List | `/tools/anime-tier-list` | Client-only; pointer drag + tap-to-move; PNG export (MAL CDN allows CORS) |
| Daily Game | `/tools/daily-anime-game` | `toolDailyGame` schedule fixed 30 days ahead, keyed by UTC date; clues built from stored metadata |

**Wiki import (owner-approved).** `scripts/tools/import-wiki.mjs` reads episode infobox fields (episode number, chapters, arc) from Fandom wikis via the MediaWiki API, at about 1 request per second with an identifying User-Agent. It copies no prose and credits each source as "CC BY-SA" on the page. Records are marked `verification.method: "wiki-import"` and shown as "Data from … (CC BY-SA)", not "verified". Covered: One Piece (arc-level), Naruto, Naruto Shippuden, Bleach, Demon Slayer (5 entries), MHA (8), Hunter × Hunter (2011), Chainsaw Man, Frieren (2), Black Clover, Spy × Family (4) and JJK (3). Alignment of each season was checked by episode titles and known end chapters. Wiki data can contain errors.

**Live lookup (owner-approved).** When the catalogue has no match, `/api/tools/anime-lookup` queries Tenrai and returns safe-for-work results at once. It also inserts them into `toolAnime` (insert-only, `provenance.addedBy: "live-lookup"`) through `waitUntil`. Safeguards: 3-character minimum, 30 lookups/minute per isolate, 6-hour edge cache, and the `TOOLS_LIVE_LOOKUP` flag. This makes Tenrai a runtime dependency for misses only; if Tenrai is down, search still works from the catalogue.

**Site changes.** The header language switch (EN/ES) is removed; hreflang tags and article language links are unchanged. The homepage has a "Watch Smarter" tools strip (text only, no images). `wrangler.jsonc` sets `run_worker_first: false` so `astro dev` serves client assets again; both deploy scripts still force `true`.

**Still curated-only / not covered:** chronological and beginner watch orders, manga-canon vs anime-canon filler splits, chapter maps and arcs for series not listed above, and schedule delay notices.

**Tests:** 68 automated tests (`npm test`). `astro check` reports 0 errors. Production build passes; 0 existing pages or sitemap URLs removed, 103 sitemap URLs added.

## 7. SEO pass (2026-10-17, branch `feature/tools-seo`)

**Audit findings fixed:** 193 tool titles over 75 characters (filler/watch-order titles now fit about 65), 48 over-long descriptions (now clamped to 158), flagship watch-order pages that were `noindex`, no per-series Manga Finder pages, no article→tool links and no tool→tool links. FAQPage JSON-LD is removed from all tools; the FAQs stay visible. Remaining structured data: BreadcrumbList, WebApplication (tool pages) and ItemList (watch orders).

**Landing pages (indexable, in the sitemap):**
- Filler: naruto, naruto-shippuden, bleach, one-piece, dragon-ball-z. Added longest filler stretches, an arc-by-arc filler table (arcs from wikis), and links to the watch order, manga guide and filler-free binge plan.
- Watch order: one-piece, naruto, bleach, monogatari (renamed from `bakemonogatari`, with a 301), attack-on-titan, jujutsu-kaisen, demon-slayer-kimetsu-no-yaiba, my-hero-academia. Added a "main story in release order" list, a by-format table and filler links per entry.
- Manga (new route `/tools/anime-manga-chapter-finder/[slug]`): jujutsu-kaisen, demon-slayer, chainsaw-man, solo-leveling (newly imported from its wiki), frieren, my-hero-academia, spy-x-family, naruto. Each has a season table, per-episode chapter tables, a preselected lookup and a "continue from chapter N" answer.
- Skipped: `fate`. MAL links Fate entries as alternative versions, so a data-derived order can't answer "Fate watch order" without editorial curation.

**Linking:** "Popular anime guides" on `/tools`; related-tools cards on every tool; a "Plan your watch" box on English articles (only existing, indexable tool pages for that article's anime; Release Calendar on premiere/schedule news); a share box with copy-link and HTML-link snippet on landing pages.

**Build robustness:** snapshot loaders retry transient MongoDB/DNS failures (4 attempts, backoff, build-time only).

**Not verified:** the production build. Atlas and local DNS were unstable during this session: replica set without a primary, SRV lookups failing. Astro completed one full build, but the post-build fingerprint step failed, so the generated HTML, sitemap and articles were not inspected after these changes.
