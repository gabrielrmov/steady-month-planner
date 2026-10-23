import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Plus, Search } from "lucide-react";
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
import { StageBoard } from "@/components/pj/StageBoard";
import {
  AreaField,
  DateField,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/pj/ui";
import {
  createProjectFromDeal,
  saveRow,
  useDeleteRow,
  useInvalidatePj,
  useRows,
  useSaveRow,
} from "@/lib/pj/data";
import { brl, daysUntil, dateBR, hasPhone, norm, waLink } from "@/lib/pj/format";
import { setPrefill } from "@/lib/pj/prefill";
import { LEAD_STAGES, type LeadStage, type PjLead } from "@/lib/pj/types";

export const Route = createFileRoute("/_authenticated/pj/crm")({
  head: () => ({ meta: [{ title: "CRM comercial | FINLIST" }] }),
  component: CrmPage,
});

const CLOSED: LeadStage[] = ["Fechado", "Perdido"];
type Draft = Partial<PjLead>;

/** Lead fechado: oferece criar cliente + projeto + valor a receber (sem duplicar o cliente). */
async function offerProject(
  l: Pick<PjLead, "name" | "company" | "service" | "contact" | "value">,
  invalidate: ReturnType<typeof useInvalidatePj>,
) {
  if (!confirm("Lead fechado! Criar cliente e projeto (com valor a receber) agora?")) return;
  await createProjectFromDeal({
    title: l.service || `Projeto ${l.name}`,
    clientName: l.name,
    company: l.company,
    clientExtra: hasPhone(l.contact) ? { phone: l.contact } : { email: l.contact },
    value: l.value,
  });
  await invalidate("pj_clients", "pj_projects", "transactions");
  toast.success("Cliente e projeto criados, com o valor a receber");
}

function CrmPage() {
  const leads = useRows<PjLead>("pj_leads");
  const invalidate = useInvalidatePj();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);

  const all = useMemo(() => leads.data ?? [], [leads.data]);
  const visible = all.filter((l) => norm(`${l.name} ${l.company ?? ""}`).includes(norm(q)));
  const kpi = useMemo(() => {
    const open = all.filter((l) => !CLOSED.includes(l.stage));
    const won = all.filter((l) => l.stage === "Fechado");
    const lost = all.filter((l) => l.stage === "Perdido");
    const sum = (a: PjLead[]) => a.reduce((t, l) => t + Number(l.value || 0), 0);
    return {
      potential: sum(open),
      closed: sum(won),
      open: open.length,
      conv:
        won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
    };
  }, [all]);

  async function move(l: PjLead, stage: LeadStage) {
    try {
      await saveRow<PjLead>("pj_leads", { id: l.id, stage });
      await invalidate("pj_leads");
      if (stage === "Fechado") await offerProject(l, invalidate);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM comercial"
        subtitle="Cada oportunidade andando pelo funil."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar lead…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-44 pl-9"
              />
            </div>
            <Button onClick={() => setEditing({ stage: "Novo lead" })} className="hover-glow">
              <Plus className="mr-1 h-4 w-4" /> Novo lead
            </Button>
          </>
        }
      />

      <KpiGrid>
        <Kpi label="Potencial em aberto" value={brl(kpi.potential)} />
        <Kpi label="Fechado" value={brl(kpi.closed)} dark />
        <Kpi label="Leads em aberto" value={kpi.open} />
        <Kpi label="Conversão" value={`${kpi.conv}%`} />
      </KpiGrid>

      {leads.isLoading ? (
        <Card className="h-60 animate-pulse bg-muted/40" />
      ) : (
        <StageBoard
          stages={LEAD_STAGES}
          count={(st) => visible.filter((l) => l.stage === st).length}
        >
          {(st, si) => {
            const items = visible.filter((l) => l.stage === st);
            return (
              <>
                {items.map((l) => {
                  const late =
                    !!l.follow_up &&
                    !CLOSED.includes(l.stage) &&
                    (daysUntil(l.follow_up) ?? 1) <= 0;
                  return (
                    <Card key={l.id} className="space-y-1.5 p-3">
                      <p className="font-medium leading-tight">{l.name}</p>
                      {(l.company || l.service) && (
                        <p className="text-xs text-muted-foreground">
                          {[l.company, l.service].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="num text-sm">{brl(l.value)}</p>
                      {l.follow_up && (
                        <p
                          className={
                            late
                              ? "text-xs font-medium text-destructive"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {late ? "⚠ " : ""}follow-up {dateBR(l.follow_up)}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {si > 0 && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 md:h-8 md:w-8"
                            title="Voltar etapa"
                            onClick={() => move(l, LEAD_STAGES[si - 1])}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        )}
                        {si < LEAD_STAGES.length - 1 && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 md:h-8 md:w-8"
                            title="Avançar etapa"
                            onClick={() => move(l, LEAD_STAGES[si + 1])}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 md:h-8"
                          onClick={() => setEditing(l)}
                        >
                          Editar
                        </Button>
                        {hasPhone(l.contact) && (
                          <Button
                            asChild
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 md:h-8 md:w-8"
                          >
                            <a
                              href={waLink(l.contact)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </>
            );
          }}
        </StageBoard>
      )}

      {editing && <LeadDialog initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LeadDialog({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const navigate = useNavigate();
  const save = useSaveRow<PjLead>("pj_leads", "Lead salvo");
  const del = useDeleteRow("pj_leads", "Lead removido");
  const invalidate = useInvalidatePj();
  const set = <K extends keyof PjLead>(k: K, v: PjLead[K] | null) =>
    setD((x) => ({ ...x, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{d.id ? "Editar lead" : "Novo lead"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Nome do contato" value={d.name} onChange={(v) => set("name", v)} />
          <TextField label="Empresa" value={d.company} onChange={(v) => set("company", v)} />
          <TextField
            label="Serviço de interesse"
            value={d.service}
            onChange={(v) => set("service", v)}
            className="sm:col-span-2"
          />
          <NumberField
            label="Valor estimado"
            value={d.value}
            onChange={(v) => set("value", v ?? 0)}
            suffix="R$"
          />
          <SelectField
            label="Etapa"
            value={d.stage ?? "Novo lead"}
            onChange={(v) => set("stage", v as LeadStage)}
            options={[...LEAD_STAGES]}
          />
          <TextField
            label="WhatsApp / e-mail"
            value={d.contact}
            onChange={(v) => set("contact", v)}
          />
          <DateField
            label="Próximo follow-up"
            value={d.follow_up}
            onChange={(v) => set("follow_up", v)}
          />
          <AreaField
            label="Observações"
            value={d.notes}
            onChange={(v) => set("notes", v)}
            rows={2}
            className="sm:col-span-2"
          />
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {d.id && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrefill("proposal", {
                      client_name: d.name,
                      company: d.company,
                      price: d.value,
                      scope_of_work: d.service,
                    });
                    navigate({ to: "/pj/propostas" });
                  }}
                >
                  Gerar proposta
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    if (!confirm("Excluir este lead?")) return;
                    await del.mutateAsync(d.id!);
                    onClose();
                  }}
                >
                  Excluir
                </Button>
              </>
            )}
          </div>
          <Button
            disabled={!d.name?.trim() || save.isPending}
            onClick={async () => {
              const saved = await save.mutateAsync({
                ...d,
                name: d.name!.trim(),
                value: d.value ?? 0,
              });
              onClose();
              if (d.stage === "Fechado" && initial.stage !== "Fechado") {
                try {
                  await offerProject(saved, invalidate);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
