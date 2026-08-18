import { createFileRoute } from "@tanstack/react-router";
import { createElement as h, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/divisao-ganhos")({
    head: () => ({
          meta: [
            { title: "Divisão de Ganhos | Finlist" },
            {
                      name: "description",
                      content: "Divida seus ganhos entre contas fixas, reserva de emergência, lazer, investimentos e outras categorias que você definir.",
            },
            { property: "og:title", content: "Divisão de Ganhos | Finlist" },
            {
                      property: "og:description",
                      content: "Divida seus ganhos entre contas fixas, reserva de emergência, lazer, investimentos e outras categorias que você definir.",
            },
            { property: "og:type", content: "website" },
            { name: "robots", content: "noindex" },
                ],
    }),
    component: IncomeSplitPage,
});

const brl = (v: number) =>
    (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DEFAULT_CATEGORIES = [
  { name: "Contas fixas", percentage: 50, position: 0 },
  { name: "Reserva de emergência", percentage: 20, position: 1 },
  { name: "Lazer", percentage: 10, position: 2 },
  { name: "Investimentos", percentage: 20, position: 3 },
  ];

type SplitRow = {
    id: string;
    name: string;
    percentage: number;
    position: number;
};

function IncomeSplitPage() {
    const qc = useQueryClient();
    const seeded = useRef(false);
    const [amount, setAmount] = useState(0);
    const [newName, setNewName] = useState("");
    const [newPct, setNewPct] = useState(0);

  const { data: rows = [], isLoading } = useQuery({
        queryKey: ["income-split-categories"],
        queryFn: async () => {
                const { data, error } = await supabase
                  .from("income_split_categories")
                  .select("*")
                  .order("position");
                if (error) throw error;
                return (data ?? []) as SplitRow[];
        },
  });

  const seed = useMutation({
        mutationFn: async () => {
                const { data: userData } = await supabase.auth.getSession();
                if (!userData.session) throw new Error("Sessão expirada");
                const { error } = await supabase.from("income_split_categories").insert(
                          DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userData.session!.user.id }))
                        );
                if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["income-split-categories"] }),
  });

  useEffect(() => {
        if (!isLoading && rows.length === 0 && !seeded.current) {
                seeded.current = true;
                seed.mutate();
        }
  }, [isLoading, rows.length]);

  const updatePct = useMutation({
        mutationFn: async ({ id, percentage }: { id: string; percentage: number }) => {
                const { error } = await supabase
                  .from("income_split_categories")
                  .update({ percentage })
                  .eq("id", id);
                if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["income-split-categories"] }),
  });

  const updateName = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
                const { error } = await supabase
                  .from("income_split_categories")
                  .update({ name })
                  .eq("id", id);
                if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["income-split-categories"] }),
  });

  const addRow = useMutation({
        mutationFn: async () => {
                const { data: userData } = await supabase.auth.getSession();
                if (!userData.session) throw new Error("Sessão expirada");
                const { error } = await supabase.from("income_split_categories").insert({
                          user_id: userData.session.user.id,
                          name: newName,
                          percentage: newPct,
                          position: rows.length,
                });
                if (error) throw error;
        },
        onSuccess: () => {
                qc.invalidateQueries({ queryKey: ["income-split-categories"] });
                setNewName("");
                setNewPct(0);
                toast.success("Divisão criada");
        },
        onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
        mutationFn: async (id: string) => {
                const { error } = await supabase.from("income_split_categories").delete().eq("id", id);
                if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["income-split-categories"] }),
  });

  const totalPct = rows.reduce((sum, r) => sum + Number(r.percentage || 0), 0);

  return h(
        "div",
    { className: "mx-auto max-w-3xl space-y-6" },
        h(
                "div",
                null,
                h("h1", { className: "text-xl font-bold tracking-tight sm:text-2xl" }, "Divisão de ganhos"),
                h(
                          "p",
                  { className: "text-sm text-muted-foreground" },
                          "Informe quanto você ganhou e veja como distribuir entre suas categorias."
                        )
              ),
        h(
                Card,
          { className: "p-5" },
                h(Label, { className: "text-xs text-muted-foreground" }, "Quanto você ganhou este mês?"),
                h(Input, {
                          type: "number",
                          min: 0,
                          className: "mt-1.5 text-lg font-semibold",
                          value: Number.isNaN(amount) ? "" : amount,
                          onChange: (e) => setAmount(parseFloat(e.target.value)),
                          placeholder: "0,00",
                })
              ),
        h(
                Card,
          { className: "divide-y divide-border" },
                rows.map((r) =>
                          h(
                                      "div",
                            { key: r.id, className: "flex flex-wrap items-center gap-3 p-4" },
                                      h(Input, {
                                                    className: "flex-1 min-w-[140px]",
                                                    value: r.name,
                                                    onChange: (e) => updateName.mutate({ id: r.id, name: e.target.value }),
                                      }),
                                      h(
                                                    "div",
                                        { className: "relative w-24" },
                                                    h(Input, {
                                                                    type: "number",
                                                                    min: 0,
                                                                    max: 100,
                                                                    value: r.percentage,
                                                                    onChange: (e) => updatePct.mutate({ id: r.id, percentage: parseFloat(e.target.value) || 0 }),
                                                    }),
                                                    h(
                                                                    "span",
                                                      {
                                                                        className:
                                                                                            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground",
                                                      },
                                                                    "%"
                                                                  )
                                                  ),
                                      h(
                                                    "span",
                                        { className: "w-28 text-right text-sm font-semibold" },
                                                    brl((amount * Number(r.percentage || 0)) / 100)
                                                  ),
                                      h(
                                                    Button,
                                        { variant: "ghost", size: "icon", onClick: () => del.mutate(r.id) },
                                                    h(Trash2, { className: "h-4 w-4 text-muted-foreground" })
                                                  )
                                    )
                               ),
                rows.length === 0 && !isLoading
                  ? h("p", { className: "p-8 text-center text-sm text-muted-foreground" }, "Nenhuma divisão ainda.")
                  : null
              ),
        h(
                Card,
          { className: "p-5" },
                h(
                          "form",
                  {
                              onSubmit: (e) => {
                                            e.preventDefault();
                                            if (newName) addRow.mutate();
                              },
                              className: "flex flex-wrap items-end gap-3",
                  },
                          h(
                                      "div",
                            { className: "flex-1 min-w-[140px] space-y-1.5" },
                                      h(Label, { className: "text-xs text-muted-foreground" }, "Nova categoria"),
                                      h(Input, {
                                                    value: newName,
                                                    onChange: (e) => setNewName(e.target.value),
                                                    placeholder: "Ex: Doações",
                                      })
                                    ),
                          h(
                                      "div",
                            { className: "w-24 space-y-1.5" },
                                      h(Label, { className: "text-xs text-muted-foreground" }, "%"),
                                      h(Input, {
                                                    type: "number",
                                                    min: 0,
                                                    max: 100,
                                                    value: Number.isNaN(newPct) ? "" : newPct,
                                                    onChange: (e) => setNewPct(parseFloat(e.target.value)),
                                      })
                                    ),
                          h(Button, { type: "submit" }, h(Plus, { className: "mr-1 h-4 w-4" }), "Adicionar")
                        )
              ),
        h(
                Card,
          {
                    className: `flex items-center justify-between p-4 ${
                                totalPct !== 100 ? "border-amber-500/50" : "border-emerald-500/50"
                    }`,
          },
                h("span", { className: "text-sm text-muted-foreground" }, "Total distribuído"),
                h(
                          "span",
                  {
                              className: `text-sm font-bold ${totalPct !== 100 ? "text-amber-600" : "text-emerald-600"}`,
                  },
                          totalPct + "%"
                        )
              )
      );
}
