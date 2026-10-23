import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AreaField, DateField, PageHeader, SelectField, TextField } from "@/components/pj/ui";
import { copyText } from "@/lib/pj/clipboard";
import { today } from "@/lib/pj/format";
import { BRIEFING_TYPES, briefingText, type BriefingData } from "@/lib/pj/texts";

export const Route = createFileRoute("/_authenticated/pj/briefing")({
  head: () => ({ meta: [{ title: "Briefing | FINLIST" }] }),
  component: BriefingPage,
});

function BriefingPage() {
  const [d, setD] = useState<BriefingData>({
    type: BRIEFING_TYPES[0],
    date: today(),
    qty: "4",
    duration: "60 segundos",
    platforms: "Instagram, TikTok",
  });
  const set = <K extends keyof BriefingData>(k: K, v: BriefingData[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const text = useMemo(() => briefingText(d), [d]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Briefing"
        subtitle="Pergunte certo antes de captar e envie ao cliente."
        actions={
          <Button onClick={() => copyText(text)} className="hover-glow">
            <Copy className="mr-1 h-4 w-4" /> Copiar briefing
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-rise space-y-3 p-5">
          <SelectField
            label="Tipo de projeto"
            value={d.type}
            onChange={(v) => set("type", v)}
            options={BRIEFING_TYPES}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Cliente" value={d.client} onChange={(v) => set("client", v)} />
            <TextField label="Projeto" value={d.project} onChange={(v) => set("project", v)} />
            <TextField
              label="Contato do responsável"
              value={d.contact}
              onChange={(v) => set("contact", v)}
            />
            <DateField label="Data da captação" value={d.date} onChange={(v) => set("date", v)} />
            <TextField
              label="Local"
              value={d.place}
              onChange={(v) => set("place", v)}
              className="sm:col-span-2"
            />
          </div>
          <AreaField
            label="Objetivo do vídeo"
            value={d.goal}
            onChange={(v) => set("goal", v)}
            rows={2}
          />
          <TextField label="Público-alvo" value={d.audience} onChange={(v) => set("audience", v)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Quantidade de vídeos" value={d.qty} onChange={(v) => set("qty", v)} />
            <TextField label="Duração" value={d.duration} onChange={(v) => set("duration", v)} />
          </div>
          <TextField
            label="Plataformas"
            value={d.platforms}
            onChange={(v) => set("platforms", v)}
          />
          <TextField
            label="Quem participa/aparece"
            value={d.people}
            onChange={(v) => set("people", v)}
          />
          <AreaField
            label="Assuntos principais"
            value={d.topics}
            onChange={(v) => set("topics", v)}
            rows={2}
          />
          <TextField label="Referências (links)" value={d.refs} onChange={(v) => set("refs", v)} />
          <TextField
            label="Tom (descontraído, premium…)"
            value={d.tone}
            onChange={(v) => set("tone", v)}
          />
          <TextField
            label="Equipamentos / acessos / autorizações"
            value={d.logistics}
            onChange={(v) => set("logistics", v)}
          />
          <TextField
            label="Prazo de entrega"
            value={d.deadline}
            onChange={(v) => set("deadline", v)}
          />
        </Card>
        <Card className="animate-rise h-fit p-5">
          <h2 className="mb-3 text-sm font-bold tracking-tight">Pré-visualização</h2>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {text}
          </pre>
        </Card>
      </div>
    </div>
  );
}
