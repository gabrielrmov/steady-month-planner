import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Hourglass } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/installments")({
  head: () => ({
    meta: [
      { title: "Parcelamentos | Finlist" },
      { name: "description", content: "Acompanhe quanto falta para quitar cada compra parcelada por cartão." },
      { property: "og:title", content: "Parcelamentos | Finlist" },
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

  // group by card -> purchase_group_id
  const byCard = new Map<string, { card: Row["cards"]; groups: Map<string, Row[]> }>();
  for (const r of rows) {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parcelas em aberto</h1>
        <p className="text-sm text-muted-foreground">Acompanhe quanto falta para quitar cada compra parcelada</p>
      </div>

      {isLoading && <Card className="p-8 text-center text-sm text-muted-foreground">Carregando...</Card>}
      {!isLoading && byCard.size === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma compra parcelada no cartão registrada.
        </Card>
      )}

      {[...byCard.entries()].map(([cardKey, { card, groups }]) => {
        const totalRemaining = [...groups.values()].flat().filter((r) => r.status !== "paid").reduce((s, r) => s + Number(r.amount), 0);
        return (
          <div key={cardKey} className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: (card?.color ?? "#6B7280") + "22", color: card?.color ?? "#6B7280" }}
              >
                <CreditCard className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold">{card?.name ?? "Sem cartão"}</h2>
              <span className="ml-auto text-sm text-muted-foreground">Restam {brl(totalRemaining)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...groups.values()].map((items) => {
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
                  <Card key={first.purchase_group_id ?? first.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{first.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {total}× de {brl(perInstallment)}
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
                      <span>{brl(remainingValue)} restantes</span>
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
