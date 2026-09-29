import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Wallet, ArrowRight, Target, Banknote, Tag, Receipt, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configuração inicial | Finlist" },
      { name: "description", content: "Configure sua conta Finlist em poucos passos." },
      { property: "og:title", content: "Configuração inicial | Finlist" },
      { property: "og:description", content: "Configure sua conta Finlist em poucos passos." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const goals = [
  { id: "control", label: "Ter controle do mês", icon: Wallet },
  { id: "save", label: "Economizar mais", icon: Banknote },
  { id: "debt", label: "Sair das dívidas", icon: Target },
  { id: "plan", label: "Planejar o futuro", icon: Sparkles },
];

const defaultCategories = [
  { name: "Moradia", color: "#0b6e5f", kind: "expense" },
  { name: "Alimentação", color: "#0a6c86", kind: "expense" },
  { name: "Transporte", color: "#f2b01e", kind: "expense" },
  { name: "Lazer", color: "#3a7a6b", kind: "expense" },
  { name: "Salário", color: "#0b3b33", kind: "income" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch as unknown as { plan?: string };
  const isProIntent = search?.plan === "pro";
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [goal, setGoal] = useState("");
  const [income, setIncome] = useState("");
  const [firstBill, setFirstBill] = useState({ description: "", amount: "", due_date: "" });
  const [categories, setCategories] = useState(defaultCategories);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: userRes }) => {
      const uid = userRes.session?.user.id;
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("onboarding_completed, full_name").eq("id", uid).maybeSingle();
      if (data?.onboarding_completed) {
        navigate({ to: "/dashboard" });
      } else if (data?.full_name) {
        setFullName(data.full_name);
      }
    });
  }, [navigate]);

  const totalSteps = 4;

  const finishOnboarding = async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getSession();
    const uid = userRes.session?.user.id;
    if (!uid) return;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true, full_name: fullName || undefined })
      .eq("id", uid);

    if (profileError) {
      setLoading(false);
      return toast.error(profileError.message);
    }

    // Seed custom categories if user changed them
    if (categories.length > 0) {
      const { data: existing } = await supabase.from("categories").select("name").eq("user_id", uid);
      const existingNames = new Set((existing ?? []).map((c) => c.name));
      const toInsert = categories.filter((c) => !existingNames.has(c.name)).map((c) => ({ ...c, user_id: uid }));
      if (toInsert.length > 0) await supabase.from("categories").insert(toInsert);
    }

    // Create first transaction if filled
    if (firstBill.description && firstBill.amount && firstBill.due_date) {
      await supabase.from("transactions").insert({
        user_id: uid,
        description: firstBill.description,
        amount: Number(firstBill.amount),
        type: "expense",
        due_date: firstBill.due_date,
        status: "pending",
        payment_method: "pix",
      });
    }

    qc.invalidateQueries({ queryKey: ["profile"] });
    setLoading(false);
    toast.success("Tudo pronto! Bem-vindo ao Finlist.");
    if (isProIntent) {
      navigate({ to: "/settings", search: { checkout: "pro" } });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  const stepContent = [
    {
      title: "Bem-vindo ao Finlist",
      subtitle: "Vamos configurar sua conta em poucos passos.",
      icon: Wallet,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Como devemos te chamar?</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>
        </div>
      ),
    },
    {
      title: "Qual seu objetivo principal?",
      subtitle: "Isso nos ajuda a personalizar sua experiência.",
      icon: Target,
      content: (
        <div className="grid grid-cols-2 gap-3">
          {goals.map((g) => {
            const Icon = g.icon;
            const selected = goal === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{g.label}</span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Suas categorias",
      subtitle: "Você pode editar ou adicionar novas depois.",
      icon: Tag,
      content: (
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={cat.name}
                onChange={(e) => {
                  const next = [...categories];
                  next[idx].name = e.target.value;
                  setCategories(next);
                }}
                placeholder="Nome da categoria"
              />
              <select
                value={cat.kind}
                onChange={(e) => {
                  const next = [...categories];
                  next[idx].kind = e.target.value;
                  setCategories(next);
                }}
                className="rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="expense">Saída</option>
                <option value="income">Entrada</option>
              </select>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategories([...categories, { name: "", color: "#6B7280", kind: "expense" }])}
          >
            Adicionar categoria
          </Button>
        </div>
      ),
    },
    {
      title: "Adicione sua primeira conta",
      subtitle: "Pode ser uma conta fixa do mês. Você pode pular se quiser.",
      icon: Receipt,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Input
              id="desc"
              value={firstBill.description}
              onChange={(e) => setFirstBill({ ...firstBill, description: e.target.value })}
              placeholder="Ex: Aluguel"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                value={firstBill.amount}
                onChange={(e) => setFirstBill({ ...firstBill, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="due">Vencimento</Label>
              <Input
                id="due"
                type="date"
                value={firstBill.due_date}
                onChange={(e) => setFirstBill({ ...firstBill, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = stepContent[step];
  const Icon = current.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Wallet className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-foreground">Finlist</span>
      </Link>

      <Card className="w-full max-w-lg border-border/60 bg-card p-6">
        <div className="mb-6 flex items-center justify-center gap-2">
          {stepContent.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">{current.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
        </div>

        {current.content}

        <div className="mt-8 flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Voltar
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finishOnboarding} disabled={loading}>
              {loading ? "Finalizando..." : "Concluir"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
