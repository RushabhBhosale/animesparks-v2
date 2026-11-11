import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Modal, PageHeader, Spinner, Textarea, useAction } from '../ui';

export function Taxonomy({ project, kind }: { project: any; kind: 'authors' | 'categories' }) {
  const client = useQueryClient(), { busy, run } = useAction();
  const [editing, setEditing] = useState<any | null>(null);
  const { data, error, isLoading } = useQuery({ queryKey: [kind, project._id], queryFn: () => api<any[]>(`/projects/${project._id}/${kind}`) });
  const one = kind === 'authors' ? 'author' : 'category', defaultKey = kind === 'authors' ? 'authorId' : 'categoryId';
  const refresh = () => { client.invalidateQueries({ queryKey: [kind, project._id] }); client.invalidateQueries({ queryKey: ['projects'] }); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget), body = { name: f.get('name'), description: f.get('description') || undefined };
    run('save', () => api(`/projects/${project._id}/${kind}${editing.id ? `/${editing.id}` : ''}`, { method: editing.id ? 'PATCH' : 'POST', body }), r => { setEditing(null); refresh(); return `Saved "${r.name}"`; });
  };
  const makeDefault = (id: string) => run(`d${id}`, () => api(`/projects/${project._id}`, { method: 'PATCH', body: { defaults: { [defaultKey]: id } } }), () => { refresh(); return `Default ${one} updated`; });
  return (
    <>
      <PageHeader title={kind === 'authors' ? 'Authors' : 'Categories'} subtitle={kind === 'authors' ? 'The default author is assigned to articles that arrive without one. Authors are never invented.' : 'Missing categories are chosen from these by the rules in Project Settings; the default is the fallback.'}
        actions={<Button variant="primary" onClick={() => setEditing({})}>New {one}</Button>} />
      <Card>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorNote error={error} /></div> : !data!.length ? <Empty>No {kind} yet.</Empty> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500"><th className="py-2 pl-4">Name</th><th className="py-2">Slug</th><th className="py-2 text-right">Articles</th><th className="py-2 pr-4" /></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {data!.map(row => (
                <tr key={row.id}>
                  <td className="py-2.5 pl-4 font-medium">{row.name} {row.isDefault && <Badge className="ml-1 bg-accent/10 text-accent-dark">Default</Badge>}{row.description && <div className="max-w-md truncate text-xs font-normal text-zinc-500">{row.description}</div>}</td>
                  <td className="py-2.5 text-zinc-600">{row.slug}</td>
                  <td className="py-2.5 text-right tabular-nums">{row.articleCount}</td>
                  <td className="py-2.5 pr-4 text-right"><div className="flex justify-end gap-1.5">{!row.isDefault && <Button size="sm" variant="ghost" busy={busy === `d${row.id}`} onClick={() => makeDefault(row.id)}>Make default</Button>}<Button size="sm" onClick={() => setEditing(row)}>Edit</Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {editing && (
        <Modal title={editing.id ? `Edit ${one}` : `New ${one}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Name"><Input name="name" defaultValue={editing.name} required autoFocus maxLength={120} /></Field>
            {kind === 'categories' && <Field label="Description"><Textarea name="description" defaultValue={editing.description} rows={3} maxLength={600} /></Field>}
            {editing.id && <p className="text-xs text-zinc-500">The slug ({editing.slug}) is a public URL and stays unchanged.</p>}
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" variant="primary" busy={busy === 'save'}>Save</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
