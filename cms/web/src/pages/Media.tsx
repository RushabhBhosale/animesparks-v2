import { useEffect, useRef, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { api, fmt, qs } from '../api';
import { Badge, Button, Card, cx, Empty, ErrorNote, Field, Input, Modal, PageHeader, Pager, Select, Spinner, useAction } from '../ui';

export function UploadForm({ project, onDone, franchise }: { project: any; onDone(asset: any): void; franchise?: string }) {
  const { busy, run } = useAction();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget), file = form.get('file') as File, url = String(form.get('url') || '').trim();
    if (!file?.size && !url) return;
    form.set('rightsConfirmed', form.get('rights') ? 'true' : 'false');
    const request = file?.size ? { form } : { body: { url, alt: form.get('alt') || undefined, title: form.get('title') || undefined, franchise: form.get('franchise') || undefined, rightsConfirmed: !!form.get('rights') } };
    run('upload', () => api(`/projects/${project._id}/media`, request), asset => { onDone(asset); return asset.reused ? 'This image was already in the library; reused it.' : `Uploaded and verified: ${asset.width}×${asset.height}, ${Math.round(asset.byteSize / 1024)} KB`; });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Image file" hint="JPEG, PNG, WebP, GIF or AVIF, up to 15 MB"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="block w-full text-sm file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:text-sm file:font-medium" /></Field>
      <Field label="…or import from an HTTPS URL"><Input name="url" type="url" placeholder="https://" /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Alt text"><Input name="alt" maxLength={300} /></Field><Field label="Anime / franchise"><Input name="franchise" defaultValue={franchise} maxLength={120} /></Field></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="rights" required className="mt-1" /><span>I have the right to publish this image.</span></label>
      <div className="flex justify-end"><Button type="submit" variant="primary" busy={busy === 'upload'}><Upload className="size-4" />Upload</Button></div>
    </form>
  );
}

