// One-shot engine runner for cron hosts (e.g. a scheduled GitHub Action): `npm run engine -- --max=50`
// `--check-storage` first proves this runner can write to, publicly read from and delete in media storage.
import { tick } from '../core/engine';
import { cms } from '../core/projects';
import { engineActor } from '../core/types';
import { publicMediaUrl } from '../core/util';
import { createNodeRuntime } from './runtime-node';

const max = Number(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] || 40);
const runtime = await createNodeRuntime();
const ctx = { ...runtime.base, actor: engineActor };
try {
  if (process.argv.includes('--check-storage')) {
    for (const project of await cms(ctx).projects.find({ 'media.enabled': true }).toArray()) {
      const storage = ctx.storage(project);
      if (!storage) throw new Error(`Storage check failed for ${project._id}: no storage credentials are configured on this runner.`);
      const key = `${project.media.keyPrefix}/_healthcheck/${Date.now()}.txt`;
      await storage.put(key, new TextEncoder().encode('cms storage check'), 'text/plain');
      const status = await fetch(publicMediaUrl(ctx, project, key)).then(r => r.status).catch(() => 0);
      await storage.delete(key);
      if (status !== 200) throw new Error(`Storage check failed for ${project._id}: file was written but its public URL returned ${status || 'no response'}.`);
      console.log(`storage ok: ${project._id} (${storage.kind}) write, public read and delete succeeded`);
    }
  }
  let total = 0;
  for (let pass = 0; pass < 20 && total < max; pass++) {
    const summary = await tick(ctx, { workerId: `cli:${process.pid}`, maxJobs: Math.min(10, max - total), scan: pass === 0 });
    console.log(JSON.stringify(summary));
    total += summary.ran;
    if (!summary.ran) break;
  }
} finally { await runtime.close(); }
