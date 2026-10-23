import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberField, SelectField } from "@/components/pj/ui";
import { budget } from "@/lib/pj/calc";
import { brl } from "@/lib/pj/format";
import { setPrefill } from "@/lib/pj/prefill";

const TYPES = [
  "Conteúdo para redes sociais",
  "Vídeo institucional",
  "Evento",
  "Depoimento",
  "Produto",
  "Outro",
];

type Form = {
  type: string;
  days: number | null;
  shootHours: number | null;
  editHours: number | null;
  equipment: number | null;
  travel: number | null;
  extras: number | null;
  margin: number | null;
  tax: number | null;
};

/** Calculadora de orçamento de um projeto de vídeo: preço sugerido, mínimo e premium. */
export function BudgetCalculator({
  rate,
  onRateChange,
  tax,
}: {
  rate: number;
  onRateChange: (v: number) => void;
  tax: number;
}) {
  const navigate = useNavigate();
  const [f, setF] = useState<Form>({
    type: TYPES[0],
    days: 1,
    shootHours: 4,
    editHours: 8,
    equipment: 0,
    travel: 0,
    extras: 0,
    margin: 30,
    tax,
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const r = useMemo(
    () =>
      budget({
        days: f.days ?? 1,
        shootHours: f.shootHours ?? 0,
        editHours: f.editHours ?? 0,
        rate,
        equipment: f.equipment ?? 0,
        travel: f.travel ?? 0,
        extras: f.extras ?? 0,
        margin: f.margin ?? 0,
        tax: f.tax ?? 0,
      }),
    [f, rate],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="animate-rise space-y-4 p-6">
        <SelectField
          label="Tipo de trabalho"
          value={f.type}
          onChange={(v) => set("type", v)}
          options={TYPES}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Diárias / projetos"
            value={f.days}
            onChange={(v) => set("days", v)}
            step="1"
            min={1}
          />
          <NumberField
            label="Valor da hora"
            value={rate}
            onChange={(v) => onRateChange(v ?? 0)}
            suffix="R$"
          />
          <NumberField
            label="Horas de captação (por diária)"
            value={f.shootHours}
            onChange={(v) => set("shootHours", v)}
            suffix="h"
          />
          <NumberField
            label="Horas de edição (por diária)"
            value={f.editHours}
            onChange={(v) => set("editHours", v)}
            suffix="h"
          />
          <NumberField
            label="Equipamento/locação"
            value={f.equipment}
            onChange={(v) => set("equipment", v)}
            suffix="R$"
          />
          <NumberField
            label="Deslocamento"
            value={f.travel}
            onChange={(v) => set("travel", v)}
            suffix="R$"
          />
          <NumberField
            label="Extras (trilha, motion…)"
            value={f.extras}
            onChange={(v) => set("extras", v)}
            suffix="R$"
          />
          <NumberField
            label="Margem de lucro"
            value={f.margin}
            onChange={(v) => set("margin", v)}
            suffix="%"
          />
          <NumberField label="Imposto" value={f.tax} onChange={(v) => set("tax", v)} suffix="%" />
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="animate-rise glow-ring p-6">
          <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Valor sugerido
          </p>
          <p className="num mt-2 text-4xl">{brl(r.price)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Mínimo (sem margem)" value={brl(r.min)} />
            <Stat label="Premium (+25%)" value={brl(r.premium)} />
            <Stat label="Horas totais" value={`${r.hours}h`} />
            <Stat label="Seu valor/hora real" value={brl(r.hourly)} />
          </div>
          <Button
            className="hover-glow mt-5 w-full"
            onClick={() => {
              setPrefill("proposal", { price: Math.round(r.price), title: f.type });
              navigate({ to: "/pj/propostas" });
            }}
          >
            Usar na proposta →
          </Button>
        </Card>

        <Card className="animate-rise divide-y divide-border p-6">
          <Row label="Trabalho (horas × valor/hora)" value={brl(r.work)} />
          <Row label="Custos diretos" value={brl(r.costs)} />
          <Row label="Impostos" value={brl(r.taxes)} />
          <Row label="Margem de lucro" value={brl(r.profit)} strong />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num text-base">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num ${strong ? "text-base" : ""}`}>{value}</span>
    </div>
  );
}
