import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlan, PLAN_LABEL } from "@/lib/plan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Crown, ArrowRight } from "lucide-react";
import { startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { invoiceMonthFor } from "@/lib/automation";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Cartões de crédito | Finlist" },
      { name: "description", content: "Cadastre cartões, acompanhe faturas e limites por mês." },
      { property: "og:title", content: "Cartões de crédito | Finlist" },
      { property: "og:description", content: "Cadastre cartões, acompanhe faturas e limites por mês." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CardsPage,
});

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#059669", "#111827"];

const FREE_CARD_LIMIT = 2;

function CardsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [closingDay, setClosingDay] = useState<string>("");
  const [dueDay, setDueDay] = useState<string>("");
  const [limit, setLimit] = useState<string>("");

  const plan = usePlan();
  const isPro = plan.hasAccess;

  const { data: cards = [] } = useQuery({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cardTxs = [] } = useQuery({
    queryKey: ["card-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, due_date, card_id, payment_method, status")
        .eq("payment_method", "card");
      if (error) throw error;
      return data ?? [];
    },
  });

  const currentInvoice = startOfMonth(new Date());
  const invoiceTotal = (card: any) =>
    cardTxs
      .filter(
        (t: any) =>
          t.card_id === card.id &&
          invoiceMonthFor(new Date(t.due_date + "T12:00:00"), card.closing_day).getTime() ===
            currentInvoice.getTime(),
      )
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const atLimit = !isPro && cards.length >= FREE_CARD_LIMIT;

  const add = useMutation({
    mutationFn: async () => {
      if (atLimit) throw new Error("Limite do plano gratuito atingido. Faça upgrade para o Pro para adicionar mais cartões.");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("cards").insert({
        user_id: userData.user.id,
        name,
        color,
        closing_day: closingDay ? Number(closingDay) : null,
        due_day: dueDay ? Number(dueDay) : null,
        credit_limit: limit ? Number(limit) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      setName(""); setClosingDay(""); setDueDay(""); setLimit("");
      toast.success("Cartão criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["tx"] });
      toast.success("Removido");
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cartões</h1>
          <p className="text-sm text-muted-foreground">Cadastre seus cartões para organizar as compras parceladas</p>
        </div>
        {!isPro && (
          <Badge variant="secondary" className="hidden sm:flex">
            {cards.length}/{FREE_CARD_LIMIT} cartões no plano gratuito
          </Badge>
        )}
      </div>

      <Card className="border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <form
          onSubmit={(e) => { e.preventDefault(); if (name) add.mutate(); }}
          className="grid gap-3 sm:grid-cols-[1.5fr_repeat(3,1fr)_auto]"
        >
          <div>
            <Label htmlFor="cn" className="text-xs">Nome</Label>
            <Input id="cn" placeholder="Ex: Nubank" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cd" className="text-xs">Fechamento</Label>
            <Input id="cd" type="number" min="1" max="31" placeholder="dia" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dd" className="text-xs">Vencimento</Label>
            <Input id="dd" type="number" min="1" max="31" placeholder="dia" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="lm" className="text-xs">Limite</Label>
            <Input id="lm" type="number" step="0.01" placeholder="R$" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={!name || add.isPending || atLimit}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
          <div className="sm:col-span-full flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </form>

        {atLimit && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Você atingiu o limite do plano gratuito</p>
                <p className="text-sm text-muted-foreground">Faça upgrade para o Pro e cadastre cartões ilimitados.</p>
              </div>
              <Button size="sm" asChild>
                <Link to="/pricing">
                  Upgrade Pro
                  <Crown className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.length === 0 && (
          <Card className="border-border/60 bg-card p-8 text-center text-sm text-muted-foreground sm:col-span-2">
            Nenhum cartão cadastrado ainda.
          </Card>
        )}
        {cards.map((c) => (
          <Card key={c.id} className="border-border/60 bg-card flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: c.color + "22", color: c.color }}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.closing_day ? `Fecha dia ${c.closing_day}` : "—"}
                {c.due_day ? ` · Vence dia ${c.due_day}` : ""}
                {c.credit_limit ? ` · Limite ${Number(c.credit_limit).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
              </p>
              <p className="mt-1 text-xs">
                Fatura de <span className="capitalize">{format(currentInvoice, "MMMM", { locale: ptBR })}</span>:{" "}
                <span className="font-semibold">
                  {invoiceTotal(c).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
