import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
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
      { title: "Dashboard financeiro | FINLIST" },
      {
        name: "description",
        content: "Visão geral do mês: quanto entra, quanto sai e o checklist de contas a pagar.",
      },
      { property: "og:title", content: "Dashboard financeiro | FINLIST" },
      {
        property: "og:description",
        content: "Visão geral do mês: quanto entra, quanto sai e o checklist de contas a pagar.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthLabel = (d: Date) => {
  const t = format(d, "MMMM 'de' yyyy", { locale: ptBR });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const brlShort = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")}k` : v.toFixed(0);

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

type CategoryBudget = { id: string; name: string; color: string; monthly_budget: number | null };

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
        .select(
          "id, description, amount, type, status, due_date, category_id, categories(name, color)",
        )
        .gte("due_date", historyFrom)
        .lte("due_date", to)
        .order("due_date");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, color, monthly_budget");
      if (error) throw error;
      return (data ?? []) as CategoryBudget[];
    },
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["savings-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("id, name, target_amount, current_amount");
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        name: string;
        target_amount: number;
        current_amount: number;
      }[];
    },
  });
  const goalsSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const goalsTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const goalsPct =
    goalsTarget > 0 ? Math.min(100, Math.round((goalsSaved / goalsTarget) * 100)) : 0;
  const budgetById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.monthly_budget])),
    [categories],
  );

  const txs = useMemo(
    () => rows.filter((t) => t.due_date >= from && t.due_date <= to),
    [rows, from, to],
  );

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
  const expensePaid = expense
    .filter((t) => t.status === "paid")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expensePending = expenseTotal - expensePaid;
  const incomePaid = income
    .filter((t) => t.status === "paid")
    .reduce((s, t) => s + Number(t.amount), 0);
  const incomePending = incomeTotal - incomePaid;
  const balance = incomeTotal - expenseTotal;

  const CHECKLIST_LIMIT = 8;
  const unpaidExpense = useMemo(
    () =>
      expense
        .filter((t) => t.status !== "paid")
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [expense],
  );
  const paidExpense = useMemo(() => expense.filter((t) => t.status === "paid"), [expense]);
  const paidExpenseTotal = paidExpense.reduce((s, t) => s + Number(t.amount), 0);
  const checklistItems = unpaidExpense.slice(0, CHECKLIST_LIMIT);
  const hiddenUnpaidCount = Math.max(0, unpaidExpense.length - checklistItems.length);
  const paidRatio = expenseTotal > 0 ? Math.round((expensePaid / expenseTotal) * 100) : 0;
  const savingRate = incomeTotal > 0 ? Math.round((balance / incomeTotal) * 100) : 0;

  // mês anterior para comparativo
  const prevFrom = format(startOfMonth(subMonths(month, 1)), "yyyy-MM-dd");
  const prevTo = format(endOfMonth(subMonths(month, 1)), "yyyy-MM-dd");
  const prev = rows.filter((t) => t.due_date >= prevFrom && t.due_date <= prevTo);
  const prevIncome = prev
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense = prev
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const delta = (cur: number, before: number) =>
    before > 0 ? Math.round(((cur - before) / before) * 100) : null;

  // série dos últimos 6 meses
  const series = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const m = subMonths(month, 5 - i);
      const a = format(startOfMonth(m), "yyyy-MM-dd");
      const b = format(endOfMonth(m), "yyyy-MM-dd");
      const slice = rows.filter((t) => t.due_date >= a && t.due_date <= b);
      const inc = slice
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0);
      const exp = slice
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0);
      return {
        mes: format(m, "MMM", { locale: ptBR }),
        entradas: inc,
        saidas: exp,
        saldo: inc - exp,
      };
    });
  }, [rows, month]);

  // top categorias do mês (com orçamento, quando definido)
  const topCategories = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; total: number; budget: number | null }
    >();
    for (const t of expense) {
      const key = t.category_id ?? "none";
      const name = t.categories?.name ?? "Sem categoria";
      const color = t.categories?.color ?? "#64748B";
      const budget = t.category_id ? (budgetById.get(t.category_id) ?? null) : null;
      const cur = map.get(key) ?? { name, color, total: 0, budget };
      cur.total += Number(t.amount);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expense, budgetById]);

  const overBudget = topCategories.filter((c) => c.budget !== null && c.total > c.budget);

  const today = new Date(new Date().toDateString());
  const overdueList = txs.filter(
    (t) =>
      t.status === "pending" && t.type === "expense" && new Date(t.due_date + "T00:00:00") < today,
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

  const prevSavingRate =
    prevIncome > 0 ? Math.round(((prevIncome - prevExpense) / prevIncome) * 100) : null;
  const savingRateDelta =
    prevSavingRate !== null && incomeTotal > 0 ? savingRate - prevSavingRate : null;

  type Insight = { text: string; tone: "destructive" | "warning" | "success" | "primary" };
  const insights: Insight[] = [];

  if (overdue > 0) {
    insights.push({
      text: `Você tem ${overdue} ${overdue === 1 ? "conta em atraso" : "contas em atraso"} somando ${brl(
        overdueList.reduce((s, t) => s + Number(t.amount), 0),
      )}.`,
      tone: "destructive",
    });
  }
  for (const c of overBudget.slice(0, 2)) {
    insights.push({
      text: `${c.name} já passou do orçamento mensal (${brl(c.total)} de ${brl(c.budget!)}).`,
      tone: "warning",
    });
  }
  if (expenseTotal > incomeTotal && incomeTotal > 0) {
    insights.push({
      text: `As saídas superam as entradas em ${brl(expenseTotal - incomeTotal)} neste mês.`,
      tone: "warning",
    });
  }
  if (incomePending > 0 && incomeTotal > 0) {
    insights.push({
      text: `Você ainda tem ${brl(incomePending)} a receber neste mês (${Math.round((incomePending / incomeTotal) * 100)}% do previsto).`,
      tone: "primary",
    });
  }
  if (savingRateDelta !== null && Math.abs(savingRateDelta) >= 3) {
    insights.push({
      text:
        savingRateDelta > 0
          ? `Sua taxa de economia subiu para ${savingRate}%, ${savingRateDelta} pontos acima do mês passado.`
          : `Sua taxa de economia caiu para ${savingRate}%, ${Math.abs(savingRateDelta)} pontos abaixo do mês passado.`,
      tone: savingRateDelta > 0 ? "success" : "warning",
    });
  }
  if (topCategories[0]) {
    insights.push({
      text: `${topCategories[0].name} é seu maior gasto do mês (${brl(topCategories[0].total)}${
        expenseTotal
          ? `, ${Math.round((topCategories[0].total / expenseTotal) * 100)}% do total`
          : ""
      }).`,
      tone: "primary",
    });
  }
  if (biggest) {
    insights.push({
      text: `Maior despesa individual: ${biggest.description} (${brl(Number(biggest.amount))}).`,
      tone: "primary",
    });
  }
  if (insights.length === 0) {
    insights.push({
      text: "Cadastre suas contas do mês para ver insights personalizados.",
      tone: "primary",
    });
  }
  const topInsights = insights.slice(0, 3);
  const insightToneDot: Record<Insight["tone"], string> = {
    destructive: "bg-destructive",
    warning: "bg-warning",
    success: "bg-success",
    primary: "bg-primary",
  };

  const period = monthLabel(month);
  const dueLabel = (days: number) =>
    days < 0
      ? `Venceu há ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}`
      : days === 0
        ? "Vence hoje"
        : `Vence em ${days} ${days === 1 ? "dia" : "dias"}`;

  const balanceDelta = delta(balance, prevIncome - prevExpense);

  return (
    <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">
      <header className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Visão geral
          </p>
          <h1 className="mt-2 truncate text-[34px] font-semibold leading-none tracking-tight sm:text-[44px]">
            {period}
          </h1>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              aria-label="Mês anterior"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              aria-label="Próximo mês"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link to="/transactions" className="ml-auto shrink-0 sm:ml-0">
            <Button className="h-10 px-4 text-[13px]">Novo lançamento</Button>
          </Link>
        </div>
      </header>

      <Fragment key={from}>
        <section aria-label="Indicadores" className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <div className="animate-rise min-w-0">
            <Eyebrow>Saldo do mês</Eyebrow>
            <Money
              value={balance}
              className={`mt-4 block text-[44px] font-medium leading-none tracking-tight sm:text-[76px] ${balance < 0 ? "text-negative" : ""}`}
            />
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
              <span className="num inline-flex items-center rounded-full border border-border px-3 py-1 text-[12px] text-foreground">
                {incomeTotal > 0 ? `${savingRate}% da renda sobra` : "Sem entradas no mês"}
              </span>
              {balanceDelta !== null && balanceDelta !== 0 && (
                <span className={`num ${balanceDelta > 0 ? "text-positive" : "text-negative"}`}>
                  {balanceDelta > 0 ? "▲" : "▼"} {Math.abs(balanceDelta)}% vs mês anterior
                </span>
              )}
            </div>
            <div className="mt-8 h-24 w-full sm:h-28" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    stroke="var(--chart-1)"
                    strokeWidth={1.75}
                    fill="url(#gBalance)"
                    dot={false}
                    isAnimationActive
                    animationDuration={1100}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Saldo · últimos 6 meses
            </p>
          </div>

          <dl
            className="animate-rise divide-y divide-border self-start border-y border-border"
            style={{ animationDelay: "120ms" }}
          >
            <StatRow
              label="Receitas"
              value={incomeTotal}
              delta={delta(incomeTotal, prevIncome)}
              upIsGood
              note={
                incomePending > 0
                  ? `${brl(incomePending)} a receber`
                  : incomeTotal > 0
                    ? "Tudo recebido"
                    : undefined
              }
            />
            <StatRow
              label="Despesas"
              value={expenseTotal}
              delta={delta(expenseTotal, prevExpense)}
              note={
                expensePending > 0
                  ? `${brl(expensePending)} a pagar`
                  : expenseTotal > 0
                    ? "Tudo pago"
                    : undefined
              }
            />
            <div className="py-5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Metas
                </dt>
                <dd className="num text-[22px] font-medium leading-none">
                  {goalsTarget > 0 ? `${goalsPct}%` : "—"}
                </dd>
              </div>
              <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="animate-grow-x h-full rounded-full bg-[var(--chart-1)]"
                  style={{ width: `${goalsPct}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {goalsTarget > 0 ? (
                  `${brl(goalsSaved)} de ${brl(goalsTarget)}`
                ) : (
                  <Link to="/savings" className="hover:text-foreground hover:underline">
                    Nenhuma meta ainda. Criar a primeira
                  </Link>
                )}
              </p>
            </div>
          </dl>
        </section>

        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <section className="animate-rise min-w-0" style={{ animationDelay: "200ms" }}>
            <SectionHead title="Fluxo de caixa">
              <span className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="h-[2px] w-4" style={{ background: "var(--chart-1)" }} />
                  Entrou
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-[2px] w-4" style={{ background: "var(--foreground)" }} />
                  Saiu
                </span>
              </span>
            </SectionHead>
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 5" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={10}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    tickFormatter={(v) => brlShort(Number(v))}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                    width={40}
                  />
                  <RTooltip
                    cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "none",
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(v: number | string, n) => [
                      brl(Number(v)),
                      n === "entradas" ? "Entrou" : "Saiu",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="entradas"
                    stroke="var(--chart-1)"
                    strokeWidth={1.75}
                    fill="url(#gIn)"
                    dot={false}
                    activeDot={{ r: 3.5 }}
                    animationDuration={1000}
                  />
                  <Area
                    type="monotone"
                    dataKey="saidas"
                    stroke="var(--foreground)"
                    strokeWidth={1.5}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 3.5 }}
                    animationDuration={1000}
                    animationBegin={150}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="animate-rise min-w-0" style={{ animationDelay: "280ms" }}>
            <SectionHead title="Despesas por categoria">
              <Link
                to="/categories"
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                Orçamentos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </SectionHead>
            {topCategories.length === 0 ? (
              <p className="py-10 text-[14px] leading-6 text-muted-foreground">
                Nenhuma despesa categorizada neste mês.
              </p>
            ) : (
              <ul className="mt-6 space-y-6">
                {topCategories.map((c, i) => {
                  const pct = expenseTotal > 0 ? Math.round((c.total / expenseTotal) * 100) : 0;
                  const hasBudget = c.budget !== null && c.budget > 0;
                  const budgetPct = hasBudget ? Math.min(100, (c.total / c.budget!) * 100) : null;
                  const isOver = hasBudget && c.total > c.budget!;
                  return (
                    <li key={c.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[14px] font-medium">{c.name}</span>
                        <span className={`num shrink-0 text-[14px] ${isOver ? "text-negative" : ""}`}>
                          {brl(c.total)}
                        </span>
                      </div>
                      <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="animate-grow-x h-full rounded-full"
                          style={{
                            animationDelay: `${350 + i * 90}ms`,
                            width: `${hasBudget ? budgetPct : pct}%`,
                            background: isOver ? "var(--negative)" : "var(--chart-1)",
                          }}
                        />
                      </div>
                      <p
                        className={`num mt-1.5 text-[11px] ${isOver ? "text-negative" : "text-muted-foreground"}`}
                      >
                        {isOver
                          ? `${brl(c.total - c.budget!)} acima do orçamento`
                          : hasBudget
                            ? `orçamento ${brl(c.budget!)}`
                            : `${pct}% das despesas`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <section className="animate-rise min-w-0" style={{ animationDelay: "360ms" }}>
            <SectionHead title="A pagar">
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                Ver todas <ArrowUpRight className="h-3 w-3" />
              </Link>
            </SectionHead>

            {isLoading ? (
              <div className="space-y-3 py-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : expense.length === 0 ? (
              <div className="py-10">
                <p className="text-[14px] text-muted-foreground">
                  Nenhum lançamento neste mês.
                </p>
                <Link to="/transactions" className="mt-4 inline-block">
                  <Button size="sm" variant="outline">
                    Adicionar lançamento
                  </Button>
                </Link>
              </div>
            ) : unpaidExpense.length === 0 ? (
              <div className="flex items-center gap-3 py-8">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-positive" />
                <p className="text-[14px]">
                  Tudo pago neste mês
                  <span className="num ml-2 text-muted-foreground">
                    {paidExpense.length} {paidExpense.length === 1 ? "conta" : "contas"} ·{" "}
                    {brl(paidExpenseTotal)}
                  </span>
                </p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {checklistItems.map((t, ri) => {
                    const days = differenceInCalendarDays(
                      new Date(t.due_date + "T00:00:00"),
                      today,
                    );
                    const isOverdue = days < 0;
                    const soon = days >= 0 && days <= 7;
                    const tone = isOverdue
                      ? "text-negative"
                      : soon
                        ? "text-attention"
                        : "text-muted-foreground";
                    return (
                      <li
                        key={t.id}
                        className="animate-fade-in group flex items-center gap-4 py-3.5 transition-colors"
                        style={{ animationDelay: `${440 + ri * 60}ms` }}
                      >
                        <label className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            aria-label={`Marcar ${t.description} como paga`}
                            checked={false}
                            onChange={(e) =>
                              togglePaid.mutate({ id: t.id, paid: e.target.checked })
                            }
                            className="h-[18px] w-[18px] cursor-pointer appearance-none rounded-full border border-border-strong bg-transparent transition-colors checked:border-[var(--chart-1)] checked:bg-[var(--chart-1)] hover:border-foreground"
                          />
                        </label>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">{t.description}</p>
                          <p className={`font-mono text-[11px] sm:hidden ${tone}`}>
                            {dueLabel(days)}
                          </p>
                        </div>
                        <span
                          className={`hidden items-center gap-2 whitespace-nowrap font-mono text-[11px] sm:inline-flex ${tone}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${isOverdue ? "bg-negative" : soon ? "bg-attention" : "bg-border-strong"}`}
                          />
                          {days > 7
                            ? format(new Date(t.due_date + "T00:00:00"), "dd/MM/yyyy")
                            : dueLabel(days)}
                        </span>
                        <span className="num w-28 shrink-0 text-right text-[14px]">
                          {brl(Number(t.amount))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {hiddenUnpaidCount > 0 && (
                  <Link
                    to="/transactions"
                    className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  >
                    + {hiddenUnpaidCount} {hiddenUnpaidCount === 1 ? "conta" : "contas"}
                  </Link>
                )}
              </>
            )}
          </section>

          <section className="animate-rise min-w-0" style={{ animationDelay: "440ms" }}>
            <SectionHead title="Sinais" />
            <ul className="mt-6 space-y-4">
              {topInsights.map((ins, i) => (
                <li
                  key={i}
                  className="animate-rise flex items-start gap-3 text-[14px] leading-6"
                  style={{ animationDelay: `${520 + i * 90}ms` }}
                >
                  <span
                    className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${insightToneDot[ins.tone]}`}
                  />
                  <span className="min-w-0">{ins.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Contas pagas
                </span>
                <span className="num text-[14px]">{paidRatio}%</span>
              </div>
              <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="animate-grow-x h-full rounded-full bg-[var(--chart-1)]"
                  style={{ width: `${paidRatio}%` }}
                />
              </div>
            </div>
          </section>
        </div>
      </Fragment>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </p>
  );
}

function SectionHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Money({ value, className }: { value: number; className?: string }) {
  const shown = useAnimatedNumber(value);
  return <span className={`num ${className ?? ""}`}>{brl(shown)}</span>;
}

function StatRow({
  label,
  value,
  delta,
  upIsGood,
  note,
}: {
  label: string;
  value: number;
  delta: number | null;
  upIsGood?: boolean;
  note?: string;
}) {
  const up = (delta ?? 0) > 0;
  const good = upIsGood ? up : !up;
  return (
    <div className="py-5">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </dt>
        <dd>
          <Money value={value} className="text-[22px] font-medium leading-none" />
        </dd>
      </div>
      <p className="num mt-2 flex flex-wrap items-center justify-end gap-x-3 text-[12px] text-muted-foreground">
        {delta !== null && delta !== 0 && (
          <span className={good ? "text-positive" : "text-negative"}>
            {up ? "▲" : "▼"} {Math.abs(delta)}% vs mês anterior
          </span>
        )}
        {note && <span>{note}</span>}
      </p>
    </div>
  );
}
