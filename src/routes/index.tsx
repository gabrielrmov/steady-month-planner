import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Calculator,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CreditCard,
  FileUp,
  Hourglass,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Lock,
  PiggyBank,
  Repeat,
  Wallet,
  Wand2,
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

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const navLinks = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "Dúvidas" },
];

const moreFeatures = [
  {
    icon: Repeat,
    title: "Recorrência automática",
    desc: "Cadastre as contas fixas uma vez. O mês seguinte já nasce pronto.",
  },
  {
    icon: BarChart3,
    title: "Relatórios por categoria",
    desc: "Evolução mês a mês e para onde o dinheiro está indo.",
  },
  {
    icon: FileUp,
    title: "Importação de extrato",
    desc: "Traga o OFX ou CSV do banco em vez de digitar tudo.",
  },
  {
    icon: Wand2,
    title: "Regras de categorização",
    desc: "Diga uma vez que “iFood” é alimentação e nunca mais repita.",
  },
  {
    icon: PiggyBank,
    title: "Metas de economia",
    desc: "Acompanhe quanto já guardou e o ritmo para chegar lá.",
  },
  {
    icon: Landmark,
    title: "Open Finance",
    desc: "Conecte sua conta bancária e acompanhe os lançamentos.",
  },
];

const steps = [
  {
    title: "Cadastre o seu mês",
    desc: "Contas fixas, parcelas, cartões e recebimentos em poucos cliques — ou importe o extrato.",
  },
  {
    title: "Marque o que foi pago",
    desc: "O checklist e o calendário mostram exatamente o que falta e o que vence primeiro.",
  },
  {
    title: "Feche o mês no azul",
    desc: "O dashboard mostra o saldo previsto e os relatórios apontam onde dá para ajustar.",
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

const plans = [
  {
    name: "Pessoal",
    price: "19",
    desc: "Para organizar as finanças do dia a dia.",
    features: [
      "Checklist mensal e lançamentos ilimitados",
      "Cartões, faturas e parcelas",
      "Calendário e alertas de vencimento",
      "Relatórios, metas e exportação CSV",
      "Importação de extratos OFX/CSV",
    ],
    href: "/auth?plan=pf",
    highlight: false,
  },
  {
    name: "Pessoal + PJ",
    price: "39",
    desc: "Para autônomos e quem também tem empresa.",
    features: [
      "Tudo do plano Pessoal",
      "Precificação de serviços",
      "Custo por hora, impostos e margem",
      "Gastos pessoais e da empresa separados",
      "Suporte prioritário",
    ],
    href: "/auth?plan=pfpj",
    highlight: true,
  },
];

const faqs = [
  {
    q: "Como funciona o teste grátis?",
    a: "São 30 dias com todos os recursos liberados, incluindo o módulo PJ, sem pedir cartão de crédito. Depois você escolhe o plano Pessoal ou Pessoal + PJ.",
  },
  {
    q: "Qual a diferença entre Pessoal e Pessoal + PJ?",
    a: "O Pessoal (R$ 19/mês) cobre suas finanças do dia a dia. O Pessoal + PJ (R$ 39/mês) acrescenta a precificação de serviços com custo por hora, impostos e margem.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Cada conta só acessa os próprios dados, com regras de segurança aplicadas direto no banco de dados. Nunca vendemos ou compartilhamos suas informações.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Os planos são mensais, sem fidelidade e sem multa de cancelamento.",
  },
  {
    q: "Perco meus lançamentos se o teste acabar?",
    a: "Não. Tudo continua salvo; apenas os recursos pagos ficam bloqueados até você assinar.",
  },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-lg";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className={`flex shrink-0 items-center justify-center bg-primary ${box}`}>
      <Wallet className={`${icon} text-primary-foreground`} />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  desc,
  center = false,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-[1.08] text-foreground md:text-[44px]">
        {title}
      </h2>
      {desc && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product visuals — built from real app vocabulary, not illustrations */
/* ------------------------------------------------------------------ */

const flow = [
  { m: "mar", in: 7.8, out: 6.1 },
  { m: "abr", in: 8.1, out: 5.9 },
  { m: "mai", in: 7.9, out: 6.4 },
  { m: "jun", in: 8.4, out: 5.6 },
  { m: "jul", in: 8.2, out: 5.3 },
  { m: "ago", in: 8.4, out: 5.1 },
];

const checklist = [
  { name: "Aluguel", due: "05/08", value: "R$ 2.400,00", done: true },
  { name: "Cartão Nubank · fatura", due: "07/08", value: "R$ 1.187,40", done: true },
  { name: "Condomínio", due: "10/08", value: "R$ 640,00", done: true },
  { name: "Internet fibra", due: "amanhã", value: "R$ 129,90", done: false, soon: true },
  { name: "Notebook · parcela 4/10", due: "20/08", value: "R$ 420,00", done: false },
];

function ProductWindow() {
  const max = 9;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lg)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate text-xs text-muted-foreground">finlist · Agosto de 2026</span>
      </div>

      <div className="grid md:grid-cols-[200px_minmax(0,1fr)]">
        {/* sidebar */}
        <aside className="hidden border-r border-border p-4 md:block">
          <div className="mb-5 flex items-center gap-2">
            <BrandMark size="sm" />
            <span className="font-display text-sm font-semibold">Finlist</span>
          </div>
          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true },
            { icon: CalendarDays, label: "Calendário" },
            { icon: ListChecks, label: "Contas" },
            { icon: CreditCard, label: "Cartões" },
            { icon: Hourglass, label: "Parcelas" },
            { icon: BarChart3, label: "Relatórios" },
          ].map((i) => (
            <div
              key={i.label}
              className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${
                i.active ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              <i.icon className={`h-3.5 w-3.5 ${i.active ? "text-primary" : ""}`} />
              {i.label}
            </div>
          ))}
        </aside>

        {/* main */}
        <div className="min-w-0 space-y-4 bg-background p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold">Dashboard</p>
            <span className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
              Agosto de 2026
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              { label: "Entradas", value: "R$ 8.400", tone: "text-success" },
              { label: "Saídas", value: "R$ 5.137", tone: "text-destructive" },
              { label: "Saldo previsto", value: "R$ 3.263", tone: "text-foreground" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
                <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-[11px]">{k.label}</p>
                <p className={`mt-1 text-sm font-semibold tabular-nums sm:text-lg ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* flow chart */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Fluxo dos últimos 6 meses</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-[var(--chart-1)]" /> Entradas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-[var(--chart-2)]" /> Saídas
                  </span>
                </div>
              </div>
              <div className="mt-4 flex h-32 items-end justify-between gap-2 border-b border-border">
                {flow.map((d) => (
                  <div key={d.m} className="flex h-full flex-1 items-end justify-center gap-[2px]">
                    <div
                      className="w-2.5 rounded-t-[3px] bg-[var(--chart-1)]"
                      style={{ height: `${(d.in / max) * 100}%` }}
                    />
                    <div
                      className="w-2.5 rounded-t-[3px] bg-[var(--chart-2)]"
                      style={{ height: `${(d.out / max) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between gap-2">
                {flow.map((d) => (
                  <span key={d.m} className="flex-1 text-center text-[10px] text-muted-foreground">
                    {d.m}
                  </span>
                ))}
              </div>
            </div>

            {/* checklist */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Checklist de agosto</p>
                <p className="text-[10px] text-muted-foreground">3 de 5 pagas</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-3/5 rounded-full bg-primary" />
              </div>
              <div className="mt-3 divide-y divide-border">
                {checklist.slice(0, 4).map((r) => (
                  <div key={r.name} className="flex items-center gap-2.5 py-2">
                    {r.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-border" />
                    )}
                    <span
                      className={`min-w-0 flex-1 truncate text-xs ${
                        r.done ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {r.name}
                    </span>
                    <span className="text-xs font-semibold tabular-nums">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistVisual() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elegant)] sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Contas de agosto</p>
          <p className="mt-0.5 text-xs text-muted-foreground">R$ 4.777,30 no mês</p>
        </div>
        <p className="text-sm font-semibold tabular-nums">
          3<span className="text-muted-foreground">/5 pagas</span>
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-3/5 rounded-full bg-primary" />
      </div>
      <div className="mt-4 divide-y divide-border">
        {checklist.map((r) => (
          <div key={r.name} className="flex items-center gap-3 py-3">
            {r.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-border" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${r.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                {r.name}
              </p>
              <p className="text-xs text-muted-foreground">Vence {r.due}</p>
            </div>
            {r.soon && (
              <span className="hidden rounded-full bg-[var(--warning-subtle)] px-2 py-0.5 text-[11px] font-medium text-warning sm:inline">
                Vence amanhã
              </span>
            )}
            <span className="text-sm font-semibold tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardsVisual() {
  const parcelas = [
    { name: "Notebook", paid: 4, total: 10, value: "R$ 420,00" },
    { name: "Geladeira", paid: 7, total: 12, value: "R$ 289,90" },
    { name: "Curso de inglês", paid: 2, total: 6, value: "R$ 199,00" },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-foreground p-6 text-background shadow-[var(--shadow-elegant)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium opacity-80">Nubank · fatura de agosto</p>
          <CreditCard className="h-5 w-5 opacity-70" />
        </div>
        <p className="mt-6 font-display text-3xl font-semibold tabular-nums">R$ 1.187,40</p>
        <div className="mt-4 flex gap-6 text-xs opacity-70">
          <span>Fecha dia 28</span>
          <span>Vence dia 05</span>
          <span>Limite livre R$ 3.812</span>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold">Parcelas em andamento</p>
        <div className="mt-4 space-y-4">
          {parcelas.map((p) => (
            <div key={p.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {p.paid}/{p.total} · <span className="font-semibold text-foreground">{p.value}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(p.paid / p.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarVisual() {
  // August 2026 starts on a Saturday.
  const offset = 6;
  const days = 31;
  const events: Record<number, "in" | "out"> = { 5: "out", 7: "out", 10: "out", 15: "in", 19: "out", 20: "out", 30: "in" };
  const today = 18;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-elegant)] sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Agosto de 2026</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Entrada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Saída
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="py-1 font-medium">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const ev = events[day];
          const isToday = day === today;
          return (
            <div
              key={day}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs ${
                isToday ? "bg-foreground font-semibold text-background" : "text-foreground"
              }`}
            >
              {day}
              <span
                className={`mt-0.5 h-1 w-1 rounded-full ${
                  ev === "in" ? "bg-success" : ev === "out" ? "bg-destructive" : "bg-transparent"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--warning-subtle)] text-warning">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Internet fibra vence amanhã</p>
          <p className="text-xs text-muted-foreground">R$ 129,90 · ainda não marcada como paga</p>
        </div>
      </div>
    </div>
  );
}

function PricingVisual() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="h-4 w-4 text-primary" />
        Preço sugerido do serviço
      </div>
      <p className="mt-5 font-display text-4xl font-semibold tabular-nums">R$ 4.821,43</p>
      <p className="mt-1 text-sm text-muted-foreground">R$ 241,07 por hora trabalhada</p>
      <div className="mt-6 divide-y divide-border border-t border-border">
        {[
          ["Custo por hora da empresa", "R$ 75,00"],
          ["Custo total do serviço", "R$ 1.500,00"],
          ["Impostos estimados", "R$ 289,29"],
          ["Lucro estimado", "R$ 3.032,14"],
        ].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between py-3 text-sm">
            <span className="text-muted-foreground">{l}</span>
            <span className="font-semibold tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureRow({
  eyebrow,
  title,
  desc,
  bullets,
  visual,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h3 className="mt-3 font-display text-2xl font-semibold leading-tight md:text-[34px]">{title}</h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{desc}</p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-foreground/80">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "lg:order-1" : ""}>{visual}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-lg font-semibold">Finlist</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-16 md:pt-24">
          <div className="ambient-glow" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              30 dias grátis · sem cartão de crédito
            </div>
            <h1 className="mt-7 font-display text-[42px] font-semibold leading-[1.02] sm:text-6xl md:text-[76px]">
              Toda conta do mês,
              <br />
              <span className="text-primary">sob controle.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              O Finlist junta contas a pagar e receber, cartões, parcelas e relatórios em um checklist
              mensal simples — para você saber, a qualquer momento, quanto vai sobrar.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Começar teste de 30 dias
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#como-funciona" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver como funciona
                </Button>
              </a>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Tudo liberado no teste · Cancele quando quiser
            </p>
          </div>

          <div className="relative mx-auto mt-14 max-w-6xl md:mt-20">
            <ProductWindow />
          </div>
        </section>

        {/* Stats strip */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 md:grid-cols-4 md:divide-x md:divide-border">
            {[
              { value: "30 dias", label: "de teste com tudo liberado" },
              { value: "PF + PJ", label: "no mesmo lugar" },
              { value: "OFX/CSV", label: "importação de extratos" },
              { value: "0", label: "planilhas para manter" },
            ].map((s) => (
              <div key={s.label} className="px-4 text-center md:px-6">
                <p className="font-display text-3xl font-semibold md:text-4xl">{s.value}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="recursos" className="scroll-mt-20 px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow="Recursos"
              title="Tudo que você precisa para fechar o mês no azul"
              desc="Sem planilha, sem app de banco espalhado. Um lugar só, organizado do jeito que o mês acontece."
            />
            <div className="mt-16 space-y-24 md:mt-20 md:space-y-32">
              <FeatureRow
                eyebrow="Checklist mensal"
                title="Veja em segundos o que já foi pago e o que ainda falta"
                desc="Cada mês vira uma lista. Marque as contas conforme paga e acompanhe o progresso até o fim do mês."
                bullets={[
                  "Contas fixas se repetem sozinhas todo mês",
                  "Destaque do que vence nos próximos dias",
                  "Totais pagos e pendentes sempre atualizados",
                ]}
                visual={<ChecklistVisual />}
              />
              <FeatureRow
                flip
                eyebrow="Cartões e parcelas"
                title="Faturas e parcelamentos sem susto no fim do mês"
                desc="Cada compra parcelada entra no mês certo, com a data de fechamento do seu cartão. Você sabe quanto falta para quitar cada uma."
                bullets={[
                  "Fatura por data de fechamento e vencimento",
                  "Quantas parcelas faltam em cada compra",
                  "Vários cartões lado a lado",
                ]}
                visual={<CardsVisual />}
              />
              <FeatureRow
                eyebrow="Calendário e alertas"
                title="Nenhum vencimento esquecido"
                desc="O calendário mostra entradas e saídas dia a dia, e o Finlist avisa o que está chegando antes de virar juros."
                bullets={[
                  "Entradas e saídas no dia em que acontecem",
                  "Alertas de contas próximas do vencimento",
                  "Visão da semana e do mês inteiro",
                ]}
                visual={<CalendarVisual />}
              />
            </div>

            <div className="mt-24 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:mt-32 md:grid-cols-2 lg:grid-cols-3">
              {moreFeatures.map((f) => (
                <div key={f.title} className="bg-card p-7">
                  <f.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PJ module */}
        <section className="border-y border-border bg-card px-6 py-24 md:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="Módulo PJ"
                title="Descubra quanto cobrar por cada serviço"
                desc="A calculadora considera custos fixos, pró-labore, horas produtivas, impostos e margem para chegar ao preço justo — por conta, e não por chute."
              />
              <ul className="mt-8 space-y-3">
                {[
                  "Custo real por hora da sua operação",
                  "Impostos e margem embutidos no preço final",
                  "Gastos pessoais e da empresa separados",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-primary">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/80">{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <PricingVisual />
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="scroll-mt-20 px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              center
              eyebrow="Como funciona"
              title="Organizado em uma tarde. Tranquilo o mês inteiro."
            />
            <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((s, i) => (
                <div key={s.title} className="relative">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card font-display text-base font-semibold shadow-[var(--shadow-card)]">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 && (
                      <span className="hidden h-px flex-1 bg-border md:block" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-6xl">
            <figure className="mx-auto max-w-3xl text-center">
              <blockquote className="font-display text-2xl font-semibold leading-snug md:text-[34px]">
                “{testimonials[0].quote}”
              </blockquote>
              <figcaption className="mt-6 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{testimonials[0].author}</span> ·{" "}
                {testimonials[0].role}
              </figcaption>
            </figure>
            <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-2">
              {testimonials.slice(1).map((t) => (
                <figure
                  key={t.author}
                  className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
                >
                  <blockquote className="leading-relaxed text-foreground/85">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {t.author.charAt(0)}
                    </span>
                    <span className="text-sm">
                      <span className="block font-semibold">{t.author}</span>
                      <span className="text-muted-foreground">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="precos" className="scroll-mt-20 border-t border-border bg-card px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              center
              eyebrow="Preços"
              title="Comece grátis. Depois, um preço justo."
              desc="30 dias com todos os recursos liberados, sem cartão de crédito. Depois é só escolher o plano."
            />
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`relative flex flex-col rounded-2xl border bg-background p-7 md:p-8 ${
                    p.highlight
                      ? "border-foreground shadow-[var(--shadow-elegant)]"
                      : "border-border"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-7 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                      Mais completo
                    </span>
                  )}
                  <p className="text-lg font-semibold">{p.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="font-display text-5xl font-semibold tabular-nums">{p.price}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </p>
                  <ul className="mt-7 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={p.href} className="mt-8 block">
                    <Button className="w-full" size="lg" variant={p.highlight ? "default" : "outline"}>
                      Começar teste grátis
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Sem fidelidade. Cancele quando quiser.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border px-6 py-24 md:py-32">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <SectionHeading
              eyebrow="Dúvidas"
              title="Perguntas frequentes"
              desc="Não encontrou o que procurava? Escreva para contato@finlist.app."
            />
            <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
              {faqs.map((f) => (
                <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground px-8 py-16 text-center text-background md:px-16 md:py-24">
            <h2 className="mx-auto max-w-3xl font-display text-3xl font-semibold leading-[1.08] md:text-5xl">
              Comece o próximo mês já sabendo quanto vai sobrar.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg opacity-70">
              Crie sua conta em menos de um minuto e use tudo por 30 dias, de graça.
            </p>
            <Link
              to="/auth"
              className="mt-9 inline-flex h-11 items-center gap-2 rounded-lg bg-background px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-background/90"
            >
              Começar teste grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="font-display font-semibold text-foreground">Finlist</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
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
          <p>© {new Date().getFullYear()} Finlist</p>
        </div>
      </footer>
    </div>
  );
}
