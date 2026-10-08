import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.PUBLIC_DEPLOY_TARGET !== 'production') {
  throw new Error('Production Worker preparation requires PUBLIC_DEPLOY_TARGET=production.');
}

const output = 'dist';
const serverDirectory = join(output, 'server');
const configPath = join(serverDirectory, 'wrangler.json');
const clientDirectory = join(output, 'client');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

if (config.name !== 'animesparks-v2') {
  throw new Error(`Refusing production deploy: expected the existing animesparks-v2 Worker, found ${config.name}.`);
}
if (!config.r2_buckets?.some(binding => binding.binding === 'IMAGES_BUCKET' && binding.bucket_name === 'animesparks-staging')) {
  throw new Error('Refusing production deploy: the existing IMAGES_BUCKET binding changed.');
}
if (!config.routes?.some(route => route.pattern === 'admin.animesparks.blog' && route.custom_domain === true)) {
  throw new Error('Refusing production deploy: the existing admin custom domain route is missing.');
}

const headers = readFileSync(join(clientDirectory, '_headers'), 'utf8');
const homepage = readFileSync(join(clientDirectory, 'index.html'), 'utf8');
if (/X-Robots-Tag:\s*noindex/i.test(headers) || !/<meta name="robots" content="index, follow"/.test(homepage)) {
  throw new Error('Refusing production deploy: generated public assets are not indexable production output.');
}

config.main = 'guarded-worker.mjs';
config.assets = { ...config.assets, run_worker_first: true };
config.routes = [
  { pattern: 'www.animesparks.blog/*', zone_name: 'animesparks.blog' },
  { pattern: 'animesparks.blog/*', zone_name: 'animesparks.blog' },
  ...config.routes.filter(route => route.pattern !== 'www.animesparks.blog/*' && route.pattern !== 'animesparks.blog/*'),
];
// Keep the live admin behavior reported by the existing production Worker.
config.vars = { ...config.vars, ADMIN_WRITES_ENABLED: 'true' };
const rollbackConfig = {
  ...config,
  routes: config.routes.filter(route => route.pattern !== 'www.animesparks.blog/*' && route.pattern !== 'animesparks.blog/*'),
};
writeFileSync(join(serverDirectory, 'wrangler.rollback.json'), JSON.stringify(rollbackConfig, null, 2));
writeFileSync(configPath, JSON.stringify(config, null, 2));

copyFileSync('scripts/guarded-worker.mjs', join(serverDirectory, 'guarded-worker.mjs'));
const tagRouteMap = JSON.parse(readFileSync(join(clientDirectory, 'tag-route-map.json'), 'utf8'));
writeFileSync(join(serverDirectory, 'tag-route-map.mjs'), `export default ${JSON.stringify(tagRouteMap)};\n`);

const localSecretCopy = join(serverDirectory, '.dev.vars');
if (existsSync(localSecretCopy)) rmSync(localSecretCopy);

console.log('Prepared the existing animesparks-v2 Worker for www, apex redirect, admin, and workers.dev hosts.');
