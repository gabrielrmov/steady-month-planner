import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  FileUp,
  Landmark,
  Lock,
  PiggyBank,
  Repeat,
  Wand2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FINLIST — Controle financeiro mensal para PF e PJ" },
      {
        name: "description",
        content:
          "Checklist mensal de contas, cartões, parcelas, relatórios e precificação de serviços PJ. Teste grátis por 30 dias, sem cartão.",
      },
      { property: "og:title", content: "FINLIST — Controle financeiro mensal para PF e PJ" },
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
          name: "FINLIST",
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
    title: "Feche o mês em ordem",
    desc: "O dashboard mostra o saldo previsto e os relatórios apontam onde dá para ajustar.",
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

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Números do faixa: fatos do produto e dos planos, sem promessas. */
const facts = [
  { value: "30 dias", label: "de teste com tudo liberado" },
  { value: "R$ 19", label: "por mês no plano Pessoal" },
  { value: "OFX e CSV", label: "para importar o extrato" },
  { value: "Mensal", label: "sem fidelidade, cancele quando quiser" },
];

type Row = { name: string; cat: string; cents: number; type: "in" | "out"; status: string };

const sampleRows: Row[] = [
  { name: "Salário", cat: "Salário", cents: 480000, type: "in", status: "Recebido" },
  { name: "Aluguel", cat: "Moradia", cents: 145000, type: "out", status: "Pago" },
  { name: "Internet", cat: "Moradia", cents: 11990, type: "out", status: "Vence em 3 dias" },
  { name: "Mercado", cat: "Alimentação", cents: 62480, type: "out", status: "Pago" },
  { name: "Projeto de logo", cat: "Freelance", cents: 90000, type: "in", status: "Pendente" },
];

const tickerRows = [
  ...sampleRows,
  { name: "Ônibus e metrô", cat: "Transporte", cents: 21000, type: "out", status: "Pago" },
  { name: "Plano de saúde", cat: "Saúde", cents: 38900, type: "out", status: "Vence em 5 dias" },
  { name: "Cinema", cat: "Lazer", cents: 7800, type: "out", status: "Pago" },
] as Row[];

const cases = [
  {
    tab: "Autônomo",
    who: "Exemplo: designer que recebe por projeto",
    title: "Saber quanto entra antes de o mês acabar.",
    body: "Cada recebimento fica como pendente até cair. O saldo previsto mostra o que sobra se tudo entrar como combinado.",
    rows: [
      { label: "Entradas do mês", cents: 690000 },
      { label: "Saídas do mês", cents: 412000 },
      { label: "Ainda a receber", cents: 180000 },
    ],
    note: "Saldo previsto: R$ 2.780,00",
  },
  {
    tab: "Família",
    who: "Exemplo: casal com filhos e cartão",
    title: "Nenhuma conta esquecida no meio do mês.",
    body: "Contas fixas nascem prontas todo mês. O calendário mostra o que vence primeiro, sem susto.",
    rows: [
      { label: "Contas a pagar", cents: 318000 },
      { label: "Já pagas", cents: 204000 },
      { label: "Vencem nesta semana", cents: 41990 },
    ],
    note: "Internet vence em 3 dias: R$ 119,90.",
  },
  {
    tab: "Pequeno negócio",
    who: "Exemplo: loja com poucos funcionários",
    title: "Gastos da empresa separados dos pessoais.",
    body: "Precificação de serviços com custo por hora, impostos e margem, no plano Pessoal + PJ.",
    rows: [
      { label: "Receitas do mês", cents: 1850000 },
      { label: "Despesas do mês", cents: 1274000 },
      { label: "Meta de economia", cents: 200000 },
    ],
    note: "Meta do mês: você guardou R$ 800,00 de R$ 2.000,00.",
  },
];

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function ExampleTag() {
  return (
    <span className="rounded-sm border border-border-strong px-2 py-0.5 text-[12px] leading-4 text-ink-muted">
      Exemplo ilustrativo
    </span>
  );
}

