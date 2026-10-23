/** Pecinhas de interface compartilhadas pelas telas de "Meu trabalho (PJ)". */
import type { ComponentProps, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="animate-rise flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

type Str = string | null | undefined;

export function TextField({
  label,
  value,
  onChange,
  hint,
  className,
  ...rest
}: {
  label: string;
  value: Str;
  onChange: (v: string) => void;
  hint?: string;
  className?: string;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <Field label={label} hint={hint} className={className}>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

/** Número opcional: vazio vira null. */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  className,
  step = "0.01",
  min = 0,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  suffix?: string;
  hint?: string;
  className?: string;
  step?: string;
  min?: number;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

export function DateField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: Str;
  onChange: (v: string | null) => void;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} />
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  rows = 3,
  hint,
  className,
}: {
  label: string;
  value: Str;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <Textarea
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border-transparent bg-muted/70 px-3.5 py-2.5 shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
      />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | [string, string])[];
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-11 w-full rounded-xl border border-transparent bg-muted/70 px-3 text-base transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:text-sm"
      >
        {options.map((o) => {
          const [v, t] = Array.isArray(o) ? o : [o, o || "—"];
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Kpi({
  label,
  value,
  tone,
  dark,
}: {
  label: string;
  value: ReactNode;
  tone?: "neg" | "pos";
  dark?: boolean;
}) {
  return (
    <Card className={cn("animate-rise p-4", dark && "bg-primary text-primary-foreground")}>
      <p
        className={cn(
          "font-mono text-[11px] font-medium uppercase tracking-wide",
          dark ? "opacity-80" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "num mt-1 text-xl sm:text-2xl",
          tone === "neg" && "text-destructive",
          tone === "pos" && "text-success",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

export function KpiGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 | 6 }) {
  const c = {
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "md:grid-cols-3 xl:grid-cols-5",
    6: "md:grid-cols-3 2xl:grid-cols-6",
  }[cols];
  return <div className={cn("grid grid-cols-2 gap-3", c)}>{children}</div>;
}

export function Empty({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-primary">
          {icon}
        </div>
      )}
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </Card>
  );
}

export function Bar({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", danger ? "bg-destructive" : "bg-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
