# AnimeSparks v2 — Stage 1

Independent Astro application for Cloudflare Workers. It reads the existing `animesparks` MongoDB Atlas database and links directly to the existing R2 public image domain. Stage 1 serves the homepage and English article routes only.

## Local setup

1. `npm install`
2. Create `.dev.vars` with `MONGODB_URI="..."` (do not commit it). `MONGODB_DB_NAME` defaults to `animesparks` from `wrangler.jsonc`.
3. `npm run dev`

## Deploy

Use the separate Worker name `animesparks-v2`. Configure `MONGODB_URI` as a Wrangler secret (`npx wrangler secret put MONGODB_URI`) before deploying with `npm run deploy`. The deploy script removes Astro's local `.dev.vars` copy from build output and checks that the URI is absent from all output files. Do not add production routes or custom domains. The temporary Worker emits production canonicals and `noindex, nofollow` for workers.dev responses.

No MongoDB writes, migration scripts, R2 bindings, page caches, or production routing are part of this project.
