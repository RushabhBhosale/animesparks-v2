// One-time setup of the deployed Worker's secrets: `npm run worker:secrets -- [username]`
// Sets MONGODB_URI (from cms/.env or the site's .dev.vars), a random session secret and the admin
// username, then asks for the dashboard password. Values go straight to Cloudflare; nothing is printed.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { CMS_DIR, loadEnv } from './runtime-node';

const env = loadEnv();
if (!env.MONGODB_URI) { console.error('MONGODB_URI not found in cms/.env or ../.dev.vars.'); process.exit(1); }
const put = (name: string, value: string) => {
  const result = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--config', 'wrangler.jsonc'], { cwd: CMS_DIR, input: value, stdio: ['pipe', 'ignore', 'inherit'] });
  if (result.status !== 0) { console.error(`Could not set ${name}.`); process.exit(1); }
  console.log(`${name} set`);
};
put('MONGODB_URI', env.MONGODB_URI);
put('ADMIN_JWT_SECRET', randomBytes(32).toString('hex'));
put('ADMIN_USER', process.argv[2] || 'admin');
const password = spawnSync('npx', ['tsx', 'server/set-password.ts'], { cwd: CMS_DIR, stdio: 'inherit' });
process.exit(password.status ?? 1);
