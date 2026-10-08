import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.PUBLIC_DEPLOY_TARGET === 'production') {
  throw new Error('Refusing to prepare a production build with the staging Worker configuration. Production cutover must use a separately reviewed deployment target.');
}

const output = 'dist';
const serverConfigPath = join(output, 'server', 'wrangler.json');
const serverConfig = JSON.parse(readFileSync(serverConfigPath, 'utf8'));
const stagingHeaders = readFileSync(join(output, 'client', '_headers'), 'utf8');
const stagingHome = readFileSync(join(output, 'client', 'index.html'), 'utf8');
if (!/X-Robots-Tag:\s*noindex,\s*nofollow/i.test(stagingHeaders) || !/<meta name="robots" content="noindex, nofollow"/.test(stagingHome)) {
  throw new Error('Refusing staging deployment: output is missing its noindex,nofollow safeguard.');
}
serverConfig.main = 'guarded-worker.mjs';
serverConfig.assets = { ...serverConfig.assets, run_worker_first: true };
writeFileSync(serverConfigPath, JSON.stringify(serverConfig));
copyFileSync('scripts/guarded-worker.mjs', join(output, 'server', 'guarded-worker.mjs'));
const tagRouteMap = JSON.parse(readFileSync(join(output, 'client', 'tag-route-map.json'), 'utf8'));
writeFileSync(join(output, 'server', 'tag-route-map.mjs'), `export default ${JSON.stringify(tagRouteMap)};\n`);
const localSecretCopy = join(output, 'server', '.dev.vars');
if (existsSync(localSecretCopy)) rmSync(localSecretCopy);
const localSecrets = '.dev.vars';
if (existsSync(localSecrets)) {
  const line = readFileSync(localSecrets, 'utf8').split(/\r?\n/).find(x => x.startsWith('MONGODB_URI='));
  if (line) {
    const uri = JSON.parse(line.slice('MONGODB_URI='.length));
    const inspect = dir => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) inspect(file);
        else if (readFileSync(file).includes(uri)) throw new Error('Build output contains a local secret');
      }
    };
    inspect(output);
  }
}
console.log('Deploy output contains no local MongoDB secret');
