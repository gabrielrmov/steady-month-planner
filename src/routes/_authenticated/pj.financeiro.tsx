import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AreaField,
  Bar,
  DateField,
  Empty,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/pj/ui";
import {
  prolaboreToPersonal,
  saveRow,
  seedBusinessCategories,
  useBusinessCategories,
  useBusinessTransactions,
  useDeleteRow,
  useInvalidatePj,
  usePersonalMonth,
  usePjProfile,
  useRows,
  useSaveProfile,
} from "@/lib/pj/data";
import { monthRange, monthSummary } from "@/lib/pj/calc";
import { downloadText, financeCsv } from "@/lib/pj/export";
import { brl, dateBR, monthLabel, shiftMonth, today, toNumber } from "@/lib/pj/format";
import type { PjProject, PjTransaction, Scope } from "@/lib/pj/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pj/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro PJ | FINLIST" }] }),
  component: FinanceiroPage,
});

type View = Scope | "all";
const VIEWS: [View, string][] = [
  ["business", "PJ"],
  ["personal", "Pessoal"],
  ["all", "Consolidado"],
];
type Draft = Partial<PjTransaction>;

function FinanceiroPage() {
  const profile = usePjProfile();
  const saveProfile = useSaveProfile();
  const business = useBusinessTransactions();
  const categories = useBusinessCategories();
  const projects = useRows<PjProject>("pj_projects");
  const invalidate = useInvalidatePj();
  const [ym, setYm] = useState(today().slice(0, 7));
  const [view, setView] = useState<View>("business");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [goalEdit, setGoalEdit] = useState<number | null | undefined>(undefined);
  const { from, to } = monthRange(ym);
  const personal = usePersonalMonth(from, to, view !== "business");

  // Primeira vez no financeiro PJ: cria as categorias padrão que faltam (uma tentativa por abertura).
  const seeded = useRef(false);
  useEffect(() => {
    if (!categories.isSuccess || seeded.current) return;
    const names = (categories.data ?? []).map((c) => c.name);
    seeded.current = true;
    seedBusinessCategories(names)
      .then(async (n) => {
        if (n) await invalidate("categories");
      })
      .catch((e: Error) => toast.error(e.message));
  }, [categories.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const biz = useMemo(
    () => (business.data ?? []).filter((t) => t.due_date.startsWith(ym)),
    [business.data, ym],
  );
  const pers = useMemo(() => personal.data ?? [], [personal.data]);
  const shown = useMemo(
    () =>
      [...(view !== "personal" ? biz : []), ...(view !== "business" ? pers : [])].sort((a, b) =>
        b.due_date.localeCompare(a.due_date),
      ),
    [biz, pers, view],
  );
  const taxRate = profile.data?.tax_rate ?? 0;
  const sum = monthSummary(shown, ym, view === "personal" ? 0 : taxRate);
  // Imposto estimado só incide sobre o que a empresa recebeu.
  const tax = monthSummary(biz, ym, taxRate).tax;
  const goal = toNumber(profile.data?.monthly_goal);
  const bizReceived = monthSummary(biz, ym, 0).received;
  const projectName = (id: string | null) =>
    (projects.data ?? []).find((p) => p.id === id)?.title ?? "";

  async function markPaid(t: PjTransaction) {
    try {
      await saveRow<PjTransaction>("transactions", {
        id: t.id,
        status: "paid",
        paid_at: new Date().toISOString(),
      });
      await invalidate("transactions");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function exportCsv() {
    const rows = (business.data ?? [])
      .slice()
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((t) => ({ ...t, project_title: projectName(t.project_id) }));
    downloadText("financeiro-pj.csv", financeCsv(rows), "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro PJ"
        subtitle="Entradas, despesas e meta do mês, separados do pessoal."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing({ type: "expense", status: "paid", due_date: today() })}
            >
              <Plus className="mr-1 h-4 w-4" /> Despesa
            </Button>
            <Button
              onClick={() => setEditing({ type: "income", status: "paid", due_date: today() })}
              className="hover-glow"
            >
              <Plus className="mr-1 h-4 w-4" /> Entrada
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Mês anterior"
            onClick={() => setYm(shiftMonth(ym, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <b className="min-w-36 text-center first-letter:uppercase">{monthLabel(ym)}</b>
          <Button
            size="icon"
            variant="outline"
            aria-label="Próximo mês"
            onClick={() => setYm(shiftMonth(ym, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Visão">
          {VIEWS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                view === k
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <KpiGrid cols={5}>
        <Kpi label="Recebido" value={brl(sum.received)} />
        <Kpi label="A receber" value={brl(sum.pending)} />
        <Kpi label="Despesas" value={brl(sum.expenses)} />
        <Kpi
          label="Resultado"
          value={brl(sum.result)}
          tone={sum.result < 0 ? "neg" : undefined}
          dark
        />
        <Kpi label="Imposto estimado" value={view === "personal" ? "—" : brl(tax)} />
      </KpiGrid>

      {view !== "personal" && (
        <Card className="animate-rise space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b className="text-sm">Meta de faturamento do mês</b>
            {goalEdit === undefined ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="num">
                  {goal
                    ? `${Math.min(100, Math.round((bizReceived / goal) * 100))}% de ${brl(goal)}`
                    : "sem meta"}
                </span>
                <Button size="sm" variant="outline" onClick={() => setGoalEdit(goal || null)}>
                  Definir
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  className="h-9 w-36"
                  value={goalEdit ?? ""}
                  onChange={(e) =>
                    setGoalEdit(e.target.value === "" ? null : Number(e.target.value))
                  }
                  aria-label="Meta do mês em reais"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!profile.data) return;
                    await saveProfile.mutateAsync({
                      ...profile.data,
                      monthly_goal: goalEdit ?? null,
                    });
                    setGoalEdit(undefined);
                  }}
                >
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setGoalEdit(undefined)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
          {goal > 0 && <Bar value={bizReceived} max={goal} />}
        </Card>
      )}

      {business.isLoading ? (
        <Card className="h-40 animate-pulse bg-muted/40" />
      ) : shown.length === 0 ? (
        <Empty title="Nenhum lançamento neste mês">
          Entradas dos projetos aparecem aqui sozinhas. Você também pode lançar à mão.
        </Empty>
      ) : (
        <Card className="animate-rise divide-y divide-border">
          {shown.map((t) => {
            const isBiz = t.scope === "business";
            return (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      dateBR(t.due_date),
                      t.categories?.name,
                      t.project_id && projectName(t.project_id),
                      view === "all" && (isBiz ? "PJ" : "Pessoal"),
                      t.status === "paid" ? "" : "pendente",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "num text-sm",
                      t.type === "income" ? "text-success" : "text-destructive",
                    )}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {brl(t.amount)}
                  </span>
                  {isBiz ? (
                    <>
                      {t.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(t)}>
                          Marcar pago
                        </Button>
                      )}
                      {t.type === "expense" && t.categories?.name === "Pró-labore" && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Cria uma entrada no seu financeiro pessoal"
                          onClick={async () => {
                            try {
                              const ok = await prolaboreToPersonal(t, profile.data?.company ?? "");
                              toast[ok ? "success" : "info"](
                                ok
                                  ? "Entrada lançada no financeiro pessoal"
                                  : "Esse pró-labore já foi lançado",
                              );
                              await invalidate("transactions");
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                        >
                          → Pessoal
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                        Editar
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/transactions">Abrir em Contas</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {editing && (
        <TxDialog
          initial={editing}
          categories={(categories.data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind,
          }))}
          projects={projects.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TxDialog({
  initial,
  categories,
  projects,
  onClose,
}: {
  initial: Draft;
  categories: { id: string; name: string; kind: "income" | "expense" }[];
  projects: PjProject[];
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const invalidate = useInvalidatePj();
  const del = useDeleteRow("transactions", "Lançamento removido");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof PjTransaction>(k: K, v: PjTransaction[K] | null) =>
    setD((x) => ({ ...x, [k]: v }));
  const kind = d.type ?? "expense";
  const cats = categories.filter((c) => c.kind === kind);

  async function save() {
    if (!d.description?.trim() || !toNumber(d.amount))
      return toast.error("Preencha descrição e valor");
    setBusy(true);
    try {
      await saveRow<PjTransaction>("transactions", {
        id: d.id,
        description: d.description.trim(),
        amount: toNumber(d.amount),
        type: kind,
        status: d.status ?? "paid",
        due_date: d.due_date ?? today(),
        paid_at: d.status === "paid" ? (d.paid_at ?? new Date().toISOString()) : null,
        category_id: d.category_id ?? null,
        project_id: d.project_id ?? null,
        notes: d.notes ?? null,
        scope: "business",
        ...(d.id ? {} : { payment_method: "pix" }),
      } as Partial<PjTransaction>);
      await invalidate("transactions");
      toast.success("Lançamento salvo");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {d.id ? "Editar lançamento" : kind === "income" ? "Nova entrada" : "Nova despesa"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Descrição"
            value={d.description}
            onChange={(v) => set("description", v)}
            className="sm:col-span-2"
          />
          <NumberField
            label="Valor"
            value={d.amount}
            onChange={(v) => set("amount", v ?? 0)}
            suffix="R$"
          />
          <DateField
            label="Data"
            value={d.due_date}
            onChange={(v) => set("due_date", v ?? today())}
          />
          <SelectField
            label="Tipo"
            value={kind}
            onChange={(v) =>
              setD((x) => ({ ...x, type: v as "income" | "expense", category_id: null }))
            }
            options={[
              ["income", "Entrada"],
              ["expense", "Despesa"],
            ]}
          />
          <SelectField
            label="Status"
            value={d.status ?? "paid"}
            onChange={(v) => set("status", v as "paid" | "pending")}
            options={[
              ["paid", "Pago/recebido"],
              ["pending", "Pendente"],
            ]}
          />
          <SelectField
            label="Categoria"
            value={d.category_id ?? ""}
            onChange={(v) => set("category_id", v || null)}
            options={[["", "Sem categoria"], ...cats.map((c): [string, string] => [c.id, c.name])]}
          />
          <SelectField
            label="Projeto (opcional)"
            value={d.project_id ?? ""}
            onChange={(v) => set("project_id", v || null)}
            options={[["", "Nenhum"], ...projects.map((p): [string, string] => [p.id, p.title])]}
          />
          <AreaField
            label="Observações"
            value={d.notes}
            onChange={(v) => set("notes", v)}
            rows={2}
            className="sm:col-span-2"
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {d.id ? (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={async () => {
                if (!confirm("Excluir este lançamento?")) return;
                await del.mutateAsync(d.id!);
                await invalidate("transactions");
                onClose();
              }}
            >
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={busy} onClick={save}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
