import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  EditPreviewToggle,
  AreaField,
  DateField,
  NumberField,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/pj/ui";
import {
  brandOf,
  createProjectFromDeal,
  publishShare,
  saveRow,
  useDeleteRow,
  useInvalidatePj,
  usePjProfile,
  useRows,
  type ShareRow,
} from "@/lib/pj/data";
import { ShareDialog } from "@/components/pj/ShareDialog";
import { proposalBlocks, renderBlocks } from "@/lib/pj/doc";
import { kitSummary } from "@/lib/pj/calc";
import {
  PROPOSAL_TYPES,
  fillProposal,
  proposalNumber,
  suggestPrice,
  type ProposalType,
} from "@/lib/pj/proposal-templates";
import { brl, today, toNumber } from "@/lib/pj/format";
import { printElement } from "@/lib/pj/print";
import { setPrefill, takePrefill } from "@/lib/pj/prefill";
import {
  PROPOSAL_STATUS,
  type PjClient,
  type PjEquipment,
  type PjProposal,
  type ProposalStatus,
} from "@/lib/pj/types";

export const Route = createFileRoute("/_authenticated/pj/propostas")({
  head: () => ({ meta: [{ title: "Propostas | FINLIST" }] }),
  component: PropostasPage,
});

type Draft = Partial<PjProposal>;

const blank = (): Draft => ({
  title: "Proposta Comercial",
  proposal_date: today(),
  validity: "7 dias",
  client_name: "",
  company: "",
  intro: "",
  scope_of_work: "",
  deliverables: "",
  timeline: "",
  price: 0,
  payment_terms: "50% na aprovação e 50% na entrega",
  notes: "",
  status: "Rascunho",
});

