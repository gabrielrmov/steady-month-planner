import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  AlertCircle,
  BellRing,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ensureRecurringForMonth } from "@/lib/automation";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard financeiro | Finlist" },
      { name: "description", content: "Visão geral do mês: quanto entra, quanto sai e o checklist de contas a pagar." },
      { property: "og:title", content: "Dashboard financeiro | Finlist" },
      { property: "og:description", content: "Visão geral do mês: quanto entra, quanto sai e o checklist de contas a pagar." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlShort = (v: number) =>
  Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k` : `R$ ${v.toFixed(0)}`;

type Row = {
  id: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  due_date: string;
  category_id: string | null;
  categories?: { name: string; color: string } | null;
};

function Dashboard() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const from = format(month, "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");
  const historyFrom = format(startOfMonth(subMonths(month, 5)), "yyyy-MM-dd");
  const qc = useQueryClient();

  // Gera automaticamente as contas recorrentes do mês visualizado
  const generated = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (generated.current.has(from)) return;
    generated.current.add(from);
    ensureRecurringForMonth(month).then((n) => {
      if (n > 0) {
        qc.invalidateQueries({ queryKey: ["tx"] });
        toast.success(`${n} contas recorrentes geradas para este mês`);
      }
    });
  }, [from]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tx", "range", historyFrom, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, type, status, due_date, category_id, categories(name, color)")
        .gte("due_date", historyFrom)
        .lte("due_date", to)
        .order("due_date");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const txs = useMemo(() => rows.filter((t) => t.due_date >= from && t.due_date <= to), [rows, from, to]);

  const togglePaid = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: paid ? "paid" : "pending",
          paid_at: paid ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tx"] }),
  });

  const income = txs.filter((t) => t.type === "income");
  const expense = txs.filter((t) => t.type === "expense");
  const incomeTotal = income.reduce((s, t) => s + Number(t.amount), 0);
  const expenseTotal = expense.reduce((s, t) => s + Number(t.amount), 0);
  const expensePaid = expense.filter((t) => t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const expensePending = expenseTotal - expensePaid;
  const incomePaid = income.filter((t) => t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const incomePending = incomeTotal - incomePaid;
  const balance = incomeTotal - expenseTotal;
  const paidRatio = expenseTotal > 0 ? Math.round((expensePaid / expenseTotal) * 100) : 0;
  const savingRate = incomeTotal > 0 ? Math.round((balance / incomeTotal) * 100) : 0;

  // mês anterior para comparativo
  const prevFrom = format(startOfMonth(subMonths(month, 1)), "yyyy-MM-dd");
  const prevTo = format(endOfMonth(subMonths(month, 1)), "yyyy-MM-dd");
  const prev = rows.filter((t) => t.due_date >= prevFrom && t.due_date <= prevTo);
  const prevIncome = prev.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense = prev.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const delta = (cur: number, before: number) =>
    before > 0 ? Math.round(((cur - before) / before) * 100) : null;

  // série dos últimos 6 meses
  const series = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const m = subMonths(month, 5 - i);
      const a = format(startOfMonth(m), "yyyy-MM-dd");
      const b = format(endOfMonth(m), "yyyy-MM-dd");
      const slice = rows.filter((t) => t.due_date >= a && t.due_date <= b);
      const inc = slice.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const exp = slice.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { mes: format(m, "MMM", { locale: ptBR }), entradas: inc, saidas: exp, saldo: inc - exp };
    });
  }, [rows, month]);

  // top categorias do mês
  const topCategories = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    for (const t of expense) {
      const name = t.categories?.name ?? "Sem categoria";
      const color = t.categories?.color ?? "#64748B";
      const cur = map.get(name) ?? { name, color, total: 0 };
      cur.total += Number(t.amount);
      map.set(name, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expense]);

  const today = new Date(new Date().toDateString());
  const overdueList = txs.filter(
    (t) => t.status === "pending" && t.type === "expense" && new Date(t.due_date + "T00:00:00") < today,
  );
  const overdue = overdueList.length;
  const upcoming = txs
    .filter((t) => {
      if (t.status !== "pending" || t.type !== "expense") return false;
      const d = differenceInCalendarDays(new Date(t.due_date + "T00:00:00"), today);
      return d >= 0 && d <= 7;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const alerts = [...overdueList, ...upcoming];

  const biggest = [...expense].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  const insight =
    overdue > 0
      ? `Você tem ${overdue} conta(s) em atraso somando ${brl(
          overdueList.reduce((s, t) => s + Number(t.amount), 0),
        )}.`
      : expenseTotal > incomeTotal
        ? `As saídas superam as entradas em ${brl(expenseTotal - incomeTotal)} neste mês.`
        : topCategories[0]
          ? `${topCategories[0].name} é seu maior gasto do mês (${brl(topCategories[0].total)}${
              expenseTotal ? `, ${Math.round((topCategories[0].total / expenseTotal) * 100)}% do total` : ""
            }).`
          : "Cadastre suas contas do mês para ver insights personalizados.";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="space-y-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do mês</p>
        </div>
        <div className="flex items-center justify-between gap-1 rounded-lg border border-border bg-card p-1 sm:justify-start sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-medium capitalize sm:min-w-32 sm:flex-none">
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Entradas previstas"
          value={brl(incomeTotal)}
          icon={ArrowUpCircle}
          tone="success"
          delta={delta(incomeTotal, prevIncome)}
          deltaGoodWhenUp
        />
        <StatCard
          label="Saídas previstas"
          value={brl(expenseTotal)}
          icon={ArrowDownCircle}
          tone="destructive"
          delta={delta(expenseTotal, prevExpense)}
        />
        <StatCard
          label="Saldo previsto"
          value={brl(balance)}
          icon={Wallet}
          tone={balance >= 0 ? "success" : "destructive"}
          subtitle={incomeTotal > 0 ? `${savingRate}% da renda sobra` : undefined}
        />
        <StatCard
          label="A pagar restante"
          value={brl(expensePending)}
          icon={AlertCircle}
          tone="warning"
          subtitle={overdue > 0 ? `${overdue} em atraso` : "em dia"}
        />
        <StatCard
          label="Ainda a receber"
          value={brl(incomePending)}
          icon={Clock}
          tone="warning"
          subtitle={
            incomeTotal > 0
              ? incomePending > 0
                ? `${Math.round((incomePending / incomeTotal) * 100)}% do previsto`
                : "tudo recebido"
              : undefined
          }
        />
      </div>

      <Card className="animate-rise p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Insight do mês
            </p>
            <p className="mt-0.5 text-sm text-foreground">{insight}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso de pagamento</span>
            <span className="font-medium text-foreground">{paidRatio}%</span>
          </div>
          <Progress value={paidRatio} className="h-2" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Fluxo dos últimos 6 meses</h2>
              <p className="text-xs text-muted-foreground">Entradas x saídas previstas</p>
            </div>
            <Link to="/reports" className="hidden sm:block">
              <Button variant="outline" size="sm">Relatórios</Button>
            </Link>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis
                  tickFormatter={(v) => brlShort(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                  width={62}
                />
                <RTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v: number | string, n) => [brl(Number(v)), n === "entradas" ? "Entradas" : "Saídas"]}
                />
                <Area type="monotone" dataKey="entradas" stroke="var(--success)" fill="url(#gIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="saidas" stroke="var(--destructive)" fill="url(#gOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold">Onde o dinheiro foi</h2>
            <p className="text-xs text-muted-foreground">Top categorias do mês</p>
          </div>
          {topCategories.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sem gastos categorizados.</p>
          ) : (
            <ul className="space-y-3.5">
              {topCategories.map((c) => {
                const pct = expenseTotal > 0 ? Math.round((c.total / expenseTotal) * 100) : 0;
                return (
                  <li key={c.name}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{brl(c.total)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {biggest && (
            <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <PiggyBank className="h-3.5 w-3.5 text-primary" />
              Maior despesa: {biggest.description} · {brl(Number(biggest.amount))}
            </p>
          )}
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card className="border-warning/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-warning-foreground" />
            <h2 className="font-semibold">Alertas de vencimento</h2>
          </div>
          <ul className="space-y-2">
            {alerts.slice(0, 6).map((t) => {
              const days = differenceInCalendarDays(new Date(t.due_date + "T00:00:00"), today);
              const label =
                days < 0 ? `Atrasada há ${Math.abs(days)} dia(s)` : days === 0 ? "Vence hoje" : `Vence em ${days} dia(s)`;
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{t.description}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className={days < 0 ? "text-destructive" : "text-muted-foreground"}>{label}</span>
                    <span className="font-semibold">{brl(Number(t.amount))}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Checklist do mês</h2>
            <p className="text-sm text-muted-foreground">
              Marque cada conta conforme o pagamento
            </p>
          </div>
          <Link to="/transactions">
            <Button size="sm">Ver todas</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : expense.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma conta neste mês.</p>
            <Link to="/transactions" className="mt-3 inline-block">
              <Button size="sm" variant="outline">Adicionar conta</Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {expense.map((t) => {
              const isPaid = t.status === "paid";
              const isOverdue = !isPaid && new Date(t.due_date) < new Date(new Date().toDateString());
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => togglePaid.mutate({ id: t.id, paid: e.target.checked })}
                    className="h-5 w-5 rounded border-border accent-[oklch(0.55_0.22_260)]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm font-medium ${isPaid ? "line-through text-muted-foreground" : ""}`}>
                      {t.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {format(new Date(t.due_date + "T00:00:00"), "dd/MM")}
                      {isOverdue && <span className="ml-2 text-destructive">Atrasado</span>}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${isPaid ? "text-muted-foreground line-through" : ""}`}>
                    {brl(Number(t.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  subtitle,
  delta,
  deltaGoodWhenUp,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive" | "warning";
  subtitle?: string;
  delta?: number | null;
  deltaGoodWhenUp?: boolean;
}) {
  const toneClass = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];
  const up = (delta ?? 0) > 0;
  const good = deltaGoodWhenUp ? up : !up;
  return (
    <Card className="hover-lift p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</p>
          <p className="mt-1.5 truncate text-lg font-bold tracking-tight sm:mt-2 sm:text-2xl">{value}</p>
          {delta !== null && delta !== undefined && delta !== 0 && (
            <p className={`mt-1 flex items-center gap-1 text-xs ${good ? "text-success" : "text-destructive"}`}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta)}% vs mês anterior
            </p>
          )}
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
