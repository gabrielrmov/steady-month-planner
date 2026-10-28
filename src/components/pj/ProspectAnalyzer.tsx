import { useRef, useState } from "react";
import { Copy, ImagePlus, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AreaField } from "@/components/pj/ui";
import { copyText } from "@/lib/pj/clipboard";
import { shrinkToJpeg } from "@/lib/pj/image";
import { withBase } from "@/lib/base";
import { cn } from "@/lib/utils";

type Shot = { id: number; media_type: "image/jpeg"; data: string; preview: string };
type Advice = {
  resumo: string;
  etapa: string;
  proximo_passo: string;
  alertas: string[];
  mensagens: { tom: string; quando: string; texto: string }[];
};
const MAX = 4;

/** Envie prints da conversa e receba o andamento, o próximo passo e novas mensagens prontas. */
export function ProspectAnalyzer() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  async function add(files: FileList | File[] | null | undefined) {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const room = MAX - shots.length;
    if (list.length > room) toast.info(`No máximo ${MAX} prints por análise`);
    try {
      const added = await Promise.all(
        list
          .slice(0, Math.max(0, room))
          .map(async (f) => ({ id: ++seq.current, ...(await shrinkToJpeg(f)) })),
      );
      setShots((s) => [...s, ...added]);
      setAdvice(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function analyze() {
    if (!shots.length) return toast.error("Envie ao menos um print");
    setBusy(true);
    try {
      const res = await fetch(withBase("/api/prospect/advice"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "x-finlist": "1" },
        body: JSON.stringify({
          images: shots.map(({ media_type, data }) => ({ media_type, data })),
          context,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Erro ${res.status}`);
      setAdvice(body as Advice);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card
        className={cn("animate-rise space-y-4 p-5", over && "ring-2 ring-primary")}
        onPaste={(e) => add(e.clipboardData.files)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        tabIndex={0}
      >
        <div>
          <h2 className="text-sm font-bold tracking-tight">Prints da conversa</h2>
          <p className="text-xs text-muted-foreground">
            Cole (Cmd+V), arraste ou escolha até {MAX} prints do WhatsApp, Instagram ou e-mail. Os
            prints vão para a IA só para esta análise e não ficam salvos.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shots.map((s) => (
            <div key={s.id} className="relative overflow-hidden rounded-xl border border-border">
              <img
                src={s.preview}
                alt="Print da conversa"
                className="aspect-[3/4] w-full object-cover"
              />
              <button
                type="button"
                aria-label="Remover print"
                onClick={() => setShots((x) => x.filter((y) => y.id !== s.id))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {shots.length < MAX && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-5 w-5" />
              Adicionar print
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />

        <AreaField
          label="Contexto (opcional)"
          value={context}
          onChange={setContext}
          rows={3}
          hint="Ex.: é o pastor de uma paróquia, quero fechar conteúdo mensal para o Instagram, ele disse que ia ver com a equipe."
        />
        <Button
          onClick={analyze}
          disabled={busy || shots.length === 0}
          className="hover-glow w-full"
        >
          {busy ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-4 w-4" />
          )}
          {busy ? "Analisando…" : "Analisar e sugerir mensagens"}
        </Button>
      </Card>

      <div className="space-y-4">
        {!advice && !busy && (
          <Card className="p-6 text-sm text-muted-foreground">
            O resultado aparece aqui: onde a conversa está, o próximo passo e 3 mensagens prontas
            para enviar.
          </Card>
        )}
        {advice && (
          <>
            <Card className="animate-rise space-y-3 p-5">
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {advice.etapa}
              </span>
              <p className="whitespace-pre-wrap break-words text-sm">{advice.resumo}</p>
              <div className="rounded-xl bg-muted/60 p-3 text-sm">
                <b>Próximo passo:</b> {advice.proximo_passo}
              </div>
              {advice.alertas.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {advice.alertas.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </Card>
            {advice.mensagens.map((m, i) => (
              <Card key={i} className="animate-rise space-y-3 p-5">
                <p className="text-xs text-muted-foreground">
                  <b className="text-foreground">{m.tom}</b> · {m.quando}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.texto}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => copyText(m.texto)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(m.texto)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
