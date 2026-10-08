import { spawnSync } from 'node:child_process';

const run = (label, command, args, env = process.env) => {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${label} failed with status ${result.status ?? 'unknown'}`);
};
const environment = { ...process.env, PUBLIC_DEPLOY_TARGET: 'staging' };
run('Staging build', process.execPath, ['scripts/build.mjs', '--target=staging'], environment);
run('Staging deployment preparation', process.execPath, ['scripts/prepare-deploy.mjs'], environment);
run('Staging Worker deployment', 'node_modules/.bin/wrangler', ['deploy', '--config', 'dist/server/wrangler.json'], environment);
