import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, fmt, qs } from '../api';
import { Card, cx, Empty, ErrorNote, PageHeader, Select, Spinner } from '../ui';

const DOT: Record<string, string> = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-zinc-300' };
export function ActivityList({ items, project }: { items: any[]; project: any }) {
  if (!items?.length) return <Empty>No activity yet.</Empty>;
  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((e, i) => (
        <li key={i} className="flex gap-3 py-2.5 text-sm">
          <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', DOT[e.level])} />
          <div className="min-w-0 flex-1">
            <div className="break-words">{e.message}</div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500">
              <span>{fmt(e.at, project.timezone)}</span><span>{e.type}</span><span>{e.actor}</span>
              {e.articleId && <Link className="truncate text-zinc-700 underline-offset-2 hover:underline" to={`/${project._id}/articles/${encodeURIComponent(e.articleId)}`}>{e.title || e.articleId}</Link>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
const FILTERS: Record<string, string> = {
  publishing: 'publish.scheduled,publish.attempted,publish.succeeded,publish.failed,publish.live,publish.unpublished,publish.schedule_cancelled,deploy.hook_failed',
  repairs: 'metadata.repaired,article.processed,media.review', media: 'media.uploaded,hero.attached,inline.inserted,media.broken', failures: 'publish.failed,job.failed,media.broken,deploy.hook_failed', all: '',
};
export function HistoryPage({ project }: { project: any }) {
  const [filter, setFilter] = useState('publishing');
  const { data, error, isLoading } = useQuery({ queryKey: ['activity', project._id, filter], queryFn: () => api(`/projects/${project._id}/activity${qs({ types: FILTERS[filter], limit: 150 })}`), refetchInterval: 20_000 });
  return (
    <>
      <PageHeader title="Publishing History" subtitle="Every scheduling, publishing attempt, repair and failure, newest first."
        actions={<Select value={filter} onChange={e => setFilter(e.target.value)} className="w-44"><option value="publishing">Publishing</option><option value="repairs">Repairs</option><option value="media">Media</option><option value="failures">Failures</option><option value="all">Everything</option></Select>} />
      <Card className="px-5 py-2">{isLoading ? <Spinner /> : error ? <ErrorNote error={error} /> : <ActivityList items={data} project={project} />}</Card>
    </>
  );
}
