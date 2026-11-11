import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Trash2 } from 'lucide-react';
import { api, fmt } from '../api';
import { Badge, Button, Empty, Field, Input, PageHeader, Section, Select, Textarea, Toggle, useAction, useToast } from '../ui';

const list = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);

/** One settings card = one slice of the project document, saved on its own. */
function Group<T>({ project, title, description, pick, children }: { project: any; title: string; description?: string; pick(p: any): T; children(value: T, set: (patch: Partial<T>) => void): ReactNode }) {
  const client = useQueryClient(), { busy, run } = useAction();
  const [value, setValue] = useState<T>(() => pick(project));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setValue(pick(project)); }, [project]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => run('save', () => api(`/projects/${project._id}`, { method: 'PATCH', body: value }), () => { setDirty(false); client.invalidateQueries({ queryKey: ['projects'] }); return `${title} saved`; });
  return (
    <Section title={title} description={description} actions={<Button variant="primary" size="sm" disabled={!dirty} busy={busy === 'save'} onClick={save}>Save</Button>}>
      {children(value, patch => { setValue(v => ({ ...v, ...patch })); setDirty(true); })}
    </Section>
  );
}
const Num = ({ label, value, onChange, hint }: { label: string; value: number; onChange(n: number): void; hint?: string }) => <Field label={label} hint={hint}><Input type="number" value={value} onChange={e => onChange(Number(e.target.value))} /></Field>;