function Money({ cents, type }: { cents: number; type?: "in" | "out" }) {
  return (
    <span className={`num text-[14px] leading-5 ${type === "in" ? "text-positive" : ""}`}>
      {type === "in" ? "+ " : type === "out" ? "- " : ""}
      {brl(cents)}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const soon = status.startsWith("Vence");
  return (
    <span
      className={`hidden rounded-full border px-3 py-0.5 text-[12px] leading-4 sm:inline-block ${
        soon ? "border-attention font-semibold text-attention" : "border-border text-ink-muted"
      }`}
    >
      {status}
    </span>
  );
}

function LedgerPanel({
  rows,
  title = "Lançamentos",
  period = "Setembro de 2026",
}: {
  rows: Row[];
  title?: string;
  period?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="font-display text-[18px] font-bold leading-6">{title}</p>
          <p className="text-[12px] leading-4 text-ink-muted">{period}</p>
        </div>
        <ExampleTag />
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-[22px]">{r.name}</p>
              <p className="text-[12px] leading-4 text-ink-muted">{r.cat}</p>
            </div>
            <StatusChip status={r.status} />
            <div className="w-28 text-right">
              <Money cents={r.cents} type={r.type} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-20 px-6 py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Heading({ eyebrow, title, desc }: { eyebrow?: string; title: string; desc?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="text-[13px] font-semibold leading-[18px] tracking-[0.2px] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-balance font-display text-[32px] font-bold leading-[38px] tracking-[-0.5px] md:text-[40px] md:leading-[46px]">
        {title}
      </h2>
      {desc && <p className="mt-4 text-[17px] leading-[26px] text-ink-muted">{desc}</p>}
    </div>
  );
}

function FeatureRow({
  eyebrow,
  title,
  desc,
  points,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  points: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={flip ? "md:order-2" : ""}>
        <p className="text-[13px] font-semibold leading-[18px] tracking-[0.2px] text-primary">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-balance font-display text-[28px] font-bold leading-[34px] tracking-[-0.5px] md:text-[32px] md:leading-[38px]">
          {title}
        </h3>
        <p className="mt-4 text-[15px] leading-[22px] text-ink-muted">{desc}</p>
        <ul className="mt-6 space-y-3">
          {points.map((pt) => (
            <li key={pt} className="flex items-start gap-3 text-[15px] leading-[22px]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {pt}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "md:order-1" : ""}>{visual}</div>
    </div>
  );
}

function BillsVisual() {
  const bills = [
    { n: "Internet", d: "Vence em 3 dias", c: 11990, soon: true },
    { n: "Plano de saúde", d: "Vence em 5 dias", c: 38900, soon: true },
    { n: "Aluguel", d: "Venceu há 2 dias", c: 145000, late: true },
    { n: "Energia", d: "Vence 25/09/2026", c: 24350 },
  ];
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="font-display text-[18px] font-bold leading-6">Contas a pagar</p>
        <ExampleTag />
      </div>
      <ul className="divide-y divide-border">
        {bills.map((b) => (
          <li key={b.n} className="flex items-center gap-3 px-5 py-3">
            <span className="h-5 w-5 shrink-0 rounded-sm border border-border-strong" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-[22px]">{b.n}</p>
              <p
                className={`text-[12px] leading-4 ${
                  b.late
                    ? "font-semibold text-negative"
                    : b.soon
                      ? "font-semibold text-attention"
                      : "text-ink-muted"
                }`}
              >
                {b.d}
              </p>
            </div>
            <Money cents={b.c} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalVisual() {
  const pct = 40;
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold leading-[18px] tracking-[0.2px] text-ink-muted">
            Meta de economia
          </p>
          <p className="num mt-2 text-[32px] leading-[40px] md:text-[40px] md:leading-[44px]">
            {brl(80000)}
          </p>
          <p className="text-[14px] leading-5 text-ink-muted">
            de {brl(200000)} · Setembro de 2026
          </p>
        </div>
        <ExampleTag />
      </div>
      <div
        className="mt-6 h-3 w-full overflow-hidden rounded-lg bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da meta"
      >
        <div className="h-full rounded-lg bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[14px] leading-5">
        <span className="num text-positive">▲ {pct}%</span> da meta. Faltam {brl(120000)} para
        fechar o mês.
      </p>
    </div>
  );
}

function ChartVisual() {
  const months = [
    { m: "Abr", i: 5200, o: 4100 },
    { m: "Mai", i: 5400, o: 4700 },
    { m: "Jun", i: 5100, o: 3900 },
    { m: "Jul", i: 6100, o: 4800 },
    { m: "Ago", i: 5900, o: 4300 },
    { m: "Set", i: 6900, o: 4120 },
  ];
  const max = 7000;
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[18px] font-bold leading-6">Entradas x saídas</p>
          <p className="text-[12px] leading-4 text-ink-muted">Abril a setembro de 2026</p>
        </div>
        <ExampleTag />
      </div>
      <div
        className="mt-6 flex h-44 items-end gap-3"
        role="img"
        aria-label="Gráfico de barras de entradas e saídas por mês"
      >
        {months.map((x) => (
          <div key={x.m} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div
                className="w-1/2 rounded-t-sm bg-[var(--chart-1)]"
                style={{ height: `${(x.i / max) * 100}%` }}
              />
              <div
                className="w-1/2 rounded-t-sm bg-[var(--chart-2)]"
                style={{ height: `${(x.o / max) * 100}%` }}
              />
            </div>
            <span className="text-[12px] leading-4 text-ink-muted">{x.m}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-5 text-[13px] font-semibold leading-[18px]">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[var(--chart-1)]" />
          Entrou
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[var(--chart-2)]" />
          Saiu
        </span>
      </div>
    </div>
  );
}

function Landing() {
  const [tab, setTab] = useState(0);
  const c = cases[tab];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-brand-deep px-6 py-2 text-center text-[13px] font-semibold leading-[18px] text-on-brand">
        Novo: metas de economia com progresso mensal.{" "}
        <a href="#recursos" className="underline underline-offset-2">
          Ver recursos
        </a>
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link to="/" aria-label="FINLIST">
            <Logo />
          </Link>
          <nav
            aria-label="Principal"
            className="hidden items-center gap-8 text-[15px] text-ink-muted md:flex"
          >
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-foreground">
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
        {/* Herói */}
        <section className="px-6 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div>
              <p className="inline-block rounded-full border border-border-strong px-3 py-1 text-[13px] font-semibold leading-[18px] text-ink-muted">
                30 dias grátis · sem cartão de crédito
              </p>
              <h1 className="mt-6 text-balance font-display text-[40px] font-bold leading-[1.02] tracking-[-1px] sm:text-[56px] sm:leading-[56px]">
                Seu dinheiro, em ordem.
              </h1>
              <p className="mt-6 max-w-lg text-[17px] leading-[26px] text-ink-muted">
                FINLIST reúne receitas, despesas, contas a pagar e metas em uma lista clara, para
                você decidir com o dinheiro em dia.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto">
                    Começar teste grátis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#recursos">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Ver recursos
                  </Button>
                </a>
              </div>
            </div>
            <LedgerPanel rows={sampleRows} />
          </div>
        </section>

        {/* Faixa de fatos */}
        <section
          aria-label="FINLIST em números"
          className="border-y border-border bg-card px-6 py-12"
        >
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="num text-[24px] leading-8 sm:text-[32px] sm:leading-[40px]">
                  {f.value}
                </dd>
                <p className="mt-1 text-[14px] leading-5 text-ink-muted">{f.label}</p>
              </div>
            ))}
          </dl>
        </section>

        {/* Casos de exemplo (abas) */}
        <Section id="casos">
          <Heading
            eyebrow="Para quem é"
            title="Do jeito que você já vive o mês."
            desc="Três situações de exemplo. Os nomes e os valores são ilustrativos, não são clientes reais."
          />
          <div className="mt-10" role="tablist" aria-label="Casos de exemplo">
            <div className="flex flex-wrap gap-2">
              {cases.map((x, i) => (
                <button
                  key={x.tab}
                  role="tab"
                  aria-selected={tab === i}
                  onClick={() => setTab(i)}
                  className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold leading-[18px] ${
                    tab === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-strong bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {x.tab}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              className="mt-6 grid gap-8 rounded-xl border border-border bg-card p-6 md:grid-cols-2 md:p-10"
            >
              <div>
                <p className="text-[12px] leading-4 text-ink-muted">{c.who}</p>
                <h3 className="mt-3 text-balance font-display text-[28px] font-bold leading-[34px] tracking-[-0.5px]">
                  {c.title}
                </h3>
                <p className="mt-4 text-[15px] leading-[22px] text-ink-muted">{c.body}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-semibold leading-[18px] tracking-[0.2px] text-ink-muted">
                    Setembro de 2026
                  </p>
                  <ExampleTag />
                </div>
                <ul className="divide-y divide-border">
                  {c.rows.map((r) => (
                    <li key={r.label} className="flex items-center justify-between py-3">
                      <span className="text-[15px] leading-[22px]">{r.label}</span>
                      <Money cents={r.cents} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[15px] font-bold leading-[22px]">{c.note}</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Recursos: blocos alternados */}
        <Section id="recursos" className="border-t border-border bg-card">
          <Heading
            eyebrow="Recursos"
            title="Tudo do mês em uma lista só."
            desc="Lançamentos, contas a pagar, metas e gráficos, com o valor sempre primeiro."
          />
          <div className="mt-16 space-y-24">
            <FeatureRow
              eyebrow="Lançamentos"
              title="Registre o que entrou e o que saiu."
              desc="Valor, categoria, data e status. Você marca como pago quando pagar, e o saldo acompanha."
              points={[
                "Categorias prontas: Moradia, Alimentação, Transporte, Lazer, Saúde",
                "Crie e edite as suas",
                "Filtre por período, tipo, categoria e status",
              ]}
              visual={<LedgerPanel rows={sampleRows.slice(0, 4)} period="Setembro de 2026" />}
            />
            <FeatureRow
              flip
              eyebrow="Contas a pagar"
              title="Veja o que vence primeiro."
              desc="Vencimentos próximos e vencidos aparecem em destaque, sempre com a palavra, nunca só com a cor."
              points={[
                "Alertas de vencimento",
                "Calendário do mês",
                "Parcelas e faturas de cartão",
              ]}
              visual={<BillsVisual />}
            />
            <FeatureRow
              eyebrow="Metas"
              title="Guarde um pouco todo mês."
              desc="Defina a meta de economia e acompanhe o progresso sem cobrança nem bronca."
              points={[
                "Meta com valor e prazo",
                "Progresso sempre visível",
                "Aportes manuais quando quiser",
              ]}
              visual={<GoalVisual />}
            />
            <FeatureRow
              flip
              eyebrow="Gráficos"
              title="Entenda para onde o dinheiro foi."
              desc="Despesas por categoria e a evolução mensal de entradas e saídas, sempre com o período à vista."
              points={[
                "Rótulo direto nas barras",
                "Comparativo com o mês anterior",
                "Relatórios por categoria",
              ]}
              visual={<ChartVisual />}
            />
          </div>
        </Section>

        {/* Fita de lançamentos */}
        <section aria-hidden className="overflow-hidden border-y border-border py-6">
          <div className="flex w-max animate-[marquee_45s_linear_infinite] gap-4 px-2">
            {[...tickerRows, ...tickerRows].map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-[15px] font-bold leading-[22px]">{r.name}</p>
                  <p className="text-[12px] leading-4 text-ink-muted">{r.cat}</p>
                </div>
                <Money cents={r.cents} type={r.type} />
              </div>
            ))}
          </div>
        </section>

        {/* Mais recursos */}
        <Section>
          <Heading eyebrow="E ainda" title="Menos digitação, mais clareza." />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {moreFeatures.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6">
                <f.icon className="h-6 w-6 text-primary" strokeWidth={2} aria-hidden />
                <h3 className="mt-4 font-display text-[22px] font-bold leading-7">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-[22px] text-ink-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Como funciona */}
        <Section id="como-funciona" className="border-t border-border bg-card">
          <Heading eyebrow="Como funciona" title="Três passos, todo mês." />
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((st, i) => (
              <li key={st.title} className="rounded-xl border border-border bg-background p-6">
                <span className="num text-[18px] leading-6 text-primary">0{i + 1}</span>
                <h3 className="mt-3 font-display text-[22px] font-bold leading-7">{st.title}</h3>
                <p className="mt-2 text-[15px] leading-[22px] text-ink-muted">{st.desc}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Preços */}
        <Section id="precos">
          <Heading
            eyebrow="Preços"
            title="Comece grátis. Depois, um preço justo."
            desc="30 dias com todos os recursos liberados, sem cartão de crédito. Depois é só escolher o plano."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-xl border bg-card p-7 md:p-8 ${
                  p.highlight ? "border-2 border-primary" : "border-border"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[12px] font-semibold leading-4 text-on-accent">
                    Mais completo
                  </span>
                )}
                <p className="font-display text-[22px] font-bold leading-7">{p.name}</p>
                <p className="mt-1 text-[15px] leading-[22px] text-ink-muted">{p.desc}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-[14px] text-ink-muted">R$</span>
                  <span className="num text-[40px] leading-[44px]">{p.price}</span>
                  <span className="text-[14px] text-ink-muted">/mês</span>
                </p>
                <ul className="mt-7 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px] leading-[22px]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={p.href} className="mt-8 block">
                  <Button
                    className="w-full"
                    size="lg"
                    variant={p.highlight ? "default" : "outline"}
                  >
                    Começar teste grátis
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-[14px] text-ink-muted">
            <Lock className="h-4 w-4" aria-hidden />
            Sem fidelidade. Cancele quando quiser.
          </p>
        </Section>

        {/* Dúvidas */}
        <Section id="faq" className="border-t border-border">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <Heading
              eyebrow="Dúvidas"
              title="Perguntas frequentes"
              desc="Não encontrou o que procurava? Escreva para contato@finlist.app."
            />
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold leading-[22px]">
                    {f.q}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-3 text-[15px] leading-[22px] text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* Chamada final */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl rounded-xl bg-brand-deep px-8 py-16 text-center text-on-brand md:px-16 md:py-20">
            <h2 className="mx-auto max-w-3xl text-balance font-display text-[32px] font-bold leading-[38px] tracking-[-0.5px] md:text-[40px] md:leading-[46px]">
              Comece o próximo mês sabendo quanto vai sobrar.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-[26px] opacity-80">
              Crie sua conta em menos de um minuto e use tudo por 30 dias, de graça.
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-background px-6 text-[15px] font-bold text-foreground hover:bg-card"
            >
              Começar teste grátis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-5 text-ink-muted">
              Seu dinheiro, em ordem. FINLIST não é banco, corretora nem consultoria.
            </p>
          </div>
          <FooterCol
            title="Produto"
            links={[
              { to: "/#recursos", label: "Recursos" },
              { to: "/#como-funciona", label: "Como funciona" },
              { to: "/pricing", label: "Planos" },
            ]}
          />
          <FooterCol
            title="Conta"
            links={[
              { to: "/auth", label: "Entrar" },
              { to: "/auth", label: "Criar conta" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { to: "/terms", label: "Termos" },
              { to: "/privacy", label: "Privacidade" },
            ]}
          />
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-[12px] leading-4 text-ink-muted">
          © {new Date().getFullYear()} FINLIST. Valores e nomes de exemplo nesta página são
          ilustrativos.
        </p>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold leading-[18px] tracking-[0.2px]">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.to} className="text-[14px] leading-5 text-ink-muted hover:text-foreground">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
