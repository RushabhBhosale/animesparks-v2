# Stage 3: static public delivery report

Deployed on 2026-10-07 to `https://animesparks-v2.rushabhbhosale25757.workers.dev` only. Worker version `7d828943-867e-46f8-bab6-74a6f20b94e0`. The production domain remains on its existing deployment.

## Route matrix

| Public route | Delivery |
| --- | --- |
| `/` | Astro prerendered HTML |
| `/blog/[slug]` | Astro `getStaticPaths`, published English only |
| `/es/blog/[slug]` | Astro `getStaticPaths`, published Spanish only |
| `/blogs`, `/blogs/es` | Astro prerendered base HTML |
| `/categories`, `/categories/[slug]` | Astro prerendered HTML |
| `/tags/[tag]`, `/tags/[...tag]` | Astro prerendered HTML; 30 case-colliding variants use distinct static assets mapped to their original URLs |
| `/trending`, `/my-anime-list` | Astro prerendered HTML |
| `/about`, `/contact`, `/privacy`, `/sitemap`, `/404` | Astro prerendered HTML |
| `/sitemap.xml`, `/rss.xml` | Astro prerendered XML |
| `/search-index.json`, `/listing-data.json`, `/tag-route-map.json`, `/route-inventory.json` | Build-generated static data assets |
| `/search`, `/api/search` | Dynamic Worker routes using the static search index; no MongoDB |
| Query variants of `/blogs`, `/blogs/es`, `/trending`, `/categories/[slug]`, `/tags/[tag]` | Dynamic Worker rendering via internal `/listing-variant`; reads static listing data, no MongoDB |
| `/robots.txt` | Dynamic host-specific response, no MongoDB |
| `/home`, `/blog/es/[slug]` | Dynamic legacy redirects, no MongoDB |
| `/admin/*`, `/api/admin/*` | Dynamic, protected Worker routes; MongoDB remains the admin source of truth |

Astro remains in `output: 'server'` with the Cloudflare adapter. Public content routes explicitly prerender. The single Worker uses `assets.run_worker_first: true` so the existing `admin.animesparks.blog` host can reject public routes. For public prerendered HTML, the Cloudflare Astro entry checks the generated static-asset manifest and returns `env.ASSETS.fetch()` before rendering any Astro route. This incurs a small Worker invocation but serves generated HTML from Cloudflare Static Assets. The build-only MongoDB module is absent from the runtime server bundle. A local Wrangler preview with no `MONGODB_URI` returned 200 for English and Spanish articles and 404 for an unknown article.

## Content and build

| Measure | Result |
| --- | ---: |
| Published English articles generated | 233 |
| Published Spanish articles generated | 13 |
| Draft records excluded | 2 |
| Category detail pages | 6 |
| Tag pages | 635 (605 direct tag files and 30 variant assets) |
| Anime listing pages | 1, containing 131 published entries |
| Other public HTML content routes | 10 |
| Total public content URLs | 897 |
| Generated HTML files | 898 including the 404 page |
| Full build time | 8.1 seconds |
| Deployment time | 28.57 seconds total, including asset upload and trigger deployment |
| Build/type errors | 0; two existing admin-media hints |

The static search index is 171,313 bytes and contains searchable metadata, never article bodies. The Worker reads it only for search requests. Query variants of listings read a 669,792-byte static card dataset; default listing visits use prerendered HTML. No automatic publish or deploy trigger was enabled. A future admin publish action can enqueue a full build/deploy through a narrowly scoped CI or Cloudflare deploy hook after the MongoDB write succeeds.

## Live performance

All 40 requested requests returned HTTP 200. There were no 500s, hangs, or timeouts.

| Route | Requests | Median | Range |
| --- | ---: | ---: | ---: |
| Home | 10 | 372 ms | 364–686 ms |
| English article | 10 | 380 ms | 372–579 ms |
| Spanish article | 10 | 375 ms | 368–530 ms |
| Category | 5 | 379 ms | 359–533 ms |
| Anime listing | 5 | 410 ms | 385–558 ms |

The prior MongoDB SSR baseline was approximately 2–3 seconds. These measurements are from this client's location and include network latency.

## SEO and parity

- The current production sitemap contains 253 URLs; the deployed sitemap contains 323, all on `https://www.animesparks.blog`. The additional URLs are 3 newly published English articles, 6 category pages, and 61 indexable tag pages. Drafts, admin, internal variant assets, and workers.dev URLs are excluded.
- RSS returns 200 and includes 233 published English articles with production-host links. Workers.dev robots returns `Disallow: /`; HTML and XML responses have `X-Robots-Tag: noindex, nofollow`, and public HTML has the same robots meta tag. Production can be made indexable in a later build with `PUBLIC_DEPLOY_TARGET=production`; the production domain was not attached.
- Live canonical URLs, hreflang relationships, titles, descriptions, H1s, JSON-LD types, publication dates, and modified dates match the current production site across the shared content set. Spanish article pages use `lang="es"` as required and retain EN ↔ ES links.
- The exhaustive live crawl compared 902 URLs: 897 build-inventory content URLs plus 5 query/unknown-route checks, against the production site. Old and new HTTP status matched on all 902; 901 returned 200 and one unknown article returned 404. No new-side timeout occurred. The first local crawl found substantive differences on 652 URLs, including tag titles, truncated descriptions, and dates; these were fixed. The final live crawl has zero substantive mismatches.
- The live crawl reports 675 raw differences, all intentional: `og:locale` was added on 655 pages, 15 Spanish pages now correctly use `lang="es"`, and seven articles use migrated R2 images in OG/Twitter metadata where production uses a fallback poster. Image presence and article-body presence are intact. All generated internal content links resolve to a generated route or a retained legacy redirect.

## Data, security, and admin

- Read-only MongoDB audit: 248 article records, including 233 published English, 13 published Spanish, and 2 drafts. No published article lacks a hero R2 key.
- Stored legacy Sanity CDN strings occur in 26 MongoDB records, 78 occurrences total: `articles.body[].hostedUrl` 15, `articles.mainImage.hostedUrl` 24, and matching `sourceDocument` fields 15 and 24. Generated public HTML contains zero `cdn.sanity.io` references. No production content was edited.
- Generated-output scan found no occurrence of the locally available MongoDB secret value and no obvious MongoDB URI in public assets. Remote-only secrets were unavailable to compare by value; the build output contains no copied `.dev.vars`.
- Live admin checks: login page 200, unauthenticated dashboard 302 to login, unauthenticated admin API 401, public article path on admin host 404, and admin robots disallows all. Authenticated dashboard and write flows were not exercised because no login credentials were provided and this stage prohibits content mutations. Admin routes and APIs remain dynamic and protected; `ADMIN_WRITES_ENABLED` remains `true`, its prior value.
- MongoDB writes: 0. R2 image-bucket writes/deletes: 0. Sanity changes: 0. No production DNS, Vercel, or production-domain Worker route changes were made. The existing admin custom domain remains attached to the same Worker.

## Verification artifacts

- `scripts/stage3-parity.py`: exhaustive read-only production/live comparison; detailed live results at `/private/tmp/animesparks-stage3-live-parity.json`.
- `scripts/stage3-legacy-audit.mjs`: read-only stored-reference field audit.
- `scripts/stage3-secret-scan.mjs`: generated-output secret-value scan.
- Build, dry-run, deployment, and performance logs are under `/private/tmp/animesparks-stage3-*`.
