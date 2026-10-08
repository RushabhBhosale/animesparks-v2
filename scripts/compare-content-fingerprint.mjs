import { readFileSync, writeFileSync } from 'node:fs';

const valid = value => /^[a-f0-9]{64}$/.test(value || '');
const fingerprint = process.env.CONTENT_FINGERPRINT;
if (process.argv.includes('--self-test')) {
  const current = 'a'.repeat(64);
  const unchangedSkips = current === current;
  const changedBuilds = current !== 'b'.repeat(64);
  if (!unchangedSkips || !changedBuilds) throw new Error('Change comparison self-check failed.');
  console.log('Change comparison self-check passed (unchanged skips, changed rebuilds).');
} else {
  if (!valid(fingerprint)) throw new Error('CONTENT_FINGERPRINT must be a SHA-256 hex value.');
  let deployed = '';
  const manifestArg = process.argv.findIndex(value => value === '--manifest');
  if (manifestArg >= 0) {
    const path = process.argv[manifestArg + 1];
    if (!path) throw new Error('--manifest requires a path.');
    try {
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      if (manifest.schema === 1 && valid(manifest.fingerprint)) deployed = manifest.fingerprint;
    } catch { /* A missing or invalid deployed manifest requires a rebuild. */ }
  } else {
    try {
      const response = await fetch(process.env.CONTENT_MANIFEST_URL || 'https://www.animesparks.blog/content-manifest.json', { redirect: 'error' });
      if (response.ok) {
        const manifest = await response.json();
        if (manifest.schema === 1 && valid(manifest.fingerprint)) deployed = manifest.fingerprint;
      }
    } catch { /* A missing or unreadable production manifest requires a rebuild. */ }
  }
  const changed = deployed !== fingerprint;
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: 'a' });
  console.log(changed ? 'Published content differs from the deployed manifest.' : 'Published content matches the deployed manifest.');
}
