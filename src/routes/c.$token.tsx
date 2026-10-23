import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VideoPlayer, type PlayerHandle } from "@/components/pj/VideoPlayer";
import { proposalBlocks, renderBlocks, type ProposalData } from "@/lib/pj/doc";
import { mmss, parseTime, waLink } from "@/lib/pj/format";
import { hasAutoTime, parseVideoUrl } from "@/lib/pj/video";
import { withBase } from "@/lib/base";
import { cn } from "@/lib/utils";
import type { PublicEvent, PublicShare } from "@/server/share";

export const Route = createFileRoute("/c/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Área do cliente" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ClientPage,
});

type Payload = { share: PublicShare; events: PublicEvent[] };
const NAME_KEY = "pj:clientName";
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};

async function fetchShare(token: string): Promise<Payload> {
  const res = await fetch(withBase(`/api/share/${token}`), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(res.status === 404 ? "not_found" : "error");
  return res.json();
}

async function postEvent(token: string, body: Record<string, unknown>) {
  const res = await fetch(withBase(`/api/share/${token}`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error ?? "Não foi possível enviar");
  }
}

function ClientPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => fetchShare(token),
    refetchInterval: 20_000,
    retry: false,
  });
  const [name, setName] = useState(readName);

  // Uma visualização por sessão do navegador (o servidor ainda limita por visitante).
  useEffect(() => {
    if (!data) return;
    const key = `pj:viewed:${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sem armazenamento: o servidor limita de qualquer forma */
    }
    postEvent(token, { type: "view" }).catch(() => undefined);
  }, [data, token]);

  const send = async (body: Record<string, unknown>) => {
    if (!name.trim()) {
      toast.error("Informe seu nome");
      return false;
    }
    try {
      await postEvent(token, { ...body, name: name.trim().slice(0, 80) });
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* sem armazenamento */
      }
      await qc.invalidateQueries({ queryKey: ["public-share", token] });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };

  if (isLoading)
    return (
      <Shell>
        <Card className="h-40 animate-pulse bg-muted/40" />
      </Shell>
    );
  if (error || !data) {
    return (
      <Shell>
        <Card className="space-y-2 p-8 text-center">
          <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">Peça um novo link a quem enviou.</p>
        </Card>
      </Shell>
    );
  }

  const { share, events } = data;
  const approval = [...events].reverse().find((e) => e.type === "approval");
  return (
    <Shell>
      <header className="flex items-center gap-3">
        {share.brand.logo && (
          <img
            src={share.brand.logo}
            alt=""
            className="h-10 w-10 rounded-lg bg-white object-contain p-0.5"
          />
        )}
        <b>{share.brand.name}</b>
      </header>
      {approval && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            approval.decision === "approved"
              ? "border-success/50 bg-success/10"
              : "border-warning/50 bg-warning/10",
          )}
        >
          {approval.decision === "approved" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <TriangleAlert className="h-4 w-4" />
          )}
          <span>
            {approval.decision === "approved" ? "Aprovado" : "Ajustes solicitados"} por{" "}
            {approval.name || "você"} em {new Date(approval.created_at).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}
      {share.kind === "proposal" ? (
        <ProposalView share={share} events={events} name={name} setName={setName} send={send} />
      ) : (
        <DeliveryView share={share} events={events} name={name} setName={setName} send={send} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}

type ViewProps = {
  share: PublicShare;
  events: PublicEvent[];
  name: string;
  setName: (v: string) => void;
  send: (body: Record<string, unknown>) => Promise<boolean>;
};

function NameField({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="cl-name" className="text-xs text-muted-foreground">
        Seu nome
      </label>
      <Input
        id="cl-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        autoComplete="name"
      />
    </div>
  );
}

function DecisionCard({
  label,
  name,
  setName,
  send,
}: { label: string } & Pick<ViewProps, "name" | "setName" | "send">) {
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="space-y-3 p-5">
      <h2 className="text-sm font-bold tracking-tight">Sua decisão</h2>
      <NameField name={name} setName={setName} />
      {asking && (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="O que você gostaria de ajustar?"
          className="rounded-xl"
          aria-label="O que ajustar"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={async () => {
            if (!name.trim()) return toast.error("Informe seu nome");
            if (!confirm("Confirmar aprovação?")) return;
            setBusy(true);
            if (await send({ type: "approval", decision: "approved" }))
              toast.success("Aprovado, obrigado!");
            setBusy(false);
          }}
        >
          {label}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (!asking) return setAsking(true);
            setBusy(true);
            if (
              await send({
                type: "approval",
                decision: "changes",
                text: text.trim().slice(0, 2000),
              })
            ) {
              toast.success("Pedido enviado");
              setAsking(false);
              setText("");
            }
            setBusy(false);
          }}
        >
          {asking ? "Enviar pedido de ajustes" : "Pedir ajustes"}
        </Button>
      </div>
    </Card>
  );
}

function ProposalView({ share, events, name, setName, send }: ViewProps) {
  const [text, setText] = useState("");
  const blocks = useMemo(() => proposalBlocks(share.data as ProposalData, share.brand), [share]);
  const thread = events.filter((e) => e.type === "comment" || e.type === "reply");
  return (
    <>
      <div className="doc" aria-label="Proposta">
        {renderBlocks(blocks)}
      </div>
      <DecisionCard label="Aprovar proposta" name={name} setName={setName} send={send} />
      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-bold tracking-tight">Dúvidas ou comentários</h2>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Escreva uma dúvida ou comentário…"
          className="rounded-xl"
          aria-label="Comentário"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              if (!text.trim()) return;
              if (await send({ type: "comment", text: text.trim() })) setText("");
            }}
          >
            Enviar
          </Button>
          {share.brand.phone && (
            <Button asChild variant="outline">
              <a href={waLink(share.brand.phone)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1 h-4 w-4" /> Falar no WhatsApp
              </a>
            </Button>
          )}
        </div>
        {thread.map((e) => (
          <div
            key={e.id}
            className={cn(
              "rounded-xl p-3 text-sm",
              e.type === "reply" ? "bg-primary/10" : "bg-muted/60",
            )}
          >
            <b>{e.type === "reply" ? share.brand.name || "Resposta" : e.name || "Você"}</b>
            <p className="mt-1 whitespace-pre-wrap break-words">{e.text}</p>
          </div>
        ))}
      </Card>
    </>
  );
}

type DeliveryVideo = { title: string; url: string; note: string };

function DeliveryView({ share, events, name, setName, send }: ViewProps) {
  const videos = ((share.data.videos as DeliveryVideo[]) ?? []).slice(0, 20);
  const message = typeof share.data.message === "string" ? share.data.message : "";
  const [cur, setCur] = useState(0);
  const [time, setTime] = useState("");
  const [text, setText] = useState("");
  const player = useRef<PlayerHandle>(null);
  const video = videos[cur];
  const auto = video ? hasAutoTime(parseVideoUrl(video.url)) : false;

  const thread = events
    .filter((e) => (e.type === "comment" || e.type === "reply") && (e.video ?? 0) === cur)
    .sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9) || a.created_at.localeCompare(b.created_at));

  if (videos.length === 0)
    return <Card className="p-6 text-sm text-muted-foreground">Nenhum vídeo publicado ainda.</Card>;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        {message && <p className="whitespace-pre-wrap break-words text-sm">{message}</p>}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Vídeos">
          {videos.map((v, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === cur}
              onClick={() => setCur(i)}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium",
                i === cur
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground",
              )}
            >
              {v.title || `Vídeo ${i + 1}`}
            </button>
          ))}
        </div>
        <VideoPlayer key={cur} ref={player} url={video.url} />
        {video.note && <p className="text-sm text-muted-foreground">{video.note}</p>}
        <DecisionCard label="Aprovar entrega" name={name} setName={setName} send={send} />
      </div>

      <Card className="h-fit space-y-3 p-5">
        <h2 className="text-sm font-bold tracking-tight">Deixe seu comentário</h2>
        <NameField name={name} setName={setName} />
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <label htmlFor="cl-time" className="text-xs text-muted-foreground">
              Minuto
            </label>
            <Input
              id="cl-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="0:00"
              className="w-24"
              inputMode="numeric"
            />
          </div>
          {auto && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                const t = await player.current?.getTime();
                if (t != null) setTime(mmss(t));
                else toast.error("Digite o minuto manualmente");
              }}
            >
              Usar tempo atual
            </Button>
          )}
        </div>
        {!auto && (
          <p className="text-xs text-muted-foreground">
            Neste tipo de vídeo, digite o minuto à mão.
          </p>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="O que ajustar neste momento do vídeo?"
          className="rounded-xl"
          aria-label="Comentário"
        />
        <Button
          onClick={async () => {
            if (!text.trim()) return;
            let t = parseTime(time);
            if (t == null && auto) t = Math.floor((await player.current?.getTime()) ?? 0) || null;
            if (
              await send({
                type: "comment",
                video: cur,
                time: t == null ? null : Math.min(86400, Math.floor(t)),
                text: text.trim(),
              })
            ) {
              setText("");
              setTime("");
              toast.success("Comentário enviado");
            }
          }}
        >
          Enviar comentário
        </Button>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold">
            Comentários ({thread.filter((e) => e.type === "comment").length})
          </h3>
          {thread.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum comentário neste vídeo.</p>
          )}
          {thread.map((e) => (
            <div
              key={e.id}
              className={cn(
                "rounded-xl p-3 text-sm",
                e.type === "reply" ? "bg-primary/10" : "bg-muted/60",
                e.done && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {e.time != null && (
                  <button
                    type="button"
                    className="num rounded-md bg-primary px-1.5 py-0.5 text-xs text-primary-foreground"
                    onClick={() => player.current?.seek(e.time!)}
                    aria-label={`Ir para ${mmss(e.time)}`}
                  >
                    {mmss(e.time)}
                  </button>
                )}
                <b>{e.type === "reply" ? share.brand.name || "Resposta" : e.name || "Você"}</b>
                {e.done && <span className="text-xs text-muted-foreground">✓ resolvido</span>}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words">{e.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
