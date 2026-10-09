import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Categorias | FINLIST" },
      { name: "description", content: "Personalize as categorias das suas entradas e saídas." },
      { property: "og:title", content: "Categorias | FINLIST" },
      { property: "og:description", content: "Personalize as categorias das suas entradas e saídas." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CategoriesPage,
});

const COLORS = ["#0b6e5f", "#0b3b33", "#0a6c86", "#f2b01e", "#b3261e", "#3a7a6b", "#4a5f59", "#8a5a00"];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Category = {
  id: string;
  name: string;
  color: string;
  kind: "expense" | "income";
  monthly_budget: number | null;
};

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState(COLORS[0]);
  const [budget, setBudget] = useState("");
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getSession();
      if (!userData.session) throw new Error("Sessão expirada");
      const { error } = await supabase.from("categories").insert({
        user_id: userData.session.user.id,
        name,
        color,
        kind,
        monthly_budget: kind === "expense" && budget ? Number(budget) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setBudget("");
      toast.success("Categoria criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number | null }) => {
      const { error } = await supabase.from("categories").update({ monthly_budget: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Orçamento atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBudgetDraft = (cat: Category) => {
    const draft = budgetDrafts[cat.id];
    if (draft === undefined) return;
    const trimmed = draft.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      toast.error("Valor de orçamento inválido");
      return;
    }
    if (value === (cat.monthly_budget ?? null)) return;
    updateBudget.mutate({ id: cat.id, value });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-rise">
        <h1 className="text-[26px] font-bold tracking-tight sm:text-[32px]">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Organize suas contas por tipo e defina orçamentos mensais para acompanhar gastos
        </p>
      </div>

      <Card className="animate-rise p-5" style={{ animationDelay: "60ms" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name) add.mutate(); }}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
        >
          <div>
            <Label htmlFor="cname" className="sr-only">Nome</Label>
            <Input id="cname" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Select value={kind} onValueChange={(v) => setKind(v as "expense" | "income")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Saída</SelectItem>
              <SelectItem value="income">Entrada</SelectItem>
            </SelectContent>
          </Select>
          {kind === "expense" && (
            <div className="relative w-32">
              <Label htmlFor="cbudget" className="sr-only">Orçamento mensal</Label>
              <Input
                id="cbudget"
                type="number"
                min="0"
                step="0.01"
                placeholder="Orçamento"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
          <Button type="submit" className="hover-glow"><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </form>
      </Card>

      <Card className="animate-rise divide-y divide-border" style={{ animationDelay: "120ms" }}>
        {cats.map((c, i) => (
          <div
            key={c.id}
            className="animate-rise flex flex-wrap items-center gap-3 p-4"
            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
          >
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="min-w-0 flex-1 text-sm font-medium">{c.name}</span>
            <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {c.kind === "expense" ? "Saída" : "Entrada"}
            </span>
            {c.kind === "expense" && (
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sem orçamento"
                  defaultValue={c.monthly_budget ?? ""}
                  onChange={(e) => setBudgetDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                  onBlur={() => saveBudgetDraft(c)}
                  className="h-8 w-32 text-xs"
                />
              </div>
            )}
            <Button variant="ghost" size="icon" className="group" onClick={() => del.mutate(c.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:scale-110" />
            </Button>
          </div>
        ))}
        {cats.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma categoria.</p>
        )}
      </Card>
    </div>
  );
}
