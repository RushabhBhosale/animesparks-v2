// Sets the dashboard password on the deployed Worker: `npm run set-password -- [username]`
// The password is typed here, hashed locally and sent to Cloudflare as a secret; it is never stored on disk.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { askHidden } from './prompt';
import { CMS_DIR } from './runtime-node';

const put = (name: string, value: string) => {
  const result = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--config', 'wrangler.jsonc'], { cwd: CMS_DIR, input: value, stdio: ['pipe', 'ignore', 'inherit'] });
  if (result.status !== 0) throw new Error(`Could not set ${name}.`);
  console.log(`${name} set`);
};
try {
  console.log('Choose the dashboard password. Typing is hidden: nothing appears as you type.');
  const password = await askHidden('New password (at least 12 characters), then Enter: ');
  if (password.length < 12) throw new Error(`That was ${password.length} characters; the password must be at least 12. Nothing was changed.`);
  if (await askHidden('Type it again, then Enter: ') !== password) throw new Error('The two entries do not match. Nothing was changed.');
  console.log('Saving to Cloudflare…');
  put('ADMIN_PASS_HASH', createHash('sha256').update(password).digest('hex'));
  if (process.argv[2]) put('ADMIN_USER', process.argv[2]);
  console.log('Done. You can sign in to the dashboard now.');
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
