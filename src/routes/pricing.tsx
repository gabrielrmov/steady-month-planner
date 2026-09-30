import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Wallet, Sparkles, ArrowRight } from "lucide-react";
import {
  breadcrumbLd,
  faqLd,
  organizationLd,
  seo,
  softwareLd,
  webPageLd,
  websiteLd,
} from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () =>
    seo({
      title: "Planos e preços do FINLIST: a partir de R$ 19/mês",
      description:
        "Teste grátis por 30 dias, sem cartão. Depois, R$ 19/mês no plano Pessoal ou R$ 39/mês no Pessoal + PJ, com precificação de serviços. Sem fidelidade.",
      path: "/pricing",
      jsonLd: [
        organizationLd(),
        websiteLd(),
        softwareLd(),
        webPageLd({
          path: "/pricing",
          name: "Planos e preços do FINLIST",
          description: "Compare o teste grátis, o plano Pessoal e o Pessoal + PJ.",
        }),
        breadcrumbLd([
          { name: "Início", path: "/" },
          { name: "Planos e preços", path: "/pricing" },
        ]),
        faqLd(faqs),
      ],
    }),
  component: PricingPage,
});

const plans = [
  {
    name: "Teste grátis",
    price: "R$ 0",
    period: "por 30 dias",
    desc: "Acesso completo por um mês, sem cartão de crédito.",
    features: [
      "Todos os recursos liberados",
      "Checklist mensal de contas",
      "Cartões, parcelas e calendário",
      "Relatórios e exportação",
      "Painel de precificação PJ",
      "Após 30 dias, escolha um plano",
    ],
    cta: "Começar teste grátis",
    href: "/auth",
    highlight: false,
  },
  {
    name: "Pessoal (PF)",
    price: "R$ 19",
    period: "por mês",
    desc: "Para quem organiza apenas as finanças pessoais.",
    features: [
      "Lançamentos e checklist ilimitados",
      "Cartões e parcelamentos ilimitados",
      "Relatórios avançados e comparativos",
      "Exportação em CSV",
      "Importação de extratos (OFX/CSV)",
      "Histórico completo de meses",
    ],
    cta: "Assinar Pessoal",
    href: "/auth?plan=pf",
    highlight: true,
  },
  {
    name: "Pessoal + PJ",
    price: "R$ 39",
    period: "por mês",
    desc: "Para autônomos e PJ que também emitem serviços.",
    features: [
      "Tudo do plano Pessoal",
      "Painel de precificação de serviços",
      "Custo por hora e margem de lucro",
      "Simulação de impostos por serviço",
      "Separação de gastos pessoais e da empresa",
      "Suporte prioritário",
    ],
    cta: "Assinar Pessoal + PJ",
    href: "/auth?plan=pfpj",
    highlight: false,
  },
];

const faqs = [
  {
    q: "Como funciona o teste grátis?",
    a: "Você tem 30 dias com todos os recursos liberados, incluindo o painel PJ. Ao fim do período, escolha entre o plano Pessoal ou Pessoal + PJ para continuar.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Os planos são mensais e o cancelamento é imediato, sem multa.",
  },
  {
    q: "Qual a diferença entre Pessoal e Pessoal + PJ?",
    a: "O Pessoal cobre suas finanças do dia a dia. O Pessoal + PJ adiciona o painel de precificação de serviços, com custo por hora, impostos e margem de lucro.",
  },
  {
    q: "Meus dados somem se o teste terminar?",
    a: "Não. Seus lançamentos continuam salvos; apenas os recursos pagos ficam bloqueados até a assinatura.",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">FINLIST</span>
          </Link>
          <Link to="/auth">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Planos simples, sem surpresa
          </div>
          <h1 className="font-display text-3xl font-semibold md:text-5xl">
            Escolha o plano ideal para você
          </h1>
          <p className="mt-4 text-muted-foreground">
            Teste tudo por 30 dias. Depois, escolha entre o plano Pessoal (PF) ou Pessoal + PJ, com
            painel de precificação de serviços.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={`relative p-6 ${
                p.highlight ? "border-primary/50 bg-card" : "border-border/60 bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Mais popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-foreground">{p.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={p.href} className="mt-6 block">
                <Button className="w-full" variant={p.highlight ? "default" : "outline"}>
                  {p.cta}
                  {p.highlight && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold text-foreground">
            Perguntas frequentes
          </h2>
          <div className="mx-auto mt-6 max-w-2xl space-y-4">
            {faqs.map((f) => (
              <Card key={f.q} className="border-border/60 bg-card p-5">
                <h3 className="font-medium text-foreground">{f.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Ainda tem dúvidas? Entre em contato conosco pelo email{" "}
            <a href="mailto:contato@finlist.app" className="text-primary hover:underline">
              contato@finlist.app
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <p>© {new Date().getFullYear()} FINLIST</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">
              Termos
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link to="/" className="hover:text-foreground">
              Voltar para o início
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
