import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LineChart,
  ListChecks,
  Wallet,
  Zap,
  ArrowRight,
  Star,
  Shield,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finlist — Organize as contas do mês sem planilha" },
      {
        name: "description",
        content:
          "Checklist mensal de contas a pagar e receber, cartões, parcelas e dashboard de fluxo de caixa. Comece grátis.",
      },
      { property: "og:title", content: "Finlist — Organize as contas do mês sem planilha" },
      {
        property: "og:description",
        content: "Checklist mensal, cartões, parcelas e dashboard de fluxo de caixa. Comece grátis.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steady-month-planner.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://steady-month-planner.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Finlist",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          url: "https://steady-month-planner.lovable.app/",
          offers: [
            { "@type": "Offer", price: "0", priceCurrency: "BRL", name: "Gratuito" },
            { "@type": "Offer", price: "19", priceCurrency: "BRL", name: "Pro" },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ListChecks,
    title: "Checklist mensal",
    desc: "Marque as contas conforme paga. Vece o que ainda falta em segundos, sem perder nenhum vencimento.",
  },
  {
    icon: LineChart,
    title: "Dashboard claro",
    desc: "Entradas, saídas, saldo previsto e a saúde do seu mês em um único painel visual.",
  },
  {
    icon: Zap,
    title: "Recorrência automática",
    desc: "Cadastre contas fixas uma vez e replique todo mês automaticamente. Sem planilhas.",
  },
  {
    icon: CreditCard,
    title: "Cartões e parcelas",
    desc: "Acompanhe faturas, parcelamentos e saiba quanto tempo falta para quitar cada compra.",
  },
  {
    icon: CalendarDays,
    title: "Calendário financeiro",
    desc: "Visualize entradas e saídas por dia no calendário e nunca mais perca um vencimento.",
  },
  {
    icon: BarChart3,
    title: "Relatórios avançados",
    desc: "Entenda seus gastos por categoria, evolução mensal e tendências ao longo do tempo.",
  },
];

const steps = [
  {
    step: "01",
    title: "Cadastre suas contas",
    desc: "Adicione contas fixas, parcelamentos e recebimentos em poucos cliques.",
  },
  {
    step: "02",
    title: "Acompanhe o mês",
    desc: "Use o checklist mensal e o calendário para saber exatamente o que vence e quando.",
  },
  {
    step: "03",
    title: "Tome decisões",
    desc: "Com dashboard e relatórios, você enxerga para onde o dinheiro vai e planeja com tranquilidade.",
  },
];

const testimonials = [
  {
    quote: "Finalmente parei de perder conta no meio do mês. O checklist me salvou.",
    author: "Mariana L.",
    role: "Autônoma",
  },
  {
    quote: "Simples, direto e com tudo que preciso para organizar as finanças da família.",
    author: "Ricardo T.",
    role: "Engenheiro",
  },
  {
    quote: "O controle de parcelas me fez enxergar quanto realmente gasto no cartão.",
    author: "Juliana M.",
    role: "Designer",
  },
];

const faqs = [
  {
    q: "O Finlist é gratuito?",
    a: "Sim. O plano gratuito já organiza seu mês com checklist, categorias, calendário e até 2 cartões. O Pro libera relatórios, exportação e cartões ilimitados.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Seus dados são criptografados e acessíveis apenas por você. Nunca vendemos ou compartilhamos informações.",
  },
  {
    q: "Posso cancelar o Pro quando quiser?",
    a: "Sim. A assinatura é mensal e o cancelamento é simples, sem multa ou burocracia.",
  },
  {
    q: "O Finlist se conecta ao meu banco?",
    a: "Ainda não. Você cadastra seus lançamentos manualmente, o que mantém tudo simples, privado e sob seu controle.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <div className="flex items-center gap-2">
            <Link to="/pricing">
              <Button variant="ghost" size="sm">Planos</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-32 md:pb-40">
          <div className="absolute inset-0 -z-10 opacity-30">
            <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Organizador financeiro mensal
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-7xl">
              Toda conta do mês,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                sob controle.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Checklist mês a mês de contas a pagar e receber, cartões, parcelas e um dashboard
              claro do que vai entrar e sair. Sem planilhas, sem complicação.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="shadow-[var(--shadow-elegant)]">
                  Criar minha conta grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline">
                  Ver planos
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Gratuito para começar
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Sem cartão de crédito
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Cancele quando quiser
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-card/30 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Tudo que você precisa para organizar o mês
              </h2>
              <p className="mt-3 text-muted-foreground">
                Um conjunto completo de ferramentas para você nunca mais perder o controle das finanças.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title} className="border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Como funciona</h2>
              <p className="mt-3 text-muted-foreground">Três passos para começar a organizar suas finanças.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.step} className="relative rounded-2xl border border-border bg-card p-6">
                  <span className="text-4xl font-bold text-primary/20">{s.step}</span>
                  <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-y border-border bg-card/30 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <div className="mb-3 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Amado por quem organiza o mês</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.author} className="border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
                  <p className="text-sm text-muted-foreground">"{t.quote}"</p>
                  <div className="mt-4">
                    <p className="font-semibold text-foreground">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)] md:p-12">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight md:text-4xl">Comece grátis, evolua quando precisar</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                O plano gratuito já organiza seu mês inteiro. O Pro adiciona relatórios avançados,
                cartões ilimitados, exportação CSV e suporte prioritário.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/auth">
                  <Button size="lg">Criar conta grátis</Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline">
                    Ver planos e preços
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-card/30 px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Perguntas frequentes</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((f) => (
                <Card key={f.q} className="border-border/60 bg-card p-5">
                  <h3 className="font-semibold text-foreground">{f.q}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Pronto para organizar suas contas?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Junte-se a milhares de pessoas que já deixaram as planilhas para trás.
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button size="lg" className="shadow-[var(--shadow-elegant)]">
                Começar grátis agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Finlist</span>
          </div>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-foreground">Planos</Link>
            <Link to="/auth" className="hover:text-foreground">Entrar</Link>
            <Link to="/terms" className="hover:text-foreground">Termos</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
          </div>
          <p>© {new Date().getFullYear()} Finlist. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
