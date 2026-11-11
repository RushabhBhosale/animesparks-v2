import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { tick } from '../core/engine';
import { engineActor } from '../core/types';
import { createApp } from './app';
import { CMS_DIR, createNodeRuntime } from './runtime-node';

const runtime = await createNodeRuntime();
const { base, env, port } = runtime;
const app = createApp({ base: () => base, env, secureCookies: runtime.publicUrl.startsWith('https://') });

// Local development storage is served from disk; R2 is served by its own public domain.
if (runtime.storageMode === 'local') app.use('/media-files/*', serveStatic({ root: runtime.mediaDir, rewriteRequestPath: path => path.replace(/^\/media-files/, '') }));
const dist = join(CMS_DIR, 'web/dist');
if (existsSync(join(dist, 'index.html'))) {
  app.use('/assets/*', serveStatic({ root: dist }));
  const index = readFileSync(join(dist, 'index.html'), 'utf8');
  app.get('*', c => c.html(index));
} else app.get('/', c => c.text('CMS API is running. Build the dashboard with `npm run web:build` (or run `npm run web:dev`).'));

serve({ fetch: app.fetch, port }, () => console.log(`[cms] ${runtime.publicUrl}  db=${base.db.databaseName}  storage=${runtime.storageMode}  ai=${base.ai ? 'configured' : 'off'}`));

// The engine runs in-process, independent of any dashboard or assistant session. Jobs are durable in
// MongoDB, so a restart (or a second runner) simply continues where this one stopped.
if (env.CMS_ENGINE !== 'off') {
  const workerId = `node:${process.pid}`;
  const interval = Math.max(5, Number(env.CMS_ENGINE_INTERVAL_SECONDS || 20)) * 1000;
  let running = false, passes = 0;
  const pass = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await tick({ ...base, actor: engineActor }, { workerId, maxJobs: 10, scan: passes++ % 3 === 0 });
      if (summary.ran || summary.scanned?.queued) console.log('[engine]', JSON.stringify(summary));
    } catch (error) { console.error('[engine] pass failed:', (error as Error).message); }
    finally { running = false; }
  };
  setTimeout(pass, 1500);
  setInterval(pass, interval);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => runtime.close().finally(() => process.exit(0)));
