import Link from "next/link";
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
    neutral: "border-ink/10 bg-white text-ink",
    green: "border-field/15 bg-field/10 text-field",
    amber: "border-amber-400/25 bg-amber-100 text-amber-900",
    red: "border-coral/25 bg-coral/10 text-red-800",
    blue: "border-sky/25 bg-sky/10 text-sky-900",
    dark: "border-ink bg-ink text-white"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
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
  type = "button",
  onClick,
  disabled = false
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-ink text-white hover:bg-ink/90",
    secondary: "bg-white text-ink ring-1 ring-ink/10 hover:bg-mist",
    ghost: "bg-transparent text-ink hover:bg-white/70"
  };
  const classes = cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition",
    "focus:outline-none focus:ring-2 focus:ring-field focus:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-60",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  id
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-lg border border-ink/10 bg-white/92 shadow-panel backdrop-blur",
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
          <p className="text-xs font-bold uppercase text-field">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-ink/65">{description}</p>
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
    green: "bg-field/10 text-field",
    amber: "bg-amber-100 text-amber-900",
    blue: "bg-sky/10 text-sky-900",
    red: "bg-coral/10 text-red-800"
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-ink/60">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
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
      <span className="text-sm font-semibold text-ink/80">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-10 w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-field focus:ring-2 focus:ring-field/20";