function PropostasPage() {
  const profile = usePjProfile();
  const saved = useRows<PjProposal>("pj_proposals", { col: "updated_at", ascending: false });
  const clients = useRows<PjClient>("pj_clients", { col: "name" });
  const invalidate = useInvalidatePj();
  const del = useDeleteRow("pj_proposals", "Proposta removida");
  const navigate = useNavigate();
  const paper = useRef<HTMLDivElement>(null);
  const equipment = useRows<PjEquipment>("pj_equipment");
  // Campos que você mexeu à mão: o preenchimento automático não sobrescreve.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [type, setType] = useState<ProposalType>("Conteúdo mensal");
  const [qty, setQty] = useState(4);
  const [d, setD] = useState<Draft>(() => {
    const pre = takePrefill<Draft>("proposal") ?? {};
    return { ...blank(), ...pre };
  });
  const prefilled = useRef<string[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<ShareRow | null>(null);

  const set = <K extends keyof PjProposal>(k: K, v: PjProposal[K] | null) => {
    setD((x) => ({ ...x, [k]: v }));
    setTouched((t) => new Set(t).add(k));
  };

  const priceCtx = useMemo(
    () => ({
      desiredIncome: profile.data?.desired_income,
      fixedCosts: profile.data?.fixed_costs,
      billableHours: profile.data?.billable_hours,
      taxRate: profile.data?.tax_rate,
      kitMonthly: kitSummary(equipment.data ?? []).monthly,
    }),
    [profile.data, equipment.data],
  );
  const suggestion = useMemo(() => suggestPrice(type, priceCtx, qty), [type, priceCtx, qty]);

  /** Preenche tudo para o tipo escolhido; só mexe no que você não editou (ou em tudo, com force). */
  function refill(
    next: { type?: ProposalType; qty?: number; name?: string | null; company?: string | null },
    force = false,
  ) {
    const t = next.type ?? type;
    const q = next.qty ?? qty;
    const f = fillProposal(
      t,
      { name: next.name ?? d.client_name, company: next.company ?? d.company },
      { name: profile.data?.full_name, company: profile.data?.company },
      q,
    );
    const price = suggestPrice(t, priceCtx, q).price;
    const keep = force ? new Set<string>() : touched;
    setD((x) => {
      const out: Draft = { ...x };
      for (const [k, v] of Object.entries(f))
        if (!keep.has(k)) (out as Record<string, unknown>)[k] = v;
      if (!keep.has("price")) out.price = price;
      return out;
    });
    if (force) setTouched(new Set());
  }

  // Primeira abertura: com o perfil carregado, a proposta já nasce preenchida (respeitando o que veio do CRM/orçamento).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !profile.data || equipment.isLoading) return;
    started.current = true;
    const pre = Object.keys(d).filter(
      (k) =>
        ![
          "title",
          "proposal_date",
          "validity",
          "client_name",
          "company",
          "intro",
          "scope_of_work",
          "deliverables",
          "timeline",
          "price",
          "payment_terms",
          "notes",
          "status",
        ].includes(k) ||
        (d as Record<string, unknown>)[k] !== (blank() as Record<string, unknown>)[k],
    );
    prefilled.current = pre;
    setTouched(new Set(pre.filter((k) => k !== "status")));
    const keep = new Set(pre);
    const f = fillProposal(
      type,
      { name: d.client_name, company: d.company },
      { name: profile.data.full_name, company: profile.data.company },
      qty,
    );
    setD((x) => {
      const out: Draft = { ...x };
      for (const [k, v] of Object.entries(f))
        if (!keep.has(k)) (out as Record<string, unknown>)[k] = v;
      if (!keep.has("price")) out.price = suggestion.price;
      return out;
    });
  }, [profile.data, equipment.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  const brand = useMemo(() => (profile.data ? brandOf(profile.data) : {}), [profile.data]);
  const blocks = useMemo(
    () => proposalBlocks(d, brand, { number: proposalNumber(d.proposal_date, d.id) }),
    [d, brand],
  );

  async function save(silent = false): Promise<PjProposal | null> {
    if (!d.title?.trim()) {
      toast.error("Dê um título à proposta");
      return null;
    }
    try {
      const row = await saveRow<PjProposal>("pj_proposals", { ...d, price: toNumber(d.price) });
      setD((x) => ({ ...x, id: row.id }));
      await invalidate("pj_proposals");
      if (!silent) toast.success("Proposta salva");
      return row;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }

  async function approve() {
    if (d.status === "Aprovada" && !confirm("Esta proposta já foi aprovada. Criar outro projeto?"))
      return;
    if (!toNumber(d.price) && !confirm("Proposta sem valor. Criar projeto mesmo assim?")) return;
    setBusy(true);
    try {
      const row = await save(true);
      if (!row) return;
      await saveRow<PjProposal>("pj_proposals", { id: row.id, status: "Aprovada" });
      set("status", "Aprovada");
      await createProjectFromDeal({
        title:
          d.title === "Proposta Comercial"
            ? `Projeto ${d.company || d.client_name || ""}`.trim()
            : d.title!,
        clientName: d.client_name,
        company: d.company,
        value: toNumber(d.price),
        notes: d.scope_of_work,
        proposalId: row.id,
      });
      await invalidate("pj_proposals", "pj_clients", "pj_projects", "transactions");
      toast.success("Aprovada: cliente, projeto e valor a receber criados");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toContract() {
    setPrefill("contract", {
      client_name: d.company || d.client_name,
      object: d.scope_of_work,
      deliverables: d.deliverables,
      value: toNumber(d.price),
      payment_terms: d.payment_terms,
      term: d.timeline,
      proposal_id: d.id ?? null,
    });
    navigate({ to: "/pj/contratos" });
  }

  async function openShare() {
    if (!profile.data) return;
    setBusy(true);
    try {
      const row = await save(true);
      if (!row) return;
      const link = await publishShare({
        kind: "proposal",
        refId: row.id,
        title: d.title ?? "Proposta",
        brand: brandOf(profile.data),
        snapshot: {
          title: d.title,
          client_name: d.client_name,
          company: d.company,
          proposal_date: d.proposal_date,
          validity: d.validity,
          intro: d.intro,
          scope_of_work: d.scope_of_work,
          deliverables: d.deliverables,
          timeline: d.timeline,
          price: toNumber(d.price),
          payment_terms: d.payment_terms,
          notes: d.notes,
        },
      });
      if (d.status === "Rascunho") {
        await saveRow<PjProposal>("pj_proposals", { id: row.id, status: "Enviada" });
        set("status", "Enviada");
        await invalidate("pj_proposals");
      }
      setShare(link);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pdf() {
    // Salva primeiro: o PDF sai com o número da proposta.
    const row = await save(true);
    if (!row) return;
    setMode("preview");
    setTimeout(() => {
      const name = [d.title, d.company || d.client_name].filter(Boolean).join(" - ");
      if (!printElement(paper.current, name || "Proposta"))
        toast.error("Libere os pop-ups para gerar o PDF");
    }, 150);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propostas"
        subtitle="Escolha o cliente e o tipo de trabalho: o resto se preenche sozinho. Depois é só gerar o PDF."
        actions={
          <>
            <Button variant="outline" onClick={() => setListOpen(true)}>
              Abrir
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setD(blank());
                setTouched(new Set());
                setTimeout(() => refill({ name: "", company: "" }, true), 0);
              }}
            >
              Nova
            </Button>
            <Button variant="outline" onClick={() => save()}>
              Salvar
            </Button>
            <Button variant="outline" onClick={toContract}>
              Gerar contrato
            </Button>
            <Button variant="outline" onClick={approve} disabled={busy}>
              Aprovar → projeto
            </Button>
            <Button variant="outline" onClick={openShare} disabled={busy}>
              Link do cliente
            </Button>
            <Button onClick={pdf} className="hover-glow">
              Gerar PDF
            </Button>
          </>
        }
      />

      <EditPreviewToggle value={mode} onChange={setMode} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={cn("animate-rise space-y-3 p-5", mode === "preview" && "hidden lg:block")}>
          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Preenchimento automático
            </p>
            <SelectField
              label="Cliente cadastrado"
              value={d.client_id ?? ""}
              onChange={(id) => {
                const c = (clients.data ?? []).find((x) => x.id === id);
                const name = c ? c.name : d.client_name;
                const company = c ? c.company || c.name : d.company;
                setD((x) => ({ ...x, client_id: c?.id ?? null, client_name: name, company }));
                setTouched((t) => {
                  const n = new Set(t);
                  n.delete("client_name");
                  n.delete("company");
                  return n;
                });
                refill({ name, company });
              }}
              options={[
                [
                  "",
                  clients.data?.length
                    ? "Escolher cliente cadastrado…"
                    : "Nenhum cliente cadastrado",
                ],
                ...(clients.data ?? []).map((c): [string, string] => [c.id, c.company || c.name]),
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Tipo de trabalho"
                value={type}
                onChange={(v) => {
                  setType(v as ProposalType);
                  refill({ type: v as ProposalType });
                }}
                options={[...PROPOSAL_TYPES]}
              />
              {type === "Conteúdo mensal" && (
                <NumberField
                  label="Vídeos por mês"
                  value={qty}
                  step="1"
                  min={1}
                  onChange={(v) => {
                    const q = Math.max(1, Math.round(v ?? 4));
                    setQty(q);
                    refill({ qty: q });
                  }}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Preço sugerido: <b className="num text-foreground">{brl(suggestion.price)}</b> com
              base no seu valor/hora mínimo (<span className="num">{brl(suggestion.hourly)}</span>
              ). Ajuste renda, custos e horas em Perfil PJ.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => refill({}, true)}>
                Refazer tudo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setD((x) => ({ ...x, price: suggestion.price }));
                  setTouched((t) => {
                    const n = new Set(t);
                    n.delete("price");
                    return n;
                  });
                }}
              >
                Usar preço sugerido
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Nome do cliente"
              value={d.client_name}
              onChange={(v) => set("client_name", v)}
            />
            <TextField label="Empresa" value={d.company} onChange={(v) => set("company", v)} />
            <TextField label="Título" value={d.title} onChange={(v) => set("title", v)} />
            <DateField
              label="Data"
              value={d.proposal_date}
              onChange={(v) => set("proposal_date", v)}
            />
            <TextField label="Validade" value={d.validity} onChange={(v) => set("validity", v)} />
            <NumberField
              label="Valor"
              value={d.price}
              onChange={(v) => set("price", v ?? 0)}
              suffix="R$"
            />
          </div>
          <AreaField
            label="Abertura (opcional)"
            value={d.intro}
            onChange={(v) => set("intro", v)}
          />
          <AreaField
            label="Escopo do projeto"
            value={d.scope_of_work}
            onChange={(v) => set("scope_of_work", v)}
          />
          <AreaField
            label="Entregáveis (um por linha)"
            value={d.deliverables}
            onChange={(v) => set("deliverables", v)}
          />
          <AreaField
            label="Prazos"
            value={d.timeline}
            onChange={(v) => set("timeline", v)}
            rows={2}
          />
          <TextField
            label="Forma de pagamento"
            value={d.payment_terms}
            onChange={(v) => set("payment_terms", v)}
          />
          <AreaField
            label="Observações"
            value={d.notes}
            onChange={(v) => set("notes", v)}
            rows={2}
          />
          <SelectField
            label="Status da proposta"
            value={d.status ?? "Rascunho"}
            onChange={(v) => set("status", v as ProposalStatus)}
            options={[...PROPOSAL_STATUS]}
          />
        </Card>

        <div
          ref={paper}
          className={cn("doc h-fit", mode === "edit" && "hidden lg:block")}
          aria-label="Pré-visualização da proposta"
        >
          {renderBlocks(blocks)}
        </div>
      </div>

      {share && (
        <ShareDialog
          share={share}
          message={`Olá! Segue a proposta "${d.title}":`}
          onApproved={approve}
          onClose={() => setShare(null)}
        />
      )}

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Propostas salvas</DialogTitle>
          </DialogHeader>
          {(saved.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada salvo ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {(saved.data ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.company || p.client_name || "Sem cliente"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.title} · {brl(p.price)} · {p.status}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setD(p);
                        setTouched(new Set(Object.keys(p)));
                        setListOpen(false);
                      }}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm("Excluir esta proposta?")) return;
                        await del.mutateAsync(p.id);
                        if (d.id === p.id) setD(blank());
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
