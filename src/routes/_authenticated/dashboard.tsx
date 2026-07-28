import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Wallet, AlertCircle, BellRing } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ensureRecurringForMonth } from "@/lib/automation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Dashboard() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const from = format(month, "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");
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


  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["tx", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("due_date", from)
        .lte("due_date", to)
        .order("due_date");
      if (error) throw error;
      return data ?? [];
    },
  });

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
  const balance = incomeTotal - expenseTotal;

  const overdue = txs.filter(
    (t) => t.status === "pending" && t.type === "expense" && new Date(t.due_date) < new Date(new Date().toDateString()),
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do mês</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium capitalize">
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Entradas previstas"
          value={brl(incomeTotal)}
          icon={ArrowUpCircle}
          tone="success"
        />
        <StatCard
          label="Saídas previstas"
          value={brl(expenseTotal)}
          icon={ArrowDownCircle}
          tone="destructive"
        />
        <StatCard
          label="Saldo previsto"
          value={brl(balance)}
          icon={Wallet}
          tone={balance >= 0 ? "success" : "destructive"}
        />
        <StatCard
          label="A pagar restante"
          value={brl(expensePending)}
          icon={AlertCircle}
          tone="warning"
          subtitle={overdue > 0 ? `${overdue} em atraso` : "em dia"}
        />
      </div>

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
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
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
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive" | "warning";
  subtitle?: string;
}) {
  const toneClass = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
