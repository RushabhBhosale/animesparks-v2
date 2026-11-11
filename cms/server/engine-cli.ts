// One-shot engine runner for cron hosts (e.g. a scheduled GitHub Action): `npm run engine -- --max=50`
import { tick } from '../core/engine';
import { engineActor } from '../core/types';
import { createNodeRuntime } from './runtime-node';

const max = Number(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] || 40);
const runtime = await createNodeRuntime();
try {
  let total = 0;
  for (let pass = 0; pass < 20 && total < max; pass++) {
    const summary = await tick({ ...runtime.base, actor: engineActor }, { workerId: `cli:${process.pid}`, maxJobs: Math.min(10, max - total), scan: pass === 0 });
    console.log(JSON.stringify(summary));
    total += summary.ran;
    if (!summary.ran) break;
  }
} finally { await runtime.close(); }
