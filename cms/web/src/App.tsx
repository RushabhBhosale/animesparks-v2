import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Activity, Bot, CalendarClock, CheckCircle2, FileText, FolderTree, History, Image, LayoutDashboard, LogOut, PencilLine, Plus, Settings, Users } from 'lucide-react';
import { api } from './api';
import { Button, cx, ErrorNote, Field, Input, Modal, Select, Spinner, useAction } from './ui';
import { Overview } from './pages/Overview';
import { Articles } from './pages/Articles';
import { Editor } from './pages/Editor';
import { Media } from './pages/Media';
import { Taxonomy } from './pages/Taxonomy';
import { Automation } from './pages/Automation';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';

const NAV = [
  ['overview', 'Overview', LayoutDashboard], ['content', 'Content', FileText], ['drafts', 'Drafts', PencilLine], ['scheduled', 'Scheduled', CalendarClock], ['published', 'Published', CheckCircle2],
  ['media', 'Media Library', Image], ['authors', 'Authors', Users], ['categories', 'Categories', FolderTree], ['automation', 'Automation', Bot], ['history', 'Publishing History', History], ['settings', 'Project Settings', Settings],
] as const;

function Login({ onDone }: { onDone(): void }) {
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(null);
    try { await api('/auth/login', { body: { username: form.get('username'), password: form.get('password') } }); onDone(); } catch (e) { setError(e); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-7 shadow-sm">
        <div><div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-ink text-white"><Activity className="size-4" /></div><h1 className="text-lg font-semibold">Sign in to the CMS</h1><p className="text-sm text-zinc-500">Content, media and publishing automation.</p></div>
        <Field label="Username"><Input name="username" autoComplete="username" autoFocus required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <ErrorNote error={error} />
        <Button type="submit" variant="primary" busy={busy} className="w-full">Sign in</Button>
      </form>
    </div>
  );
}

function NewProject({ onClose }: { onClose(): void }) {
  const { busy, run } = useAction(), navigate = useNavigate(), client = useQueryClient();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    run('create', () => api('/projects', { body: { name: f.get('name'), siteUrl: f.get('siteUrl'), timezone: f.get('timezone') || 'UTC' } }), p => { client.invalidateQueries({ queryKey: ['projects'] }); onClose(); navigate(`/${p._id}/settings`); return `Project "${p.name}" created`; });
  };
  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><Input name="name" required placeholder="My other site" /></Field>
        <Field label="Site URL"><Input name="siteUrl" type="url" required placeholder="https://example.com" /></Field>
        <Field label="Time zone" hint="IANA name"><Input name="timezone" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} /></Field>
        <p className="text-xs text-zinc-500">New projects get their own collections, media library and credentials, and start in manual-approval mode.</p>
        <div className="flex justify-end gap-2 pt-1"><Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" busy={busy === 'create'}>Create project</Button></div>
      </form>
    </Modal>
  );
}

function Shell() {
  const { pid = '' } = useParams(), navigate = useNavigate(), client = useQueryClient();
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => api<any[]>('/projects') });
  const [creating, setCreating] = useState(false);
  const project = projects.data?.find(p => p._id === pid);
  if (projects.isLoading) return <Spinner />;
  if (projects.error) return <div className="p-8"><ErrorNote error={projects.error} /></div>;
  if (!project) return projects.data?.[0] ? <Navigate to={`/${projects.data[0]._id}/overview`} replace /> : <div className="p-8 text-sm">No projects yet. <Button onClick={() => setCreating(true)}>Create one</Button>{creating && <NewProject onClose={() => setCreating(false)} />}</div>;
  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-ink text-zinc-300 max-md:w-14">
        <div className="border-b border-white/10 p-3">
          <div className="max-md:hidden">
            <Select aria-label="Project" value={pid} onChange={e => e.target.value === '+' ? setCreating(true) : navigate(`/${e.target.value}/overview`)} className="!border-white/15 !bg-white/5 font-medium !text-white">
              {projects.data!.map(p => <option key={p._id} value={p._id} className="text-ink">{p.name}</option>)}
              <option value="+" className="text-ink">+ New project…</option>
            </Select>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map(([path, label, Icon], i) => (
            <NavLink key={path} to={`/${pid}/${path}`} title={label} className={({ isActive }) => cx('flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors', i === 5 || i === 8 ? 'mt-3' : '', isActive ? 'bg-white/12 text-white' : 'hover:bg-white/6 hover:text-white')}>
              <Icon className="size-4 shrink-0" /><span className="max-md:hidden">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-2">
          <button onClick={async () => { await api('/auth/logout', { method: 'POST' }); client.clear(); window.location.assign('/'); }} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] hover:bg-white/6 hover:text-white"><LogOut className="size-4" /><span className="max-md:hidden">Sign out</span></button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="overview" element={<Page><Overview project={project} /></Page>} />
          <Route path="content" element={<Page><Articles project={project} view="all" /></Page>} />
          <Route path="drafts" element={<Page><Articles project={project} view="draft" /></Page>} />
          <Route path="scheduled" element={<Page><Articles project={project} view="scheduled" /></Page>} />
          <Route path="published" element={<Page><Articles project={project} view="published" /></Page>} />
          <Route path="articles/:id" element={<Editor project={project} />} />
          <Route path="media" element={<Page><Media project={project} /></Page>} />
          <Route path="authors" element={<Page><Taxonomy project={project} kind="authors" /></Page>} />
          <Route path="categories" element={<Page><Taxonomy project={project} kind="categories" /></Page>} />
          <Route path="automation" element={<Page><Automation project={project} /></Page>} />
          <Route path="history" element={<Page><HistoryPage project={project} /></Page>} />
          <Route path="settings" element={<Page><SettingsPage project={project} /></Page>} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </main>
      {creating && <NewProject onClose={() => setCreating(false)} />}
    </div>
  );
}
const Page = ({ children }: { children: React.ReactNode }) => <div className="mx-auto max-w-[1180px] px-6 py-6">{children}</div>;

export function NewArticleButton({ project }: { project: any }) {
  const [open, setOpen] = useState(false), navigate = useNavigate(), { busy, run } = useAction();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) { e.preventDefault(); setOpen(true); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get('title') || '').trim();
    run('new', () => api(`/projects/${project._id}/articles`, { body: { title } }), a => { setOpen(false); navigate(`/${project._id}/articles/${encodeURIComponent(a.id)}`); });
  };
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} title="New article (N)"><Plus className="size-4" />New article</Button>
      {open && <Modal title="New article" onClose={() => setOpen(false)}><form onSubmit={submit} className="space-y-3"><Field label="Title"><Input name="title" autoFocus required maxLength={180} placeholder="Working title" /></Field><div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="primary" busy={busy === 'new'}>Create draft</Button></div></form></Modal>}
    </>
  );
}

export function App() {
  const client = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api('/auth/me'), retry: false });
  useEffect(() => { const on = () => client.invalidateQueries({ queryKey: ['me'] }); window.addEventListener('cms:unauthorized', on); return () => window.removeEventListener('cms:unauthorized', on); }, [client]);
  if (me.isLoading) return <Spinner />;
  if (me.error) return <Login onDone={() => client.invalidateQueries()} />;
  return <Routes><Route path="/:pid/*" element={<Shell />} /><Route path="*" element={<Shell />} /></Routes>;
}
