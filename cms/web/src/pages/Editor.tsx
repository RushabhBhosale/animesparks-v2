import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Node } from '@tiptap/core';
import { EditorContent, useEditor, type Editor as TipTap } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ArrowLeft, Bold, Code, ExternalLink, Heading2, Heading3, Heading4, ImagePlus, Italic, Link2, Link2Off, List, ListOrdered, Quote, Redo2, Search, Undo2 } from 'lucide-react';
import { portableTextToTiptap, tiptapToPortableText } from '../../../../src/lib/admin/portable-text-adapter';
import { api, ApiError, ago, fmt, qs } from '../api';
import { Badge, Button, Card, cx, ErrorNote, Field, Input, Modal, Select, Spinner, StatusBadge, Textarea, useAction, useToast } from '../ui';
import { ActivityList } from './History';
import { MediaBrowser, UploadForm } from './Media';

// Same node names and attributes as the site's existing editor, so Portable Text round-trips unchanged.
const PtImage = Node.create({
  name: 'ptImage', group: 'block', atom: true, draggable: true, selectable: true,
  addAttributes: () => ({ r2Key: { default: null }, publicUrl: { default: null }, sanityId: { default: null }, alt: { default: '' }, caption: { default: '' }, _key: { default: null }, extraFields: { default: null } }),
  parseHTML: () => [{ tag: 'figure[data-pt-image]' }],
  renderHTML({ node }) {
    const a = node.attrs, img = ['img', { src: a.publicUrl || '', alt: a.alt || '', 'data-key': a.r2Key || '' }];
    return ['figure', { 'data-pt-image': '' }, img, ['figcaption', {}, a.caption || (a.alt ? `Alt: ${a.alt}` : 'No alt text')]] as never;
  },
});
const PtRaw = Node.create({
  name: 'portableTextBlock', group: 'block', atom: true, addAttributes: () => ({ json: { default: '{}' } }), parseHTML: () => [{ tag: 'div[data-pt-raw]' }],
  renderHTML: ({ node }) => ['div', { 'data-pt-raw': '', class: 'pt-raw' }, `Unsupported block kept as-is: ${String(node.attrs.json).slice(0, 80)}`],
});

