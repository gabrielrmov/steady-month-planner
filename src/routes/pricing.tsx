import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Wallet } from "lucide-react";

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
    ],
    cta: "Começar grátis",
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
    highlight: true,
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Finlist</span>
          </Link>
          <Link to="/auth">
            <Button size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Planos simples, sem surpresa</h1>
          <p className="mt-4 text-muted-foreground">
            Comece de graça hoje e migre para o Pro quando quiser relatórios mais profundos.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={`relative p-6 shadow-[var(--shadow-card)] ${
                p.highlight ? "border-primary shadow-[var(--shadow-elegant)]" : ""
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Mais popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 block">
                <Button className="w-full" variant={p.highlight ? "default" : "outline"}>
                  {p.cta}
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="text-center text-xl font-semibold">Perguntas frequentes</h2>
          <div className="mx-auto mt-6 max-w-2xl space-y-4">
            {[
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim. O Pro é mensal e o cancelamento é imediato, sem multa.",
              },
              {
                q: "Meus dados ficam salvos se eu voltar para o gratuito?",
                a: "Ficam. Você continua com acesso aos lançamentos, apenas os recursos Pro são desativados.",
              },
              {
                q: "O Finlist se conecta ao meu banco?",
                a: "Ainda não. Os lançamentos são cadastrados por você, o que mantém tudo simples e privado.",
              },
            ].map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-medium">{f.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Finlist
      </footer>
    </div>
  );
}
