import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Sparkles, User } from "lucide-react";

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

function SettingsPage() {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: profile } = useQuery({
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

      <Card className="p-5 shadow-[var(--shadow-card)]">
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

      <Card className="p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Plano</h2>
          </div>
          <Badge variant="secondary">Gratuito</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Você está no plano gratuito, com lançamentos, cartões e checklist mensal. O plano Pro
          adiciona relatórios avançados, exportações ilimitadas e histórico completo.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <a href="/pricing">Ver planos</a>
        </Button>
      </Card>

      <Card className="p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Seus dados</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Baixe todos os seus lançamentos em CSV para abrir no Excel ou Google Sheets.
        </p>
        <Button className="mt-4" variant="outline" onClick={exportCsv} disabled={exporting}>
          {exporting ? "Gerando..." : "Exportar CSV"}
        </Button>
      </Card>
    </div>
  );
}
