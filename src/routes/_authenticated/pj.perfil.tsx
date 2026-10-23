import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AreaField, NumberField, PageHeader, SelectField, TextField } from "@/components/pj/ui";
import { BackupCard } from "@/components/pj/BackupCard";
import { usePjProfile, useSaveProfile } from "@/lib/pj/data";
import { resizeLogo } from "@/lib/pj/image";
import { MEI_LIMIT, REGIMES, type PjProfile, type Regime } from "@/lib/pj/types";

export const Route = createFileRoute("/_authenticated/pj/perfil")({
  head: () => ({ meta: [{ title: "Perfil PJ | FINLIST" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { data, isLoading } = usePjProfile();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil PJ"
        subtitle="Usado automaticamente em propostas, contratos, mensagens e na página do cliente."
      />
      {isLoading || !data ? (
        <Card className="h-64 animate-pulse bg-muted/40" />
      ) : (
        <ProfileForm initial={data} />
      )}
      <BackupCard />
    </div>
  );
}

function ProfileForm({ initial }: { initial: PjProfile }) {
  const [p, setP] = useState<PjProfile>(initial);
  const save = useSaveProfile();
  const set = <K extends keyof PjProfile>(k: K, v: PjProfile[K]) => setP((x) => ({ ...x, [k]: v }));

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("logo", await resizeLogo(file, 400));
      toast.success("Logo carregada. Clique em Salvar para guardar.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submit = async () => {
    const saved = await save.mutateAsync({ ...p, tax_rate: p.tax_rate ?? 0 });
    setP((x) => ({ ...x, id: saved.id }));
  };

  return (
    <Card className="animate-rise space-y-6 p-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <TextField label="Seu nome" value={p.full_name} onChange={(v) => set("full_name", v)} />
        <TextField label="Nome da empresa" value={p.company} onChange={(v) => set("company", v)} />
        <TextField label="CNPJ / CPF" value={p.doc} onChange={(v) => set("doc", v)} />
        <TextField
          label="WhatsApp"
          value={p.phone}
          onChange={(v) => set("phone", v)}
          inputMode="tel"
        />
        <TextField label="E-mail" type="email" value={p.email} onChange={(v) => set("email", v)} />
        <TextField label="Cidade/UF" value={p.city} onChange={(v) => set("city", v)} />
        <AreaField
          label="Endereço / sede"
          value={p.address}
          onChange={(v) => set("address", v)}
          rows={2}
          className="sm:col-span-2"
        />
        <TextField
          label="Chave Pix"
          value={p.pix}
          onChange={(v) => set("pix", v)}
          className="sm:col-span-2"
        />
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-sm font-bold tracking-tight">Logo</h2>
        <div className="flex flex-wrap items-center gap-4">
          {p.logo ? (
            <img
              src={p.logo}
              alt="Logo"
              className="h-16 w-16 rounded-xl border border-border bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              sem logo
            </div>
          )}
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onLogo(e.target.files?.[0])}
              className="h-auto py-2"
            />
            <p className="text-[11px] text-muted-foreground">
              Reduzida para no máximo 400 px antes de salvar.
            </p>
          </div>
          {p.logo && (
            <Button type="button" variant="ghost" size="sm" onClick={() => set("logo", null)}>
              Remover
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-sm font-bold tracking-tight">Regime e impostos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Regime"
            value={p.regime}
            onChange={(v) => {
              set("regime", v as Regime);
              if (v === "MEI" && !p.annual_limit) set("annual_limit", MEI_LIMIT);
            }}
            options={REGIMES.map((r) => [r, r || "Não informado"] as [string, string])}
          />
          <NumberField
            label="Imposto estimado"
            value={p.tax_rate}
            onChange={(v) => set("tax_rate", v ?? 0)}
            suffix="%"
            hint="Ex.: 6 (Simples)"
          />
          <NumberField
            label="Limite anual de faturamento"
            value={p.annual_limit}
            onChange={(v) => set("annual_limit", v)}
            suffix="R$"
            hint={`MEI: ${MEI_LIMIT.toLocaleString("pt-BR")}`}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-sm font-bold tracking-tight">Metas e custos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Meta de faturamento do mês"
            value={p.monthly_goal}
            onChange={(v) => set("monthly_goal", v)}
            suffix="R$"
          />
          <NumberField
            label="Quanto quer ganhar por mês"
            value={p.desired_income}
            onChange={(v) => set("desired_income", v)}
            suffix="R$"
          />
          <NumberField
            label="Custos fixos por mês"
            value={p.fixed_costs}
            onChange={(v) => set("fixed_costs", v)}
            suffix="R$"
          />
          <NumberField
            label="Horas faturáveis por mês"
            value={p.billable_hours}
            onChange={(v) => set("billable_hours", v)}
            suffix="h"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Renda, custos fixos e horas alimentam o cálculo de quanto cobrar por hora em Precificação.
        </p>
      </section>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={save.isPending} className="hover-glow">
          Salvar
        </Button>
      </div>
    </Card>
  );
}