function Tokens({ project }: { project: any }) {
  const client = useQueryClient(), { busy, run } = useAction(), toast = useToast();
  const { data } = useQuery({ queryKey: ['tokens', project._id], queryFn: () => api<any[]>(`/projects/${project._id}/tokens`) });
  const [name, setName] = useState(''), [scopes, setScopes] = useState<string[]>(['read', 'write', 'media']), [created, setCreated] = useState<any | null>(null);
  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast('info', 'Copied'));
  const LABEL: Record<string, string> = { read: 'Read', write: 'Write drafts & metadata', media: 'Upload & process media', publish: 'Publish & schedule (public-facing)' };
  return (
    <Section title="API tokens & MCP" description="Project-scoped credentials for the REST API and the MCP server. Only a hash is stored; the token is shown once.">
      <div className="mb-4 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
        <div><span className="font-medium text-ink">MCP endpoint (Streamable HTTP):</span> <code>{window.location.origin}/mcp</code> with <code>Authorization: Bearer &lt;token&gt;</code></div>
        <div className="mt-1">Clients that cannot send a header can use <code>{window.location.origin}/mcp/&lt;token&gt;</code>. Local stdio: <code>CMS_API_TOKEN=… npm run mcp</code>. Tools a token is not permitted to use are not exposed to the assistant at all.</div>
      </div>
      {created && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm"><div className="font-medium text-emerald-900">Token “{created.name}” created. Copy it now — it will not be shown again.</div><div className="mt-2 flex gap-2"><Input readOnly value={created.token} className="font-mono text-xs" onFocus={e => e.currentTarget.select()} /><Button onClick={() => copy(created.token)}><Copy className="size-3.5" />Copy</Button></div></div>}
      {!data?.length ? <Empty>No tokens yet.</Empty> : (
        <ul className="mb-4 divide-y divide-zinc-100 text-sm">
          {data.map(t => <li key={t._id} className="flex items-center gap-3 py-2"><div className="min-w-0 flex-1"><span className="font-medium">{t.name}</span> {t.scopes.map((s: string) => <Badge key={s} className={s === 'publish' ? 'ml-1 bg-violet-100 text-violet-800' : 'ml-1'}>{s}</Badge>)}<div className="text-xs text-zinc-500">Created {fmt(t.createdAt)} · {t.lastUsedAt ? `last used ${fmt(t.lastUsedAt)}` : 'never used'}</div></div>
            <Button size="sm" variant="danger" busy={busy === t._id} onClick={() => window.confirm(`Revoke token "${t.name}"? Anything using it stops working immediately.`) && run(t._id, () => api(`/projects/${project._id}/tokens/${t._id}`, { method: 'DELETE' }), () => { client.invalidateQueries({ queryKey: ['tokens'] }); return 'Token revoked'; })}><Trash2 className="size-3.5" />Revoke</Button></li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4">
        <div className="w-56"><Field label="New token name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="ChatGPT scheduler" /></Field></div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pb-2 text-sm">{Object.entries(LABEL).map(([scope, label]) => <label key={scope} className="flex items-center gap-1.5"><input type="checkbox" checked={scopes.includes(scope)} onChange={e => setScopes(s => e.target.checked ? [...s, scope] : s.filter(x => x !== scope))} />{label}</label>)}</div>
        <Button variant="primary" disabled={!name.trim() || !scopes.length} busy={busy === 'create'} onClick={() => run('create', () => api(`/projects/${project._id}/tokens`, { body: { name, scopes } }), t => { setCreated(t); setName(''); client.invalidateQueries({ queryKey: ['tokens'] }); })}>Create token</Button>
      </div>
    </Section>
  );
}

export function SettingsPage({ project }: { project: any }) {
  const pid = project._id, { busy, run } = useAction();
  const authors = useQuery({ queryKey: ['authors', pid], queryFn: () => api<any[]>(`/projects/${pid}/authors`) });
  const categories = useQuery({ queryKey: ['categories', pid], queryFn: () => api<any[]>(`/projects/${pid}/categories`) });
  const [storage, setStorage] = useState<any | null>(null);
  return (
    <>
      <PageHeader title="Project Settings" subtitle={`Project ID: ${pid} · content in ${project.content.dbName}.${project.content.articles}`} />
      <div className="space-y-4">
        <Group project={project} title="General" pick={p => ({ name: p.name, siteUrl: p.siteUrl, timezone: p.timezone, urls: p.urls })}>
          {(v, set) => <div className="grid gap-3 md:grid-cols-2">
            <Field label="Project name"><Input value={v.name} onChange={e => set({ name: e.target.value })} /></Field>
            <Field label="Site URL"><Input value={v.siteUrl} onChange={e => set({ siteUrl: e.target.value })} /></Field>
            <Field label="Time zone" hint="IANA name, used for publishing slots"><Input value={v.timezone} onChange={e => set({ timezone: e.target.value })} /></Field>
            <Field label="Article URL pattern" hint="Existing public URLs stay stable"><Input value={v.urls.article} onChange={e => set({ urls: { ...v.urls, article: e.target.value } })} /></Field>
          </div>}
        </Group>
        <Group project={project} title="Publishing policy" description="What happens to an article once every required check passes." pick={p => ({ publishing: p.publishing })}>
          {(v, set) => { const p = v.publishing, up = (patch: any) => set({ publishing: { ...p, ...patch } }); return <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">{[['manual', 'Manual approval', 'Complete articles wait in “Awaiting review” for a person (or a token with publish permission).'], ['auto', 'Publish automatically', 'Complete articles are published immediately.'], ['scheduled', 'Schedule automatically', 'Complete articles take the next free publishing slot.']].map(([mode, label, text]) => (
              <label key={mode} className={`cursor-pointer rounded-lg border p-3 ${p.approvalMode === mode ? 'border-accent bg-accent/5' : 'border-zinc-200'}`}><input type="radio" className="sr-only" checked={p.approvalMode === mode} onChange={() => up({ approvalMode: mode })} /><div className="text-sm font-medium">{label}</div><div className="mt-0.5 text-xs text-zinc-500">{text}</div></label>))}</div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Publishing slots" hint={`${project.timezone}, HH:MM, comma-separated`}><Input value={p.slots.join(', ')} onChange={e => up({ slots: list(e.target.value) })} /></Field>
              <Num label="Minimum lead time (minutes)" value={p.minLeadMinutes} onChange={n => up({ minLeadMinutes: n })} />
            </div>
            <Toggle checked={p.verifyLive} onChange={verifyLive => up({ verifyLive })} label="Confirm the public URL after publishing" description="Checks the article URL until the rebuilt site serves it, and flags it if it never does." />
          </div>; }}
        </Group>
        <Group project={project} title="Defaults" description="Used only when an article arrives without the value." pick={p => ({ defaults: p.defaults })}>
          {(v, set) => <div className="grid gap-3 md:grid-cols-3">
            <Field label="Default author"><Select value={v.defaults.authorId || ''} onChange={e => set({ defaults: { ...v.defaults, authorId: e.target.value || undefined } })}><option value="">None</option>{authors.data?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Fallback category" hint="When no rule matches"><Select value={v.defaults.categoryId || ''} onChange={e => set({ defaults: { ...v.defaults, categoryId: e.target.value || undefined } })}><option value="">None (leave for review)</option>{categories.data?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          </div>}
        </Group>
        <Group project={project} title="Category mapping" description="Deterministic rules: a missing category is chosen by the best keyword / article-type match in the title, tags and excerpt." pick={p => ({ categoryRules: p.categoryRules })}>
          {(v, set) => <div className="space-y-3">{categories.data?.map(cat => {
            const rule = v.categoryRules.find((r: any) => r.categoryId === cat.id) || { categoryId: cat.id, keywords: [], articleTypes: [] };
            const up = (patch: any) => set({ categoryRules: [...v.categoryRules.filter((r: any) => r.categoryId !== cat.id), { ...rule, ...patch }].filter((r: any) => r.keywords.length || r.articleTypes?.length) });
            return <div key={cat.id} className="grid gap-2 md:grid-cols-[160px_1fr_1fr] md:items-center"><div className="text-sm font-medium">{cat.name}</div><Input aria-label={`${cat.name} keywords`} placeholder="keywords, comma-separated" defaultValue={rule.keywords.join(', ')} onBlur={e => up({ keywords: list(e.target.value) })} /><Input aria-label={`${cat.name} article types`} placeholder="article types, comma-separated" defaultValue={(rule.articleTypes || []).join(', ')} onBlur={e => up({ articleTypes: list(e.target.value) })} /></div>;
          })}</div>}
        </Group>
        <Group project={project} title="Automatic repair" description="Repairs only fill in missing or invalid values. Valid fields, article bodies and published articles are left alone." pick={p => ({ repair: p.repair })}>
          {(v, set) => { const r = v.repair, up = (patch: any) => set({ repair: { ...r, ...patch } }); return <div className="grid gap-x-8 md:grid-cols-2">
            <Toggle checked={r.enabled} onChange={enabled => up({ enabled })} label="Repair metadata automatically" />
            <Toggle checked={r.author} onChange={author => up({ author })} label="Assign the default author" />
            <Toggle checked={r.category} onChange={category => up({ category })} label="Choose a category from the rules" />
            <Toggle checked={r.seo} onChange={seo => up({ seo })} label="Complete SEO title, description and excerpt" />
            <Toggle checked={r.slug} onChange={slug => up({ slug })} label="Fix missing or duplicate slugs (drafts only)" />
            <Toggle checked={r.internalLinks} onChange={internalLinks => up({ internalLinks })} label="Suggest related internal links" />
            <Toggle checked={r.useAi} onChange={useAi => up({ useAi })} label="Use AI when rules are not enough" description="Category tie-breaks and meta descriptions. Needs an AI text provider on the server." />
            <div className="pt-1"><Num label="Related links to suggest" value={r.maxInternalLinks} onChange={n => up({ maxInternalLinks: n })} /></div>
          </div>; }}
        </Group>
        <Group project={project} title="Quality rules" description="Completeness checks that block publishing. No keyword-density or score formulas." pick={p => ({ quality: p.quality })}>
          {(v, set) => { const q = v.quality, up = (patch: any) => set({ quality: { ...q, ...patch } }); return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-4">
            <Num label="Minimum words (warning)" value={q.minWords} onChange={n => up({ minWords: n })} /><Num label="SEO title max length" value={q.metaTitleMax} onChange={n => up({ metaTitleMax: n })} />
            <Num label="Meta description min" value={q.metaDescriptionMin} onChange={n => up({ metaDescriptionMin: n })} /><Num label="Meta description max" value={q.metaDescriptionMax} onChange={n => up({ metaDescriptionMax: n })} />
            <Num label="Required inline images" value={q.minInlineImages} onChange={n => up({ minInlineImages: n })} /><Num label="Words per extra inline image" value={q.wordsPerInlineImage} onChange={n => up({ wordsPerInlineImage: n })} hint="0 = off" /><Num label="Maximum inline images" value={q.maxInlineImages} onChange={n => up({ maxInlineImages: n })} />
          </div><div className="grid gap-x-8 md:grid-cols-2">
            <Toggle checked={q.requireHero} onChange={requireHero => up({ requireHero })} label="Require a hero image" /><Toggle checked={q.requireHeadings} onChange={requireHeadings => up({ requireHeadings })} label="Require section headings" />
            <Toggle checked={q.requireExcerpt} onChange={requireExcerpt => up({ requireExcerpt })} label="Require an excerpt" /><Toggle checked={q.checkInternalLinks} onChange={checkInternalLinks => up({ checkInternalLinks })} label="Check internal links" />
          </div></div>; }}
        </Group>
        <Group project={project} title="Images" description="Where article images may come from and how they are stored." pick={p => ({ media: p.media })}>
          {(v, set) => { const m = v.media, up = (patch: any) => set({ media: { ...m, ...patch } }); const PROVIDERS: [string, string, string][] = [['translation', 'Source-language article', 'Translations reuse the images of the article they translate.'], ['library', 'Media library', 'Approved assets already used for the same franchise.'], ['anilist', 'AniList', 'Official key visuals and cover art, matched by title; source and licence recorded.'], ['fandom', 'Fandom wikis', 'Page images from the wikis mapped below. Rights stay with the original holders — enable only if you accept that.'], ['ai', 'AI generation', 'Original images from the configured provider when nothing else fits.']];
            return <div className="space-y-4">
              <Toggle checked={m.enabled} onChange={enabled => up({ enabled })} label="Source and attach images automatically" description="When off, articles missing images wait in the media review queue." />
              <div><div className="mb-1 text-xs font-medium text-zinc-600">Permitted sources, tried in this order</div><div className="grid gap-x-8 md:grid-cols-2">{PROVIDERS.map(([id, label, text]) => <Toggle key={id} checked={m.providers.includes(id)} label={label} description={text} onChange={on => up({ providers: PROVIDERS.map(p => p[0]).filter(p => p === id ? on : m.providers.includes(p)), ...(id === 'ai' ? { aiGeneration: { ...m.aiGeneration, enabled: on } } : {}) })} />)}</div></div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Fandom wiki mapping" hint="One per line: Franchise = wiki subdomain"><Textarea rows={3} defaultValue={Object.entries(m.fandomWikis).map(([k, w]) => `${k} = ${w}`).join('\n')} onBlur={e => up({ fandomWikis: Object.fromEntries(e.target.value.split('\n').map(l => l.split('=').map(s => s.trim())).filter(p => p.length === 2 && p[0] && p[1])) })} placeholder={'Bleach = bleach\nOne Piece = onepiece'} /></Field>
                <Field label="AI image style prompt"><Textarea rows={3} value={m.aiGeneration.stylePrompt} onChange={e => up({ aiGeneration: { ...m.aiGeneration, stylePrompt: e.target.value } })} /></Field>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Public media domain"><Input value={m.publicBaseUrl} onChange={e => up({ publicBaseUrl: e.target.value })} /></Field><Field label="R2 bucket"><Input value={m.bucket || ''} onChange={e => up({ bucket: e.target.value })} /></Field><Field label="Key prefix"><Input value={m.keyPrefix} onChange={e => up({ keyPrefix: e.target.value })} /></Field><Num label="WebP quality" value={m.quality} onChange={n => up({ quality: n })} />
                <Num label="Hero max width" value={m.heroMaxWidth} onChange={n => up({ heroMaxWidth: n })} /><Num label="Hero min width" value={m.heroMinWidth} onChange={n => up({ heroMinWidth: n })} /><Num label="Inline max width" value={m.inlineMaxWidth} onChange={n => up({ inlineMaxWidth: n })} /><Num label="Inline min width" value={m.inlineMinWidth} onChange={n => up({ inlineMinWidth: n })} />
              </div>
              <div className="flex flex-wrap items-center gap-3"><Button busy={busy === 'storage'} onClick={() => run('storage', () => api(`/projects/${pid}/storage-test`, { method: 'POST' }), setStorage)}>Test storage</Button>
                {storage && <span className={`text-sm ${storage.ok ? 'text-emerald-700' : 'text-red-700'}`}>{storage.ok ? `Write, public read and delete all succeeded (${storage.storage}).` : `Storage check failed: written=${storage.written}, public URL returned ${storage.publicStatus || 'no response'} (${storage.storage}).`}</span>}
                <span className="text-xs text-zinc-500">Writes a small file, reads it from the public domain, then deletes it.</span></div>
            </div>; }}
        </Group>
        <Group project={project} title="Custom fields" description="Extra article fields for this project's schema. Stored at the top level of the article document." pick={p => ({ customFields: p.customFields })}>
          {(v, set) => <div className="space-y-2">
            {v.customFields.map((f: any, i: number) => { const up = (patch: any) => set({ customFields: v.customFields.map((x: any, n: number) => n === i ? { ...x, ...patch } : x) }); return (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_120px_1.5fr_auto_auto] md:items-center">
                <Input aria-label="Key" placeholder="key" value={f.key} onChange={e => up({ key: e.target.value })} /><Input aria-label="Label" placeholder="Label" value={f.label} onChange={e => up({ label: e.target.value })} />
                <Select aria-label="Type" value={f.type} onChange={e => up({ type: e.target.value })}>{['string', 'text', 'number', 'boolean', 'select', 'tags'].map(t => <option key={t}>{t}</option>)}</Select>
                <Input aria-label="Options" placeholder="options (select), comma-separated" defaultValue={(f.options || []).join(', ')} onBlur={e => up({ options: list(e.target.value) })} disabled={f.type !== 'select'} />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!f.required} onChange={e => up({ required: e.target.checked })} />Required</label>
                <Button size="sm" variant="ghost" aria-label="Remove field" onClick={() => set({ customFields: v.customFields.filter((_: any, n: number) => n !== i) })}><Trash2 className="size-3.5" /></Button>
              </div>); })}
            <Button size="sm" onClick={() => set({ customFields: [...v.customFields, { key: '', label: '', type: 'string' }] })}>Add field</Button>
          </div>}
        </Group>
        <Tokens project={project} />
      </div>
    </>
  );
}