function Tool({ active, title, onClick, children, disabled }: { active?: boolean; title: string; onClick(): void; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" title={title} aria-label={title} aria-pressed={active} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onClick} className={cx('flex size-8 items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 disabled:opacity-30', active && 'bg-zinc-200 text-ink')}>{children}</button>;
}
function LinkPicker({ project, onPick, onClose }: { project: any; onPick(article: any): void; onClose(): void }) {
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['link-search', project._id, q], queryFn: () => api(`/projects/${project._id}/articles${qs({ q, status: 'published', limit: 12, sort: 'published' })}`) });
  return (
    <Modal title="Link to a published article" onClose={onClose}>
      <div className="relative mb-3"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-400" /><Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search published articles" className="pl-8" /></div>
      {isLoading ? <Spinner /> : <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto">{data.items.map((a: any) => <li key={a.id}><button type="button" onClick={() => onPick(a)} className="block w-full px-1 py-2 text-left text-sm hover:bg-zinc-50"><div className="font-medium">{a.title}</div><div className="text-xs text-zinc-500">/{a.slug}</div></button></li>)}</ul>}
    </Modal>
  );
}
function ImagePicker({ project, franchise, onPick, onClose }: { project: any; franchise?: string; onPick(asset: any): void; onClose(): void }) {
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  return (
    <Modal title="Choose an image" onClose={onClose} wide>
      <div className="mb-3 flex gap-1">{(['library', 'upload'] as const).map(t => <Button key={t} size="sm" variant={tab === t ? 'primary' : 'ghost'} onClick={() => setTab(t)}>{t === 'library' ? 'Media library' : 'Upload new'}</Button>)}</div>
      {tab === 'library' ? <MediaBrowser project={project} onPick={onPick} franchise={franchise} /> : <UploadForm project={project} franchise={franchise} onDone={onPick} />}
    </Modal>
  );
}
function Toolbar({ editor, project, franchise }: { editor: TipTap; project: any; franchise?: string }) {
  const [picker, setPicker] = useState<'link' | 'image' | null>(null), [, force] = useState(0);
  useEffect(() => { const on = () => force(n => n + 1); editor.on('transaction', on); return () => { editor.off('transaction', on); }; }, [editor]);
  const chain = () => editor.chain().focus();
  const urlFor = (a: any) => project.siteUrl.replace(/\/$/, '') + ((a.language && project.urls.byLanguage?.[a.language]) || project.urls.article).replace('{slug}', a.slug);
  const externalLink = () => { const href = window.prompt('Link URL (https://…)', editor.getAttributes('link').href || 'https://'); if (href === null) return; href.trim() ? chain().extendMarkRange('link').setLink({ href: href.trim() }).run() : chain().unsetLink().run(); };
  const image = editor.isActive('ptImage') ? editor.getAttributes('ptImage') : null;
  return (
    <div className="sticky top-0 z-10 rounded-t-lg border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <Tool title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Tool>
        <Tool title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Tool>
        <Tool title="Heading 4" active={editor.isActive('heading', { level: 4 })} onClick={() => chain().toggleHeading({ level: 4 }).run()}><Heading4 className="size-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        <Tool title="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><Bold className="size-4" /></Tool>
        <Tool title="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><Italic className="size-4" /></Tool>
        <Tool title="Inline code" active={editor.isActive('code')} onClick={() => chain().toggleCode().run()}><Code className="size-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        <Tool title="Bullet list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}><List className="size-4" /></Tool>
        <Tool title="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="size-4" /></Tool>
        <Tool title="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}><Quote className="size-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        <Tool title="Link" active={editor.isActive('link')} onClick={externalLink}><ExternalLink className="size-4" /></Tool>
        <Tool title="Internal link to a published article" onClick={() => setPicker('link')}><Link2 className="size-4" /></Tool>
        <Tool title="Remove link" disabled={!editor.isActive('link')} onClick={() => chain().unsetLink().run()}><Link2Off className="size-4" /></Tool>
        <Tool title="Insert image" onClick={() => setPicker('image')}><ImagePlus className="size-4" /></Tool>
        <span className="ml-auto" />
        <Tool title="Undo (⌘Z)" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}><Undo2 className="size-4" /></Tool>
        <Tool title="Redo (⇧⌘Z)" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}><Redo2 className="size-4" /></Tool>
      </div>
      {image && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50 px-3 py-2">
          <span className="text-xs font-medium text-zinc-600">Image</span>
          <Input aria-label="Alt text" placeholder="Alt text (describe the image)" value={image.alt || ''} onChange={e => editor.commands.updateAttributes('ptImage', { alt: e.target.value })} className="h-8 min-w-48 flex-1" />
          <Input aria-label="Caption" placeholder="Caption (optional)" value={image.caption || ''} onChange={e => editor.commands.updateAttributes('ptImage', { caption: e.target.value })} className="h-8 min-w-48 flex-1" />
          <Button size="sm" variant="danger" onClick={() => chain().deleteSelection().run()}>Remove</Button>
        </div>
      )}
      {picker === 'link' && <LinkPicker project={project} onClose={() => setPicker(null)} onPick={a => { const href = urlFor(a); editor.state.selection.empty ? chain().insertContent({ type: 'text', text: a.title, marks: [{ type: 'link', attrs: { href } }] }).run() : chain().setLink({ href }).run(); setPicker(null); }} />}
      {picker === 'image' && <ImagePicker project={project} franchise={franchise} onClose={() => setPicker(null)} onPick={a => { chain().insertContent({ type: 'ptImage', attrs: { r2Key: a.r2Key, publicUrl: a.publicUrl, alt: a.alt || '', caption: '' } }).run(); setPicker(null); }} />}
    </div>
  );
}

