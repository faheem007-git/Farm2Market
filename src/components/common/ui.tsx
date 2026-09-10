import { useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

/* ---------- Button ---------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  loading?: boolean;
}
const btnStyles: Record<BtnVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 border-brand-700",
  secondary: "bg-white text-stone-800 border-stone-300 hover:border-brand-600 hover:text-brand-800",
  ghost: "bg-transparent text-brand-800 border-transparent hover:bg-brand-50",
  danger: "bg-red-700 text-white hover:bg-red-800 border-red-700",
};
export function Button({ variant = "primary", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60", btnStyles[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]", className)}>{children}</div>;
}

/* ---------- Badge ---------- */
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "amber" | "red" | "blue"; children: ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    green: "bg-green-50 text-green-800 border-green-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    red: "bg-red-50 text-red-800 border-red-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

/* ---------- Input / Select ---------- */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({ label, error, className, id, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>}
      <input
        id={inputId}
        className={cn("w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100", className)}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export function Select({ label, children, className, id, ...rest }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>}
      <select id={id} className={cn("w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600", className)} {...rest}>
        {children}
      </select>
    </label>
  );
}

/* ---------- Textarea ---------- */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export function Textarea({ label, error, className, id, ...rest }: TextareaProps) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>}
      <textarea
        id={id}
        rows={3}
        className={cn("w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100", className)}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-stone-500 hover:bg-stone-100" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 rounded-md bg-stone-100 p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={t === active} onClick={() => onChange(t)} className={cn("rounded px-3 py-1.5 text-sm font-medium", t === active ? "bg-white shadow text-stone-900" : "text-stone-500 hover:text-stone-800")}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------- Dropdown ---------- */
export function Dropdown({ label, items, onSelect }: { label: string; items: string[]; onSelect: (i: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:border-brand-600">
        {label} ▾
      </button>
      {open && (
        <ul className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-stone-200 bg-white py-1 shadow-lg">
          {items.map((i) => (
            <li key={i}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => { onSelect(i); setOpen(false); }}>
                {i}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- States ---------- */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-stone-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
      {label}
    </div>
  );
}
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-stone-800">{title}</p>
      {body && <p className="mt-1 text-sm text-stone-500">{body}</p>}
    </div>
  );
}
export function ErrorState({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-semibold text-red-800">{title}</p>
      {body && <p className="mt-1 text-sm text-red-700">{body}</p>}
      {onRetry && <Button variant="secondary" className="mt-3" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

/* ---------- Page header / status ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function StatusIndicator({ status }: { status: string }) {
  const tone = /delivered|confirmed|success|verified|open/i.test(status) ? "green" : /transit|shipped|matched|packed/i.test(status) ? "blue" : /cancelled|error/i.test(status) ? "red" : "amber";
  return <Badge tone={tone as "green"}>{status.replace(/_/g, " ")}</Badge>;
}
