import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendário financeiro | Finlist" },
      { name: "description", content: "Veja entradas e saídas dia a dia em um calendário mensal." },
      { property: "og:title", content: "Calendário financeiro | Finlist" },
      { property: "og:description", content: "Veja entradas e saídas dia a dia em um calendário mensal." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());

  const from = format(startOfWeek(startOfMonth(month), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const to = format(endOfWeek(endOfMonth(month), { weekStartsOn: 0 }), "yyyy-MM-dd");

  const { data: txs = [] } = useQuery({
    queryKey: ["tx-cal", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, type, due_date, status, payment_method, cards(name, color), categories(name, color)")
        .gte("due_date", from)
        .lte("due_date", to)
        .order("due_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
      }),
    [month],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, typeof txs>();
    for (const t of txs) {
      const arr = m.get(t.due_date) ?? [];
      arr.push(t);
      m.set(t.due_date, arr);
    }
    return m;
  }, [txs]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedItems = byDay.get(selectedKey) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>
          <p className="text-sm text-muted-foreground">Visualize entradas e saídas por dia</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize">
            {format(month, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const income = items.filter((i) => i.type === "income").reduce((s, i) => s + Number(i.amount), 0);
              const expense = items.filter((i) => i.type === "expense").reduce((s, i) => s + Number(i.amount), 0);
              const isCurrent = isSameMonth(day, month);
              const isSel = isSameDay(day, selected);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={key}
                  onClick={() => setSelected(day)}
                  className={`min-h-20 rounded-md border p-1.5 text-left text-xs transition-colors ${
                    isSel ? "border-primary bg-accent" : "border-border hover:bg-accent/40"
                  } ${isCurrent ? "" : "opacity-40"}`}
                >
                  <div className={`mb-1 flex items-center justify-between`}>
                    <span className={`text-[11px] font-semibold ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {income > 0 && <div className="truncate text-[10px] font-medium text-success">+{brl(income)}</div>}
                    {expense > 0 && <div className="truncate text-[10px] font-medium text-destructive">-{brl(expense)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold capitalize">
            {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <div className="mt-3 space-y-2">
            {selectedItems.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum lançamento neste dia.</p>
            )}
            {selectedItems.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.cards?.color ?? t.categories?.color ?? "#888" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.payment_method === "card" ? t.cards?.name ?? "Cartão" : t.payment_method.toUpperCase()}
                    {t.status === "paid" ? " · pago" : ""}
                  </p>
                </div>
                <span className={`text-xs font-semibold ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                  {t.type === "income" ? "+" : "-"}{brl(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
