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
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendário financeiro | FINLIST" },
      { name: "description", content: "Veja entradas e saídas dia a dia em um calendário mensal." },
      { property: "og:title", content: "Calendário financeiro | FINLIST" },
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
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="animate-rise space-y-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:space-y-0">
        <div className="min-w-0">
          <h1 className="font-display truncate text-[28px] font-semibold sm:text-[34px]">Calendário</h1>
          <p className="text-sm text-muted-foreground">Visualize entradas e saídas por dia</p>
        </div>
        <div className="flex items-center justify-between gap-1 rounded-lg border border-border bg-card p-1 sm:justify-start">
          <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-medium capitalize sm:min-w-36 sm:flex-none">
            {format(month, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="animate-rise p-2 sm:p-3" style={{ animationDelay: "60ms" }}>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground sm:text-xs">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-1.5 sm:py-2">{d}</div>
            ))}
          </div>
          <div className="animate-rise grid grid-cols-7 gap-1">
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
                  className={`min-h-12 rounded-md border p-1 text-left text-xs transition-colors sm:min-h-20 sm:p-1.5 ${
                    isSel ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  } ${isCurrent ? "" : "opacity-40"}`}
                >
                  <div className="flex items-center justify-between sm:mb-1">
                    <span
                      className={`text-[11px] font-semibold ${
                        isToday
                          ? "flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  {/* Mobile: apenas indicadores */}
                  <div className="mt-1 flex items-center gap-1 sm:hidden">
                    {income > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                    {expense > 0 && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                  </div>
                  <div className="hidden space-y-0.5 sm:block">
                    {income > 0 && <div className="truncate num text-[10px] text-success">+{brl(income)}</div>}
                    {expense > 0 && <div className="truncate num text-[10px] text-destructive">-{brl(expense)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="animate-rise p-4" style={{ animationDelay: "120ms" }}>
          <p className="text-sm font-semibold capitalize">
            {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <div className="mt-3 space-y-2">
            {selectedItems.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum lançamento neste dia.</p>
            )}
            {selectedItems.map((t, i) => (
              <div
                key={t.id}
                className="animate-rise flex items-center gap-2 rounded-md border border-border p-2"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: t.cards?.color ?? t.categories?.color ?? "#888" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.payment_method === "card" ? t.cards?.name ?? "Cartão" : t.payment_method.toUpperCase()}
                    {t.status === "paid" ? " · pago" : ""}
                  </p>
                </div>
                <span className={`num text-xs ${t.type === "income" ? "text-success" : "text-destructive"}`}>
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
