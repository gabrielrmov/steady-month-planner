import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Landmark, RefreshCw, Trash2, ShieldCheck, Plus } from "lucide-react";
import { createConnectToken, openFinanceStatus, saveBankItem, syncBankConnection } from "@/lib/openfinance.functions";
import { openPluggyWidget } from "@/lib/pluggy-widget";

export const Route = createFileRoute("/_authenticated/open-finance")({
  head: () => ({
    meta: [
      { title: "Open Finance — conectar contas | Finlist" },
      { name: "description", content: "Conecte suas contas bancárias e cartões via Open Finance para lançamentos automáticos." },
      { property: "og:title", content: "Open Finance — conectar contas | Finlist" },
      { property: "og:description", content: "Conecte suas contas bancárias e cartões via Open Finance para lançamentos automáticos." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OpenFinancePage,
});

function OpenFinancePage() {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: ofStatus } = useQuery({
    queryKey: ["openfinance-status"],
    queryFn: () => openFinanceStatus(),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["bank-connections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_connections").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const syncBank = useMutation({
    mutationFn: async (connectionId: string) => {
      setSyncing(connectionId);
      return syncBankConnection({ data: { connectionId } });
    },
    onSuccess: ({ imported, skipped }) => {
      qc.invalidateQueries({ queryKey: ["tx"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["bank-connections"] });
      toast.success(`${imported} lançamentos sincronizados${skipped ? `, ${skipped} já existiam` : ""}`);
    },
    onError: (e: Error) => {
      qc.invalidateQueries({ queryKey: ["bank-connections"] });
      toast.error(e.message);
    },
    onSettled: () => setSyncing(null),
  });

  const connectBank = useMutation({
    mutationFn: async (itemId?: string) => {
      const { accessToken } = await createConnectToken({ data: { itemId: itemId ?? null } });
      await openPluggyWidget({
        connectToken: accessToken,
        updateItem: itemId,
        onSuccess: async (newItemId) => {
          try {
            const { id } = await saveBankItem({ data: { itemId: newItemId } });
            qc.invalidateQueries({ queryKey: ["bank-connections"] });
            toast.success("Conta conectada. Sincronizando lançamentos...");
            syncBank.mutate(id);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao salvar conexão");
          }
        },
        onError: () => toast.error("Não foi possível concluir a conexão com o banco"),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-connections"] });
      toast.success("Conta desconectada");
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-rise flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold sm:text-[34px]">Open Finance</h1>
          <p className="text-sm text-muted-foreground">
            Adicione suas contas e cartões para os lançamentos entrarem sozinhos, já categorizados.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Conexão oficial e somente leitura
        </Badge>
      </div>

      <Card className="animate-rise border-border/60 bg-card p-5" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h2 className="font-bold tracking-tight">Adicionar conta</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Você autoriza na tela oficial do seu banco. Nós nunca vemos sua senha e as{" "}
          <Link to="/rules" className="text-primary underline">
            regras de categorização
          </Link>{" "}
          são aplicadas automaticamente.
        </p>

        {ofStatus && !ofStatus.configured && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            A conexão com o agregador ainda não está ativa nesta conta. Assim que as credenciais forem cadastradas, o
            botão abaixo abre a tela oficial do seu banco.
          </div>
        )}

        <Button
          className="hover-glow mt-4"
          onClick={() => connectBank.mutate(undefined)}
          disabled={connectBank.isPending || !ofStatus?.configured}
        >
          <Plus className="mr-2 h-4 w-4" />
          {connectBank.isPending ? "Abrindo..." : "Adicionar conta bancária"}
        </Button>
      </Card>

      <Card className="animate-rise border-border/60 bg-card p-5" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-bold tracking-tight">Contas conectadas</h2>
        </div>

        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {connections.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma conta conectada ainda. Adicione a primeira acima.
            </p>
          )}
          {connections.map((c: any, i: number) => (
            <div
              key={c.id}
              className="animate-rise flex flex-wrap items-center justify-between gap-2 p-3"
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div>
                <p className="text-sm font-medium">{c.institution_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.status === "error"
                    ? c.last_error || "Erro na última sincronização"
                    : c.last_synced_at
                      ? `Sincronizado em ${new Date(c.last_synced_at).toLocaleString("pt-BR")}`
                      : c.status === "connected"
                        ? "Conectado — sincronize para trazer os lançamentos"
                        : "Aguardando autorização no banco"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncing === c.id || !c.external_item_id}
                  onClick={() => syncBank.mutate(c.id)}
                >
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${syncing === c.id ? "animate-spin" : ""}`} />
                  {syncing === c.id ? "Sincronizando" : "Sincronizar"}
                </Button>
                {c.external_item_id && (
                  <Button variant="ghost" size="sm" onClick={() => connectBank.mutate(c.external_item_id)}>
                    Reconectar
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="group" onClick={() => delConnection.mutate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive transition-transform duration-150 group-hover:scale-110" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Prefere subir um arquivo OFX/CSV?{" "}
          <Link to="/import" className="text-primary underline">
            Importar extrato
          </Link>
        </p>
      </Card>
    </div>
  );
}