/** Media grid, also used as the picker inside the editor (`onPick`). */
export function MediaBrowser({ project, onPick, franchise }: { project: any; onPick?(asset: any): void; franchise?: string }) {
  const [q, setQ] = useState(franchise || ''), [term, setTerm] = useState(franchise || ''), [filter, setFilter] = useState(''), [page, setPage] = useState(1), [open, setOpen] = useState<any | null>(null);
  useEffect(() => { const t = setTimeout(() => { setTerm(q); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  const params = { q: term, filter, page, limit: onPick ? 18 : 36 };
  const { data, error, isLoading } = useQuery({ queryKey: ['media', project._id, params], queryFn: () => api(`/projects/${project._id}/media${qs(params)}`), placeholderData: keepPreviousData });
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2"><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search alt text, title, franchise or file name" className="min-w-52 flex-1" autoFocus={!!onPick} />
        <Select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className="w-40" aria-label="Filter"><option value="">All assets</option><option value="cms">Added by the CMS</option><option value="unused">Unused</option><option value="broken">Broken</option></Select></div>
      {isLoading ? <Spinner /> : error ? <ErrorNote error={error} /> : !data.items.length ? <Empty>No media matches.</Empty> : (
        <div className={cx('grid gap-3', onPick ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6')}>
          {data.items.map((a: any) => (
            <button key={a.r2Key} type="button" onClick={() => onPick ? onPick(a) : setOpen(a)} className="group overflow-hidden rounded-lg border border-zinc-200 bg-white text-left hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-accent">
              <div className="aspect-[4/3] bg-zinc-100"><img src={a.publicUrl} alt={a.alt || ''} loading="lazy" className="size-full object-cover" /></div>
              <div className="px-2 py-1.5"><div className="truncate text-xs font-medium">{a.alt || a.title || a.originalFilename || a.filename}</div><div className="flex items-center gap-1 text-[11px] text-zinc-500"><span>{a.width}×{a.height}</span>{a.broken && <Badge className="bg-red-100 text-red-800">Broken</Badge>}{a.franchise && <span className="truncate">· {a.franchise}</span>}</div></div>
            </button>
          ))}
        </div>
      )}
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
      {open && <AssetModal project={project} assetKey={open.r2Key} onClose={() => setOpen(null)} />}
    </>
  );
}
function AssetModal({ project, assetKey, onClose }: { project: any; assetKey: string; onClose(): void }) {
  const client = useQueryClient(), { busy, run } = useAction();
  const path = `/projects/${project._id}/media/asset${qs({ key: assetKey })}`;
  const { data, isLoading, error } = useQuery({ queryKey: ['asset', project._id, assetKey], queryFn: () => api(path) });
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    run('save', () => api(path, { method: 'PATCH', body: { alt: f.get('alt'), title: f.get('title'), franchise: f.get('franchise'), approved: !!f.get('approved') } }), () => { client.invalidateQueries({ queryKey: ['media'] }); client.invalidateQueries({ queryKey: ['asset'] }); return 'Asset saved'; });
  };
  return (
    <Modal title="Media asset" onClose={onClose} wide>
      {isLoading ? <Spinner /> : error ? <ErrorNote error={error} /> : (
        <div className="grid gap-5 md:grid-cols-2">
          <div><img src={data.publicUrl} alt={data.alt || ''} className="max-h-80 w-full rounded-lg border border-zinc-200 bg-zinc-50 object-contain" />
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-zinc-600">
              <dt>Size</dt><dd>{data.width}×{data.height} · {Math.round(data.byteSize / 1024)} KB · {data.mimeType}</dd><dt>Key</dt><dd className="break-all">{data.r2Key}</dd>
              <dt>Source</dt><dd>{data.source ? <>{data.source.provider}{data.source.page && <> · <a className="underline" href={data.source.page} target="_blank" rel="noreferrer">source page</a></>}<br />{data.source.license}{data.source.attribution ? ` · ${data.source.attribution}` : ''}</> : 'Imported with the existing site'}</dd>
              <dt>Verified</dt><dd>{data.broken ? 'Missing from storage' : fmt(data.r2VerifiedAt)}</dd>
            </dl>
          </div>
          <form onSubmit={save} className="space-y-3">
            <Field label="Alt text"><Input name="alt" defaultValue={data.alt} maxLength={300} /></Field>
            <Field label="Title"><Input name="title" defaultValue={data.title} maxLength={200} /></Field>
            <Field label="Anime / franchise" hint="Used to match images to articles"><Input name="franchise" defaultValue={data.franchise} maxLength={120} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="approved" defaultChecked={data.approved !== false} />Approved for automatic reuse</label>
            <div className="flex gap-2"><Button type="submit" variant="primary" busy={busy === 'save'}>Save</Button><Button busy={busy === 'verify'} onClick={() => run('verify', () => api(`/projects/${project._id}/media/verify`, { body: { keys: [assetKey] } }), r => { client.invalidateQueries({ queryKey: ['asset'] }); return r.broken.length ? 'File is missing from storage' : 'File exists in storage'; })}>Verify file</Button></div>
            <div><div className="mb-1 text-xs font-medium text-zinc-600">Used in {data.usedIn.length} article{data.usedIn.length === 1 ? '' : 's'}</div><ul className="max-h-32 space-y-0.5 overflow-y-auto text-sm">{data.usedIn.map((a: any) => <li key={a.id}><Link className="underline" to={`/${project._id}/articles/${encodeURIComponent(a.id)}`}>{a.title}</Link></li>)}</ul></div>
          </form>
        </div>
      )}
    </Modal>
  );
}
export function Media({ project }: { project: any }) {
  const [uploading, setUploading] = useState(false), client = useQueryClient(), { busy, run } = useAction();
  const done = useRef(() => { client.invalidateQueries({ queryKey: ['media'] }); setUploading(false); });
  return (
    <>
      <PageHeader title="Media Library" subtitle={`Stored at ${project.media.publicBaseUrl}. Uploads are optimised, de-duplicated by file hash and verified before they appear here.`}
        actions={<><Button busy={busy === 'verify'} onClick={() => run('verify', () => api(`/projects/${project._id}/media/verify`, { body: {} }), r => { client.invalidateQueries({ queryKey: ['media'] }); return `Checked ${r.checked} files: ${r.broken.length} broken`; })}>Check for broken files</Button><Button variant="primary" onClick={() => setUploading(true)}><Upload className="size-4" />Upload</Button></>} />
      <Card className="p-4"><MediaBrowser project={project} /></Card>
      {uploading && <Modal title="Upload image" onClose={() => setUploading(false)}><UploadForm project={project} onDone={done.current} /></Modal>}
    </>
  );
}
