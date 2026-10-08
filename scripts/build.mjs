import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const environment = { ...process.env };
const requestedTarget = process.argv.slice(2).find(value => value.startsWith('--target='))?.slice('--target='.length)
  || environment.PUBLIC_DEPLOY_TARGET
  || 'staging';
if (!['staging', 'production'].includes(requestedTarget)) {
  throw new Error(`Unsupported PUBLIC_DEPLOY_TARGET: ${requestedTarget}`);
}
environment.PUBLIC_DEPLOY_TARGET = requestedTarget;
if (!environment.MONGODB_URI) {
  const line = readFileSync('.dev.vars', 'utf8').split(/\r?\n/).find(value => value.startsWith('MONGODB_URI='));
  if (!line) throw new Error('MONGODB_URI is required for public prerendering');
  environment.MONGODB_URI = JSON.parse(line.slice('MONGODB_URI='.length));
}

// Build target is explicit and injected into Astro so metadata is deterministic.
const production = requestedTarget === 'production';
writeFileSync('public/_headers', production ? '' : '/*\n  X-Robots-Tag: noindex, nofollow\n');
const started = Date.now();
const result = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
  env: environment,
  stdio: 'inherit',
});
console.log(`[stage3] Full build: ${((Date.now() - started) / 1000).toFixed(1)}s`);
if (result.status !== 0) process.exit(result.status ?? 1);
if (production) {
  const fingerprintManifest = spawnSync(process.execPath, ['scripts/content-fingerprint.mjs', '--write-manifest', 'dist/client/content-manifest.json'], {
    env: environment,
    stdio: 'inherit',
  });
  if (fingerprintManifest.status !== 0) process.exit(fingerprintManifest.status ?? 1);
  // Wrangler's prerender environment may leave the local .dev.vars file in
  // the server output. It is only a build input and must never ship.
  rmSync('dist/server/.dev.vars', { force: true });
  const verification = spawnSync(process.execPath, ['scripts/verify-production-build.mjs'], {
    env: environment,
    stdio: 'inherit',
  });
  if (verification.status !== 0) process.exit(verification.status ?? 1);
  const preparation = spawnSync(process.execPath, ['scripts/prepare-production.mjs'], {
    env: environment,
    stdio: 'inherit',
  });
  if (preparation.status !== 0) process.exit(preparation.status ?? 1);
  const secretScan = spawnSync(process.execPath, ['scripts/stage3-secret-scan.mjs'], {
    env: environment,
    stdio: 'inherit',
  });
  if (secretScan.status !== 0) process.exit(secretScan.status ?? 1);
}
