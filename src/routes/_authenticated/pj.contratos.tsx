import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AreaField,
  DateField,
  Field,
  NumberField,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/pj/ui";
import { saveRow, useDeleteRow, useInvalidatePj, usePjProfile, useRows } from "@/lib/pj/data";
import { contractBlocks, renderBlocks } from "@/lib/pj/doc";
import { today, toNumber } from "@/lib/pj/format";
import { printElement } from "@/lib/pj/print";
import { takePrefill } from "@/lib/pj/prefill";
import { CONTRACT_TYPES, type ContractType, type PjClient, type PjContract } from "@/lib/pj/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pj/contratos")({
  head: () => ({ meta: [{ title: "Contratos | FINLIST" }] }),
  component: ContratosPage,
});

type Draft = Partial<PjContract>;
const blank = (): Draft => ({
  contract_type: "pontual",
  contract_date: today(),
  value: 0,
  revisions: 2,
});

function ContratosPage() {
  const profile = usePjProfile();
  const saved = useRows<PjContract>("pj_contracts", { col: "updated_at", ascending: false });
  const clients = useRows<PjClient>("pj_clients", { col: "name" });
  const invalidate = useInvalidatePj();
  const del = useDeleteRow("pj_contracts", "Contrato removido");
  const paper = useRef<HTMLDivElement>(null);
  const [d, setD] = useState<Draft>(() => ({
    ...blank(),
    ...(takePrefill<Draft>("contract") ?? {}),
  }));
  const [listOpen, setListOpen] = useState(false);

  const set = <K extends keyof PjContract>(k: K, v: PjContract[K] | null) =>
    setD((x) => ({ ...x, [k]: v }));
  const type = (d.contract_type ?? "pontual") as ContractType;
  const blocks = useMemo(() => contractBlocks(d, profile.data ?? {}), [d, profile.data]);

  async function save() {
    try {
      const row = await saveRow<PjContract>("pj_contracts", {
        ...d,
        value: toNumber(d.value),
        revisions: d.revisions ?? 2,
      });
      setD((x) => ({ ...x, id: row.id }));
      await invalidate("pj_contracts");
      toast.success("Contrato salvo");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle="Escolha o tipo, preencha e gere o PDF."
        actions={
          <>
            <Button variant="outline" onClick={() => setListOpen(true)}>
              Abrir
            </Button>
            <Button variant="outline" onClick={() => setD(blank())}>
              Novo
            </Button>
            <Button variant="outline" onClick={save}>
              Salvar
            </Button>
            <Button
              className="hover-glow"
              onClick={() =>
                printElement(paper.current, "Contrato") ||
                toast.error("Libere os pop-ups para gerar o PDF")
              }
            >
              Gerar PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-rise space-y-3 p-5">
          <Field label="Tipo de contrato" hint={CONTRACT_TYPES[type].hint}>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("contract_type", k)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    type === k
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {CONTRACT_TYPES[k].label}
                </button>
              ))}
            </div>
          </Field>
          <SelectField
            label="Cliente cadastrado"
            value={d.client_id ?? ""}
            onChange={(id) => {
              const c = (clients.data ?? []).find((x) => x.id === id);
              if (!c) return set("client_id", null);
              setD((x) => ({
                ...x,
                client_id: c.id,
                client_name: c.company || c.name,
                client_doc: c.doc,
                client_address: c.address,
                representative: c.company ? c.name : "",
              }));
            }}
            options={[
              [
                "",
                clients.data?.length ? "Escolher cliente cadastrado…" : "Nenhum cliente cadastrado",
              ],
              ...(clients.data ?? []).map((c): [string, string] => [c.id, c.company || c.name]),
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Contratante (nome/empresa)"
              value={d.client_name}
              onChange={(v) => set("client_name", v)}
            />
            <TextField
              label="CPF/CNPJ"
              value={d.client_doc}
              onChange={(v) => set("client_doc", v)}
            />
            <TextField
              label="Endereço"
              value={d.client_address}
              onChange={(v) => set("client_address", v)}
            />
            <TextField
              label="Representante (opcional)"
              value={d.representative}
              onChange={(v) => set("representative", v)}
            />
          </div>
          <AreaField
            label={type === "imagem" ? "Finalidade do vídeo" : "Objeto (o que será feito)"}
            value={d.object}
            onChange={(v) => set("object", v)}
          />
          {type !== "imagem" && (
            <>
              <AreaField
                label="Entregáveis"
                value={d.deliverables}
                onChange={(v) => set("deliverables", v)}
                rows={2}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label={type === "mensal" ? "Valor mensal" : "Valor"}
                  value={d.value}
                  onChange={(v) => set("value", v ?? 0)}
                  suffix="R$"
                />
                <TextField
                  label="Pagamento (ex.: 50% + 50%)"
                  value={d.payment_terms}
                  onChange={(v) => set("payment_terms", v)}
                />
                <TextField
                  label={type === "mensal" ? "Vigência" : "Prazo de entrega"}
                  value={d.term}
                  onChange={(v) => set("term", v)}
                />
                <NumberField
                  label="Rodadas de revisão"
                  value={d.revisions}
                  onChange={(v) => set("revisions", v ?? 0)}
                  step="1"
                />
              </div>
              <TextField
                label="Multa de cancelamento (opcional)"
                value={d.cancel_fee}
                onChange={(v) => set("cancel_fee", v)}
              />
            </>
          )}
          <DateField
            label="Data"
            value={d.contract_date}
            onChange={(v) => set("contract_date", v)}
          />
        </Card>

        <div ref={paper} className="doc h-fit" aria-label="Pré-visualização do contrato">
          {renderBlocks(blocks)}
        </div>
      </div>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contratos salvos</DialogTitle>
          </DialogHeader>
          {(saved.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada salvo ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {(saved.data ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.client_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">
                      {CONTRACT_TYPES[c.contract_type]?.label}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setD(c);
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
                        if (!confirm("Excluir este contrato?")) return;
                        await del.mutateAsync(c.id);
                        if (d.id === c.id) setD(blank());
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
