import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import { toast } from "sonner";
import {
  BookOpen,
  Car,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/divisao-ganhos")({
  head: () => ({
    meta: [
      { title: "Divisão de Ganhos | Finlist" },
      {
        name: "description",
        content:
          "Divida seus ganhos entre contas fixas, reserva de emergência, lazer, investimentos e outras categorias que você definir.",
      },
      { property: "og:title", content: "Divisão de Ganhos | Finlist" },
      {
        property: "og:description",
        content:
          "Divida seus ganhos entre contas fixas, reserva de emergência, lazer, investimentos e outras categorias que você definir.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IncomeSplitPage,
});

const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Ordered, colorblind-safe categorical palette (fixed order, never cycled per-render).
const COLOR_OPTIONS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

const ICON_OPTIONS: { key: string; icon: typeof Home }[] = [
  { key: "Home", icon: Home },
  { key: "Receipt", icon: Receipt },
  { key: "ShoppingCart", icon: ShoppingCart },
  { key: "Utensils", icon: Utensils },
  { key: "Car", icon: Car },
  { key: "Heart", icon: Heart },
  { key: "ShieldCheck", icon: ShieldCheck },
  { key: "PiggyBank", icon: PiggyBank },
  { key: "TrendingUp", icon: TrendingUp },
  { key: "Wallet", icon: Wallet },
  { key: "Gift", icon: Gift },
  { key: "Gamepad2", icon: Gamepad2 },
  { key: "Plane", icon: Plane },
  { key: "GraduationCap", icon: GraduationCap },
  { key: "Music", icon: Music },
  { key: "Dumbbell", icon: Dumbbell },
  { key: "PawPrint", icon: PawPrint },
  { key: "BookOpen", icon: BookOpen },
  { key: "Smartphone", icon: Smartphone },
  { key: "Sparkles", icon: Sparkles },
];
const ICON_MAP: Record<string, typeof Home> = Object.fromEntries(ICON_OPTIONS.map((o) => [o.key, o.icon]));

const DEFAULT_CATEGORIES = [
  { name: "Contas fixas", percentage: 50, position: 0, color: COLOR_OPTIONS[0], icon: "Home" },
  { name: "Reserva de emergência", percentage: 20, position: 1, color: COLOR_OPTIONS[2], icon: "ShieldCheck" },
  { name: "Lazer", percentage: 10, position: 2, color: COLOR_OPTIONS[3], icon: "Gamepad2" },
  { name: "Investimentos", percentage: 20, position: 3, color: COLOR_OPTIONS[6], icon: "TrendingUp" },
];

type SplitRow = {
  id: string;
  name: string;
  percentage: number;
  position: number;
  color: string | null;
  icon: string | null;
};

const colorFor = (r: SplitRow, idx: number) => r.color || COLOR_OPTIONS[idx % COLOR_OPTIONS.length];
const iconFor = (r: SplitRow) => ICON_MAP[r.icon ?? ""] ?? Wallet;

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
        DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userData.session!.user.id })),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const updateStyle = useMutation({
    mutationFn: async ({ id, color, icon }: { id: string; color?: string; icon?: string }) => {
      const patch: Record<string, string> = {};
      if (color !== undefined) patch.color = color;
      if (icon !== undefined) patch.icon = icon;
      const { error } = await supabase.from("income_split_categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income-split-categories"] }),
  });

  const swapPositions = useMutation({
    mutationFn: async ({
      a,
      b,
    }: {
      a: { id: string; position: number };
      b: { id: string; position: number };
    }) => {
      const { error: e1 } = await supabase
        .from("income_split_categories")
        .update({ position: b.position })
        .eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("income_split_categories")
        .update({ position: a.position })
        .eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income-split-categories"] }),
  });

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    swapPositions.mutate({ a: rows[idx], b: rows[idx - 1] });
  };
  const moveDown = (idx: number) => {
    if (idx >= rows.length - 1) return;
    swapPositions.mutate({ a: rows[idx], b: rows[idx + 1] });
  };

  const addRow = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getSession();
      if (!userData.session) throw new Error("Sessão expirada");
      const { error } = await supabase.from("income_split_categories").insert({
        user_id: userData.session.user.id,
        name: newName,
        percentage: newPct,
        position: rows.length,
        color: COLOR_OPTIONS[rows.length % COLOR_OPTIONS.length],
        icon: "Sparkles",
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
  const hasChartData = rows.length > 0 && totalPct > 0;

  const chartData = rows.map((r, i) => ({
    id: r.id,
    name: r.name || "Sem nome",
    value: Number(r.percentage) || 0,
    fill: colorFor(r, i),
  }));

  const chartConfig: ChartConfig = Object.fromEntries(
    rows.map((r, i) => [r.id, { label: r.name || "Sem nome", color: colorFor(r, i) }]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-rise">
        <h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">Divisão de ganhos</h1>
        <p className="text-sm text-muted-foreground">
          Informe quanto você ganhou e veja como distribuir entre suas categorias.
        </p>
      </div>

      <Card className="animate-rise p-5" style={{ animationDelay: "60ms" }}>
        <Label className="text-xs text-muted-foreground">Quanto você ganhou este mês?</Label>
        <Input
          type="number"
          min={0}
          className="mt-1.5 text-lg font-semibold"
          value={Number.isNaN(amount) ? "" : amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          placeholder="0,00"
        />
      </Card>

      <Card className="animate-rise glow-ring p-5" style={{ animationDelay: "120ms" }}>
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Como fica dividido
        </p>
        {hasChartData ? (
          <div className="relative mx-auto aspect-square w-full max-w-[200px]">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="name"
                      formatter={(value, name) => (
                        <span className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {value}%
                          </span>
                        </span>
                      )}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={88}
                  strokeWidth={2}
                  stroke="var(--card)"
                  paddingAngle={chartData.length > 1 ? 2 : 0}
                >
                  {chartData.map((d) => (
                    <Cell key={d.id} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-lg font-bold ${totalPct !== 100 ? "text-warning" : "text-success"}`}
              >
                {totalPct}%
              </span>
              <span className="text-[10px] text-muted-foreground">distribuído</span>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Defina as porcentagens abaixo para ver o gráfico.
          </p>
        )}
      </Card>

      <Card className="animate-rise divide-y divide-border" style={{ animationDelay: "180ms" }}>
        {rows.map((r, i) => {
          const RowIcon = iconFor(r);
          const rowColor = colorFor(r, i);
          return (
            <div
              key={r.id}
              className="animate-rise flex flex-wrap items-center gap-3 p-4"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-muted-foreground/50 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
                  aria-label="Mover para cima"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(i)}
                  disabled={i === rows.length - 1}
                  className="text-muted-foreground/50 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
                  aria-label="Mover para baixo"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105"
                    style={{ backgroundColor: rowColor + "22", color: rowColor }}
                    aria-label="Escolher ícone e cor"
                  >
                    <RowIcon className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Cor</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateStyle.mutate({ id: r.id, color: c })}
                        className={`h-6 w-6 rounded-full border-2 ${
                          rowColor === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Ícone</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {ICON_OPTIONS.map(({ key, icon: OptIcon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateStyle.mutate({ id: r.id, icon: key })}
                        className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                          (r.icon ?? "") === key
                            ? "border-foreground bg-muted"
                            : "border-transparent hover:bg-muted"
                        }`}
                        aria-label={key}
                      >
                        <OptIcon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                className="flex-1 min-w-[120px]"
                value={r.name}
                onChange={(e) => updateName.mutate({ id: r.id, name: e.target.value })}
              />
              <div className="relative w-24">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={r.percentage}
                  onChange={(e) =>
                    updatePct.mutate({ id: r.id, percentage: parseFloat(e.target.value) || 0 })
                  }
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <span className="w-28 text-right text-sm font-semibold">
                {brl((amount * Number(r.percentage || 0)) / 100)}
              </span>
              <Button variant="ghost" size="icon" className="group" onClick={() => del.mutate(r.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:scale-110" />
              </Button>
            </div>
          );
        })}
        {rows.length === 0 && !isLoading && (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma divisão ainda.</p>
        )}
      </Card>

      <Card className="animate-rise p-5" style={{ animationDelay: "240ms" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newName) addRow.mutate();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nova categoria</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Doações" />
          </div>
          <div className="w-24 space-y-1.5">
            <Label className="text-xs text-muted-foreground">%</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={Number.isNaN(newPct) ? "" : newPct}
              onChange={(e) => setNewPct(parseFloat(e.target.value))}
            />
          </div>
          <Button type="submit" className="hover-glow">
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </form>
      </Card>

      <Card
        className={`animate-rise flex items-center justify-between p-4 ${totalPct !== 100 ? "border-warning/50" : "border-success/50"}`}
        style={{ animationDelay: "300ms" }}
      >
        <span className="text-sm text-muted-foreground">Total distribuído</span>
        <span className={`text-sm font-bold ${totalPct !== 100 ? "text-warning" : "text-success"}`}>
          {totalPct}%
        </span>
      </Card>
    </div>
  );
}
