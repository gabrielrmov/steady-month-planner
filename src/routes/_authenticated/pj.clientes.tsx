import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageCircle, Plus, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { AreaField, Empty, PageHeader, TextField } from "@/components/pj/ui";
import { useBusinessTransactions, useDeleteRow, useRows, useSaveRow } from "@/lib/pj/data";
import { brl, hasPhone, norm, waLink } from "@/lib/pj/format";
import type { PjClient, PjProject, PjProposal } from "@/lib/pj/types";

export const Route = createFileRoute("/_authenticated/pj/clientes")({
  head: () => ({ meta: [{ title: "Clientes | FINLIST" }] }),
  component: ClientesPage,
});

type Draft = Partial<PjClient>;

/** Etiquetas (Fixo, Recorrente, Avulso, via ALMA) guardadas nas observações, separadas por " | ". */
const TAGS = new Set(["Fixo", "Recorrente", "Avulso", "via ALMA"]);
const tags = (notes: string | null) =>
  (notes ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter((x) => TAGS.has(x));

function ClientesPage() {
  const clients = useRows<PjClient>("pj_clients", { col: "name" });
  const projects = useRows<PjProject>("pj_projects");
  const proposals = useRows<PjProposal>("pj_proposals");
  const tx = useBusinessTransactions();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);

  const stats = useMemo(() => {
    const out = new Map<string, { projects: number; proposals: number; paid: number }>();
    for (const c of clients.data ?? []) {
      const own = (projects.data ?? []).filter((p) => p.client_id === c.id);
      const ids = new Set(own.map((p) => p.id));
      const paid = (tx.data ?? [])
        .filter(
          (t) =>
            t.type === "income" && t.status === "paid" && t.project_id && ids.has(t.project_id),
        )
        .reduce((s, t) => s + t.amount, 0);
      const key = norm(c.company || c.name);
      const props = (proposals.data ?? []).filter(
        (p) => p.client_id === c.id || (!p.client_id && norm(p.company || p.client_name) === key),
      );
      out.set(c.id, { projects: own.length, proposals: props.length, paid });
    }
    return out;
  }, [clients.data, projects.data, proposals.data, tx.data]);

  const list = (clients.data ?? []).filter((c) =>
    norm(`${c.name} ${c.company ?? ""}`).includes(norm(q)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Cadastro único: histórico, projetos e quanto cada um já pagou."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-44 pl-9"
              />
            </div>
            <Button onClick={() => setEditing({})} className="hover-glow">
              <Plus className="mr-1 h-4 w-4" /> Novo cliente
            </Button>
          </>
        }
      />

      {clients.isLoading ? (
        <Card className="h-40 animate-pulse bg-muted/40" />
      ) : list.length === 0 ? (
        <Empty
          icon={<Users className="h-6 w-6" />}
          title={q ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
        >
          Eles também são criados sozinhos quando você fecha um lead ou aprova uma proposta.
        </Empty>
      ) : (
        <Card className="animate-rise divide-y divide-border">
          {list.map((c) => {
            const s = stats.get(c.id)!;
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.company || c.name}</p>
                  {tags(c.notes).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tags(c.notes).map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            t === "Fixo" && "bg-success/15 text-success",
                            t === "Recorrente" && "bg-primary/10 text-primary",
                            t !== "Fixo" && t !== "Recorrente" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.company && c.name, c.phone, c.email].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.projects} projeto(s) · {s.proposals} proposta(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="num text-sm" title="Já pagou">
                    {brl(s.paid)}
                  </span>
                  {hasPhone(c.phone) && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={waLink(c.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                    Editar
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {editing && <ClientDialog initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ClientDialog({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const save = useSaveRow<PjClient>("pj_clients", "Cliente salvo");
  const del = useDeleteRow("pj_clients", "Cliente removido");
  const set = (k: keyof PjClient, v: string) => setD((x) => ({ ...x, [k]: v }));
  const valid = !!(d.name?.trim() || d.company?.trim());

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{d.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Contato" value={d.name} onChange={(v) => set("name", v)} />
          <TextField label="Empresa" value={d.company} onChange={(v) => set("company", v)} />
          <TextField label="CPF/CNPJ" value={d.doc} onChange={(v) => set("doc", v)} />
          <TextField
            label="WhatsApp"
            value={d.phone}
            onChange={(v) => set("phone", v)}
            inputMode="tel"
          />
          <TextField
            label="E-mail"
            type="email"
            value={d.email}
            onChange={(v) => set("email", v)}
            className="sm:col-span-2"
          />
          <TextField
            label="Endereço"
            value={d.address}
            onChange={(v) => set("address", v)}
            className="sm:col-span-2"
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
                if (
                  !confirm("Excluir este cliente? Projetos e propostas continuam, sem o vínculo.")
                )
                  return;
                await del.mutateAsync(d.id!);
                onClose();
              }}
            >
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <Button
            disabled={!valid || save.isPending}
            onClick={async () => {
              await save.mutateAsync({ ...d, name: d.name?.trim() || d.company?.trim() || "" });
              onClose();
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
