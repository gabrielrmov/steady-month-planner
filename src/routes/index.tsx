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
  Calculator,
  Lock,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finlist — Controle financeiro mensal para PF e PJ" },
      {
        name: "description",
        content:
          "Checklist mensal de contas, cartões, parcelas, relatórios e precificação de serviços PJ. Teste grátis por 30 dias, sem cartão.",
      },
      { property: "og:title", content: "Finlist — Controle financeiro mensal para PF e PJ" },
      {
        property: "og:description",
        content:
          "Checklist mensal, cartões, parcelas, relatórios e precificação PJ. Teste grátis por 30 dias.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steady-month-planner.dsggabriel7.workers.dev/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://steady-month-planner.dsggabriel7.workers.dev/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Finlist",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          url: "https://steady-month-planner.dsggabriel7.workers.dev/",
          offers: [
            { "@type": "Offer", price: "19", priceCurrency: "BRL", name: "Pessoal (PF)" },
            { "@type": "Offer", price: "39", priceCurrency: "BRL", name: "Pessoal + PJ" },
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
    desc: "Marque cada conta conforme paga e veja em segundos o que ainda falta no mês.",
  },
  {
    icon: LineChart,
    title: "Dashboard de fluxo",
    desc: "Entradas, saídas, saldo previsto e alertas de vencimento em um painel único.",
  },
  {
    icon: Zap,
    title: "Recorrência automática",
    desc: "Cadastre as contas fixas uma vez e o mês seguinte já nasce pronto.",
  },
  {
    icon: CreditCard,
    title: "Cartões e parcelas",
    desc: "Faturas por data de fechamento e quantas parcelas faltam para quitar cada compra.",
  },
  {
    icon: CalendarDays,
    title: "Calendário financeiro",
    desc: "Enxergue entradas e saídas dia a dia e nunca mais perca um vencimento.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e importação",
    desc: "Evolução mensal, gastos por categoria, regras automáticas e importação OFX/CSV.",
  },
];

const stats = [
  { value: "30 dias", label: "de teste completo" },
  { value: "2 perfis", label: "pessoal e PJ" },
  { value: "OFX/CSV", label: "importação de extratos" },
  { value: "0", label: "planilhas necessárias" },
];

const steps = [
  {
    step: "01",
    title: "Cadastre suas contas",
    desc: "Contas fixas, parcelamentos e recebimentos em poucos cliques — ou importe o extrato.",
  },
  {
    step: "02",
    title: "Acompanhe o mês",
    desc: "Checklist, calendário e alertas mostram exatamente o que vence e quando.",
  },
  {
    step: "03",
    title: "Decida com dados",
    desc: "Relatórios, faturas e precificação PJ para saber quanto sobra e quanto cobrar.",
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
    quote: "A precificação PJ me mostrou que eu cobrava abaixo do custo por hora.",
    author: "Juliana M.",
    role: "Designer",
  },
];

const faqs = [
  {
    q: "Como funciona o teste grátis?",
    a: "São 30 dias com todos os recursos liberados, incluindo o painel PJ, sem pedir cartão de crédito. Depois você escolhe o plano Pessoal ou Pessoal + PJ.",
  },
  {
    q: "Qual a diferença entre Pessoal e Pessoal + PJ?",
    a: "O Pessoal (R$ 19/mês) cobre suas finanças do dia a dia. O Pessoal + PJ (R$ 39/mês) acrescenta a precificação de serviços com custo por hora, impostos e margem.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Cada conta só acessa os próprios dados, com regras de segurança aplicadas no banco. Nunca vendemos ou compartilhamos informações.",
  },
  {
    q: "Perco meus lançamentos se o teste acabar?",
    a: "Não. Tudo continua salvo; apenas os recursos pagos ficam bloqueados até você assinar.",
  },
];