const Panel = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => <Card className="p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>{right}</div><div className="space-y-3">{children}</div></Card>;
const Count = ({ value, max, min }: { value: string; max: number; min?: number }) => <span className={cx(value.length > max || (min && value.length > 0 && value.length < min) ? 'text-amber-600' : '')}>{value.length}/{max}</span>;
const formOf = (a: any) => ({
  title: a.title || '', slug: a.slug || '', excerpt: a.excerpt || '', seoTitle: a.metaTitle || '', seoDescription: a.metaDescription || '', authorId: a.authorSanityId || '', categoryIds: (a.categorySanityIds || []) as string[],
  tags: (a.tags || []).join(', '), hero: a.mainImage?.asset?.r2Key ? { assetKey: a.mainImage.asset.r2Key, alt: a.mainImage.alt || '', url: a.mainImage.asset.publicUrl } : null as null | { assetKey: string; alt: string; url?: string },
  canonicalUrl: a.meta?.seo?.canonicalUrl || '', ogTitle: a.meta?.seo?.ogTitle || '', ogDescription: a.meta?.seo?.ogDescription || '', ogImage: a.meta?.seo?.ogImage || '', fields: {} as Record<string, any>,
});

export function Editor({ project }: { project: any }) {
  const { id = '' } = useParams(), pid = project._id, client = useQueryClient(), toast = useToast(), { busy, run } = useAction();
  const base = `/projects/${pid}/articles/${encodeURIComponent(id)}`, draftKey = `cms:draft:${pid}:${id}`;
  const article = useQuery({ queryKey: ['article', pid, id], queryFn: () => api(base), refetchInterval: 12_000 });
  const authors = useQuery({ queryKey: ['authors', pid], queryFn: () => api<any[]>(`/projects/${pid}/authors`) });
  const categories = useQuery({ queryKey: ['categories', pid], queryFn: () => api<any[]>(`/projects/${pid}/categories`) });
  const revisions = useQuery({ queryKey: ['revisions', pid, id], queryFn: () => api<any[]>(`${base}/revisions`) });
  const activity = useQuery({ queryKey: ['activity', pid, id], queryFn: () => api<any[]>(`${base}/activity`), refetchInterval: 12_000 });

  const [form, setForm] = useState<ReturnType<typeof formOf> | null>(null);
  const [version, setVersion] = useState(0), [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [savedAt, setSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false), [recovered, setRecovered] = useState<any | null>(null), [heroPicker, setHeroPicker] = useState(false), [scheduleAt, setScheduleAt] = useState('');
  const state = useRef({ form, version, dirty, saving, bodyDirty: false, base: null as ReturnType<typeof formOf> | null });
  state.current = { ...state.current, form, version, dirty, saving };
  const touch = useCallback(() => setDirty(true), []);
  const editor = useEditor({
    extensions: [StarterKit.configure({ codeBlock: false, horizontalRule: false, hardBreak: false, heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: false } }), PtImage, PtRaw],
    editorProps: { attributes: { class: 'prose-editor', 'aria-label': 'Article body' } },
    onUpdate: () => { state.current.bodyDirty = true; touch(); },
  });
  const set = (patch: Partial<ReturnType<typeof formOf>>) => { setForm(f => f && { ...f, ...patch }); touch(); };

  // Load / reload from the server whenever it has a newer version and there are no local edits to lose.
  const load = useCallback((a: any) => {
    const next = { ...formOf(a), fields: Object.fromEntries(project.customFields.map((f: any) => [f.key, a[f.key] ?? ''])) };
    setForm(next);
    state.current.base = next;
    editor?.commands.setContent(portableTextToTiptap(a.body || []) as never, { emitUpdate: false });
    state.current.bodyDirty = false;
    setVersion(a.meta.version); setDirty(false); setConflict(false);
  }, [editor, project.customFields]);
  useEffect(() => {
    const a = article.data;
    if (!a || !editor) return;
    if (!form) {
      load(a);
      try { const saved = JSON.parse(localStorage.getItem(draftKey) || 'null'); if (saved?.doc) setRecovered({ ...saved, stale: saved.version !== a.meta.version }); } catch { /* ignore a corrupt local draft */ }
    } else if (a.meta.version > version) { if (dirty) setConflict(true); else load(a); }
  }, [article.data, editor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only what this editor changed since it loaded is sent, so repairs made meanwhile by the engine are never overwritten.
  const save = useCallback(async (opts: { overVersion?: number } = {}) => {
    const s = state.current, a = article.data;
    if (!s.form || !s.base || !a || !editor || s.saving || !s.dirty) return;
    const f = s.form, original = s.base, body: Record<string, any> = {};
    if (f.title !== original.title) body.title = f.title;
    if (f.slug !== original.slug) body.slug = f.slug;
    if (f.excerpt !== original.excerpt) body.excerpt = f.excerpt;
    if (f.seoTitle !== original.seoTitle) body.seoTitle = f.seoTitle;
    if (f.seoDescription !== original.seoDescription) body.seoDescription = f.seoDescription;
    if (f.authorId !== original.authorId) body.authorId = f.authorId;
    if (JSON.stringify(f.categoryIds) !== JSON.stringify(original.categoryIds)) body.categoryIds = f.categoryIds;
    if (f.tags !== original.tags) body.tags = f.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    if (JSON.stringify(f.hero && { k: f.hero.assetKey, a: f.hero.alt }) !== JSON.stringify(original.hero && { k: original.hero.assetKey, a: original.hero.alt })) body.heroImage = f.hero ? { assetKey: f.hero.assetKey, alt: f.hero.alt } : null;
    if (f.canonicalUrl && f.canonicalUrl !== original.canonicalUrl) body.canonicalUrl = f.canonicalUrl;
    if (f.ogTitle !== original.ogTitle || f.ogDescription !== original.ogDescription || f.ogImage !== original.ogImage) body.openGraph = { title: f.ogTitle || undefined, description: f.ogDescription || undefined, image: f.ogImage || undefined };
    const fields = Object.fromEntries(Object.entries(f.fields).filter(([k, v]) => (original.fields[k] ?? '') !== v && !(k === 'language' && a[k])));
    if (Object.keys(fields).length) body.fields = fields;
    if (s.bodyDirty) body.body = tiptapToPortableText(editor.getJSON() as never);
    if (!Object.keys(body).length) { setDirty(false); return; }
    setSaving(true);
    try {
      const next = await api(base, { method: 'PATCH', body: { ...body, expectedVersion: opts.overVersion ?? s.version } });
      client.setQueryData(['article', pid, id], next);
      state.current.bodyDirty = false;
      state.current.base = f;
      setVersion(next.meta.version); setDirty(false); setSavedAt(new Date().toISOString());
      if (opts.overVersion) load(next);
      localStorage.removeItem(draftKey);
      client.invalidateQueries({ queryKey: ['revisions', pid, id] });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'version_conflict') setConflict(true);
      else toast('error', `Not saved: ${(error as Error).message}${Array.isArray((error as ApiError).details) ? ` ${(error as ApiError).details.map((d: any) => d.message || d).join(' ')}` : ''}`);
    } finally { setSaving(false); }
  }, [article.data, editor, base, client, pid, id, draftKey, toast, load]);

  // Autosave after a pause, keep a local copy for recovery, ⌘S to save now.
  useEffect(() => {
    if (!dirty || !form || !editor || conflict) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ version, form, doc: editor.getJSON(), at: new Date().toISOString() })); } catch { /* storage full */ }
    const timer = setTimeout(() => save(), 2500);
    return () => clearTimeout(timer);
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } };
    const onLeave = (e: BeforeUnloadEvent) => { if (state.current.dirty) e.preventDefault(); };
    window.addEventListener('keydown', onKey); window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onLeave); };
  }, [save]);

  const refresh = () => client.invalidateQueries({ predicate: q => ['article', 'activity', 'revisions', 'overview', 'repair-queue', 'articles'].includes(q.queryKey[0] as string) });
  const act = async (key: string, path: string, message: (r: any) => string | void, body: unknown = {}, method = 'POST') => { if (state.current.dirty) await save(); return run(key, () => api(`${base}${path}`, { method, body: method === 'DELETE' ? undefined : body }), r => { refresh(); return message(r); }); };
  const publishMessage = (r: any) => r.outcome === 'published' ? `Published. ${r.liveCheck === 'queued' ? 'The public URL will be confirmed once the site rebuilds.' : ''}` : r.outcome === 'scheduled' ? `Scheduled for ${fmt(r.scheduledAt, project.timezone)} (${project.timezone})` : r.outcome === 'already_published' ? 'Already published' : `${r.message} ${r.issues.map((i: any) => i.message).join(' ')}`;
  const wordCount = useMemo(() => editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0, [editor, version, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  if (article.isLoading || !form || !editor) return article.error ? <div className="p-8"><ErrorNote error={article.error} /></div> : <Spinner />;
  const a = article.data, meta = a.meta, published = a.publicationState === 'published', issues: any[] = meta.issues || [];
  const franchise = String(form.fields.animeName || '') || undefined;
  return (
    <div className="mx-auto max-w-[1380px] px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to={`/${pid}/${published ? 'published' : 'drafts'}`} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-ink"><ArrowLeft className="size-4" />{published ? 'Published' : 'Drafts'}</Link>
        <StatusBadge status={meta.status} />
        {meta.scheduledAt && meta.status === 'scheduled' && <span className="text-xs text-zinc-500">publishes {fmt(meta.scheduledAt, project.timezone)}</span>}
        <span className="text-xs text-zinc-500" aria-live="polite">{conflict ? 'Changed elsewhere' : saving ? 'Saving…' : dirty ? 'Unsaved changes' : savedAt ? `Saved ${ago(savedAt)}` : `Version ${version}`} · {wordCount} words</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`/api${base}/preview`} target="_blank" rel="noreferrer"><Button>Preview</Button></a>
          <Button onClick={() => save()} disabled={!dirty || conflict} busy={saving} title="Save (⌘S)">Save</Button>
          {!published && <Button variant="primary" busy={busy === 'publish'} onClick={() => window.confirm('Publish this article to the live site?') && act('publish', '/publish', publishMessage)}>Publish</Button>}
        </div>
      </div>
      {conflict && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">This article was changed elsewhere (for example by the engine) while you were editing. Autosave is paused.<Button size="sm" variant="primary" busy={saving} onClick={() => save({ overVersion: article.data.meta.version })}>Keep my edits (merge with the latest)</Button><Button size="sm" onClick={() => { localStorage.removeItem(draftKey); load(article.data); }}>Discard mine and load the latest</Button></div>}
      {recovered && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Unsaved edits from {fmt(recovered.at)} were found on this device{recovered.stale ? ' (the article has changed since; only the title, excerpt and body text will be restored)' : ''}.
        <Button size="sm" variant="primary" onClick={() => { setForm(f => recovered.stale ? { ...f!, title: recovered.form.title, excerpt: recovered.form.excerpt } : recovered.form); editor.commands.setContent(recovered.doc, { emitUpdate: false }); state.current.bodyDirty = true; setDirty(true); setRecovered(null); }}>Restore them</Button>
        <Button size="sm" onClick={() => { localStorage.removeItem(draftKey); setRecovered(null); }}>Discard</Button></div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-5"><Textarea aria-label="Title" value={form.title} onChange={e => set({ title: e.target.value.replace(/\n/g, '') })} rows={2} maxLength={180} placeholder="Article title" className="resize-none !border-0 !p-0 text-[26px] font-bold !leading-tight focus:!ring-0" />
            <Field label="Excerpt" hint={<Count value={form.excerpt} max={300} />}><Textarea value={form.excerpt} onChange={e => set({ excerpt: e.target.value })} rows={2} maxLength={1000} placeholder="One or two sentences shown on cards and listings" /></Field></Card>
          <Card><Toolbar editor={editor} project={project} franchise={franchise} /><EditorContent editor={editor} /></Card>
          <Panel title="Revision history">
            {!revisions.data?.length ? <p className="text-sm text-zinc-500">No saved versions yet.</p> : <ul className="max-h-56 divide-y divide-zinc-100 overflow-y-auto text-sm">{revisions.data.map(r => <li key={r.version} className="flex items-center gap-3 py-1.5"><span className="w-10 tabular-nums text-zinc-500">v{r.version}</span><span className="min-w-0 flex-1 truncate">{r.reason} <span className="text-zinc-500">· {r.by} · {fmt(r.at, project.timezone)}</span></span>
              {r.version !== version && <Button size="sm" variant="ghost" busy={busy === `r${r.version}`} onClick={() => window.confirm(`Restore version ${r.version}? The current content is kept as a new version.`) && run(`r${r.version}`, () => api(`${base}/revisions/${r.version}/restore`, { method: 'POST' }), next => { client.setQueryData(['article', pid, id], next); load(next); refresh(); return `Restored version ${r.version}`; })}>Restore</Button>}</li>)}</ul>}
          </Panel>
          <Panel title="Processing history"><ActivityList items={activity.data || []} project={project} /></Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Workflow" right={<span className="text-xs text-zinc-500">v{version}</span>}>
            {issues.length ? <ul className="space-y-1.5">{issues.map((i, n) => <li key={n} className="flex gap-2 text-sm"><span className={cx('mt-1.5 size-2 shrink-0 rounded-full', i.severity === 'error' ? 'bg-red-500' : 'bg-amber-400')} /><span>{i.message}</span></li>)}</ul> : <p className={cx('text-sm', meta.processedHash || meta.evaluatedHash ? 'text-emerald-700' : 'text-zinc-500')}>{meta.processedHash || meta.evaluatedHash ? 'No open issues.' : 'Not checked yet.'}</p>}
            {meta.lastError && <p className="text-sm text-red-700">{meta.lastError}</p>}
            {meta.intent && <Badge className="bg-violet-100 text-violet-800">{meta.intent.type === 'publish' ? 'Publish requested — will publish when complete' : `Schedule requested for ${fmt(meta.intent.at, project.timezone)}`}</Badge>}
            {published && <p className="text-xs text-zinc-500">Published {fmt(a.publishedAt, project.timezone)} · {meta.live?.verifiedAt ? `live URL confirmed ${ago(meta.live.verifiedAt)}` : meta.live?.checkedAt ? `live check pending (last HTTP ${meta.live.lastStatus || 'none'})` : 'live URL not checked'}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" busy={busy === 'validate'} onClick={() => act('validate', '/validate', r => r.ready ? `Ready to publish${r.warnings.length ? ` (${r.warnings.length} warning${r.warnings.length > 1 ? 's' : ''})` : ''}` : `${r.errors.length} blocking issue${r.errors.length > 1 ? 's' : ''}`)}>Validate</Button>
              <Button size="sm" busy={busy === 'repair'} disabled={published} onClick={() => act('repair', '/repair', r => r.repaired.length ? `Repaired ${r.repaired.map((x: any) => x.field).join(', ')}` : r.unresolved.length ? `Nothing repaired. ${r.unresolved.join('; ')}` : 'Metadata was already complete')}>Repair metadata</Button>
              <Button size="sm" busy={busy === 'images'} disabled={published} onClick={() => act('images', '/images', r => r.queued ? 'Image job queued' : `Hero: ${r.hero}. Inline added: ${r.inlineAdded}${r.inlineMissing ? `, still missing ${r.inlineMissing}` : ''}${r.notes?.length ? ` (${r.notes.join('; ')})` : ''}`)}>Process images</Button>
              <Button size="sm" busy={busy === 'process'} disabled={published} onClick={() => act('process', '/process', () => 'Queued for full processing')}>Run full processing</Button>
            </div>
            {!published ? (
              <div className="border-t border-zinc-100 pt-3"><Field label="Schedule" hint="your local time"><div className="flex gap-2"><Input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} /><Button busy={busy === 'schedule'} disabled={!scheduleAt} onClick={() => act('schedule', '/schedule', publishMessage, { scheduledAt: new Date(scheduleAt).toISOString() })}>Schedule</Button></div></Field>
                {(meta.status === 'scheduled' || meta.intent) && <Button size="sm" variant="ghost" className="mt-2" busy={busy === 'cancel'} onClick={() => act('cancel', '/schedule', () => 'Schedule cancelled', undefined, 'DELETE')}>Cancel schedule / publish request</Button>}</div>
            ) : <Button size="sm" variant="danger" busy={busy === 'unpublish'} onClick={() => window.confirm('Unpublish this article? It will be removed from the site at the next rebuild.') && act('unpublish', '/unpublish', () => 'Unpublished')}>Unpublish</Button>}
          </Panel>
          <Panel title="Hero image">
            {form.hero ? <><img src={form.hero.url || `${project.media.publicBaseUrl}/${form.hero.assetKey}`} alt="" className="aspect-video w-full rounded-md border border-zinc-200 bg-zinc-50 object-cover" /><Field label="Alt text"><Input value={form.hero.alt} onChange={e => set({ hero: { ...form.hero!, alt: e.target.value } })} maxLength={300} /></Field></> : <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-zinc-300 text-sm text-zinc-500">No hero image</div>}
            <div className="flex gap-2"><Button size="sm" onClick={() => setHeroPicker(true)}>{form.hero ? 'Change' : 'Choose image'}</Button>{form.hero && <Button size="sm" variant="ghost" onClick={() => set({ hero: null })}>Remove</Button>}</div>
          </Panel>
          <Panel title="Details">
            <Field label="Slug" hint={published ? 'locked: public URL' : undefined}><Input value={form.slug} disabled={published} onChange={e => set({ slug: e.target.value })} /></Field>
            <Field label="Author"><Select value={form.authorId} onChange={e => set({ authorId: e.target.value })}><option value="">— none —</option>{authors.data?.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
            <div><div className="mb-1 text-xs font-medium text-zinc-600">Categories</div><div className="space-y-1">{categories.data?.map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={e => set({ categoryIds: e.target.checked ? [...form.categoryIds, c.id] : form.categoryIds.filter(x => x !== c.id) })} />{c.name}</label>)}</div></div>
            <Field label="Tags" hint="comma-separated"><Input value={form.tags} onChange={e => set({ tags: e.target.value })} /></Field>
            {project.customFields.map((f: any) => <Field key={f.key} label={f.label}>{f.type === 'select' ? <Select value={form.fields[f.key] ?? ''} disabled={f.key === 'language' && !!a[f.key]} onChange={e => set({ fields: { ...form.fields, [f.key]: e.target.value } })}><option value="">—</option>{[...new Set([...(f.options || []), ...(form.fields[f.key] ? [form.fields[f.key]] : [])])].map((o: string) => <option key={o}>{o}</option>)}</Select>
              : f.type === 'boolean' ? <input type="checkbox" checked={!!form.fields[f.key]} onChange={e => set({ fields: { ...form.fields, [f.key]: e.target.checked } })} /> : <Input type={f.type === 'number' ? 'number' : 'text'} value={form.fields[f.key] ?? ''} onChange={e => set({ fields: { ...form.fields, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value } })} />}</Field>)}
          </Panel>
          <Panel title="SEO">
            <Field label="SEO title" hint={<Count value={form.seoTitle} max={project.quality.metaTitleMax} />}><Input value={form.seoTitle} onChange={e => set({ seoTitle: e.target.value })} maxLength={180} /></Field>
            <Field label="Meta description" hint={<Count value={form.seoDescription} max={project.quality.metaDescriptionMax} min={project.quality.metaDescriptionMin} />}><Textarea rows={3} value={form.seoDescription} onChange={e => set({ seoDescription: e.target.value })} maxLength={320} /></Field>
            <Field label="Canonical URL"><Input value={form.canonicalUrl} onChange={e => set({ canonicalUrl: e.target.value })} placeholder="Derived from the slug" /></Field>
            <details className="text-sm"><summary className="cursor-pointer text-xs font-medium text-zinc-600">Open Graph overrides</summary><div className="mt-2 space-y-3">
              <Field label="OG title"><Input value={form.ogTitle} onChange={e => set({ ogTitle: e.target.value })} placeholder={form.seoTitle || form.title} /></Field><Field label="OG description"><Textarea rows={2} value={form.ogDescription} onChange={e => set({ ogDescription: e.target.value })} placeholder={form.seoDescription} /></Field><Field label="OG image URL"><Input value={form.ogImage} onChange={e => set({ ogImage: e.target.value })} placeholder="Defaults to the hero image" /></Field></div></details>
          </Panel>
          {!!a.internalLinks?.length && <Panel title="Related articles"><ul className="space-y-1 text-sm">{a.internalLinks.map((l: any, i: number) => <li key={i}><a className="underline underline-offset-2" href={l.url} target="_blank" rel="noreferrer">{l.text}</a></li>)}</ul><p className="text-xs text-zinc-500">Suggested links. Use the internal-link button in the toolbar to place one in the text.</p></Panel>}
        </div>
      </div>
      {heroPicker && <ImagePicker project={project} franchise={franchise} onClose={() => setHeroPicker(false)} onPick={asset => { set({ hero: { assetKey: asset.r2Key, alt: asset.alt || form.hero?.alt || '', url: asset.publicUrl } }); setHeroPicker(false); }} />}
    </div>
  );
}
