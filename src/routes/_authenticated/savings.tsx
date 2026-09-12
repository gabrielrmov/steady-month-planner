import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, X, PiggyBank, Check, Pencil } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/savings")({
  head: () => ({
    meta: [
      { title: "Metas de economia | Finlist" },
      { name: "description", content: "Defina metas de economia e acompanhe o progresso mês a mês." },
      { property: "og:title", content: "Metas de economia | Finlist" },
      { property: "og:description", content: "Defina metas de economia e acompanhe o progresso mês a mês." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SavingsPage,
});

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#059669", "#111827"];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Goal = {
  id: string;
  name: string;
  color: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

function SavingsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["savings-goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("savings_goals").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getSession();
      if (!userData.session) throw new Error("Sessão expirada");
      const { error } = await supabase.from("savings_goals").insert({
        user_id: userData.session.user.id,
        name,
        color,
        target_amount: Number(targetAmount),
        target_date: targetDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings-goals"] });
      setName("");
      setTargetAmount("");
      setTargetDate("");
      setFormOpen(false);
      toast.success("Meta criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Meta removida");
    },
  });

  const contribute = useMutation({
    mutationFn: async ({ id, newAmount }: { id: string; newAmount: number }) => {
      const { error } = await supabase.from("savings_goals").update({ current_amount: newAmount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Progresso atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-rise flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-normal sm:text-[34px]">Metas de economia</h1>
          <p className="text-sm text-muted-foreground">Defina objetivos e acompanhe quanto falta para alcançá-los</p>
        </div>
        {!formOpen && (
          <Button onClick={() => setFormOpen(true)} className="hover-glow">
            <Plus className="mr-1 h-4 w-4" /> Nova meta
          </Button>
        )}
      </div>

      {goals.length > 0 && (
        <Card className="animate-rise p-5" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total guardado em {goals.length} meta(s)</span>
            <span className="font-semibold">
              {brl(totalSaved)} <span className="font-normal text-muted-foreground">/ {brl(totalTarget)}</span>
            </span>
          </div>
          <Progress value={totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0} className="mt-2" />
        </Card>
      )}

      {formOpen && (
        <Card className="animate-rise border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Nova meta</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setFormOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (name && targetAmount) add.mutate(); }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]"
          >
            <div>
              <Label htmlFor="gn" className="text-xs">Nome</Label>
              <Input id="gn" placeholder="Ex: Reserva de emergência" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label htmlFor="gt" className="text-xs">Meta</Label>
              <Input id="gt" type="number" min="0" step="0.01" placeholder="R$" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="gd" className="text-xs">Data alvo (opcional)</Label>
              <Input id="gd" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!name || !targetAmount || add.isPending} className="w-full">
                <Plus className="mr-1 h-4 w-4" /> Criar
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
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="h-40 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : goals.length === 0 && !formOpen ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-primary">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Nenhuma meta criada ainda</p>
            <p className="text-sm text-muted-foreground">Crie uma meta para começar a acompanhar sua economia.</p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nova meta
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              delayMs={i * 70}
              onDelete={() => del.mutate(g.id)}
              onContribute={(newAmount) => contribute.mutate({ id: g.id, newAmount })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onDelete,
  onContribute,
  delayMs,
}: {
  goal: Goal;
  onDelete: () => void;
  onContribute: (newAmount: number) => void;
  delayMs?: number;
}) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");

  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const done = current >= target;
  const daysLeft = goal.target_date ? differenceInCalendarDays(new Date(goal.target_date + "T00:00:00"), new Date()) : null;
  const remaining = Math.max(0, target - current);
  const monthsLeft = daysLeft !== null && daysLeft > 0 ? Math.max(1, Math.ceil(daysLeft / 30)) : null;
  const neededPerMonth = !done && monthsLeft !== null && remaining > 0 ? remaining / monthsLeft : null;

  const submitContribution = () => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value)) return;
    onContribute(Math.max(0, current + value));
    setAmount("");
    setAdding(false);
  };

  return (
    <Card className="animate-rise hover-lift space-y-3 p-4" style={{ animationDelay: `${delayMs ?? 0}ms` }}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: goal.color + "22", color: goal.color }}
        >
          <PiggyBank className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{goal.name}</p>
          <p className="text-xs text-muted-foreground">
            {done ? "Meta concluída 🎉" : daysLeft !== null ? (
              daysLeft >= 0 ? `${daysLeft} dia(s) restantes` : `Data alvo passou há ${Math.abs(daysLeft)} dia(s)`
            ) : "Sem data alvo"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="shrink-0">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{brl(current)}</span>
          <span className="text-xs text-muted-foreground">de {brl(target)}</span>
        </div>
        <Progress
          value={pct}
          className={done ? "[&>div]:bg-[image:none] [&>div]:bg-success [&>div]:shadow-none" : ""}
        />
        <p className="text-[11px] text-muted-foreground">{pct.toFixed(0)}% concluído</p>
        {neededPerMonth !== null && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <PiggyBank className="h-3 w-3 shrink-0" />
            Guarde ~{brl(neededPerMonth)}/mês para bater a meta a tempo
          </p>
        )}
      </div>

      {adding ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            className="h-8 text-xs"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={submitContribution}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setAdding(false); setAmount(""); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Registrar contribuição
        </Button>
      )}
    </Card>
  );
}
