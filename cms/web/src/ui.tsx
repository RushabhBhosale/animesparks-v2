import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Loader2, X } from 'lucide-react';
import { ApiError } from './api';

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-zinc-700 disabled:bg-zinc-400',
  secondary: 'bg-white text-ink border border-zinc-300 hover:bg-zinc-50 disabled:text-zinc-400',
  ghost: 'text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-300',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:text-red-300',
};
export function Button({ variant = 'secondary', size = 'md', busy, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; busy?: boolean }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy}
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed', size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm', variants[variant], className)}>
      {busy && <Loader2 className="size-3.5 animate-spin" />}{children}
    </button>
  );
}
const field = 'w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-ink placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-zinc-100';
export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) => <input {...rest} className={cx(field, 'h-9', className)} />;
export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...rest} className={cx(field, 'py-2 leading-5', className)} />;
export const Select = ({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...rest} className={cx(field, 'h-9 pr-8', className)}>{children}</select>;
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-zinc-600"><span>{label}</span>{hint && <span className="font-normal text-zinc-400">{hint}</span>}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange(next: boolean): void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1.5">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-zinc-300')}>
        <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      <span><span className="block text-sm font-medium">{label}</span>{description && <span className="block text-xs text-zinc-500">{description}</span>}</span>
    </label>
  );
}
export const Card = ({ className, children }: { className?: string; children: ReactNode }) => <div className={cx('rounded-lg border border-zinc-200 bg-white', className)}>{children}</div>;
export function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-3.5">
        <div><h2 className="text-sm font-semibold">{title}</h2>{description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}</div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}</div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

const STATUS: Record<string, [string, string]> = {
  draft: ['Draft', 'bg-zinc-100 text-zinc-700'], needs_repair: ['Needs repair', 'bg-amber-100 text-amber-800'], awaiting_media: ['Awaiting media', 'bg-orange-100 text-orange-800'],
  awaiting_review: ['Awaiting review', 'bg-sky-100 text-sky-800'], ready: ['Ready', 'bg-teal-100 text-teal-800'], scheduled: ['Scheduled', 'bg-violet-100 text-violet-800'],
  publishing: ['Publishing', 'bg-blue-100 text-blue-800'], published: ['Published', 'bg-emerald-100 text-emerald-800'], failed: ['Failed', 'bg-red-100 text-red-800'],
  queued: ['Queued', 'bg-zinc-100 text-zinc-700'], running: ['Running', 'bg-blue-100 text-blue-800'], succeeded: ['Succeeded', 'bg-emerald-100 text-emerald-800'], dead: ['Retries exhausted', 'bg-red-100 text-red-800'],
};
export const Badge = ({ children, className }: { children: ReactNode; className?: string }) => <span className={cx('inline-flex h-5 items-center whitespace-nowrap rounded px-1.5 text-[11px] font-medium', className || 'bg-zinc-100 text-zinc-700')}>{children}</span>;
export const StatusBadge = ({ status }: { status: string }) => <Badge className={STATUS[status]?.[1]}>{STATUS[status]?.[0] || status}</Badge>;
export const statusLabel = (status: string) => STATUS[status]?.[0] || status;
export const Spinner = () => <div className="flex justify-center py-16 text-zinc-400"><Loader2 className="size-5 animate-spin" /></div>;
export const Empty = ({ children }: { children: ReactNode }) => <div className="py-12 text-center text-sm text-zinc-500">{children}</div>;
export const ErrorNote = ({ error }: { error: unknown }) => error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{(error as Error).message}</div> : null;

export function Modal({ title, onClose, children, wide }: { title: string; onClose(): void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/40 p-4 pt-[8vh]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={cx('w-full rounded-xl bg-white shadow-xl', wide ? 'max-w-4xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3"><h2 className="text-sm font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded p-1 text-zinc-500 hover:bg-zinc-100"><X className="size-4" /></button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

type Toast = { id: number; kind: 'ok' | 'error' | 'info'; text: string };
const ToastContext = createContext<(kind: Toast['kind'], text: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === 'error' ? 9000 : 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={cx('rounded-lg border px-3.5 py-2.5 text-sm shadow-lg', t.kind === 'error' ? 'border-red-200 bg-red-50 text-red-900' : t.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-zinc-200 bg-white text-ink')}>{t.text}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
/** Runs a backend action and reports exactly what came back — success text is derived from the response, never assumed. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>, done?: (result: T) => string | void) => {
    setBusy(key);
    try { const result = await fn(); const text = done?.(result); if (text) toast('ok', text); return result; }
    catch (error) { toast('error', error instanceof ApiError && Array.isArray(error.details) ? `${error.message} ${error.details.map((d: any) => d.message || d).join(' ')}` : (error as Error).message); return undefined; }
    finally { setBusy(null); }
  }, [toast]);
  return { busy, run };
}
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage(p: number): void }) {
  if (pages <= 1) return null;
  return <div className="flex items-center justify-end gap-2 px-4 py-3 text-xs text-zinc-500"><Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><span>Page {page} of {pages}</span><Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button></div>;
}
