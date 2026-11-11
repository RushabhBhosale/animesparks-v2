// Sets the dashboard password on the deployed Worker: `npm run set-password -- [username]`
// The password is typed here, hashed locally and sent to Cloudflare as a secret; it is never stored on disk.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { CMS_DIR } from './runtime-node';

const ask = (question: string) => new Promise<string>(resolve => {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput(text: string): void };
  process.stdout.write(question);
  out._writeToOutput = () => {}; // do not echo the password
  rl.question('', answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
});
const put = (name: string, value: string) => {
  const result = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--config', 'wrangler.jsonc'], { cwd: CMS_DIR, input: value, stdio: ['pipe', 'inherit', 'inherit'] });
  if (result.status !== 0) throw new Error(`Could not set ${name}.`);
};
const password = await ask('New dashboard password (min 12 characters): ');
if (password.length < 12) { console.error('Password must be at least 12 characters.'); process.exit(1); }
if (await ask('Repeat password: ') !== password) { console.error('Passwords do not match.'); process.exit(1); }
put('ADMIN_PASS_HASH', createHash('sha256').update(password).digest('hex'));
if (process.argv[2]) put('ADMIN_USER', process.argv[2]);
console.log('Dashboard password updated on the deployed Worker.');
