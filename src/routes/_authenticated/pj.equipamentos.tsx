import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DateField,
  Empty,
  Kpi,
  KpiGrid,
  NumberField,
  PageHeader,
  SelectField,
  TextField,
} from "@/components/pj/ui";
import { useDeleteRow, useRows, useSaveRow } from "@/lib/pj/data";
import { kitSummary, monthlyDepreciation } from "@/lib/pj/calc";
import { brl, dateBR, today } from "@/lib/pj/format";
import { EQUIPMENT_CATEGORIES, type PjEquipment } from "@/lib/pj/types";

export const Route = createFileRoute("/_authenticated/pj/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos | FINLIST" }] }),
  component: EquipamentosPage,
});

type Draft = Partial<PjEquipment>;

function EquipamentosPage() {
  const items = useRows<PjEquipment>("pj_equipment");
  const [editing, setEditing] = useState<Draft | null>(null);
  const list = useMemo(() => items.data ?? [], [items.data]);
  const kit = useMemo(() => kitSummary(list), [list]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipamentos"
        subtitle="Inventário e depreciação: o custo real do seu kit por mês."
        actions={
          <Button
            onClick={() =>
              setEditing({
                purchased_at: today(),
                life_months: 36,
                category: EQUIPMENT_CATEGORIES[0],
                cost: 0,
              })
            }
            className="hover-glow"
          >
            <Plus className="mr-1 h-4 w-4" /> Equipamento
          </Button>
        }
      />

      <KpiGrid cols={3}>
        <Kpi label="Investido em equipamento" value={brl(kit.invested)} />
        <Kpi label="Depreciação mensal" value={brl(kit.monthly)} dark />
        <Kpi label="Itens" value={kit.count} />
      </KpiGrid>

      {items.isLoading ? (
        <Card className="h-40 animate-pulse bg-muted/40" />
      ) : list.length === 0 ? (
        <Empty icon={<Wrench className="h-6 w-6" />} title="Nenhum equipamento ainda">
          Cadastre câmeras, lentes, áudio, luz… A depreciação mensal entra no cálculo do seu
          valor/hora.
        </Empty>
      ) : (
        <Card className="animate-rise divide-y divide-border">
          {list.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    e.category,
                    e.purchased_at && `comprado em ${dateBR(e.purchased_at)}`,
                    `${e.life_months} meses de vida útil`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="num text-xs text-muted-foreground">
                  {brl(monthlyDepreciation(e))}/mês
                </span>
                <span className="num text-sm">{brl(e.cost)}</span>
                <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing && <EquipmentDialog initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EquipmentDialog({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const save = useSaveRow<PjEquipment>("pj_equipment", "Equipamento salvo");
  const del = useDeleteRow("pj_equipment", "Equipamento removido");
  const set = <K extends keyof PjEquipment>(k: K, v: PjEquipment[K] | null) =>
    setD((x) => ({ ...x, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{d.id ? "Editar item" : "Novo equipamento"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nome"
            value={d.name}
            onChange={(v) => set("name", v)}
            className="sm:col-span-2"
          />
          <SelectField
            label="Categoria"
            value={d.category ?? EQUIPMENT_CATEGORIES[0]}
            onChange={(v) => set("category", v)}
            options={EQUIPMENT_CATEGORIES}
          />
          <NumberField
            label="Valor pago"
            value={d.cost}
            onChange={(v) => set("cost", v ?? 0)}
            suffix="R$"
          />
          <DateField
            label="Data da compra"
            value={d.purchased_at}
            onChange={(v) => set("purchased_at", v)}
          />
          <NumberField
            label="Vida útil"
            value={d.life_months}
            onChange={(v) => set("life_months", v && v > 0 ? Math.round(v) : 36)}
            suffix="meses"
            step="1"
            min={1}
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {d.id ? (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={async () => {
                if (!confirm("Excluir este item?")) return;
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
            disabled={!d.name?.trim() || save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                ...d,
                name: d.name!.trim(),
                cost: d.cost ?? 0,
                life_months: d.life_months ?? 36,
              });
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