function ProductPreview() {
  const rows = [
    { name: "Aluguel", tag: "Recorrente", value: "R$ 2.400,00", done: true },
    { name: "Cartão Nubank · fatura", tag: "Cartão", value: "R$ 1.187,40", done: true },
    { name: "Internet fibra", tag: "Recorrente", value: "R$ 129,90", done: false },
    { name: "Notebook 4/10", tag: "Parcela", value: "R$ 420,00", done: false },
  ];
  return (
    <div className="glow-ring rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-3 text-xs text-muted-foreground">Finlist · Agosto</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {[
          { label: "Entradas", value: "R$ 8.400", tone: "text-success" },
          { label: "Saídas", value: "R$ 5.137", tone: "text-destructive" },
          { label: "Saldo previsto", value: "R$ 3.263", tone: "text-foreground" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className={`mt-1 text-lg font-bold ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 px-4 pb-4">
        {rows.map((r) => (
          <div
            key={r.name}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CheckCircle2
                className={`h-4 w-4 shrink-0 ${r.done ? "text-success" : "text-muted-foreground/40"}`}
              />
              <span className="truncate text-sm text-foreground">{r.name}</span>
              <span className="hidden shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">
                {r.tag}
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-3.5">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="truncate text-lg font-semibold tracking-tight text-foreground">
              Finlist
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link to="/pricing" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Planos
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="hover-glow">
                Testar grátis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="ambient-glow" aria-hidden="true" />
          <div className="bg-grid absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <div className="hover-glow mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                30 dias grátis · sem cartão de crédito
              </div>
              <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tighter md:text-7xl">
                Toda conta do mês,
                <br />
                <span className="text-gradient">sob controle.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Checklist mês a mês de contas a pagar e receber, cartões, parcelas, relatórios e
                precificação de serviços para quem também é PJ.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" className="hover-glow glow-ring">
                    Começar teste de 30 dias
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="hover-glow">
                    Ver planos
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Tudo liberado no teste
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Dados privados por conta
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Cancele quando quiser
                </span>
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border px-6 py-10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Recursos
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tighter md:text-4xl">
                Tudo que você precisa para fechar o mês no azul
              </h2>
              <p className="mt-3 text-muted-foreground">
                Do lançamento manual à importação de extrato, com automação de recorrências e regras
                de categorização.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card
                  key={f.title}
                  className="border-border/60 bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* PJ highlight */}
        <section className="border-y border-border px-6 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Módulo PJ
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tighter md:text-4xl">
                Descubra quanto cobrar por serviço
              </h2>
              <p className="mt-4 text-muted-foreground">
                A calculadora considera custos fixos, pró-labore, horas produtivas, impostos e
                margem para chegar ao preço justo — por markup, e não por chute.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Custo real por hora da sua operação",
                  "Impostos e margem embutidos no preço final",
                  "Separação entre gastos pessoais e da empresa",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {i}
                  </li>
                ))}
              </ul>
              <Link to="/pricing" className="mt-7 inline-block">
                <Button variant="outline">Conhecer o plano Pessoal + PJ</Button>
              </Link>
            </div>
            <Card className="border-border/60 bg-card p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calculator className="h-4 w-4 text-primary" />
                Preço sugerido do serviço
              </div>
              <p className="mt-4 text-4xl font-bold tracking-tight">R$ 4.821,43</p>
              <p className="mt-1 text-xs text-muted-foreground">R$ 241,07 por hora trabalhada</p>
              <div className="mt-5 divide-y divide-border border-t border-border">
                {[
                  ["Custo por hora da empresa", "R$ 75,00"],
                  ["Custo total do serviço", "R$ 1.500,00"],
                  ["Impostos estimados", "R$ 289,29"],
                  ["Lucro estimado", "R$ 3.032,14"],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-semibold tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">Como funciona</h2>
              <p className="mt-3 text-muted-foreground">
                Três passos para começar a organizar suas finanças.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.step} className="hover-lift rounded-2xl border border-border bg-card p-6">
                  <span className="text-gradient text-5xl font-extrabold opacity-30">{s.step}</span>
                  <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-y border-border px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <div className="mb-3 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">
                Amado por quem organiza o mês
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.author} className="border-border/60 bg-card p-6">
                  <p className="text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {t.author.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{t.author}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-border bg-card p-8 text-center md:p-12">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tighter md:text-4xl">
                Teste 30 dias, depois escolha seu plano
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Pessoal por R$ 19/mês para as finanças do dia a dia, ou Pessoal + PJ por R$ 39/mês
                com precificação de serviços. Cancele quando quiser.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/auth">
                  <Button size="lg" className="hover-glow glow-ring">
                    Começar teste grátis
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="hover-glow">
                    Ver planos e preços
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">
                Perguntas frequentes
              </h2>
            </div>
            <div className="space-y-4">
              {faqs.map((f) => (
                <Card key={f.q} className="border-border/60 bg-card p-5">
                  <h3 className="font-semibold text-foreground">{f.q}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden px-6 py-24">
          <div className="ambient-glow" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tighter md:text-5xl">
              Pronto para organizar suas contas?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Crie sua conta em menos de um minuto e comece com 30 dias de acesso completo.
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button size="lg" className="hover-glow glow-ring">
                Começar grátis agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

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
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/pricing" className="hover:text-foreground">
              Planos
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Entrar
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Termos
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacidade
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Finlist. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
