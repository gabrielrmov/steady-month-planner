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
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Plus,
  Wallet,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ensureRecurringForMonth } from "@/lib/automation";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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

  // Próximos 7 dias a partir de hoje, independente do mês exibido
  const weekFrom = format(new Date(), "yyyy-MM-dd");
  const weekTo = format(new Date(Date.now() + 6 * 86400000), "yyyy-MM-dd");
  const { data: weekRows = [] } = useQuery({
    queryKey: ["tx", "week", weekFrom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, due_date")
        .eq("type", "expense")
        .neq("status", "paid")
        .gte("due_date", weekFrom)
        .lte("due_date", weekTo);
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; amount: number; due_date: string }[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const uid = sessionRes.session?.user.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; full_name: string | null; email: string | null } | null;
    },
  });
  const firstName = profile?.full_name?.split(" ")[0] ?? null;

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
  const nextDue = unpaidExpense[0];
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const key = format(d, "yyyy-MM-dd");
    const items = weekRows.filter((t) => t.due_date === key);
    return {
      d,
      key,
      count: items.length,
      total: items.reduce((x, t) => x + Number(t.amount), 0),
      isToday: i === 0,
    };
  });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const pie = topCategories.map((c) => ({ name: c.name, value: c.total, color: c.color }));

  return (
    <div className="relative isolate mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-80 w-[64rem] max-w-[140vw] -translate-x-1/2 opacity-70 blur-3xl dark:opacity-30"
        style={{
          background:
            "radial-gradient(40% 60% at 25% 40%, rgba(91,108,255,.22), transparent), radial-gradient(35% 55% at 75% 30%, rgba(16,163,127,.18), transparent)",
        }}
      />
      <header className="animate-rise flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Veja como está o seu dinheiro em {period.toLowerCase()}.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex flex-1 items-center justify-between gap-1 rounded-full bg-card p-1 shadow-[var(--soft)] ring-1 ring-black/5 sm:flex-none dark:ring-white/10">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Mês anterior"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 px-2 text-center text-[13px] font-semibold">{period}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Próximo mês"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link to="/transactions" className="shrink-0">
            <Button className="h-11 gap-1.5 rounded-full px-4 text-[13px]">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </Link>
        </div>
      </header>

      <Fragment key={from}>
        {alerts.length > 0 && (
          <div
            className="animate-rise flex flex-wrap items-center gap-3 rounded-2xl bg-[#fff1e8] px-4 py-3 text-[#7a3200] ring-1 ring-[#f6c9aa] dark:bg-[#3a1d0b] dark:text-[#ffd9bd] dark:ring-[#6b3410]"
            role="status"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ec652b] text-white">
              <BellRing className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 text-[14px] leading-5">
              {overdue > 0 ? (
                <>
                  <strong>
                    {overdue} {overdue === 1 ? "conta vencida" : "contas vencidas"}
                  </strong>{" "}
                  somando <span className="num">{brl(overdueList.reduce((x, t) => x + Number(t.amount), 0))}</span>
                  {overdueList[0] ? `, a mais antiga: ${overdueList[0].description}.` : "."}
                </>
              ) : (
                <>
                  <strong>
                    {upcoming.length} {upcoming.length === 1 ? "vencimento" : "vencimentos"} nos próximos 7 dias
                  </strong>
                  {upcoming[0] ? `, o primeiro: ${upcoming[0].description}.` : "."}
                </>
              )}
            </p>
            <Link
              to="/transactions"
              className="shrink-0 rounded-full bg-white/70 px-3.5 py-1.5 text-[13px] font-semibold hover:bg-white dark:bg-white/10 dark:hover:bg-white/20"
            >
              Ver contas
            </Link>
          </div>
        )}

        <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          <div
            className="animate-rise relative col-span-2 min-h-[210px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#111a4a] via-[#1b2a78] to-[#2f4fd0] p-5 text-white shadow-[var(--soft)] sm:p-6 xl:col-span-1"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-90" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gHero" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="saldo" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={2} fill="url(#gHero)" dot={false} animationDuration={1100} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="relative flex items-center justify-between">
              <span className="text-[13px] font-medium text-white/75">Saldo do mês</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <Money value={balance} className="relative mt-4 block whitespace-nowrap text-[30px] font-semibold leading-none sm:text-[34px]" />
            <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="rounded-full bg-white/15 px-2.5 py-1">
                {incomeTotal > 0 ? `${savingRate}% da renda sobra` : "Sem entradas"}
              </span>
              {balanceDelta !== null && balanceDelta !== 0 && (
                <span className="num rounded-full bg-white/15 px-2.5 py-1">
                  {balanceDelta > 0 ? "▲" : "▼"} {Math.abs(balanceDelta)}%
                </span>
              )}
            </div>
          </div>

          <Kpi
            index={1}
            label="Receitas"
            value={incomeTotal}
            icon={<ArrowDownLeft className="h-4 w-4" />}
            color="#10a37f"
            data={series.map((m) => m.entradas)}
            delta={delta(incomeTotal, prevIncome)}
            upIsGood
            note={incomePending > 0 ? `${brl(incomePending)} a receber` : incomeTotal > 0 ? "Tudo recebido" : "Sem entradas"}
          />
          <Kpi
            index={2}
            label="Despesas"
            value={expenseTotal}
            icon={<ArrowUpRight className="h-4 w-4" />}
            color="#e5484d"
            data={series.map((m) => m.saidas)}
            delta={delta(expenseTotal, prevExpense)}
            note={expensePending > 0 ? `${brl(expensePending)} a pagar` : expenseTotal > 0 ? "Tudo pago" : "Sem saídas"}
          />
          <div
            className="animate-rise col-span-2 rounded-3xl bg-card p-5 shadow-[var(--soft)] ring-1 ring-black/5 sm:p-6 xl:col-span-1 dark:ring-white/10"
            style={{ animationDelay: "270ms" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">Metas</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7c5cfc]/15 text-[#7c5cfc]">
                <PiggyBank className="h-4 w-4" />
              </span>
            </div>
            <p className="num mt-4 text-[30px] font-semibold leading-none sm:text-[34px]">
              {goalsTarget > 0 ? `${goalsPct}%` : "—"}
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="animate-grow-x h-full rounded-full bg-gradient-to-r from-[#7c5cfc] to-[#b39bff]"
                style={{ width: `${goalsPct}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {goalsTarget > 0 ? (
                `${brl(goalsSaved)} de ${brl(goalsTarget)}`
              ) : (
                <Link to="/savings" className="font-semibold text-primary hover:underline">
                  Criar a primeira meta
                </Link>
              )}
            </p>
          </div>
        </section>

        <Panel
          title="Próximos 7 dias"
          subtitle="O que vence a partir de hoje"
          delay={300}
          action={
            <Link to="/calendar" className="text-[13px] font-semibold text-primary hover:underline">
              Calendário
            </Link>
          }
        >
          <ol className="grid grid-cols-7 gap-1.5 sm:gap-3">
            {week.map((w) => (
              <li
                key={w.key}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-center transition-colors sm:py-4 ${
                  w.isToday
                    ? "bg-[#111a4a] text-white dark:bg-[#5b6cff]"
                    : w.count > 0
                      ? "bg-[#fff4e8] text-[#7a3200] dark:bg-[#35210a] dark:text-[#ffd9bd]"
                      : "bg-muted/60 text-muted-foreground"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {format(w.d, "EEE", { locale: ptBR }).replace(".", "")}
                </span>
                <span className="num text-[18px] font-semibold leading-none sm:text-[22px]">
                  {format(w.d, "d")}
                </span>
                <span className="num min-h-[16px] text-[10.5px] font-semibold leading-4 sm:text-[12px]">
                  {w.count > 0 ? brlShort(w.total) : "·"}
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-current opacity-60 sm:block" style={{ visibility: w.count > 0 ? "visible" : "hidden" }} />
              </li>
            ))}
          </ol>
        </Panel>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.55fr_1fr]">
          <Panel title="Entradas e saídas" subtitle="Últimos 6 meses" delay={320}>
            <div className="mb-2 flex items-center gap-5 text-[12px] font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10a37f]" /> Entrou
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#5b6cff]" /> Saiu
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={6}>
                  <defs>
                    <linearGradient id="bIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4a7" />
                      <stop offset="100%" stopColor="#10a37f" />
                    </linearGradient>
                    <linearGradient id="bOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b97ff" />
                      <stop offset="100%" stopColor="#5b6cff" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickMargin={10}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    tickFormatter={(v) => brlShort(Number(v))}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="var(--muted-foreground)"
                    width={40}
                  />
                  <RTooltip
                    cursor={{ fill: "var(--muted)", radius: 8 }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 13,
                      boxShadow: "0 8px 24px -8px rgba(16,24,40,.25)",
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(v: number | string, n) => [
                      brl(Number(v)),
                      n === "entradas" ? "Entrou" : "Saiu",
                    ]}
                  />
                  <Bar dataKey="entradas" fill="url(#bIn)" radius={[10, 10, 4, 4]} maxBarSize={22} animationDuration={900} />
                  <Bar dataKey="saidas" fill="url(#bOut)" radius={[10, 10, 4, 4]} maxBarSize={22} animationDuration={900} animationBegin={150} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Para onde vai o dinheiro"
            subtitle={period}
            delay={400}
            action={
              <Link to="/categories" className="text-[13px] font-semibold text-primary hover:underline">
                Orçamentos
              </Link>
            }
          >
            {topCategories.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-muted-foreground">
                Nenhuma despesa categorizada neste mês.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="relative mx-auto h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pie}
                        dataKey="value"
                        innerRadius={58}
                        outerRadius={84}
                        paddingAngle={3}
                        cornerRadius={6}
                        stroke="none"
                        animationDuration={900}
                      >
                        {pie.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-medium text-muted-foreground">Gasto</span>
                    <span className="num text-[16px] font-semibold">{brl(expenseTotal)}</span>
                  </div>
                </div>
                <ul className="space-y-3.5">
                  {topCategories.map((c) => {
                    const pct = expenseTotal > 0 ? Math.round((c.total / expenseTotal) * 100) : 0;
                    const hasBudget = c.budget !== null && c.budget > 0;
                    const isOver = hasBudget && c.total > c.budget!;
                    return (
                      <li key={c.name}>
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{c.name}</span>
                          <span className="num text-[13px] text-muted-foreground">{pct}%</span>
                          <span className={`num w-24 text-right text-[14px] font-semibold ${isOver ? "text-negative" : ""}`}>
                            {brl(c.total)}
                          </span>
                        </div>
                        {hasBudget && (
                          <div className="ml-6 mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (c.total / c.budget!) * 100)}%`,
                                  background: isOver ? "#e5484d" : c.color,
                                }}
                              />
                            </div>
                            <span className={`text-[11px] ${isOver ? "font-semibold text-negative" : "text-muted-foreground"}`}>
                              {isOver ? `${brl(c.total - c.budget!)} acima` : `de ${brl(c.budget!)}`}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.55fr_1fr]">
          <Panel
            title="Contas a pagar"
            subtitle={
              nextDue
                ? `Próxima: ${nextDue.description}, ${dueLabel(
                    differenceInCalendarDays(new Date(nextDue.due_date + "T00:00:00"), today),
                  ).toLowerCase()}`
                : period
            }
            delay={480}
            action={
              <Link to="/transactions" className="text-[13px] font-semibold text-primary hover:underline">
                Ver todas
              </Link>
            }
          >
            {isLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : expense.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[14px] text-muted-foreground">Nenhum lançamento neste mês.</p>
                <Link to="/transactions" className="mt-4 inline-block">
                  <Button size="sm" className="rounded-full">Adicionar lançamento</Button>
                </Link>
              </div>
            ) : unpaidExpense.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-[#e8f8f2] px-4 py-5 text-[#0b5f4a] dark:bg-[#0b2f27] dark:text-[#9be8cf]">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <p className="text-[14px]">
                  <strong>Tudo pago neste mês.</strong>{" "}
                  <span className="num">
                    {paidExpense.length} {paidExpense.length === 1 ? "conta" : "contas"} · {brl(paidExpenseTotal)}
                  </span>
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {checklistItems.map((t, ri) => {
                    const days = differenceInCalendarDays(new Date(t.due_date + "T00:00:00"), today);
                    const isOverdue = days < 0;
                    const soon = days >= 0 && days <= 7;
                    const chip = isOverdue
                      ? "bg-[#ffe9ea] text-[#b4232a] dark:bg-[#3a1215] dark:text-[#ff9aa0]"
                      : soon
                        ? "bg-[#fff1e0] text-[#a85b00] dark:bg-[#35210a] dark:text-[#ffc989]"
                        : "bg-muted text-muted-foreground";
                    const color = t.categories?.color ?? "#64748B";
                    return (
                      <li
                        key={t.id}
                        className="animate-fade-in flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-muted/70 sm:gap-4 sm:px-3"
                        style={{ animationDelay: `${540 + ri * 55}ms` }}
                      >
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-bold"
                          style={{ background: `${color}22`, color }}
                          aria-hidden="true"
                        >
                          {t.description.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold">{t.description}</p>
                          <p className="truncate text-[12px] text-muted-foreground">
                            {t.categories?.name ?? "Sem categoria"}
                            <span className="sm:hidden"> · {dueLabel(days)}</span>
                          </p>
                        </div>
                        <span className={`hidden whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold sm:inline-block ${chip}`}>
                          {days > 7 ? format(new Date(t.due_date + "T00:00:00"), "dd/MM") : dueLabel(days)}
                        </span>
                        <span className="num w-[6.5rem] shrink-0 text-right text-[14px] font-semibold">
                          {brl(Number(t.amount))}
                        </span>
                        <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center" title="Marcar como paga">
                          <input
                            type="checkbox"
                            aria-label={`Marcar ${t.description} como paga`}
                            checked={false}
                            onChange={(e) => togglePaid.mutate({ id: t.id, paid: e.target.checked })}
                            className="h-6 w-6 cursor-pointer appearance-none rounded-full border-2 border-border-strong bg-transparent transition-colors checked:border-[#10a37f] checked:bg-[#10a37f] hover:border-[#10a37f]"
                          />
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {hiddenUnpaidCount > 0 && (
                  <Link
                    to="/transactions"
                    className="mt-3 block rounded-full bg-muted py-2.5 text-center text-[13px] font-semibold hover:bg-muted/70"
                  >
                    Ver mais {hiddenUnpaidCount} {hiddenUnpaidCount === 1 ? "conta" : "contas"}
                  </Link>
                )}
              </>
            )}
          </Panel>

          <div className="space-y-4 sm:space-y-6">
            <Panel title="Metas de economia" delay={560} action={
              <Link to="/savings" className="text-[13px] font-semibold text-primary hover:underline">Ver</Link>
            }>
              {goals.length === 0 ? (
                <p className="py-4 text-[14px] text-muted-foreground">
                  Nenhuma meta ainda.{" "}
                  <Link to="/savings" className="font-semibold text-primary hover:underline">Criar a primeira</Link>
                </p>
              ) : (
                <ul className="space-y-4">
                  {goals.slice(0, 3).map((g) => {
                    const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
                    return (
                      <li key={g.id}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[14px] font-semibold">{g.name}</span>
                          <span className="num text-[13px] font-semibold text-[#7c5cfc]">{pct}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className="animate-grow-x h-full rounded-full bg-gradient-to-r from-[#7c5cfc] to-[#b39bff]" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="num mt-1 text-[12px] text-muted-foreground">
                          {brl(Number(g.current_amount))} de {brl(Number(g.target_amount))}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Resumo inteligente" delay={620}>
              <ul className="space-y-2.5">
                {topInsights.map((ins, i) => (
                  <li
                    key={i}
                    className={`animate-rise rounded-2xl px-4 py-3 text-[13.5px] leading-5 ${insightTone[ins.tone]}`}
                    style={{ animationDelay: `${680 + i * 80}ms` }}
                  >
                    {ins.text}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" /> Contas pagas no mês</span>
                  <span className="num">{paidRatio}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="animate-grow-x h-full rounded-full bg-gradient-to-r from-[#10a37f] to-[#5ad1b3]" style={{ width: `${paidRatio}%` }} />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </Fragment>
    </div>
  );
}

const insightTone: Record<"destructive" | "warning" | "success" | "primary", string> = {
  destructive: "bg-[#ffe9ea] text-[#8f1d23] dark:bg-[#3a1215] dark:text-[#ffb3b8]",
  warning: "bg-[#fff4e0] text-[#80500a] dark:bg-[#35210a] dark:text-[#ffd699]",
  success: "bg-[#e8f8f2] text-[#0b5f4a] dark:bg-[#0b2f27] dark:text-[#9be8cf]",
  primary: "bg-[#eef1ff] text-[#26327f] dark:bg-[#15193d] dark:text-[#b9c2ff]",
};

function Panel({
  title,
  subtitle,
  action,
  delay = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="animate-rise min-w-0 rounded-3xl bg-card p-5 shadow-[var(--soft)] ring-1 ring-black/5 sm:p-6 dark:ring-white/10"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold leading-6 tracking-tight">{title}</h2>
          {subtitle && <p className="truncate text-[12.5px] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Money({ value, className }: { value: number; className?: string }) {
  const shown = useAnimatedNumber(value);
  return <span className={`num ${className ?? ""}`}>{brl(shown)}</span>;
}

function Kpi({
  index,
  label,
  value,
  icon,
  color,
  data,
  delta,
  upIsGood,
  note,
}: {
  index: number;
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  data: number[];
  delta: number | null;
  upIsGood?: boolean;
  note?: string;
}) {
  const up = (delta ?? 0) > 0;
  const good = upIsGood ? up : !up;
  const id = `k-${label}`;
  return (
    <div
      className="animate-rise rounded-3xl bg-card p-5 shadow-[var(--soft)] ring-1 ring-black/5 transition-transform duration-300 hover:-translate-y-0.5 sm:p-6 dark:ring-white/10"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: `${color}22`, color }}>
          {icon}
        </span>
      </div>
      <Money value={value} className="mt-4 block whitespace-nowrap text-[24px] font-semibold leading-none sm:text-[28px]" />
      <div className="mt-3 flex items-center gap-2">
        {delta !== null && delta !== 0 && (
          <span
            className={`num shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${good ? "bg-[#e8f8f2] text-[#0b7a5c] dark:bg-[#0b2f27] dark:text-[#7be0c0]" : "bg-[#ffe9ea] text-[#b4232a] dark:bg-[#3a1215] dark:text-[#ff9aa0]"}`}
          >
            {up ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
        {note && <span className="truncate text-[12px] text-muted-foreground">{note}</span>}
      </div>
      <div className="mt-3 h-10 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.map((v) => ({ v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
