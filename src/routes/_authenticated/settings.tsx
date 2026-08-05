import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlan, PLAN_LABEL } from "@/lib/plan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Sparkles, User, Crown, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Configurações da conta | Finlist" },
      {
        name: "description",
        content: "Atualize seus dados, veja seu plano e exporte todos os seus lançamentos em CSV.",
      },
      { property: "og:title", content: "Configurações da conta | Finlist" },
      {
        property: "og:description",
        content: "Perfil, plano e exportação de dados no Finlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function SettingsPage() {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { data: profile } = useProfile();
  const plan = usePlan();
  const isPro = plan.hasAccess;

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const exportCsv = async () => {
    if (!isPro) return;
    setExporting(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("due_date, description, amount, type, status, payment_method, installment_number, installment_total, categories(name), cards(name)")
      .order("due_date");
    setExporting(false);
    if (error) return toast.error(error.message);

    const header = [
      "Data",
      "Descrição",
      "Valor",
      "Tipo",
      "Status",
      "Forma de pagamento",
      "Parcela",
      "Categoria",
      "Cartão",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = (data ?? []).map((t: any) =>
      [
        t.due_date,
        t.description,
        Number(t.amount).toFixed(2).replace(".", ","),
        t.type === "income" ? "Entrada" : "Saída",
        t.status === "paid" ? "Pago" : "Pendente",
        t.payment_method,
        t.installment_total ? `${t.installment_number}/${t.installment_total}` : "",
        t.categories?.name ?? "",
        t.cards?.name ?? "",
      ]
        .map(esc)
        .join(";"),
    );

    const csv = "\uFEFF" + [header.map(esc).join(";"), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `finlist-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Sua conta, plano e dados</p>
      </div>

      <Card className="border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Perfil</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="full-name">Nome</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ""} disabled />
          </div>
        </div>
        <Button className="mt-4" onClick={saveProfile} disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </Card>

      <Card className="border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Plano</h2>
          </div>
          <Badge variant={plan.plan === "expired" ? "secondary" : "default"}>
            {PLAN_LABEL[plan.plan]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {plan.isTrial
            ? `Você está no teste grátis de 30 dias, com acesso total (incluindo o painel PJ). Faltam ${plan.trialDaysLeft} dia(s).`
            : plan.plan === "pfpj"
              ? "Plano Pessoal + PJ ativo: finanças pessoais, relatórios, exportações e precificação de serviços."
              : plan.plan === "pf"
                ? "Plano Pessoal ativo: relatórios, exportações e cartões ilimitados. O painel de precificação PJ é exclusivo do plano Pessoal + PJ."
                : "Seu teste grátis terminou. Escolha um plano para voltar a usar relatórios, exportações e importações."}
        </p>
        {plan.isTrial && plan.trialEndsAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Teste termina em: {plan.trialEndsAt.toLocaleDateString("pt-BR")}
          </p>
        )}
        <div className="mt-4">
          {plan.plan === "pfpj" ? (
            <Button variant="outline" asChild>
              <Link to="/pricing">Ver detalhes do plano</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/pricing">
                {plan.plan === "pf" ? "Adicionar módulo PJ" : "Escolher plano"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

      </Card>

      <Card className="border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Seus dados</h2>
          {!isPro && (
            <Badge variant="outline" className="ml-auto gap-1 text-xs">
              <Lock className="h-3 w-3" />
              Plano pago
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Baixe todos os seus lançamentos em CSV para abrir no Excel ou Google Sheets.
        </p>
        <Button className="mt-4" variant="outline" onClick={exportCsv} disabled={exporting || !isPro}>
          {exporting ? "Gerando..." : isPro ? "Exportar CSV" : "Assinar para exportar"}
          {!isPro && <Crown className="ml-2 h-4 w-4" />}
        </Button>
      </Card>
    </div>
  );
}
