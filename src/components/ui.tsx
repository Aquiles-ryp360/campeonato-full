import Link from "next/link";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "dark";
}) {
  const tones = {
    neutral: "border-brand-towerMid/35 bg-white text-brand-muted",
    green: "border-green-600/20 bg-green-600/10 text-green-800",
    amber: "border-brand-yellow/70 bg-brand-yellow/25 text-brand-navy",
    red: "border-coral/25 bg-coral/10 text-red-800",
    blue: "border-brand-electric/20 bg-brand-electric/10 text-brand-electric",
    dark: "border-brand-navy bg-brand-navy text-white"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  className,
  style,
  type = "button",
  form,
  onClick,
  disabled = false
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "highlight";
  className?: string;
  style?: CSSProperties;
  type?: "button" | "submit";
  form?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-brand-electric text-white shadow-lift hover:bg-brand-institutional",
    secondary: "bg-white text-brand-navy ring-1 ring-brand-electric/20 hover:bg-brand-electric/10 hover:text-brand-electric",
    ghost: "bg-transparent text-brand-navy hover:bg-brand-electric/10 hover:text-brand-electric",
    danger: "bg-coral/10 text-red-800 ring-1 ring-coral/25 hover:bg-coral/15",
    highlight: "bg-brand-yellow text-brand-navy shadow-lift hover:bg-brand-yellowHover"
  };
  const classes = cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition",
    "focus:outline-none focus:ring-2 focus:ring-brand-electric focus:ring-offset-2 focus:ring-offset-brand-cold",
    "disabled:pointer-events-none disabled:opacity-60",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} form={form} className={classes} style={style} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-brand-towerMid/25 bg-white shadow-panel backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-md border border-dashed border-brand-towerMid/40 bg-brand-wash/60 p-6 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-white text-brand-muted shadow-insetLine">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-lg font-black text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-brand-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="min-h-20 animate-pulse rounded-md border border-brand-towerMid/20 bg-white p-4">
          <div className="h-4 w-1/3 rounded bg-brand-towerMid/25" />
          <div className="mt-4 h-3 w-2/3 rounded bg-brand-towerMid/20" />
          <div className="mt-2 h-3 w-1/2 rounded bg-brand-towerMid/20" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title = "No se pudo cargar",
  description,
  action
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-coral/25 bg-coral/10 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-red-800">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-ink">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-brand-muted">{description}</p> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/65 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-lg bg-white p-5 shadow-panel sm:rounded-lg">
        <p className="text-xl font-black text-ink">{title}</p>
        {description ? <p className="mt-2 text-sm leading-6 text-brand-muted">{description}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Breadcrumbs({
  items
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <span className="text-brand-towerMid">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="text-brand-electric hover:text-brand-institutional">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Tabs({
  items
}: {
  items: Array<{ label: string; active?: boolean; href?: string; onClick?: () => void }>;
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-md border border-brand-towerMid/25 bg-white p-1 shadow-insetLine">
      {items.map((item) => {
        const className = cn(
          "inline-flex min-h-9 shrink-0 items-center rounded px-3 py-1.5 text-sm font-black transition",
          item.active ? "bg-brand-navy text-white" : "text-brand-muted hover:bg-brand-electric/10 hover:text-brand-electric"
        );

        if (item.href) {
          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.label} type="button" onClick={item.onClick} className={className}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  empty
}: {
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  getRowKey: (row: T) => string;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Sin datos" />}</>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-brand-towerMid/25 bg-white">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-brand-wash text-xs font-black uppercase text-brand-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn("px-3 py-2", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-towerMid/20">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-3 py-3", column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-black uppercase text-brand-electric">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black text-ink">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-brand-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Metric({
  label,
  value,
  icon: Icon,
  tone = "green"
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "green" | "amber" | "blue" | "red";
}) {
  const tones = {
    green: "bg-green-600/10 text-green-800",
    amber: "bg-brand-yellow/35 text-brand-navy",
    blue: "bg-brand-electric/10 text-brand-electric",
    red: "bg-coral/10 text-red-800"
  };

  return (
    <Card className="p-4 transition hover:-translate-y-0.5 hover:border-brand-electric/25 hover:shadow-lift">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-muted">{label}</p>
          <p className="mt-1 text-2xl font-black text-ink">{value}</p>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-md", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-10 w-full rounded-md border border-brand-towerMid/35 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-brand-muted/55 focus:border-brand-electric focus:ring-2 focus:ring-brand-electric/20";
