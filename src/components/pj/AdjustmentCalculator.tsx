import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberField, SelectField } from "@/components/pj/ui";
import { adjust, requiredPct } from "@/lib/pj/calc";
import { brl } from "@/lib/pj/format";
import { copyText } from "@/lib/pj/clipboard";

const ROUND = ["Sem arredondar", "R$ 1", "R$ 5", "R$ 10", "R$ 50", "R$ 100"];
const STEP: Record<string, number> = {
  "Sem arredondar": 0,
  "R$ 1": 1,
  "R$ 5": 5,
  "R$ 10": 10,
  "R$ 50": 50,
  "R$ 100": 100,
};

const pct = (v: number) =>
  `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}%`;

/** Reajuste de um valor por índice acumulado (IPCA, IGP-M…) e ganho real, ou pelo valor que se quer chegar. */
export function AdjustmentCalculator() {
  const [current, setCurrent] = useState<number | null>(1000);
  const [index, setIndex] = useState<number | null>(4.5);
  const [real, setReal] = useState<number | null>(0);
  const [round, setRound] = useState(ROUND[0]);
  const [target, setTarget] = useState<number | null>(null);

  const r = useMemo(
    () => adjust({ current: current ?? 0, index: index ?? 0, real: real ?? 0, round: STEP[round] }),
    [current, index, real, round],
  );
  const need = target && current ? requiredPct(current, target) : null;
  const message =
    `Olá! Estou atualizando meus valores. O serviço que era ${brl(current ?? 0)} passa a ser ` +
    `${brl(r.value)} (reajuste de ${pct(r.pct)}). Qualquer dúvida, é só falar!`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="animate-rise space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Valor atual" value={current} onChange={setCurrent} suffix="R$" />
          <NumberField
            label="Índice acumulado"
            value={index}
            onChange={setIndex}
            suffix="%"
            hint="IPCA ou IGP-M do período desde o último reajuste."
            min={-100}
          />
          <NumberField
            label="Ganho real (opcional)"
            value={real}
            onChange={setReal}
            suffix="%"
            hint="Aumento além da inflação, por mais experiência ou demanda."
            min={-100}
          />
          <SelectField label="Arredondar para" value={round} onChange={setRound} options={ROUND} />
        </div>

        <div className="border-t border-border pt-4">
          <NumberField
            label="Ou: quanto quero cobrar?"
            value={target}
            onChange={setTarget}
            suffix="R$"
            hint="Mostra o percentual de reajuste necessário para chegar nesse valor."
          />
          {need !== null && (
            <p className="mt-2 text-sm text-muted-foreground">
              De {brl(current ?? 0)} para {brl(target ?? 0)} é um reajuste de{" "}
              <span className="num text-foreground">{pct(need)}</span>.
            </p>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="animate-rise glow-ring p-6">
          <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Novo valor
          </p>
          <p className="num mt-2 text-4xl">{brl(r.value)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Diferença</p>
              <p className="num text-base">{brl(r.diff)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reajuste efetivo</p>
              <p className="num text-base">{pct(r.pct)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Índice e ganho real se compõem: (1 + índice) × (1 + ganho real).
          </p>
        </Card>

        <Card className="animate-rise space-y-3 p-6">
          <p className="text-sm font-medium">Mensagem para o cliente</p>
          <p className="rounded-lg bg-muted p-3 text-sm">{message}</p>
          <Button variant="outline" className="w-full" onClick={() => copyText(message)}>
            <Copy className="mr-2 h-4 w-4" /> Copiar mensagem
          </Button>
        </Card>
      </div>
    </div>
  );
}
