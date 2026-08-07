import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlan, PLAN_LABEL } from "@/lib/plan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, FileUp, Landmark, Trash2, Upload, Crown, Lock } from "lucide-react";
import { categoryForDescription, fingerprint, parseStatement, type CategoryRule, type ParsedTx } from "@/lib/automation";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Importar extratos e Open Finance | Finlist" },
      { name: "description", content: "Importe OFX e CSV com deduplicação automática e prepare conexões bancárias." },
      { property: "og:title", content: "Importar extratos e Open Finance | Finlist" },
      { property: "og:description", content: "Importe OFX e CSV com deduplicação automática e prepare conexões bancárias." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImportPage,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const FREE_IMPORT_LIMIT = 3;

function useImportCount() {
  return useQuery({
    queryKey: ["import-count"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return 0;
      const { count, error } = await supabase
        .from("import_batches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function ImportPage() {
  const qc = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [cardId, setCardId] = useState<string>("none");
  const [institution, setInstitution] = useState("");

  const plan = usePlan();
  const isPro = plan.hasAccess;
  const { data: importCount = 0 } = useImportCount();
  const atImportLimit = !isPro && importCount >= FREE_IMPORT_LIMIT;

  const { data: rules = [] } = useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_rules").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as CategoryRule[];
    },
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["bank-connections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_connections").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleFile = async (file: File) => {
    if (atImportLimit) return toast.error("Limite de importações atingido. Assine um plano para continuar.");
    const text = await file.text();
    const rows = parseStatement(file.name, text);
    setFileName(file.name);
    setParsed(rows);
    if (!rows.length) toast.error("Não consegui ler lançamentos deste arquivo");
    else toast.success(`${rows.length} lançamentos lidos`);
  };

  const importAll = useMutation({
    mutationFn: async () => {
      if (atImportLimit) throw new Error("Limite de importações atingido. Assine um plano para continuar.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");

      const { data: batch, error: be } = await supabase
        .from("import_batches")
        .insert({ user_id: u.user.id, source: "file", file_name: fileName })
        .select()
        .single();
      if (be) throw be;

      const rows = parsed.map((t) => ({
        user_id: u.user!.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        status: "paid",
        paid_at: new Date(`${t.date}T12:00:00`).toISOString(),
        due_date: t.date,
        is_recurring: false,
        payment_method: paymentMethod,
        card_id: paymentMethod === "card" && cardId !== "none" ? cardId : null,
        category_id: categoryForDescription(rules, t.description, t.type),
        fingerprint: fingerprint(t.date, t.amount, t.description, t.externalId),
        source: "import",
        import_batch_id: batch.id,
      }));

      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        const { error } = await supabase.from("transactions").insert(row);
        if (error) skipped++;
        else imported++;
      }
      await supabase
        .from("import_batches")
        .update({ imported_count: imported, skipped_count: skipped })
        .eq("id", batch.id);
      return { imported, skipped };
    },
    onSuccess: ({ imported, skipped }) => {
      setParsed([]);
      setFileName("");
      qc.invalidateQueries({ queryKey: ["tx"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["import-count"] });
      toast.success(`${imported} importados${skipped ? `, ${skipped} duplicados ignorados` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addConnection = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      if (!institution.trim()) throw new Error("Informe o banco");
      const { error } = await supabase.from("bank_connections").insert({
        user_id: u.user.id,
        institution_name: institution.trim(),
        provider: "pluggy",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setInstitution("");
      qc.invalidateQueries({ queryKey: ["bank-connections"] });
      toast.success("Banco registrado para conexão");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-connections"] }),
  });

  const totalIn = parsed.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalOut = parsed.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Importar & Open Finance</h1>
          <p className="text-sm text-muted-foreground">
            Traga seus lançamentos automaticamente do extrato do banco ou da fatura do cartão.
          </p>
        </div>
        {!isPro && (
          <Badge variant="secondary">
            {importCount}/{FREE_IMPORT_LIMIT} importações no plano atual
          </Badge>
        )}
      </div>

      <Card className="border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Importar extrato (OFX ou CSV)</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixe o extrato ou a fatura no app do seu banco e solte aqui. Duplicados são ignorados automaticamente e as
          suas <Link to="/rules" className="text-primary underline">regras de categorização</Link> são aplicadas.
        </p>

        {atImportLimit && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Limite de importações atingido</p>
                  <p className="text-sm text-muted-foreground">
                    No plano atual você pode importar até {FREE_IMPORT_LIMIT} extratos. Faça upgrade para
                    importações ilimitadas.
                  </p>
                </div>
              </div>
              <Button size="sm" asChild>
                <Link to="/pricing">
                  Upgrade Pro
                  <Crown className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label>Arquivo</Label>
            <Input
              type="file"
              accept=".ofx,.csv,.txt"
              className="mt-1"
              disabled={atImportLimit}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={atImportLimit}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix / conta</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentMethod === "card" && (
            <div>
              <Label>Cartão</Label>
              <Select value={cardId} onValueChange={setCardId} disabled={atImportLimit}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Escolher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cartão</SelectItem>
                  {cards.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {parsed.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {parsed.length} lançamentos · entradas {brl(totalIn)} · saídas {brl(totalOut)}
              </span>
              <Button onClick={() => importAll.mutate()} disabled={importAll.isPending || atImportLimit}>
                <Upload className="mr-2 h-4 w-4" />
                {importAll.isPending ? "Importando..." : "Importar tudo"}
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              {parsed.map((t, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-0">
                  <span className="truncate pr-3">
                    <span className="text-muted-foreground">{t.date.split("-").reverse().join("/")}</span>{" "}
                    {t.description}
                  </span>
                  <span className={t.type === "income" ? "text-emerald-600" : "text-destructive"}>
                    {t.type === "income" ? "+" : "-"}
                    {brl(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Open Finance (sincronização automática)</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A sincronização direta com o banco depende de um agregador regulado (Pluggy, Belvo ou Klavi). A estrutura já
          está pronta aqui: cadastre os bancos que quer conectar e, assim que as credenciais do agregador forem
          adicionadas, a sincronização passa a rodar sozinha usando as mesmas regras de categorização e o mesmo
          controle de duplicidade da importação.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Ex: Nubank, Itaú, Inter"
          />
          <Button variant="outline" onClick={() => addConnection.mutate()} disabled={addConnection.isPending}>
            <Building2 className="mr-2 h-4 w-4" /> Adicionar banco
          </Button>
        </div>

        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {connections.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">Nenhum banco registrado.</p>
          )}
          {connections.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{c.institution_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.status === "pending" ? "Aguardando conexão do agregador" : c.status}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => delConnection.mutate(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
