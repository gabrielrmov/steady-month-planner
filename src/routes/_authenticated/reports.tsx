import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlan, PLAN_LABEL } from "@/lib/plan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, PiggyBank, Crown, ArrowRight, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios financeiros | Finlist" },
      {
        name: "description",
        content:
          "Acompanhe a evolução das suas entradas e saídas mês a mês e descubra onde seu dinheiro está indo por categoria.",
      },
      { property: "og:title", content: "Relatórios financeiros | Finlist" },
      {
        property: "og:description",
        content: "Evolução mensal, comparativos e gastos por categoria no Finlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tx = {
  amount: number;
  type: string;
  due_date: string;
  category_id: string | null;
  categories: { name: string; color: string } | null;
};

function ReportsPage() {
  const plan = usePlan();
  const isPro = plan.hasAccess;

  const monthsBack = 6;
  const start = format(startOfMonth(subMonths(new Date(), monthsBack - 1)), "yyyy-MM-dd");
  const end = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["reports", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, type, due_date, category_id, categories(name, color)")
        .gte("due_date", start)
        .lte("due_date", end);
      if (error) throw error;
      return (data ?? []) as unknown as Tx[];
    },
  });

  const months = Array.from({ length: monthsBack }, (_, i) =>
    startOfMonth(subMonths(new Date(), monthsBack - 1 - i)),
  );

  const series = months.map((m) => {
    const key = format(m, "yyyy-MM");
    const inMonth = txs.filter((t) => t.due_date.slice(0, 7) === key);
    const entrada = inMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const saida = inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return {
      mes: format(m, "MMM", { locale: ptBR }),
      entrada,
      saida,
      saldo: entrada - saida,
    };
  });

  const byCategory = new Map<string, { name: string; color: string; value: number }>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const name = t.categories?.name ?? "Sem categoria";
    const color = t.categories?.color ?? "#94A3B8";
    const cur = byCategory.get(name) ?? { name, color, value: 0 };
    cur.value += Number(t.amount);
    byCategory.set(name, cur);
  }
  const categoryData = [...byCategory.values()].sort((a, b) => b.value - a.value);

  const totalIn = series.reduce((s, r) => s + r.entrada, 0);
  const totalOut = series.reduce((s, r) => s + r.saida, 0);
  const avgBalance = series.length ? (totalIn - totalOut) / series.length : 0;

  const cards = [
    { label: "Entradas (6 meses)", value: totalIn, icon: TrendingUp, tone: "text-emerald-600" },
    { label: "Saídas (6 meses)", value: totalOut, icon: TrendingDown, tone: "text-rose-600" },
    { label: "Saldo médio mensal", value: avgBalance, icon: PiggyBank, tone: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Últimos {monthsBack} meses</p>
        </div>
        <Badge variant={isPro ? "default" : "secondary"}>
          {isPro ? "Pro" : "Gratuito"}
        </Badge>
      </div>

      {!isPro && (
        <Card className="border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Relatórios avançados são um recurso Pro</h2>
                <p className="text-sm text-muted-foreground">
                  No plano gratuito você vê apenas o resumo do mês atual. Faça upgrade para desbloquear gráficos de
                  evolução, gastos por categoria e exportação CSV.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/pricing">
                Fazer upgrade
                <Crown className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </div>
            <p className="mt-2 text-2xl font-bold">{brl(c.value)}</p>
          </Card>
        ))}
      </div>

      <Card className={`border-border/60 bg-card p-5 shadow-[var(--shadow-card)] ${!isPro ? "opacity-60" : ""}`}>
        <h2 className="mb-4 font-semibold">Evolução mensal</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                tickLine={false}
                axisLine={false}
                className="text-xs"
              />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Legend />
              <Bar dataKey="entrada" name="Entradas" fill="hsl(var(--chart-2, 152 60% 40%))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saida" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className={`border-border/60 bg-card p-5 shadow-[var(--shadow-card)] ${!isPro ? "opacity-60" : ""}`}>
        <h2 className="mb-4 font-semibold">Gastos por categoria</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem gastos registrados no período.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {categoryData.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => brl(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 self-center">
              {categoryData.slice(0, 8).map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-medium">{brl(c.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {!isPro && (
        <div className="text-center">
          <Button size="lg" asChild>
            <Link to="/pricing">
              Desbloquear relatórios completos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
