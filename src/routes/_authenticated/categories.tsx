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
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Categorias | Finlist" },
      { name: "description", content: "Personalize as categorias das suas entradas e saídas." },
      { property: "og:title", content: "Categorias | Finlist" },
      { property: "og:description", content: "Personalize as categorias das suas entradas e saídas." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CategoriesPage,
});

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#059669", "#6B7280"];

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState(COLORS[0]);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("categories").insert({
        user_id: userData.user.id,
        name,
        color,
        kind,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setName("");
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
        <p className="text-sm text-muted-foreground">Organize suas contas por tipo</p>
      </div>

      <Card className="p-5">
        <form
          onSubmit={(e) => { e.preventDefault(); if (name) add.mutate(); }}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
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
          <Button type="submit"><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </form>
      </Card>

      <Card className="divide-y divide-border">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-4">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="flex-1 text-sm font-medium">{c.name}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {c.kind === "expense" ? "Saída" : "Entrada"}
            </span>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
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
