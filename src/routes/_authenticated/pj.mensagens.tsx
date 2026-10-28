import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, SelectField, TextField } from "@/components/pj/ui";
import { ProspectAnalyzer } from "@/components/pj/ProspectAnalyzer";
import { copyText } from "@/lib/pj/clipboard";
import { usePjProfile } from "@/lib/pj/data";
import {
  FOLLOW_HINTS,
  FOLLOW_SITUATIONS,
  PROSPECT_CHANNELS,
  followUpMessages,
  prospectMessages,
  type FollowSituation,
  type ProspectChannel,
} from "@/lib/pj/texts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pj/mensagens")({
  head: () => ({ meta: [{ title: "Prospecção e follow-up | FINLIST" }] }),
  component: MensagensPage,
});

function MensagensPage() {
  const profile = usePjProfile();
  const [tab, setTab] = useState<"prosp" | "follow" | "ia">("prosp");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [obs, setObs] = useState("");
  const [project, setProject] = useState("vídeo institucional");
  const [channel, setChannel] = useState<ProspectChannel>(PROSPECT_CHANNELS[0]);
  const [sit, setSit] = useState<FollowSituation>(FOLLOW_SITUATIONS[0]);
  const me = (profile.data?.full_name ?? "").split(" ")[0];

  const messages = useMemo(
    () =>
      tab === "prosp"
        ? prospectMessages(channel, name, company, obs, me)
        : followUpMessages(sit, name, project),
    [tab, channel, name, company, obs, me, sit, project],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospecção e follow-up"
        subtitle="Mensagens prontas para abordar e retomar a conversa."
      />

      <div className="flex gap-1.5">
        {(
          [
            ["prosp", "Prospecção"],
            ["follow", "Follow-up"],
            ["ia", "Analisar conversa"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              tab === k
                ? "bg-primary text-primary-foreground"
                : "bg-muted/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ia" ? (
        <ProspectAnalyzer />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-rise space-y-3 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Nome da pessoa" value={name} onChange={setName} />
              {tab === "prosp" ? (
                <TextField label="Empresa" value={company} onChange={setCompany} />
              ) : (
                <TextField
                  label="Projeto (ex.: vídeo institucional)"
                  value={project}
                  onChange={setProject}
                />
              )}
            </div>
            {tab === "prosp" ? (
              <>
                <SelectField
                  label="Onde vai abordar?"
                  value={channel}
                  onChange={(v) => setChannel(v as ProspectChannel)}
                  options={[...PROSPECT_CHANNELS]}
                />
                <TextField
                  label="Observação específica (o que você viu no perfil deles)"
                  value={obs}
                  onChange={setObs}
                />
                <p className="text-xs text-muted-foreground">
                  Quanto mais específica a observação, menos genérica a mensagem.
                </p>
              </>
            ) : (
              <>
                <SelectField
                  label="O que aconteceu?"
                  value={sit}
                  onChange={(v) => setSit(v as FollowSituation)}
                  options={[...FOLLOW_SITUATIONS]}
                />
                <p className="text-xs text-muted-foreground">{FOLLOW_HINTS[sit]}</p>
                <p className="text-xs font-medium">
                  Não ofereça desconto de cara: primeiro entenda a objeção.
                </p>
              </>
            )}
          </Card>

          <div className="space-y-3">
            {messages.map((m, i) => (
              <Card key={i} className="animate-rise space-y-3 p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m}</p>
                <Button size="sm" onClick={() => copyText(m)}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copiar mensagem
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
