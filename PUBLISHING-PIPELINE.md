# AnimeSparks publishing pipeline

## Existing system reused

The pipeline writes the existing `articles` documents in MongoDB Atlas. It keeps the `sanityId`, `translationOfSanityId`, language, category and author references, SEO fields, FAQ/source fields, R2 image references, and Portable Text body shape already consumed by Astro. It uses the current categories/authors collections, Mongo connection helper, R2 `IMAGES_BUCKET`, static production build, safety verifier, guarded Worker preparation, and existing `animesparks-v2` Worker.

English URLs remain `/blog/[slug]`; Spanish URLs remain `/es/blog/[slug]`. New articles start as drafts. Publishing assigns `publishedAt` once, and updates preserve it. A Spanish article must reference one English source, and the API reuses that source's hero image and maps translated inline image placeholders to the original R2 image objects in their submitted positions.

## API and safety

Publishing endpoints require `Authorization: Bearer <PUBLISHING_API_KEY>` (minimum 32 characters). Configure it as a Cloudflare Worker secret. The deployment callback uses a separate `DEPLOYMENT_CALLBACK_KEY`, also configured only as a Worker/GitHub secret. The API includes:

- `GET /api/publishing/articles?q=&state=&language=&limit=` and `GET /api/publishing/articles/{id-or-slug}`
- `GET /api/publishing/taxonomy`
- `POST /api/publishing/articles` (draft, requires `Idempotency-Key`)
- `PATCH /api/publishing/articles/{id}`
- `POST /api/publishing/articles/{id}/publish`
- `POST /api/publishing/media` (multipart `file`, image types only, max 10 MB)
- `POST /api/publishing/rebuild` and `GET /api/publishing/status`
- `POST /api/publishing/deployment-result` (workflow callback)
- MCP Streamable HTTP endpoint: `POST /api/mcp`

Mutations are gated by `PUBLISHING_WRITES_ENABLED`, initially false. Admin mutations remain separately controlled by `ADMIN_WRITES_ENABLED`, also false. Requests are schema checked; Mongo slug and ID conflicts are rejected, slug and translation claims use unique Mongo `_id` locks to close concurrent-create races, idempotency results are recorded, and audit/rate-limit records go to dedicated Mongo collections. Article source URLs must be HTTPS. Image uploads require an explicit rights confirmation and create new random-keyed objects only. Existing image references must use a plausible R2 key and canonical public URL; the API never edits or deletes existing objects.

The rate limit is 60 requests per credential per minute. Use only the dedicated credential for the publishing API, never an admin session or Mongo/R2 secret. Store credentials in Cloudflare/GitHub secrets, not prompts, article bodies, or connector arguments.

## Rebuild and deployment

The existing Astro build prerenders the MongoDB snapshot into article pages, home, archives, categories, tags, sitemap and RSS. There was no existing GitHub publishing workflow in this repository, so `.github/workflows/publishing-deploy.yml` adds a serialized `repository_dispatch` pipeline. After publication it builds and verifies the production site, then deploys through Wrangler to the Worker configuration emitted by the existing production preparation script. GitHub concurrency prevents overlapping builds. Worker deployment is atomic; failed builds/deploys leave the previously active Worker deployment serving traffic. Content save and deployment state are stored separately in `publishingRebuilds` and returned separately by the API.

Configure repository secrets `MONGODB_URI`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `DEPLOYMENT_CALLBACK_KEY`. Configure Worker secrets `MONGODB_URI`, `ADMIN_JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS_HASH`, `PUBLISHING_API_KEY`, `DEPLOYMENT_CALLBACK_KEY`, and `GITHUB_ACTIONS_TOKEN`; set Worker variables `PUBLISHING_WRITES_ENABLED=false`, `ADMIN_WRITES_ENABLED=false`, and `GITHUB_REPOSITORY=OWNER/REPO`. Limit the GitHub token to repository Actions write permission. Production publication URL checks run after deployment.

After successful deployment, the workflow must still be followed by a production article URL check. This first implementation records deployment job status; the scheduled automation should call/check the article URL separately before claiming public visibility. A live deploy is not run by this change.

## ChatGPT connection

`POST https://www.animesparks.blog/api/mcp` exposes the publishing tools. This endpoint currently authenticates with the publishing bearer key. ChatGPT's current custom MCP app setup documents OAuth or no-auth modes and does not document static bearer API-key authentication. Therefore, do not connect the current endpoint directly in ChatGPT yet. Add an OAuth gateway/provider that issues short-lived access tokens accepted by the API (or another ChatGPT-supported authenticated tool bridge), then test read-only calls while writes remain off. The ChatGPT MCP app setup requires workspace developer-mode support; confirm the available plan and admin permissions. Keep the English and Spanish scheduler prompts unchanged until that connection is verified. See [OpenAI's current custom MCP setup](https://developers.openai.com/api/docs/guides/custom-mcp-server) and [ChatGPT MCP app availability](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt).

## Controlled activation

1. Provision the isolated Mongo/R2 and GitHub secrets/configuration and deploy this code with both write flags false.
2. Verify authenticated search, taxonomy, article retrieval, duplicate-slug rejection, and invalid Portable Text rejection.
3. Verify unauthenticated calls fail and add one draft only in an isolated test database after enabling `PUBLISHING_WRITES_ENABLED` there.
4. Verify idempotent retry, English/Spanish relationship checks, image-preserving translation serialization, and R2 upload with a disposable object in isolated storage.
5. Provision a separate staging deployment target before testing deployment failure/retry behavior. The new dispatch workflow is production-only by design; do not use its publish trigger as a staging test because it deploys the existing production Worker.
6. Configure an OAuth-backed remote MCP connector and test only read-only operations first. The bearer-only endpoint is not yet directly compatible with ChatGPT's custom MCP authentication flow.
7. After separate human review of test results and production credentials, explicitly authorize production publishing writes. Do not enable old scheduled automations until a controlled publish, deployment callback, and resulting article URL have all been verified.

## GitHub publishing bridge investigation (2026-10-08)

The connected target `RushabhBhosale/animesparks-v2` is public. The current GitHub app metadata returns admin/push access for the coding-session connector, and that connector exposes create-issue/create-file actions, but it does not expose repository creation or workflow dispatch. These actions belong to the Codex GitHub connector in this session; they do not establish that ChatGPT Scheduled Tasks can invoke them.

OpenAI's current standard GitHub app for ChatGPT is read-only. Scheduled Tasks can use supported connected-app actions, but GitHub event-triggered tasks are limited to supported pull-request activity; the feature does not make arbitrary issue/file writes available. GPTs are not supported by Scheduled Tasks, so a GPT Action using bearer API-key auth is not a bridge for the existing tasks. Therefore a GitHub issue inbox cannot be safely submitted to using the currently connected ChatGPT GitHub app. No issue or article payload was submitted, and no workflow test was run.

Do not put submissions in this public repository. The local app does not have a dedicated private inbox repository, and no private repository create action is exposed by the current connector. A GitHub bridge would require a separate private inbox repo and a ChatGPT-supported write-capable GitHub app integration, followed by staging credentials and a test run. The optional GitHub Enterprise app template is only for GitHub Enterprise hosts, not this github.com repository.

The shortest ChatGPT-native route is an OAuth-enabled custom MCP connection backed by the existing Publishing API. This requires an OAuth authorization provider or gateway, short-lived token verification at the MCP/API boundary, supported ChatGPT workspace access, and isolated staging credentials. Another supported route is a separate scheduled publishing service that calls the existing API directly using its own stored credentials; it would replace the ChatGPT scheduler as the runner and needs its own research/content generation and approval configuration.
