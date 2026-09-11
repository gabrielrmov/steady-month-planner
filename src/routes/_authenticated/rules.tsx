import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { categoryForDescription, type CategoryRule } from "@/lib/automation";

export const Route = createFileRoute("/_authenticated/rules")({
  head: () => ({
    meta: [
      { title: "Regras de categorização | Finlist" },
      { name: "description", content: "Crie regras automáticas para categorizar lançamentos importados." },
      { property: "og:title", content: "Regras de categorização | Finlist" },
      { property: "og:description", content: "Crie regras automáticas para categorizar lançamentos importados." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RulesPage,
});

const MATCH_LABEL: Record<string, string> = {
  contains: "contém",
  starts_with: "começa com",
  equals: "é igual a",
};

function RulesPage() {
  const qc = useQueryClient();
  const [pattern, setPattern] = useState("");
  const [matchType, setMatchType] = useState("contains");
  const [categoryId, setCategoryId] = useState("");
  const [appliesTo, setAppliesTo] = useState("expense");

  const { data: rules = [] } = useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_rules")
        .select("*, categories(name, color)")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allTx = [] } = useQuery({
    queryKey: ["all-tx-for-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("id, description, type, category_id");
      if (error) throw error;
      return (data ?? []) as { id: string; description: string; type: string; category_id: string | null }[];
    },
  });

  const matchesRule = (r: any, description: string, type: string) => {
    if (r.applies_to !== "both" && r.applies_to !== type) return false;
    const desc = description.toLowerCase();
    const pat = String(r.pattern ?? "").toLowerCase();
    if (!pat) return false;
    if (r.match_type === "starts_with") return desc.startsWith(pat);
    if (r.match_type === "equals") return desc === pat;
    return desc.includes(pat);
  };

  const uncategorizedCount = allTx.filter((t) => !t.category_id).length;

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getSession();
      if (!u.session) throw new Error("Sessão expirada");
      if (!pattern.trim() || !categoryId) throw new Error("Preencha o texto e a categoria");
      const { error } = await supabase.from("category_rules").insert({
        user_id: u.session.user.id,
        pattern: pattern.trim(),
        match_type: matchType,
        category_id: categoryId,
        applies_to: appliesTo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPattern("");
      qc.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Regra criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("category_rules").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("category_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Regra removida");
    },
  });

  const applyToExisting = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, type, category_id")
        .is("category_id", null);
      if (error) throw error;
      let count = 0;
      for (const t of data ?? []) {
        const cat = categoryForDescription(rules as unknown as CategoryRule[], t.description, t.type as any);
        if (cat) {
          await supabase.from("transactions").update({ category_id: cat }).eq("id", t.id);
          count++;
        }
      }
      return count;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["tx"] });
      toast.success(n ? `${n} lançamentos categorizados` : "Nada para categorizar");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-rise">
        <h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">Regras de categorização</h1>
        <p className="text-sm text-muted-foreground">
          Categorize lançamentos automaticamente pela descrição — vale para importações, Open Finance e novos
          lançamentos.
        </p>
      </div>

      <Card className="animate-rise p-5" style={{ animationDelay: "60ms" }}>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Quando a descrição</Label>
            <div className="mt-1 flex gap-2">
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">contém</SelectItem>
                  <SelectItem value="starts_with">começa com</SelectItem>
                  <SelectItem value="equals">é igual a</SelectItem>
                </SelectContent>
              </Select>
              <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Ex: uber" />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Aplica em</Label>
            <Select value={appliesTo} onValueChange={setAppliesTo}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Saídas</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="both">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="hover-glow w-full" onClick={() => add.mutate()} disabled={add.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Criar
            </Button>
          </div>
        </div>
      </Card>

      <div className="animate-rise flex flex-wrap items-center justify-end gap-2" style={{ animationDelay: "100ms" }}>
        {uncategorizedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {uncategorizedCount} lançamento(s) sem categoria
          </span>
        )}
        <Button
          variant="outline"
          className="hover-glow"
          onClick={() => applyToExisting.mutate()}
          disabled={applyToExisting.isPending || uncategorizedCount === 0}
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {applyToExisting.isPending
            ? "Aplicando..."
            : uncategorizedCount > 0
              ? `Aplicar nos lançamentos sem categoria (${uncategorizedCount})`
              : "Nenhum lançamento sem categoria"}
        </Button>
      </div>

      <Card className="animate-rise divide-y divide-border" style={{ animationDelay: "140ms" }}>
        {rules.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma regra criada ainda.</p>
        )}
        {rules.map((r: any, i: number) => {
          const matchCount = allTx.filter((t) => matchesRule(r, t.description, t.type)).length;
          return (
            <div
              key={r.id}
              className="animate-rise group flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
              style={{ animationDelay: `${180 + Math.min(i, 10) * 40}ms` }}
            >
              <Switch checked={r.is_active} onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  Descrição {MATCH_LABEL[r.match_type] ?? r.match_type}{" "}
                  <span className="font-medium">"{r.pattern}"</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <span>
                    {r.applies_to === "both" ? "Entradas e saídas" : r.applies_to === "income" ? "Entradas" : "Saídas"} →{" "}
                    {r.categories?.name ?? "sem categoria"}
                  </span>
                  <span className="rounded-full bg-[var(--primary-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {matchCount} lançamento{matchCount === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.categories?.color ?? "#999" }} />
              <Button variant="ghost" size="icon" className="group" onClick={() => del.mutate(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive transition-transform duration-150 group-hover:scale-110" />
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
