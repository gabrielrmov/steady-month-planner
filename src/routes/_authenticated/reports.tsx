import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlan, PLAN_LABEL } from "@/lib/plan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { TrendingDown, TrendingUp, PiggyBank, Crown, ArrowRight, Lock, Download } from "lucide-react";
import { toast } from "sonner";

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
const csvField = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

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
      mesCompleto: format(m, "MMMM yyyy", { locale: ptBR }),
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
    { label: "Entradas (6 meses)", value: totalIn, icon: TrendingUp, tone: "text-success" },
    { label: "Saídas (6 meses)", value: totalOut, icon: TrendingDown, tone: "text-destructive" },
    { label: "Saldo médio mensal", value: avgBalance, icon: PiggyBank, tone: "text-primary" },
  ];

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push(`Relatório Finlist,${csvField(format(new Date(), "dd/MM/yyyy"))}`);
    lines.push("");
    lines.push(["Mês", "Entradas", "Saídas", "Saldo"].map(csvField).join(","));
    for (const s of series) {
      lines.push([s.mesCompleto, s.entrada.toFixed(2), s.saida.toFixed(2), s.saldo.toFixed(2)].map(csvField).join(","));
    }
    lines.push("");
    lines.push(["Categoria", "Total gasto"].map(csvField).join(","));
    for (const c of categoryData) {
      lines.push([c.name, c.value.toFixed(2)].map(csvField).join(","));
    }
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finlist-relatorio-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Últimos {monthsBack} meses</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isPro ? "default" : "secondary"}>
            {PLAN_LABEL[plan.plan]}
          </Badge>
          {isPro && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={isLoading || txs.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {!isPro && (
        <Card className="border-primary/20 bg-[var(--primary-subtle)] p-5">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--primary-subtle)] p-2 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Relatórios avançados são um recurso Pro</h2>
                <p className="text-sm text-muted-foreground">
                  Seu teste grátis terminou. Assine um plano para desbloquear gráficos de
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-3 border-border/60 bg-card p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-7 w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label} className="hover-lift border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.tone}`} />
              </div>
              <p className="mt-2 text-2xl font-bold">{brl(c.value)}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className={`border-border/60 bg-card p-5 ${!isPro ? "opacity-60" : ""}`}>
        <h2 className="mb-4 font-semibold">Evolução mensal</h2>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  formatter={(v) => brl(Number(v))}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entrada" name="Entradas" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saida" name="Saídas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className={`border-border/60 bg-card p-5 ${!isPro ? "opacity-60" : ""}`}>
        <h2 className="mb-4 font-semibold">Gastos por categoria</h2>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-full" />
            <div className="space-y-2 self-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
        ) : categoryData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sem gastos registrados no período.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {categoryData.map((c) => (
                      <Cell key={c.name} fill={c.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => brl(Number(v))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
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
