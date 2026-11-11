import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, RefreshCw } from 'lucide-react';
import { api, ago, fmt } from '../api';
import { Badge, Button, Empty, ErrorNote, PageHeader, Section, Spinner, StatusBadge, Toggle, useAction } from '../ui';
import { ActivityList } from './History';
import { Stat } from './Overview';

export function Automation({ project }: { project: any }) {
  const client = useQueryClient(), { busy, run } = useAction(), pid = project._id;
  const live = { refetchInterval: 8_000 };
  const overview = useQuery({ queryKey: ['overview', pid], queryFn: () => api(`/projects/${pid}/overview`), ...live });
  const queue = useQuery({ queryKey: ['repair-queue', pid], queryFn: () => api<any[]>(`/projects/${pid}/repair-queue`), ...live });
  const failed = useQuery({ queryKey: ['jobs', pid, 'failed'], queryFn: () => api<any[]>(`/projects/${pid}/jobs?status=failed,dead`), ...live });
  const active = useQuery({ queryKey: ['jobs', pid, 'active'], queryFn: () => api<any[]>(`/projects/${pid}/jobs?status=queued,running&limit=20`), ...live });
  const activity = useQuery({ queryKey: ['activity', pid, 'automation'], queryFn: () => api<any[]>(`/projects/${pid}/activity?limit=25`), ...live });
  const refresh = () => client.invalidateQueries({ predicate: q => ['overview', 'repair-queue', 'jobs', 'activity', 'projects'].includes(q.queryKey[0] as string) });
  const act = (key: string, path: string, message: (r: any) => string) => run(key, () => api(`/projects/${pid}${path}`, { method: 'POST', body: {} }), r => { refresh(); return message(r); });
  if (overview.isLoading) return <Spinner />;
  if (overview.error) return <ErrorNote error={overview.error} />;
  const c = overview.data.counts, rt = overview.data.runtime;
  return (
    <>
      <PageHeader title="Automation" subtitle="The engine validates new drafts, repairs metadata, sources images and publishes by policy — independently of any assistant session."
        actions={<><Button onClick={refresh}><RefreshCw className="size-3.5" />Refresh</Button><Button busy={busy === 'run'} onClick={() => act('run', '/engine/run', r => `Engine pass: ${r.ran} job${r.ran === 1 ? '' : 's'} run, ${r.succeeded} succeeded, ${r.failed} failed${r.scanned ? `, ${r.scanned.queued} newly queued` : ''}`)}><Play className="size-3.5" />Run engine now</Button></>} />
      <Section title="Engine" description={`Storage: ${rt.storage || 'not configured'} · Image processing: ${rt.images ? 'available' : 'not available on this runtime'} · AI text: ${rt.aiText ? 'on' : 'off'} · AI images: ${rt.aiImage ? 'on' : 'off'}`}>
        <Toggle checked={project.automation.enabled} label="Process new and changed drafts automatically"
          description={project.automation.enabled ? `On since ${fmt(project.automation.enabledAt, project.timezone)}. Drafts created or edited after that are processed; older drafts are only inspected and listed below.` : 'Paused. Drafts are stored but nothing is repaired, scheduled or published until this is on.'}
          onChange={enabled => run('toggle', () => api(`/projects/${pid}`, { method: 'PATCH', body: { automation: { enabled } } }), () => { refresh(); return enabled ? 'Automation enabled' : 'Automation paused'; })} />
      </Section>
      <div className="my-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total drafts" value={c.drafts} /><Stat label="Missing images" value={c.missingImages} tone="warn" /><Stat label="Missing metadata" value={c.missingMetadata} tone="warn" /><Stat label="Awaiting repair" value={c.awaitingRepair} tone="warn" />
        <Stat label="Scheduled" value={c.scheduled} /><Stat label="Failed jobs" value={c.failedJobs} tone="bad" /><Stat label="Processed (7 days)" value={c.processedThisWeek} tone="good" /><Stat label="Jobs in queue" value={c.queuedJobs} />
      </div>
      <div className="space-y-4">
        <Section title="Repair queue" description="Articles that cannot be published yet, and why.">
          {queue.isLoading ? <Spinner /> : queue.error ? <ErrorNote error={queue.error} /> : !queue.data!.length ? <Empty>Nothing needs attention.</Empty> : (
            <ul className="divide-y divide-zinc-100">
              {queue.data!.map(row => (
                <li key={row.id} className="flex flex-wrap items-start gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Link to={`/${pid}/articles/${encodeURIComponent(row.id)}`} className="truncate font-medium hover:underline">{row.title}</Link><StatusBadge status={row.status} />{row.pendingRequest && <Badge className="bg-violet-100 text-violet-800">{row.pendingRequest === 'publish' ? 'Publish requested' : 'Schedule requested'}</Badge>}</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-700">
                      {row.issues.map((i: any, n: number) => <li key={n}>{i.message}{!i.repairable && <span className="text-zinc-500"> — needs a person</span>}</li>)}
                      {row.lastError && <li className="text-red-700">{row.lastError}</li>}
                    </ul>
                    <div className="mt-1 text-xs text-zinc-500">Updated {ago(row.updatedAt)}{row.warnings ? ` · ${row.warnings} warning${row.warnings > 1 ? 's' : ''}` : ''}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" busy={busy === `m${row.id}`} onClick={() => act(`m${row.id}`, `/articles/${encodeURIComponent(row.id)}/repair`, r => r.repaired.length ? `Repaired ${r.repaired.map((x: any) => x.field).join(', ')}${r.unresolved.length ? `. Unresolved: ${r.unresolved.join('; ')}` : ''}` : r.unresolved.length ? `Nothing repaired. ${r.unresolved.join('; ')}` : 'Metadata was already complete')}>Repair metadata</Button>
                    <Button size="sm" busy={busy === `i${row.id}`} onClick={() => act(`i${row.id}`, `/articles/${encodeURIComponent(row.id)}/images`, r => r.queued ? 'Image job queued for an image-capable runner' : `Hero: ${r.hero}. Inline added: ${r.inlineAdded}${r.inlineMissing ? `, still missing ${r.inlineMissing}` : ''}${r.notes?.length ? ` (${r.notes.join('; ')})` : ''}`)}>Process images</Button>
                    <Button size="sm" busy={busy === `p${row.id}`} onClick={() => act(`p${row.id}`, `/articles/${encodeURIComponent(row.id)}/process`, () => 'Queued for full processing')}>Retry processing</Button>
                    <Link to={`/${pid}/articles/${encodeURIComponent(row.id)}`}><Button size="sm" variant="ghost">Open</Button></Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Failed jobs" description="Permanent failures and jobs that used up their retries.">
          {failed.isLoading ? <Spinner /> : !failed.data?.length ? <Empty>No failed jobs.</Empty> : (
            <ul className="divide-y divide-zinc-100">
              {failed.data.map(job => (
                <li key={job._id} className="flex items-start gap-4 py-3 text-sm">
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-medium">{job.type.replace(/_/g, ' ')}</span><StatusBadge status={job.status} /><span className="text-xs text-zinc-500">{job.attempts}/{job.maxAttempts} attempts · {ago(job.updatedAt)}</span></div><div className="mt-0.5 break-words text-red-700">{job.error}</div>{job.articleId && <Link className="text-xs text-zinc-600 underline" to={`/${pid}/articles/${encodeURIComponent(job.articleId)}`}>{job.articleId}</Link>}</div>
                  <Button size="sm" busy={busy === job._id} onClick={() => act(job._id, `/jobs/${job._id}/retry`, () => 'Job re-queued')}>Retry</Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
        {!!active.data?.length && <Section title="In progress" description="Queued and running jobs, including scheduled retries.">
          <ul className="divide-y divide-zinc-100 text-sm">{active.data.map(job => <li key={job._id} className="flex flex-wrap items-center gap-2 py-2"><span className="font-medium">{job.type.replace(/_/g, ' ')}</span><StatusBadge status={job.status} /><span className="text-xs text-zinc-500">attempt {job.attempts}/{job.maxAttempts} · runs {ago(job.runAt)}</span>{job.error && <span className="w-full text-xs text-amber-700">Last error: {job.error}</span>}</li>)}</ul>
        </Section>}
        <Section title="Recent processing activity">{activity.isLoading ? <Spinner /> : <ActivityList items={activity.data || []} project={project} />}</Section>
      </div>
    </>
  );
}
