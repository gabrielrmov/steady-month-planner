import { useEffect, useState } from "react";
import { Copy, Eye, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { copyText } from "@/lib/pj/clipboard";
import {
  saveRow,
  shareUrl,
  useInvalidatePj,
  useShareEvents,
  type ShareEvent,
  type ShareRow,
} from "@/lib/pj/data";
import { mmss } from "@/lib/pj/format";
import type { ProjectVideo } from "@/lib/pj/types";
import { cn } from "@/lib/utils";

/** Janela do dono: link para copiar/enviar e a atividade do cliente (comentários, aprovações, visualizações). */
export function ShareDialog({
  share,
  message,
  videos = [],
  onApproved,
  onClose,
}: {
  share: ShareRow;
  message: string;
  videos?: ProjectVideo[];
  onApproved?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const url = shareUrl(share.token);
  const events = useShareEvents(share.id);
  const invalidate = useInvalidatePj();
  const [reply, setReply] = useState<{ to: ShareEvent; text: string } | null>(null);
  const list = events.data ?? [];
  const approval = [...list].reverse().find((e) => e.type === "approval");

  // Abrir a janela marca o que estava novo como visto (o Início PJ só avisa o que é novo).
  const unseen = list.filter((e) => !e.seen && e.type !== "reply").length;
  useEffect(() => {
    if (!unseen) return;
    saveRowSeen(share.id).then(() => invalidate("share_events"));
  }, [unseen, share.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleDone(e: ShareEvent) {
    try {
      await saveRow<ShareEvent>("share_events", { id: e.id, done: !e.done });
      await invalidate("share_events");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function sendReply() {
    if (!reply?.text.trim()) return;
    try {
      await saveRow<ShareEvent>("share_events", {
        share_id: share.id,
        type: "reply",
        name: "Você",
        body: reply.text.trim().slice(0, 2000),
        video: reply.to.video,
        time_seconds: reply.to.time_seconds,
        seen: true,
      });
      setReply(null);
      await invalidate("share_events");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const where = (e: ShareEvent) =>
    [
      e.video != null && videos[e.video] ? videos[e.video].title || `Vídeo ${e.video + 1}` : "",
      e.time_seconds != null ? mmss(e.time_seconds) : "",
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Link do cliente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Input
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1"
            aria-label="Link do cliente"
          />
          <Button onClick={() => copyText(url)}>
            <Copy className="mr-1 h-4 w-4" /> Copiar
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Quem tem o link vê o conteúdo, sem criar conta. Publique de novo para atualizar o que o
          cliente vê.
        </p>

        {approval && (
          <div
            className={cn(
              "rounded-xl border p-3 text-sm",
              approval.decision === "approved"
                ? "border-success/50 bg-success/10"
                : "border-warning/50 bg-warning/10",
            )}
          >
            <b>{approval.decision === "approved" ? "✓ Aprovado" : "⚠ Ajustes solicitados"}</b> por{" "}
            {approval.name || "cliente"} em {new Date(approval.created_at).toLocaleString("pt-BR")}
            {approval.body && <p className="mt-1 text-muted-foreground">{approval.body}</p>}
            {approval.decision === "approved" && onApproved && (
              <Button
                size="sm"
                className="mt-2"
                onClick={async () => {
                  try {
                    await onApproved();
                    onClose();
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
              >
                Aplicar aprovação no sistema
              </Button>
            )}
          </div>
        )}

        <h3 className="text-sm font-semibold">Atividade</h3>
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
        )}
        <div className="space-y-2">
          {list.map((e) =>
            e.type === "view" ? (
              <p key={e.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Cliente abriu o link em{" "}
                {new Date(e.created_at).toLocaleString("pt-BR")}
              </p>
            ) : (
              <div
                key={e.id}
                className={cn("rounded-xl bg-muted/60 p-3 text-sm", e.done && "opacity-60")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <b>{e.type === "reply" ? "Você" : e.name || "Cliente"}</b>
                    <span className="text-xs text-muted-foreground">
                      {where(e) && ` · ${where(e)}`}
                      {e.type === "approval" &&
                        ` · ${e.decision === "approved" ? "aprovou" : "pediu ajustes"}`}
                    </span>
                  </p>
                  {e.type === "comment" && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => toggleDone(e)}
                      >
                        {e.done ? "Reabrir" : "Resolver"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => setReply({ to: e, text: "" })}
                      >
                        Responder
                      </Button>
                    </div>
                  )}
                </div>
                {e.body && (
                  <p
                    className={cn("mt-1 whitespace-pre-wrap break-words", e.done && "line-through")}
                  >
                    {e.body}
                  </p>
                )}
                {reply?.to.id === e.id && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={reply.text}
                      onChange={(ev) => setReply({ ...reply, text: ev.target.value })}
                      placeholder={`Responder a ${e.name || "cliente"}`}
                      maxLength={2000}
                      className="h-9"
                    />
                    <Button size="sm" onClick={sendReply}>
                      Enviar
                    </Button>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function saveRowSeen(shareId: string) {
  await supabase
    .from("share_events")
    .update({ seen: true })
    .eq("share_id", shareId)
    .eq("seen", false);
}
