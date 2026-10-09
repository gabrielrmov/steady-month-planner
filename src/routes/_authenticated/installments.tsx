import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Hourglass, Search, X, Layers } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/installments")({
  head: () => ({
    meta: [
      { title: "Parcelamentos | FINLIST" },
      { name: "description", content: "Acompanhe quanto falta para quitar cada compra parcelada por cartão." },
      { property: "og:title", content: "Parcelamentos | FINLIST" },
      { property: "og:description", content: "Acompanhe quanto falta para quitar cada compra parcelada por cartão." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstallmentsPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  installment_number: number | null;
  installment_total: number | null;
  purchase_group_id: string | null;
  card_id: string | null;
  cards: { id: string; name: string; color: string } | null;
};

function InstallmentsPage() {
  const [query, setQuery] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["installments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, due_date, status, installment_number, installment_total, purchase_group_id, card_id, cards(id, name, color)")
        .eq("payment_method", "card")
        .not("installment_total", "is", null)
        .gt("installment_total", 1)
        .order("due_date");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const q = query.trim().toLowerCase();
  const filteredRows = q
    ? rows.filter((r) => r.description.toLowerCase().includes(q) || r.cards?.name.toLowerCase().includes(q))
    : rows;

  // group by card -> purchase_group_id
  const byCard = new Map<string, { card: Row["cards"]; groups: Map<string, Row[]> }>();
  for (const r of filteredRows) {
    const cardKey = r.card_id ?? "none";
    if (!byCard.has(cardKey)) byCard.set(cardKey, { card: r.cards, groups: new Map() });
    const bucket = byCard.get(cardKey)!;
    const gk = r.purchase_group_id ?? r.id;
    const arr = bucket.groups.get(gk) ?? [];
    arr.push(r);
    bucket.groups.set(gk, arr);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="animate-rise flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight sm:text-[32px]">Parcelas em aberto</h1>
          <p className="text-sm text-muted-foreground">Acompanhe quanto falta para quitar cada compra parcelada</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="animate-rise relative max-w-sm" style={{ animationDelay: "60ms" }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descrição ou cartão..."
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="space-y-3 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <Card className="animate-rise flex flex-col items-center gap-2 p-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma compra parcelada no cartão registrada.</p>
        </Card>
      )}

      {!isLoading && rows.length > 0 && byCard.size === 0 && (
        <Card className="animate-rise p-10 text-center text-sm text-muted-foreground">Nenhum resultado para "{query}".</Card>
      )}

      {[...byCard.entries()].map(([cardKey, { card, groups }], gi) => {
        const totalRemaining = [...groups.values()].flat().filter((r) => r.status !== "paid").reduce((s, r) => s + Number(r.amount), 0);
        return (
          <div key={cardKey} className="animate-rise space-y-3" style={{ animationDelay: `${gi * 70}ms` }}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: (card?.color ?? "#6B7280") + "22", color: card?.color ?? "#6B7280" }}
              >
                <CreditCard className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">{card?.name ?? "Sem cartão"}</h2>
              <span className="ml-auto text-sm text-muted-foreground">Restam <span className="num">{brl(totalRemaining)}</span></span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...groups.values()].map((items, j) => {
                items.sort((a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0));
                const first = items[0];
                const total = first.installment_total ?? items.length;
                const paidCount = items.filter((i) => i.status === "paid").length;
                const remainingCount = total - paidCount;
                const perInstallment = Number(first.amount);
                const remainingValue = items.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
                const nextPending = items.find((i) => i.status !== "paid");
                const pct = total ? (paidCount / total) * 100 : 0;
                return (
                  <Card
                    key={first.purchase_group_id ?? first.id}
                    className="animate-rise hover-lift space-y-2 p-4"
                    style={{ animationDelay: `${Math.min(j, 10) * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{first.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {total}× de <span className="num">{brl(perInstallment)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Falta</p>
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <Hourglass className="h-3.5 w-3.5" />
                          {remainingCount}×
                        </p>
                      </div>
                    </div>
                    <Progress value={pct} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {paidCount}/{total} pagas
                      </span>
                      <span><span className="num">{brl(remainingValue)}</span> restantes</span>
                    </div>
                    {nextPending && (
                      <p className="text-[11px] text-muted-foreground">
                        Próxima: parcela {nextPending.installment_number}/{total} em{" "}
                        {format(parseISO(nextPending.due_date), "dd MMM yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
