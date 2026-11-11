import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { NewArticleButton } from '../App';
import { Card, cx, ErrorNote, PageHeader, Section, Spinner } from '../ui';
import { ActivityList } from './History';

export function Stat({ label, value, to, tone }: { label: string; value: number; to?: string; tone?: 'warn' | 'bad' | 'good' }) {
  const body = (
    <Card className={cx('px-4 py-3.5 transition-colors', to && 'hover:border-zinc-400')}>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className={cx('mt-1 text-2xl font-semibold tabular-nums', value > 0 && tone === 'warn' && 'text-amber-700', value > 0 && tone === 'bad' && 'text-red-700', tone === 'good' && 'text-emerald-700')}>{value.toLocaleString()}</div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
export function Overview({ project }: { project: any }) {
  const { data, error, isLoading } = useQuery({ queryKey: ['overview', project._id], queryFn: () => api(`/projects/${project._id}/overview`), refetchInterval: 15_000 });
  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote error={error} />;
  const c = data.counts, base = `/${project._id}`;
  return (
    <>
      <PageHeader title={project.name} subtitle={<>{project.siteUrl} · {project.timezone} · {data.project.approvalMode === 'manual' ? 'Manual approval' : data.project.approvalMode === 'auto' ? 'Auto-publish when complete' : 'Scheduled publishing'}</>} actions={<NewArticleButton project={project} />} />
      {!data.project.automation && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Automation is paused for this project: new drafts are stored but not repaired or published automatically. <Link className="font-medium underline" to={`${base}/automation`}>Turn it on</Link></div>}
      {!data.runtime.storage && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">Media storage is not configured on this server, so images cannot be uploaded. Set the R2 credentials (see cms/.env.example).</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Published" value={c.published} to={`${base}/published`} />
        <Stat label="Drafts" value={c.drafts} to={`${base}/drafts`} />
        <Stat label="Scheduled" value={c.scheduled} to={`${base}/scheduled`} />
        <Stat label="Awaiting review" value={c.awaitingReview} to={`${base}/drafts`} tone="warn" />
        <Stat label="Awaiting repair" value={c.awaitingRepair} to={`${base}/automation`} tone="warn" />
        <Stat label="Missing images" value={c.missingImages} to={`${base}/automation`} tone="warn" />
        <Stat label="Failed jobs" value={c.failedJobs} to={`${base}/automation`} tone="bad" />
        <Stat label="Media assets" value={c.media} to={`${base}/media`} />
      </div>
      <div className="mt-5"><Section title="Recent activity" description="What the engine and editors did most recently."><ActivityList items={data.recent} project={project} /></Section></div>
    </>
  );
}
