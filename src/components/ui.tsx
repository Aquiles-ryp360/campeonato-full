import Link from "next/link";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
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
