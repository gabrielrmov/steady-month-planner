import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Wallet, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planos e preços | Finlist" },
      {
        name: "description",
        content:
          "Comece grátis e evolua para o Pro quando precisar de relatórios avançados, cartões ilimitados e exportações.",
      },
      { property: "og:title", content: "Planos e preços | Finlist" },
      {
        property: "og:description",
        content: "Compare o plano gratuito e o Pro do Finlist e escolha o que cabe no seu mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "para sempre",
    desc: "Para organizar o mês sem complicação.",
    features: [
      "Checklist mensal de contas",
      "Entradas e saídas ilimitadas",
      "Até 2 cartões",
      "Calendário financeiro",
      "Categorias personalizadas",
      "Regras de categorização",
    ],
    cta: "Começar grátis",
    href: "/auth",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 19",
    period: "por mês",
    desc: "Para quem quer enxergar o futuro das finanças.",
    features: [
      "Tudo do plano gratuito",
      "Cartões e parcelamentos ilimitados",
      "Relatórios avançados e comparativos",
      "Exportação em CSV",
      "Histórico completo de meses",
      "Suporte prioritário",
    ],
    cta: "Assinar o Pro",
    href: "/auth?plan=pro",
    highlight: true,
  },
];

const faqs = [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. O Pro é mensal e o cancelamento é imediato, sem multa.",
  },
  {
    q: "Meus dados ficam salvos se eu voltar para o gratuito?",
    a: "Ficam. Você continua com acesso aos lançamentos, apenas os recursos Pro são desativados.",
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "Aceitamos cartão de crédito e outros métodos disponíveis na plataforma de pagamentos.",
  },
  {
    q: "O plano Pro é para uma pessoa só?",
    a: "Sim, cada assinatura é vinculada a uma única conta. Em breve teremos planos para famílias.",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Finlist</span>
          </Link>
          <Link to="/auth">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Planos simples, sem surpresa
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Escolha o plano ideal para você</h1>
          <p className="mt-4 text-muted-foreground">
            Comece de graça hoje e migre para o Pro quando quiser relatórios mais profundos e recursos avançados.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={`relative p-6 shadow-[var(--shadow-card)] ${
                p.highlight ? "border-primary/50 bg-card shadow-[var(--shadow-elegant)]" : "border-border/60 bg-card"
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
          <h2 className="text-center text-2xl font-semibold text-foreground">Perguntas frequentes</h2>
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
          <p>© {new Date().getFullYear()} Finlist</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-foreground">Termos</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
            <Link to="/" className="hover:text-foreground">Voltar para o início</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
