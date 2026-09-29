import { cn } from "@/lib/utils";

/** Marca FINLIST: quadrado arredondado em brand com um "F" feito de barras de lista. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="FINLIST"
      className={cn("h-8 w-8 shrink-0", className)}
    >
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <rect
        x="17"
        y="15"
        width="8"
        height="34"
        rx="4"
        fill="var(--on-brand)"
        className="logo-bar"
        style={{ animationDelay: "0.05s" }}
      />
      <rect
        x="17"
        y="15"
        width="30"
        height="8"
        rx="4"
        fill="var(--on-brand)"
        className="logo-bar"
        style={{ animationDelay: "0.2s" }}
      />
      <rect
        x="17"
        y="28"
        width="22"
        height="8"
        rx="4"
        fill="#ec652b"
        className="logo-bar"
        style={{ animationDelay: "0.35s" }}
      />
    </svg>
  );
}

/** Marca + nome em caixa alta, em display bold. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-bold uppercase tracking-tight">FINLIST</span>
    </span>
  );
}
