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

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      if (!pattern.trim() || !categoryId) throw new Error("Preencha o texto e a categoria");
      const { error } = await supabase.from("category_rules").insert({
        user_id: u.user.id,
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Regras de categorização</h1>
        <p className="text-sm text-muted-foreground">
          Categorize lançamentos automaticamente pela descrição — vale para importações, Open Finance e novos
          lançamentos.
        </p>
      </div>

      <Card className="p-5 shadow-[var(--shadow-card)]">
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
            <Button className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Criar
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => applyToExisting.mutate()} disabled={applyToExisting.isPending}>
          <Wand2 className="mr-2 h-4 w-4" />
          {applyToExisting.isPending ? "Aplicando..." : "Aplicar nos lançamentos sem categoria"}
        </Button>
      </div>

      <Card className="divide-y divide-border shadow-[var(--shadow-card)]">
        {rules.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma regra criada ainda.</p>
        )}
        {rules.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 p-4">
            <Switch checked={r.is_active} onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                Descrição {MATCH_LABEL[r.match_type] ?? r.match_type}{" "}
                <span className="font-medium">"{r.pattern}"</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {r.applies_to === "both" ? "Entradas e saídas" : r.applies_to === "income" ? "Entradas" : "Saídas"} →{" "}
                {r.categories?.name ?? "sem categoria"}
              </p>
            </div>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.categories?.color ?? "#999" }} />
            <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
