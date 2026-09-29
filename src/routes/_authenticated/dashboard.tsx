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
  CheckCircle2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ensureRecurringForMonth } from "@/lib/automation";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display truncate text-[28px] font-bold leading-[1.2] sm:text-[32px] sm:leading-[38px]">
            Visão geral do mês
          </h1>
          <p className="text-[12px] leading-4 text-muted-foreground">{period}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border-strong bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mês anterior"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-[13px] font-semibold">{period}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Próximo mês"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link to="/transactions">
            <Button>Adicionar lançamento</Button>
          </Link>
        </div>
      </div>

      <section
        aria-label="Indicadores"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Indicator
          label="Saldo"
          value={brl(balance)}
          period={period}
          tone={balance >= 0 ? "positive" : "negative"}
          note={incomeTotal > 0 ? `${savingRate}% da renda sobra` : "Sem entradas no mês"}
        />
        <Indicator
          label="Receitas"
          value={brl(incomeTotal)}
          period={period}
          tone="positive"
          delta={delta(incomeTotal, prevIncome)}
          upIsGood
          note={
            incomePending > 0
              ? `${brl(incomePending)} ainda a receber`
              : incomeTotal > 0
                ? "Tudo recebido"
                : undefined
          }
        />
        <Indicator
          label="Despesas"
          value={brl(expenseTotal)}
          period={period}
          tone="negative"
          delta={delta(expenseTotal, prevExpense)}
          note={
            expensePending > 0
              ? `${brl(expensePending)} ainda a pagar`
              : expenseTotal > 0
                ? "Tudo pago"
                : undefined
          }
        />
        <Indicator
          label="Metas"
          value={goalsTarget > 0 ? `${goalsPct}%` : "R$ 0,00"}
          period={period}
          tone="positive"
          note={
            goalsTarget > 0
              ? `Você guardou ${brl(goalsSaved)} de ${brl(goalsTarget)}`
              : "Nenhuma meta criada. Crie a primeira em Metas."
          }
          progress={goalsTarget > 0 ? goalsPct : undefined}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="animate-rise p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[22px] font-bold leading-7">Entradas x saídas</h2>
              <p className="text-[12px] leading-4 text-muted-foreground">
                Últimos 6 meses, até {period}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[13px] font-semibold">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: "var(--chart-1)" }} />
                Entrou
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: "var(--chart-2)" }} />
                Saiu
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 18, right: 4, left: -18, bottom: 0 }}
                barGap={8}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickFormatter={(v) => brlShort(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  width={62}
                />
                <RTooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v: number | string, n) => [
                    brl(Number(v)),
                    n === "entradas" ? "Entrou" : "Saiu",
                  ]}
                />
                <Bar dataKey="entradas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  <LabelList
                    dataKey="entradas"
                    position="top"
                    formatter={(v: number) => (v > 0 ? brlShort(v) : "")}
                    fontSize={11}
                    fill="var(--foreground)"
                  />
                </Bar>
                <Bar dataKey="saidas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  <LabelList
                    dataKey="saidas"
                    position="top"
                    formatter={(v: number) => (v > 0 ? brlShort(v) : "")}
                    fontSize={11}
                    fill="var(--foreground)"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-rise p-6">
          <div className="mb-6 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-[22px] font-bold leading-7">
                Despesas por categoria
              </h2>
              <p className="text-[12px] leading-4 text-muted-foreground">{period}</p>
            </div>
            <Link to="/categories" className="hidden shrink-0 sm:block">
              <Button variant="outline" size="sm">
                Orçamentos
              </Button>
            </Link>
          </div>
          {topCategories.length === 0 ? (
            <p className="py-10 text-center text-[15px] leading-[22px] text-muted-foreground">
              Nenhuma despesa categorizada neste mês. Adicione um lançamento para ver o resumo.
            </p>
          ) : (
            <ul className="space-y-4">
              {topCategories.map((c, i) => {
                const pct = expenseTotal > 0 ? Math.round((c.total / expenseTotal) * 100) : 0;
                const hasBudget = c.budget !== null && c.budget > 0;
                const budgetPct = hasBudget ? Math.min(100, (c.total / c.budget!) * 100) : null;
                const isOver = hasBudget && c.total > c.budget!;
                return (
                  <li key={c.name}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-bold leading-[22px]">
                        {c.name}
                      </span>
                      <span
                        className={`num shrink-0 text-[14px] leading-5 ${isOver ? "text-negative" : ""}`}
                      >
                        {brl(c.total)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-lg bg-muted">
                      <div
                        className="animate-grow-x h-full rounded-lg"
                        style={{
                          width: `${hasBudget ? budgetPct : pct}%`,
                          background: isOver
                            ? "var(--negative)"
                            : i === 0
                              ? "var(--signal)"
                              : "var(--chart-1)",
                        }}
                      />
                    </div>
                    <p
                      className={`mt-1 text-[12px] leading-4 ${isOver ? "font-semibold text-negative" : "text-muted-foreground"}`}
                    >
                      {isOver
                        ? `▲ Você gastou ${brl(c.total - c.budget!)} a mais que o previsto em ${c.name}.`
                        : hasBudget
                          ? `▼ Dentro do previsto: ${brl(c.budget!)}`
                          : `${pct}% das despesas`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="animate-rise p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[22px] font-bold leading-7">Contas a pagar</h2>
              <p className="text-[12px] leading-4 text-muted-foreground">{period}</p>
            </div>
            <Link to="/transactions">
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : expense.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[15px] leading-[22px] text-muted-foreground">
                Nenhum lançamento neste mês. Adicione o primeiro para ver o resumo.
              </p>
              <Link to="/transactions" className="mt-4 inline-block">
                <Button size="sm" variant="outline">
                  Adicionar lançamento
                </Button>
              </Link>
            </div>
          ) : unpaidExpense.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg bg-[var(--success-subtle)] px-4 py-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-positive" />
              <div className="min-w-0">
                <p className="text-[15px] font-bold leading-[22px]">Tudo pago neste mês</p>
                <p className="text-[12px] leading-4 text-muted-foreground">
                  {paidExpense.length} {paidExpense.length === 1 ? "conta paga" : "contas pagas"}:{" "}
                  {brl(paidExpenseTotal)}
                </p>
              </div>
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-[13px] font-semibold leading-[18px] tracking-[0.2px] text-muted-foreground">
                    <th className="w-8 py-2 pr-2">
                      <span className="sr-only">Pago</span>
                    </th>
                    <th className="w-full py-2 pr-2">Conta</th>
                    <th className="hidden py-2 pr-2 sm:table-cell">Vencimento</th>
                    <th className="py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {checklistItems.map((t) => {
                    const days = differenceInCalendarDays(
                      new Date(t.due_date + "T00:00:00"),
                      today,
                    );
                    const isOverdue = days < 0;
                    const soon = days >= 0 && days <= 7;
                    return (
                      <tr key={t.id} className="hover:bg-muted">
                        <td className="py-3 pr-2">
                          <input
                            type="checkbox"
                            aria-label={`Marcar ${t.description} como paga`}
                            checked={false}
                            onChange={(e) =>
                              togglePaid.mutate({ id: t.id, paid: e.target.checked })
                            }
                            className="h-5 w-5 cursor-pointer rounded-sm accent-[var(--brand)]"
                          />
                        </td>
                        <td className="max-w-0 py-3 pr-2">
                          <p className="truncate text-[15px] font-bold leading-[22px]">
                            {t.description}
                          </p>
                          <p
                            className={`text-[12px] leading-4 sm:hidden ${isOverdue ? "font-semibold text-negative" : soon ? "font-semibold text-attention" : "text-muted-foreground"}`}
                          >
                            {dueLabel(days)}
                          </p>
                        </td>
                        <td className="hidden py-3 pr-2 sm:table-cell">
                          <span
                            className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-0.5 text-[12px] leading-4 ${
                              isOverdue
                                ? "border-negative font-semibold text-negative"
                                : soon
                                  ? "border-attention font-semibold text-attention"
                                  : "border-border text-muted-foreground"
                            }`}
                          >
                            {days > 7
                              ? format(new Date(t.due_date + "T00:00:00"), "dd/MM/yyyy")
                              : dueLabel(days)}
                          </span>
                        </td>
                        <td className="num py-3 text-right text-[14px] leading-5">
                          {brl(Number(t.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {hiddenUnpaidCount > 0 && (
                <Link
                  to="/transactions"
                  className="mt-2 block py-2 text-center text-[13px] font-semibold text-primary hover:underline"
                >
                  Ver mais {hiddenUnpaidCount}{" "}
                  {hiddenUnpaidCount === 1 ? "conta a pagar" : "contas a pagar"}
                </Link>
              )}
              {paidExpense.length > 0 && (
                <p className="mt-2 flex items-center gap-2 border-t border-border pt-3 text-[12px] leading-4 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-positive" />
                  {paidExpense.length} {paidExpense.length === 1 ? "conta paga" : "contas pagas"}:{" "}
                  {brl(paidExpenseTotal)} ({paidRatio}% do mês)
                </p>
              )}
            </>
          )}
        </Card>

        <Card className="animate-rise p-6">
          <h2 className="font-display text-[22px] font-bold leading-7">Resumo</h2>
          <p className="mb-4 text-[12px] leading-4 text-muted-foreground">{period}</p>
          {alerts.length > 0 && (
            <div className="mb-4 rounded-lg border border-attention p-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold leading-[18px] text-attention">
                <BellRing className="h-4 w-4" />
                {overdue > 0
                  ? `${overdue} ${overdue === 1 ? "conta vencida" : "contas vencidas"}`
                  : "Vencimentos próximos"}
              </p>
              <ul className="mt-2 space-y-1">
                {alerts.slice(0, 3).map((t) => {
                  const days = differenceInCalendarDays(new Date(t.due_date + "T00:00:00"), today);
                  return (
                    <li key={t.id} className="text-[15px] leading-[22px]">
                      {t.description}: {dueLabel(days).toLowerCase()},{" "}
                      <span className="num text-[14px]">{brl(Number(t.amount))}</span>.
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <ul className="space-y-3">
            {topInsights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[22px]">
                <span
                  className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${insightToneDot[ins.tone]}`}
                />
                <span className="min-w-0">{ins.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-[13px] font-semibold leading-[18px]">
              <span>Contas pagas no mês</span>
              <span className="num text-[14px]">{paidRatio}%</span>
            </div>
            <Progress value={paidRatio} className="h-2" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Indicator({
  label,
  value,
  period,
  tone,
  delta,
  upIsGood,
  note,
  progress,
}: {
  label: string;
  value: string;
  period: string;
  tone: "positive" | "negative";
  delta?: number | null;
  upIsGood?: boolean;
  note?: string;
  progress?: number;
}) {
  const up = (delta ?? 0) > 0;
  const good = upIsGood ? up : !up;
  return (
    <Card className="animate-rise p-6">
      <p className="text-[13px] font-semibold leading-[18px] tracking-[0.2px] text-muted-foreground">
        {label}
      </p>
      <p
        className={`num mt-2 text-[26px] leading-9 sm:text-[28px] sm:leading-9 ${tone === "negative" && label === "Saldo" ? "text-negative" : ""}`}
      >
        {value}
      </p>
      {delta !== null && delta !== undefined && delta !== 0 ? (
        <p className={`num mt-2 text-[14px] leading-5 ${good ? "text-positive" : "text-negative"}`}>
          {up ? "▲ Acima" : "▼ Abaixo"} {Math.abs(delta)}% do mês anterior
        </p>
      ) : (
        note && <p className="mt-2 text-[14px] leading-5 text-muted-foreground">{note}</p>
      )}
      {delta !== null && delta !== undefined && delta !== 0 && note && (
        <p className="mt-1 text-[12px] leading-4 text-muted-foreground">{note}</p>
      )}
      {progress !== undefined && <Progress value={progress} className="mt-3 h-2" />}
      <p className="mt-3 text-[12px] leading-4 text-muted-foreground">{period}</p>
    </Card>
  );
}
