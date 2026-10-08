# GitHub automatic rebuild setup

`.github/workflows/animesparks-auto-rebuild.yml` checks published MongoDB content every 10 minutes. It builds on a content change, on a push to `main`, or on manual dispatch. Pull request code is never checked out or given production secrets. A failed build cannot reach the deployment step.

## Configure GitHub

In **Settings → Secrets and variables → Actions**, add these repository secrets:

- `MONGODB_URI`: a MongoDB Atlas user with read-only access to the `animesparks` database.
- `CLOUDFLARE_API_TOKEN`: an account token scoped to the AnimeSparks Cloudflare account. Cloudflare's **Edit Cloudflare Workers** token template is the starting point; restrict the account and zone resources to only those used by the existing Worker and its routes.
- `CLOUDFLARE_ACCOUNT_ID`: the verified Cloudflare account ID that owns `animesparks-v2`.

Add the repository variable `ADMIN_WRITES_ENABLED` with the value verified against the live Worker. The last production audit recorded `true`; confirm that value in Cloudflare before setting it. The production build stops if this variable is missing or invalid, and uses it to preserve the live setting. It does not enable publishing writes.

Keep the repository variable `ANIMESPARKS_AUTO_DEPLOY_APPROVED` unset or set it to `false` while performing dry runs. In this state, scheduled checks compare fingerprints and build changed content, but they do not deploy. Manual dispatch defaults to the same build-only behavior. After the dry runs pass and production automation is explicitly approved, set `ANIMESPARKS_AUTO_DEPLOY_APPROVED=true` to allow changed scheduled builds and `main` code pushes to deploy.

## Dry run and deployment

1. Merge the verified production code and workflow into `main` with `ANIMESPARKS_AUTO_DEPLOY_APPROVED` off.
2. Configure the three secrets above and the verified `ADMIN_WRITES_ENABLED` variable.
3. Run **Actions → AnimeSparks MongoDB rebuild → Run workflow** with `deploy_production` left false. Confirm the MongoDB fingerprint step, production build, generated manifest match, and production safety checks pass.
4. Run `node scripts/compare-content-fingerprint.mjs --self-test`; it verifies that unchanged content skips and a changed fingerprint triggers a rebuild. Run `node scripts/content-fingerprint.mjs --self-test` to verify stable hashes and changed-input detection without writing MongoDB content. Once the first production manifest exists, an unchanged scheduled run skips its build job.
5. Review the Actions logs, then explicitly approve unattended deployment by setting `ANIMESPARKS_AUTO_DEPLOY_APPROVED=true`.

For one explicitly initiated deployment, dispatch the workflow with `deploy_production=true`; deployment still requires a detected content change. The workflow deploys only the `animesparks-v2` Worker. It verifies the production fingerprint, representative English and Spanish articles, SEO metadata, canonical and hreflang tags, JSON-LD, article bodies, R2 image references, AdSense, sitemap, RSS, archives, admin access, apex redirect, and workers.dev noindex behavior. A failed post-deploy check invokes `wrangler rollback` to restore the prior Worker version.

The fingerprint includes currently live published English and Spanish article records, linked category and author data, published categories and anime entries, homepage settings, and their image references. Only the SHA-256 fingerprint is logged or published in `content-manifest.json`; article bodies and database fields stay out of logs and the manifest. Each new fingerprint is written into the same static build before deployment.

With a healthy GitHub runner, a publication should appear after the next 10-minute poll plus build and deployment time. The verified local production build took about 2.5 minutes; GitHub queue delays can extend that.

The current repository is public. The repo should be synchronized and the workflow dry-run with production secrets before setting `ANIMESPARKS_AUTO_DEPLOY_APPROVED=true`.
