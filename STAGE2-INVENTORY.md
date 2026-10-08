# Stage 2 public route and feature inventory

Source: current Next.js `../animesparks/app`, public production responses on 2026-10-07, and read-only `animesparks` MongoDB inspection. This is the Stage 2 implementation checklist.

## Routes

- [ ] `/` editorial homepage: lead, picks, latest, trending rail, anime clusters, categories, archive/RSS links.
- [ ] `/blog/[slug]` and `/es/blog/[slug]`: published articles only, localized metadata and body, reciprocal hreflang, 404 for missing/draft/future content.
- [ ] `/blog/es/[slug]` → `/es/blog/[slug]` permanent redirect; `/home` → `/` production redirect.
- [ ] `/blogs`, `/blogs/es`: searchable/paginated archives with sorting and language links.
- [ ] `/categories`, `/categories/[slug]`: six published sections and their article listings; invalid slug 404.
- [ ] `/tags/[tag]`: article listings, pagination, indexing threshold for thin tags.
- [ ] `/trending`: time range and sorting filters; use migrated article signals without GA private API.
- [ ] `/my-anime-list`: public watchlist of 131 `animeEntries`; no individual anime route exists in the old application. Remove its publishing-only Studio link.
- [ ] `/search` and `/api/search`: public archive search and header suggestion endpoint.
- [ ] `/about`, `/contact`, `/privacy`, `/sitemap`: informational pages and visible index.
- [ ] `/sitemap.xml`, `/rss.xml`, `/robots.txt`: published URLs, production canonical host, locale alternates; workers.dev blocked from indexing.
- [ ] Generic unknown URLs: real 404, no homepage fallback.

Private `/studio` and `/api/integrations/chatgpt/*` are outside Stage 2.

## Shared behavior

- [ ] Match black/red/lime editorial visual language, header/footer, desktop and mobile navigation, cards, hero, article reading layout, and advertising containers.
- [ ] Use only read-only MongoDB repositories for articles, categories, authors, anime, settings, related/trending/search; article images from R2 public URLs. Anime watchlist images are existing external AniList URLs.
- [ ] Render actual migrated Portable Text types: `block` and `image`; styles normal, h1–h4, blockquote; strong/em/link marks; bullet/number lists including level 2; alt text/captions.
- [ ] Article breadcrumbs, author/dates/reading time, TOC, FAQ, sources, related links, tags, sharing, ads, and English/Spanish navigation.
- [ ] Production title, description, canonical, hreflang, OG/Twitter, robots, JSON-LD, status, and internal links.
- [ ] Audit all 248 articles and compare representative old/new route output; verify real workers.dev responses and images.

Production sitemap currently has 253 URLs: 10 static + 230 English + 13 Spanish articles. It omits the six public category detail URLs; Stage 2 should add those and report the intentional difference. Production RSS currently has 230 English items.
