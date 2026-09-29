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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Crown, ArrowRight, X, Wallet } from "lucide-react";
import { startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { invoiceMonthFor } from "@/lib/automation";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Cartões de crédito | FINLIST" },
      { name: "description", content: "Cadastre cartões, acompanhe faturas e limites por mês." },
      { property: "og:title", content: "Cartões de crédito | FINLIST" },
      { property: "og:description", content: "Cadastre cartões, acompanhe faturas e limites por mês." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CardsPage,
});

const COLORS = ["#0b6e5f", "#0b3b33", "#0a6c86", "#f2b01e", "#b3261e", "#3a7a6b", "#4a5f59", "#8a5a00"];

const FREE_CARD_LIMIT = 2;

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CardsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
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
      if (atLimit) throw new Error("Limite do teste/plano atual atingido. Assine um plano para adicionar mais cartões.");
      const { data: userData } = await supabase.auth.getSession();
      if (!userData.session) throw new Error("Sessão expirada");
      const { error } = await supabase.from("cards").insert({
        user_id: userData.session.user.id,
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
      setFormOpen(false);
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
      <div className="animate-rise flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-semibold sm:text-[34px]">Cartões</h1>
          <p className="text-sm text-muted-foreground">Cadastre seus cartões para organizar as compras parceladas</p>
        </div>
        <div className="flex items-center gap-2">
          {!isPro && (
            <Badge variant="secondary" className="hidden sm:flex">
              {cards.length}/{FREE_CARD_LIMIT} cartões no plano atual
            </Badge>
          )}
          {!formOpen && (
            <Button onClick={() => setFormOpen(true)} disabled={atLimit} className="hover-glow">
              <Plus className="mr-1 h-4 w-4" /> Novo cartão
            </Button>
          )}
        </div>
      </div>

      {formOpen && (
        <Card className="animate-rise border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Novo cartão</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setFormOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (name) add.mutate(); }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-[1.5fr_repeat(3,1fr)_auto]"
          >
            <div>
              <Label htmlFor="cn" className="text-xs">Nome</Label>
              <Input id="cn" placeholder="Ex: Nubank" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
              <Button type="submit" disabled={!name || add.isPending || atLimit} className="w-full">
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
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-foreground" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </form>

          {atLimit && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-[var(--primary-subtle)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Você atingiu o limite do plano atual</p>
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
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.length === 0 && !formOpen && (
          <Card className="flex flex-col items-center gap-3 border-border/60 bg-card p-10 text-center sm:col-span-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">Nenhum cartão cadastrado ainda</p>
              <p className="text-sm text-muted-foreground">Adicione um cartão para acompanhar faturas e limites.</p>
            </div>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo cartão
            </Button>
          </Card>
        )}
        {cards.map((c, i) => {
          const total = invoiceTotal(c);
          const limitValue = c.credit_limit ? Number(c.credit_limit) : null;
          const usagePct = limitValue ? Math.min(100, (total / limitValue) * 100) : null;
          const isHigh = usagePct !== null && usagePct >= 80;
          return (
            <Card
              key={c.id}
              className="animate-rise hover-lift border-border/60 bg-card p-4"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: c.color + "22", color: c.color }}
                >
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.closing_day ? `Fecha dia ${c.closing_day}` : "—"}
                    {c.due_day ? ` · Vence dia ${c.due_day}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)} className="group shrink-0">
                  <Trash2 className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:scale-110" />
                </Button>
              </div>

              <div className="mt-4 rounded-lg bg-muted/40 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">
                    Fatura de <span className="capitalize">{format(currentInvoice, "MMMM", { locale: ptBR })}</span>
                  </span>
                  <span className="num text-sm">{brl(total)}</span>
                </div>
                {limitValue !== null && (
                  <div className="mt-2 space-y-1">
                    <Progress
                      value={usagePct ?? 0}
                      className={isHigh ? "[&>div]:bg-[image:none] [&>div]:bg-destructive [&>div]:shadow-none" : ""}
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{usagePct?.toFixed(0)}% do limite</span>
                      <span className="num">{brl(limitValue)}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
