import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Quadro por etapas. No computador, uma coluna por etapa (rolagem lateral). No celular, uma etapa por vez:
 * chips com a contagem no topo e a lista de cartões da etapa escolhida, sem rolagem lateral.
 */
export function StageBoard({
  stages,
  count,
  children,
}: {
  stages: readonly string[];
  count: (stage: string) => number;
  children: (stage: string, index: number) => ReactNode;
}) {
  const [cur, setCur] = useState(() => {
    const first = stages.findIndex((s) => count(s) > 0);
    return first < 0 ? 0 : first;
  });
  const empty = (
    <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      Nenhum item nesta etapa.
    </p>
  );
  return (
    <>
      <div className="space-y-3 md:hidden">
        <div
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
          role="tablist"
          aria-label="Etapas"
        >
          {stages.map((st, i) => (
            <button
              key={st}
              type="button"
              role="tab"
              aria-selected={i === cur}
              onClick={() => setCur(i)}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                i === cur
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground",
              )}
            >
              {st}
              <span
                className={cn(
                  "num rounded-full px-1.5 text-[11px]",
                  i === cur ? "bg-primary-foreground/20" : "bg-background",
                )}
              >
                {count(st)}
              </span>
            </button>
          ))}
        </div>
        <section aria-label={stages[cur]} className="space-y-2">
          {count(stages[cur]) === 0 ? empty : children(stages[cur], cur)}
        </section>
      </div>

      <div className="hidden snap-x gap-3 overflow-x-auto pb-3 md:flex">
        {stages.map((st, i) => (
          <section key={st} aria-label={st} className="w-[270px] shrink-0 snap-start space-y-2">
            <h2 className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {st}
              <span className="num rounded-full bg-muted px-2 py-0.5 text-[11px]">{count(st)}</span>
            </h2>
            {children(st, i)}
          </section>
        ))}
      </div>
    </>
  );
}
