import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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
  Bar,
  DateField,
  Empty,
  Field,
  NumberField,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/pj/ui";
import {
  brandOf,
  createReceivable,
  moveProject,
  publishShare,
  saveRow,
  useDeleteRow,
  useInvalidatePj,
  usePjProfile,
  useRows,
  type ShareRow,
} from "@/lib/pj/data";
import { ShareDialog } from "@/components/pj/ShareDialog";
import { parseVideoUrl } from "@/lib/pj/video";
import { brl, dateBR, daysUntil } from "@/lib/pj/format";
import { supabase } from "@/integrations/supabase/client";
import {
  PROJECT_STAGES,
  PROJECT_TYPES,
  checklistFor,
  type ChecklistItem,
  type PjClient,
  type PjProject,
  type ProjectStage,
  type ProjectVideo,
} from "@/lib/pj/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pj/projetos")({
  head: () => ({ meta: [{ title: "Projetos | FINLIST" }] }),
  component: ProjetosPage,
});

type Draft = Partial<PjProject>;
const DONE: ProjectStage[] = ["Entregue", "Pago"];
const progress = (p: PjProject) =>
  p.checklist?.length
    ? Math.round((p.checklist.filter((c) => c.done).length / p.checklist.length) * 100)
    : 0;

function dueLabel(p: PjProject): { text: string; late: boolean } | null {
  const n = daysUntil(p.due_date);
  if (n == null || DONE.includes(p.stage)) return null;
  if (n < 0) return { text: `atrasado ${-n}d`, late: true };
  return { text: n === 0 ? "entrega hoje" : `entrega em ${n}d`, late: false };
}

