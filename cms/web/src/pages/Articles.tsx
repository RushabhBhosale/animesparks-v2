import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ImageOff, Search } from 'lucide-react';
import { api, ago, fmt, qs } from '../api';
import { NewArticleButton } from '../App';
import { Card, Empty, ErrorNote, Input, PageHeader, Pager, Select, Spinner, StatusBadge } from '../ui';

const VIEWS: Record<string, { title: string; subtitle: string; status?: string }> = {
  all: { title: 'Content', subtitle: 'Every article in this project.' },
  draft: { title: 'Drafts', subtitle: 'Everything that is not published yet, with its workflow state.', status: 'draft' },
  scheduled: { title: 'Scheduled', subtitle: 'Articles that passed every check and are waiting for their publish time.', status: 'scheduled' },
  published: { title: 'Published', subtitle: 'Live articles. Open a post to add missing images or run full processing.', status: 'published' },
};
export function Articles({ project, view }: { project: any; view: keyof typeof VIEWS }) {
  const [q, setQ] = useState(''), [term, setTerm] = useState(''), [page, setPage] = useState(1), [status, setStatus] = useState(''), [missing, setMissing] = useState('');
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => { setTerm(q); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); setStatus(''); setMissing(''); }, [view]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) { e.preventDefault(); search.current?.focus(); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  const params = { status: status || VIEWS[view].status, q: term, page, missing, limit: 25, sort: view === 'published' ? 'published' : 'updated' };
  const { data, error, isLoading } = useQuery({ queryKey: ['articles', project._id, params], queryFn: () => api(`/projects/${project._id}/articles${qs(params)}`), placeholderData: keepPreviousData });
  return (
    <>
      <PageHeader title={VIEWS[view].title} subtitle={VIEWS[view].subtitle} actions={<NewArticleButton project={project} />} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
          <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-400" /><Input ref={search} value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, slug, tag or franchise  ( / )" className="pl-8" /></div>
          {(view === 'all' || view === 'draft') && <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-44" aria-label="Workflow status">
            <option value="">{view === 'draft' ? 'All unpublished' : 'Any status'}</option>
            {['needs_repair', 'awaiting_media', 'awaiting_review', 'ready', 'scheduled', 'failed', ...(view === 'all' ? ['published'] : [])].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>}
          <Select value={missing} onChange={e => { setMissing(e.target.value); setPage(1); }} className="w-44" aria-label="Completeness"><option value="">Complete or not</option><option value="hero">Missing hero image</option><option value="author">Missing author</option><option value="category">Missing category</option><option value="seo">Missing SEO fields</option></Select>
          <span className="ml-auto text-xs text-zinc-500">{data ? `${data.total.toLocaleString()} article${data.total === 1 ? '' : 's'}` : ''}</span>
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorNote error={error} /></div> : !data.items.length ? <Empty>No articles match.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500"><th className="w-14 py-2 pl-4" /><th className="py-2 pr-3">Title</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">{view === 'scheduled' ? 'Publishes' : view === 'published' ? 'Published' : 'Updated'}</th><th className="py-2 pr-4 text-right">Issues</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {data.items.map((a: any) => {
                  const hero = a.mainImage?.asset?.r2Key;
                  return (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="py-2 pl-4">{hero ? <img src={a.mainImage.asset.publicUrl || `${project.media.publicBaseUrl}/${hero}`} alt="" loading="lazy" className="h-8 w-12 rounded object-cover" /> : <div className="flex h-8 w-12 items-center justify-center rounded bg-zinc-100 text-zinc-400" title="No hero image"><ImageOff className="size-3.5" /></div>}</td>
                      <td className="max-w-0 py-2 pr-3"><Link to={`/${project._id}/articles/${encodeURIComponent(a.id)}`} className="block truncate font-medium hover:underline">{a.title || 'Untitled'}</Link><div className="truncate text-xs text-zinc-500">/{a.slug}{a.language && a.language !== project.defaults.language ? ` · ${a.language}` : ''}{a.animeName ? ` · ${a.animeName}` : ''}</div></td>
                      <td className="py-2 pr-3"><StatusBadge status={a.status} /></td>
                      <td className="whitespace-nowrap py-2 pr-3 text-zinc-600" title={fmt(a.updatedAt)}>{view === 'scheduled' ? fmt(a.scheduledAt, project.timezone) : view === 'published' ? fmt(a.publishedAt, project.timezone) : ago(a.updatedAt || a.publishedAt)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-zinc-600">{a.issueCount || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
      </Card>
    </>
  );
}