function ProjetosPage() {
  const projects = useRows<PjProject>("pj_projects");
  const invalidate = useInvalidatePj();
  const [view, setView] = useState<"board" | "agenda">("board");
  const [editing, setEditing] = useState<Draft | null>(null);
  const all = projects.data ?? [];

  async function move(p: PjProject, stage: ProjectStage) {
    try {
      const { settled } = await moveProject(p, stage);
      await invalidate("pj_projects", "transactions");
      if (settled) toast.success("Pagamento lançado no financeiro");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const events = all
    .flatMap((p) => [
      p.shoot_date ? { date: p.shoot_date, kind: "Captação", p } : null,
      p.due_date && !DONE.includes(p.stage) ? { date: p.due_date, kind: "Entrega", p } : null,
    ])
    .filter((e): e is { date: string; kind: string; p: PjProject } => !!e)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        subtitle="Do briefing ao pagamento: etapas, checklist, prazos e entrega."
        actions={
          <Button
            onClick={() =>
              setEditing({
                stage: "Pré-produção",
                project_type: PROJECT_TYPES[0],
                checklist: checklistFor(PROJECT_TYPES[0]),
                videos: [],
                value: 0,
              })
            }
            className="hover-glow"
          >
            <Plus className="mr-1 h-4 w-4" /> Novo projeto
          </Button>
        }
      />

      <div className="flex gap-1.5">
        {(
          [
            ["board", "Quadro de produção"],
            ["agenda", "Agenda de datas"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
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

      {projects.isLoading ? (
        <Card className="h-60 animate-pulse bg-muted/40" />
      ) : view === "board" ? (
        <StageBoard
          stages={PROJECT_STAGES}
          count={(st) => all.filter((p) => p.stage === st).length}
        >
          {(st, si) => {
            const items = all.filter((p) => p.stage === st);
            return (
              <>
                {items.map((p) => {
                  const due = dueLabel(p);
                  return (
                    <Card
                      key={p.id}
                      className={cn("space-y-1.5 p-3", due?.late && "border-destructive/60")}
                    >
                      <p className="font-medium leading-tight">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[p.client_name, p.project_type].filter(Boolean).join(" · ")}
                      </p>
                      <p className="num text-sm">{brl(p.value)}</p>
                      <p
                        className={cn(
                          "text-xs",
                          due?.late ? "font-medium text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {[p.shoot_date && `captação ${dateBR(p.shoot_date)}`, due?.text]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <Bar value={progress(p)} max={100} />
                      <div className="flex items-center gap-1 pt-1">
                        {si > 0 && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 md:h-8 md:w-8"
                            title="Voltar etapa"
                            onClick={() => move(p, PROJECT_STAGES[si - 1])}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        )}
                        {si < PROJECT_STAGES.length - 1 && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 md:h-8 md:w-8"
                            title="Avançar etapa"
                            onClick={() => move(p, PROJECT_STAGES[si + 1])}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 md:h-8"
                          onClick={() => setEditing(p)}
                        >
                          Abrir
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </>
            );
          }}
        </StageBoard>
      ) : events.length === 0 ? (
        <Empty title="Sem datas cadastradas">
          Informe a data de captação e o prazo de entrega nos projetos.
        </Empty>
      ) : (
        <Card className="animate-rise divide-y divide-border">
          {events.map((e) => {
            const n = daysUntil(e.date)!;
            return (
              <button
                key={`${e.p.id}-${e.kind}`}
                type="button"
                onClick={() => setEditing(e.p)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {e.kind}: {e.p.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{e.p.client_name}</p>
                </div>
                <p className={cn("shrink-0 text-sm", n < 0 && "font-medium text-destructive")}>
                  {dateBR(e.date)} · {n === 0 ? "hoje" : n < 0 ? `${-n}d atrás` : `em ${n}d`}
                </p>
              </button>
            );
          })}
        </Card>
      )}

      {editing && <ProjectDialog initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProjectDialog({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>({
    ...initial,
    checklist: (initial.checklist ?? []).map((c) => ({ ...c })),
    videos: (initial.videos ?? []).map((v) => ({ ...v })),
  });
  const [newItem, setNewItem] = useState("");
  const [busy, setBusy] = useState(false);
  const clients = useRows<PjClient>("pj_clients", { col: "name" });
  const del = useDeleteRow("pj_projects", "Projeto removido");
  const invalidate = useInvalidatePj();
  const set = <K extends keyof PjProject>(k: K, v: PjProject[K] | null) =>
    setD((x) => ({ ...x, [k]: v }));
  const checklist = d.checklist ?? [];
  const videos = d.videos ?? [];
  const setItem = (i: number, patch: Partial<ChecklistItem>) =>
    set(
      "checklist",
      checklist.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    );
  const setVideo = (i: number, patch: Partial<ProjectVideo>) =>
    set(
      "videos",
      videos.map((v, j) => (j === i ? { ...v, ...patch } : v)),
    );

  const profile = usePjProfile();
  const [share, setShare] = useState<ShareRow | null>(null);

  async function publish() {
    if (!d.title?.trim()) return toast.error("Informe o nome do projeto");
    const valid = videos.filter((v) => parseVideoUrl(v.url).kind !== "none");
    if (!valid.length) return toast.error("Adicione ao menos um vídeo com link http(s)");
    if (!profile.data) return;
    setBusy(true);
    try {
      const { stage: _stage, ...rest } = d;
      const row = await saveRow<PjProject>("pj_projects", {
        ...rest,
        title: d.title.trim(),
        value: d.value ?? 0,
        ...(d.id ? {} : { stage: "Pré-produção" as ProjectStage }),
      });
      setD((x) => ({ ...x, id: row.id }));
      const link = await publishShare({
        kind: "delivery",
        refId: row.id,
        title: row.title,
        brand: brandOf(profile.data),
        snapshot: {
          title: row.title,
          message: d.delivery_message ?? "",
          videos: valid.map((v) => ({ title: v.title, url: v.url, note: v.note ?? "" })),
        },
      });
      await invalidate("pj_projects");
      setShare(link);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!d.title?.trim()) return toast.error("Informe o nome do projeto");
    setBusy(true);
    try {
      const isNew = !d.id;
      const { stage, ...rest } = d;
      const row = await saveRow<PjProject>("pj_projects", {
        ...rest,
        title: d.title.trim(),
        value: d.value ?? 0,
        // etapa nova passa por moveProject abaixo (em "Pago" dá baixa no recebimento)
        ...(isNew ? { stage: "Pré-produção" as ProjectStage } : {}),
      });
      if (stage && stage !== (isNew ? "Pré-produção" : initial.stage))
        await moveProject(row, stage);
      if (!isNew && Number(d.value ?? 0) !== Number(initial.value ?? 0)) {
        // o valor do projeto mudou: acompanha o recebimento que ainda está pendente
        await supabase
          .from("transactions")
          .update({ amount: d.value ?? 0 })
          .eq("project_id", row.id)
          .eq("type", "income")
          .eq("status", "pending");
      }
      if (
        isNew &&
        (d.value ?? 0) > 0 &&
        confirm('Lançar o valor como "a receber" no financeiro?')
      ) {
        await createReceivable(row);
      }
      await invalidate("pj_projects", "transactions");
      toast.success("Projeto salvo");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {share && (
        <ShareDialog
          share={share}
          message={`Olá! Seu vídeo "${d.title}" está pronto para revisão:`}
          videos={videos}
          onApproved={async () => {
            const { data } = await supabase.from("pj_projects").select("*").eq("id", d.id).single();
            if (data) await moveProject(data as PjProject, "Entregue");
            await invalidate("pj_projects", "transactions");
          }}
          onClose={() => setShare(null)}
        />
      )}
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{d.id ? "Projeto" : "Novo projeto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {!d.id && (
              <SelectField
                className="sm:col-span-2"
                label="Cliente cadastrado"
                value={d.client_id ?? ""}
                onChange={(id) => {
                  const c = (clients.data ?? []).find((x) => x.id === id);
                  setD((x) => ({
                    ...x,
                    client_id: c?.id ?? null,
                    client_name: c ? c.company || c.name : x.client_name,
                  }));
                }}
                options={[
                  ["", "Escolher cliente cadastrado…"],
                  ...(clients.data ?? []).map((c): [string, string] => [c.id, c.company || c.name]),
                ]}
              />
            )}
            <TextField
              label="Nome do projeto"
              value={d.title}
              onChange={(v) => set("title", v)}
              className="sm:col-span-2"
            />
            <TextField
              label="Cliente"
              value={d.client_name}
              onChange={(v) => set("client_name", v)}
            />
            <SelectField
              label="Tipo"
              value={d.project_type ?? "Outro"}
              onChange={(v) => set("project_type", v)}
              options={PROJECT_TYPES}
            />
            <DateField
              label="Data da captação"
              value={d.shoot_date}
              onChange={(v) => set("shoot_date", v)}
            />
            <DateField
              label="Prazo de entrega"
              value={d.due_date}
              onChange={(v) => set("due_date", v)}
            />
            <NumberField
              label="Valor"
              value={d.value}
              onChange={(v) => set("value", v ?? 0)}
              suffix="R$"
            />
            <SelectField
              label="Etapa"
              value={d.stage ?? "Pré-produção"}
              onChange={(v) => set("stage", v as ProjectStage)}
              options={[...PROJECT_STAGES]}
            />
            <TextField
              label="Link da entrega (Drive/Frame.io)"
              value={d.delivery_link}
              onChange={(v) => set("delivery_link", v)}
              className="sm:col-span-2"
            />
          </div>

          <Field label="Vídeos para aprovação do cliente">
            <div className="space-y-2">
              {videos.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Título (ex.: Corte 1)"
                    value={v.title}
                    onChange={(e) => setVideo(i, { title: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Link YouTube, Vimeo, Drive ou .mp4"
                    value={v.url}
                    onChange={(e) => setVideo(i, { url: e.target.value })}
                    className="flex-[2]"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remover vídeo"
                    onClick={() =>
                      set(
                        "videos",
                        videos.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => set("videos", [...videos, { title: "", url: "" }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Vídeo
              </Button>
              <Button type="button" size="sm" className="ml-2" onClick={publish} disabled={busy}>
                Publicar / ver link
              </Button>
            </div>
          </Field>

          <AreaField
            label="Mensagem para o cliente (opcional)"
            value={d.delivery_message}
            onChange={(v) => set("delivery_message", v)}
            rows={2}
          />

          <Field label="Checklist">
            <div className="space-y-1">
              {checklist.map((c, i) => (
                <label key={i} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={(e) => setItem(i, { done: e.target.checked })}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className={cn("flex-1", c.done && "text-muted-foreground line-through")}>
                    {c.t}
                  </span>
                  <button
                    type="button"
                    aria-label="Remover item"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      set(
                        "checklist",
                        checklist.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                </label>
              ))}
              <Input
                placeholder="Novo item do checklist + Enter"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newItem.trim()) {
                    e.preventDefault();
                    set("checklist", [...checklist, { t: newItem.trim(), done: false }]);
                    setNewItem("");
                  }
                }}
              />
            </div>
          </Field>

          <AreaField label="Notas" value={d.notes} onChange={(v) => set("notes", v)} rows={2} />

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2">
              {d.delivery_link && /^https?:\/\//i.test(d.delivery_link) && (
                <Button asChild variant="outline">
                  <a href={d.delivery_link} target="_blank" rel="noopener noreferrer">
                    Abrir link
                  </a>
                </Button>
              )}
              {d.id && (
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    if (!confirm("Excluir projeto?")) return;
                    await del.mutateAsync(d.id!);
                    onClose();
                  }}
                >
                  Excluir
                </Button>
              )}
            </div>
            <Button disabled={busy} onClick={save}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
