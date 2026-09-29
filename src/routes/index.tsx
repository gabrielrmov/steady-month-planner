import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { CountUp } from "@/components/landing/CountUp";
import { Reveal } from "@/components/landing/motion";
import {
  useMediaQuery,
  useParallax,
  useScrollProgress,
  useScrolled,
  useSpotlight,
  useTilt,
} from "@/components/landing/use-scroll";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import {
  BrazilDots,
  DotBars,
  DotRoute,
  GlyphDots,
  LayerStack,
} from "@/components/landing/Halftone";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  FileUp,
  Landmark,
  ListChecks,
  Lock,
  Menu,
  X,
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
  { href: "#recursos", label: "Recursos", menu: true },
  { href: "#para-quem", label: "Para quem", menu: true },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "Dúvidas" },
];

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = { name: string; cat: string; cents: number; type: "in" | "out"; status: string };

const cases = [
  {
    tab: "Autônomo",
    lead: "Um designer que recebe por projeto",
    title: "Saber quanto entra",
    dim: "antes de o mês acabar.",
    chips: ["Lançamentos", "Recebimentos", "Saldo previsto"],
    caption:
      "Cada recebimento fica pendente até cair. O saldo previsto mostra o que sobra se tudo entrar como combinado.",
    label: "Saldo previsto",
    value: 278000,
    rows: [
      { n: "Projeto de logo", d: "Pendente", c: 90000 },
      { n: "Salário", d: "Recebido", c: 480000 },
    ],
  },
  {
    tab: "Família",
    lead: "Um casal com filhos e cartão",
    title: "Nenhuma conta esquecida",
    dim: "no meio do mês.",
    chips: ["Contas a pagar", "Cartões", "Calendário"],
    caption: "As contas fixas nascem prontas todo mês. O calendário mostra o que vence primeiro.",
    label: "A pagar neste mês",
    value: 318000,
    rows: [
      { n: "Internet", d: "Vence em 3 dias", c: 11990 },
      { n: "Aluguel", d: "Pago", c: 145000 },
    ],
  },
  {
    tab: "Pequeno negócio",
    lead: "Uma loja com poucos funcionários",
    title: "Gastos da empresa",
    dim: "separados dos pessoais.",
    chips: ["Precificação", "Impostos", "Metas"],
    caption: "Custo por hora, impostos e margem para precificar serviços, no plano Pessoal + PJ.",
    label: "Meta do mês",
    value: 80000,
    rows: [
      { n: "Reserva de emergência", d: "40% da meta", c: 80000 },
      { n: "Receitas do mês", d: "Setembro de 2026", c: 1850000 },
    ],
  },
];

const audiences = [
  "Autônomos e freelancers",
  "Famílias",
  "Pequenos negócios",
  "Quem sai da planilha",
];

const groups = [
  {
    title: "Lançamentos e contas do mês",
    items: [
      ["Entradas e saídas", ListChecks],
      ["Contas a pagar", CalendarDays],
      ["Recorrências", Repeat],
      ["Parcelas", CreditCard],
    ],
  },
  {
    title: "Para entender o dinheiro",
    items: [
      ["Relatórios por categoria", BarChart3],
      ["Metas de economia", PiggyBank],
      ["Regras de categorização", Wand2],
    ],
  },
  {
    title: "Para trazer o que já existe",
    items: [
      ["Extrato OFX e CSV", FileUp],
      ["Open Finance", Landmark],
    ],
  },
] as const;

const ruleLines = [
  ['se a descrição contém "ifood"', "categoria = Alimentação"],
  ['se a descrição contém "uber"', "categoria = Transporte"],
  ['se a descrição contém "aluguel"', "categoria = Moradia"],
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
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function Tag({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "blue" | "violet" | "cyan";
}) {
  const bg = {
    green: "bg-[#e3f1ee] text-[#167e6c]",
    blue: "bg-[#e6ecf7] text-[#1e4199]",
    violet: "bg-[#efe9fa] text-[#521fa7]",
    cyan: "bg-[#e0f2f6] text-[#0c6997]",
  }[tone];
  return (
    <span
      className={`inline-block rounded-sm px-2 py-1 font-mono text-[11px] uppercase leading-none tracking-[0.06em] ${bg}`}
    >
      {children}
    </span>
  );
}

/** Valor em reais que conta até o número final. */
function AnimMoney({ cents, className = "" }: { cents: number; className?: string }) {
  const v = useAnimatedNumber(cents, 1100);
  return <span className={className}>{brl(Math.round(v))}</span>;
}

/** Quebra o texto em palavras que entram uma a uma. Renderiza igual no servidor. */
function SplitWords({
  text,
  delay = 0,
  step = 55,
}: {
  text: string;
  delay?: number;
  step?: number;
}) {
  return (
    <>
      {text.split(" ").map((w, i, arr) => (
        <span key={i}>
          <span className="word" style={{ animationDelay: `${delay + i * step}ms` }}>
            {w}
          </span>
          {i < arr.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function ExampleNote({ className = "" }: { className?: string }) {
  return (
    <p className={`font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted ${className}`}>
      Exemplo ilustrativo
    </p>
  );
}

function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-6 md:px-16 ${className}`}>{children}</div>
  );
}

function HeroWidget() {
  return (
    <div className="w-[min(100%,340px)] rounded-lg bg-card p-3 shadow-[var(--shadow-widget)]">
      <div className="space-y-1 px-2 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] leading-4 text-ink-muted">Conta corrente</p>
            <AnimMoney cents={480000} className="num block text-[15px] leading-5" />
          </div>
          <p className="text-[11px] leading-4 text-ink-muted">Setembro de 2026</p>
        </div>
        <div className="flex items-start justify-between gap-3 pt-2">
          <div>
            <p className="text-[11px] leading-4 text-ink-muted">Reserva de emergência</p>
            <AnimMoney cents={80000} className="num block text-[15px] leading-5" />
          </div>
          <p className="text-[11px] leading-4 text-ink-muted">Meta</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-2 text-[11px] leading-4">
        <span className="flex items-center gap-1.5 text-positive">
          <Check className="h-3 w-3" aria-hidden />
          Guardado
        </span>
        <span className="text-ink-muted">Exemplo ilustrativo</span>
      </div>
      <pre className="mt-3 overflow-hidden rounded-md bg-muted p-3 font-mono text-[10.5px] leading-[1.5] text-ink-muted [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
        {`{
  `}
        <span className="text-[#167e6c]">"descricao"</span>
        {`: `}
        <span className="text-[#3f9a6b]">"Reserva do mês"</span>
        {`,
  `}
        <span className="text-[#167e6c]">"valor"</span>
        {`: `}
        <span className="text-[#9f7aee]">80000</span>
        {`,
  `}
        <span className="text-[#167e6c]">"tipo"</span>
        {`: `}
        <span className="text-[#3f9a6b]">"saida"</span>
        {`,
  `}
        <span className="text-[#167e6c]">"status"</span>
        {`: `}
        <span className="text-[#3f9a6b]">"pago"</span>
        {`,
  `}
        <span className="text-[#167e6c]">"categoria"</span>
        {`: `}
        <span className="text-[#3f9a6b]">"Metas"</span>
      </pre>
    </div>
  );
}

function LayeredAccounts({ c }: { c: (typeof cases)[number] }) {
  return (
    <div className="relative mx-auto h-[330px] w-full max-w-[400px]">
      <div
        className="animate-rise absolute inset-x-6 top-0 rounded-lg bg-card p-3 shadow-[var(--shadow-product)]"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-center justify-between text-[12px] leading-4 text-ink-muted">
          <span>{c.rows[0].n}</span>
          <span className="num">{brl(c.rows[0].c)}</span>
        </div>
      </div>
      <div
        className="animate-rise absolute inset-x-3 top-9 rounded-lg bg-card p-3 pb-8 shadow-[var(--shadow-product)]"
        style={{ animationDelay: "110ms" }}
      >
        <div className="flex items-center justify-between text-[12px] leading-4 text-ink-muted">
          <span>{c.rows[1].n}</span>
          <span className="num">{brl(c.rows[1].c)}</span>
        </div>
      </div>
      <div
        className="animate-rise absolute inset-x-0 top-[74px] rounded-lg bg-card p-3 shadow-[var(--shadow-widget)]"
        style={{ animationDelay: "220ms" }}
      >
        <div className="flex items-center justify-between text-[13px] font-medium leading-5">
          <span>{c.label}</span>
          <span className="text-ink-muted">•••• 0921</span>
        </div>
        <div className="mt-2 rounded-md bg-signal p-4 text-on-signal">
          <AnimMoney cents={c.value} className="num block text-[22px] leading-7" />
          <svg viewBox="0 0 240 70" className="mt-3 h-[70px] w-full" aria-hidden>
            <polyline
              pathLength={1}
              className="animate-draw"
              points="0,52 30,60 60,44 95,36 130,46 170,26 200,16 240,22"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="mt-2 px-1 text-[11px] leading-4 text-ink-muted">Exemplo ilustrativo</p>
      </div>
    </div>
  );
}

function Terminal({ lines }: { lines: (string | [string, string])[] }) {
  return (
    <pre className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-[#03202b] p-4 font-mono text-[12px] leading-[1.6] text-[#94efb7]">
      {lines.map((l, i) => {
        const last = i === lines.length - 1;
        const style = { "--d": `${300 + i * 420}ms` } as React.CSSProperties;
        return typeof l === "string" ? (
          <span
            key={i}
            className={`rc-type block text-[#eeeff2] ${last ? "caret" : ""}`}
            style={style}
          >
            {l}
          </span>
        ) : (
          <span key={i} className={`rc-type block ${last ? "caret" : ""}`} style={style}>
            <span className="text-[#9db5bd]">{l[0]}</span>{" "}
            <span className="text-[#eeeff2]">{l[1]}</span>
          </span>
        );
      })}
    </pre>
  );
}

function DarkFeature({
  title,
  desc,
  code,
  panel,
}: {
  title: string;
  desc: string;
  code: React.ReactNode;
  panel: React.ReactNode;
}) {
  return (
    <Reveal className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-16">
      <div className="min-w-0">
        <h3 className="text-[20px] font-medium leading-[26px] text-white">{title}</h3>
        <p className="mt-2 max-w-sm text-[14px] leading-[22px] text-[#a9b6bd]">{desc}</p>
        {code}
      </div>
      <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-6 md:p-8">
        {panel}
      </div>
    </Reveal>
  );
}

function PanelChips({ items, active }: { items: string[]; active: number }) {
  return (
    <div
      className="mt-8 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((t, i) => (
        <div
          key={t}
          style={{ "--d": `${500 + i * 90}ms` } as React.CSSProperties}
          className={`rc rc-pop rounded-md border px-3 py-2 text-[12px] leading-4 ${i === active ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-[#a9b6bd]"}`}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

function MiniRow({ n, d, v, i = 0 }: { n: string; d: string; v: string; i?: number }) {
  return (
    <div
      className="rc flex items-center justify-between rounded-md bg-white/[0.06] px-4 py-3 text-white transition-colors duration-200 hover:bg-white/10"
      style={{ "--d": `${250 + i * 110}ms` } as React.CSSProperties}
    >
      <div>
        <p className="text-[13px] leading-5">{n}</p>
        <p className="text-[11px] leading-4 text-[#a9b6bd]">{d}</p>
      </div>
      <span className="num text-[14px]">{v}</span>
    </div>
  );
}

function Landing() {
  const [tab, setTab] = useState(0);
  const [aud, setAud] = useState(0);
  const [menu, setMenu] = useState(false);
  const scrolled = useScrolled();
  const progressRef = useScrollProgress<HTMLDivElement>();
  const tiltRef = useTilt<HTMLDivElement>(8);
  const stackRef = useParallax<HTMLDivElement>(-0.05, 36);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  useSpotlight();
  const mapRef = useParallax<HTMLDivElement>(-0.08, 80);
  const c = cases[tab];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#recursos"
        className="animate-fade-in block bg-[#4b5bb4] px-6 py-2.5 text-center text-[13px] leading-[18px] text-white transition-colors hover:bg-[#4453a8]"
      >
        <span className="font-medium">Novo: metas de economia com progresso mensal.</span>{" "}
        <span className="opacity-80">Veja como funciona</span> <span aria-hidden>›</span>
      </a>

      <header
        className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
          scrolled
            ? "border-b border-border bg-background/95 shadow-[var(--shadow-card)] md:bg-background/90 md:backdrop-blur-md"
            : "border-b border-transparent bg-background/80 md:bg-background/60 md:backdrop-blur-md"
        }`}
      >
        <div
          ref={progressRef}
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary"
        />
        <Wrap className="flex h-[62px] items-center justify-between gap-4">
          <Link to="/" aria-label="FINLIST" className="flex min-h-11 items-center">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="nav-link flex items-center gap-1 rounded-lg px-3 py-1.5 text-[14px] leading-5 text-foreground transition-colors duration-200 hover:bg-white/80"
              >
                {l.label}
                {l.menu && <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white bg-white/60 active:scale-95 md:hidden"
            >
              {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link to="/auth" className="hidden px-3 text-[14px] sm:block">
              Entrar
            </Link>
            <Link
              to="/auth"
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white bg-white/60 px-3.5 text-[14px] leading-5 active:scale-95 md:backdrop-blur-sm"
            >
              Começar agora <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </Wrap>
        {menu && (
          <nav
            aria-label="Menu"
            className="animate-rise border-t border-border bg-background px-6 pb-4 pt-2 md:hidden"
          >
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenu(false)}
                className="block border-b border-border py-3.5 text-[16px] leading-6 active:bg-muted last:border-b-0"
              >
                {l.label}
              </a>
            ))}
            <Link to="/auth" className="mt-3 block py-2 text-[16px] leading-6">
              Entrar
            </Link>
          </nav>
        )}
      </header>

      <main>
        {/* Herói */}
        <section className="relative overflow-hidden pb-24 pt-10 md:pb-32 md:pt-16">
          <div
            aria-hidden
            ref={mapRef}
            className="pointer-events-none absolute -right-[8%] top-0 hidden h-[125%] w-[68%] will-change-transform lg:block"
          >
            {isDesktop && (
              <>
                <BrazilDots className="absolute inset-0 h-full w-full" />
                <DotRoute
                  from={[-60.0, -3.1]}
                  to={[-46.6, -23.5]}
                  className="absolute inset-0 h-full w-full"
                />
              </>
            )}
          </div>
          <Wrap className="relative">
            <p className="animate-rise inline-flex items-center gap-2 rounded-lg border border-white bg-white/80 px-3 py-1.5 text-[12px] leading-4 text-ink-muted shadow-[var(--shadow-card)] backdrop-blur-sm">
              <span className="font-semibold text-foreground">FINLIST</span> 30 dias grátis, sem
              cartão
            </p>
            <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
              <div>
                <h1
                  className="text-balance font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px]"
                  aria-label="Organize, acompanhe e planeje o dinheiro do mês."
                >
                  <SplitWords text="Organize, acompanhe e planeje o dinheiro do mês." delay={80} />
                </h1>
                <p
                  className="animate-rise mt-5 max-w-md text-[17px] leading-[26px] text-foreground/90"
                  style={{ animationDelay: "180ms" }}
                >
                  Contas a pagar, entradas, cartões e metas em uma lista só. Para quem hoje se vira
                  com planilhas e extratos soltos.
                </p>
                <div
                  className="animate-rise mt-7 flex flex-wrap gap-3"
                  style={{ animationDelay: "270ms" }}
                >
                  <Link to="/auth">
                    <Button size="lg">
                      Começar teste grátis <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#recursos">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white bg-white/60 text-foreground shadow-[var(--shadow-card)] hover:bg-white"
                    >
                      Ver recursos
                    </Button>
                  </a>
                </div>
              </div>
              <div
                className="animate-rise flex justify-center lg:justify-start lg:pl-16 lg:pt-14"
                style={{ animationDelay: "420ms" }}
              >
                <div className="animate-float">
                  <div ref={tiltRef} className="will-change-transform">
                    <HeroWidget />
                  </div>
                </div>
              </div>
            </div>
          </Wrap>
        </section>

        {/* Números */}
        <Wrap className="grid grid-cols-2 gap-x-8 gap-y-10 pb-24 lg:grid-cols-4">
          {[
            [<CountUp key="a" to={30} suffix=" dias" />, "de teste com tudo liberado"],
            [<CountUp key="b" to={19} prefix="R$ " />, "por mês no plano Pessoal"],
            ["OFX e CSV", "para importar o extrato do banco"],
            ["Sem fidelidade", "cancele quando quiser"],
          ].map(([v, l], i) => (
            <Reveal key={l as string} delay={i * 90}>
              <p className="text-[28px] font-medium leading-[1.1] tracking-[-0.01em] text-positive">
                {v}
              </p>
              <p className="mt-2 max-w-[200px] text-[14px] leading-5 text-ink-muted">{l}</p>
            </Reveal>
          ))}
        </Wrap>

        {/* Confiança */}
        <section className="relative overflow-hidden pb-20 md:pb-28">
          <Wrap className="relative grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Tag>Tudo em ordem</Tag>
              <h2 className="mt-6 max-w-lg text-balance font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[32px]">
                Cada conta do mês no lugar dela{" "}
                <span className="text-[#7c7f88]">
                  para você ver o que entrou, o que saiu e quanto sobra.
                </span>
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-[22px] text-ink-muted">
                Nada de vender ou compartilhar seus dados. Cada conta só acessa o que é dela, com
                regras de segurança aplicadas direto no banco de dados.
              </p>
              <a
                href="#recursos"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-[14px] leading-5 shadow-[var(--shadow-card)]"
              >
                Conheça os recursos <span aria-hidden>›</span>
              </a>
            </Reveal>
            <Reveal className="relative" delay={150}>
              <DotBars className="w-full" lite={!isDesktop} />
              <ExampleNote className="absolute bottom-0 right-0" />
            </Reveal>
          </Wrap>
        </section>

        {/* Casos, com abas */}
        <section className="scroll-mt-20 pb-20 md:pb-28" id="para-quem">
          <Wrap>
            <Reveal className="overflow-hidden rounded-lg bg-card shadow-[var(--shadow-card)]">
              <div
                role="tablist"
                aria-label="Exemplos"
                className="relative grid grid-cols-3 gap-3 p-3 sm:p-5"
              >
                <span
                  aria-hidden
                  className="absolute bottom-3 left-3 top-3 w-[calc((100%-24px-24px)/3)] rounded-lg bg-signal shadow-[var(--shadow-btn)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-5 sm:left-5 sm:top-5 sm:w-[calc((100%-40px-24px)/3)]"
                  style={{ transform: `translateX(calc(${tab} * (100% + 12px)))` }}
                />
                {cases.map((x, i) => (
                  <button
                    key={x.tab}
                    role="tab"
                    aria-selected={tab === i}
                    onClick={() => setTab(i)}
                    className={`relative z-10 min-h-12 rounded-lg px-2 py-3 text-[13px] font-medium leading-5 transition-colors duration-300 active:scale-[0.98] sm:px-3 sm:py-4 sm:text-[14px] ${
                      tab === i ? "text-on-signal" : "text-ink-muted hover:text-foreground"
                    }`}
                  >
                    {x.tab}
                  </button>
                ))}
              </div>
              <div
                key={tab}
                role="tabpanel"
                className="animate-fade-in grid items-center gap-10 px-6 pb-12 pt-6 md:grid-cols-2 md:px-14"
              >
                <div>
                  <h3 className="text-balance font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[30px]">
                    {c.title} <span className="text-[#7c7f88]">{c.dim}</span>
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {c.chips.map((t, ci) => (
                      <span
                        key={t}
                        style={{ animationDelay: `${120 + ci * 70}ms` }}
                        className="animate-rise rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] leading-[18px] shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="mt-10 max-w-sm text-[15px] leading-[22px]">{c.caption}</p>
                  <p className="mt-4 text-[14px] leading-5 text-ink-muted">
                    {c.lead}. Nome e valores fictícios.
                  </p>
                </div>
                <LayeredAccounts c={c} />
              </div>
            </Reveal>
          </Wrap>
        </section>

        {/* Feito para organizar */}
        <section id="recursos" className="scroll-mt-20 pb-20 md:pb-28">
          <Wrap className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="rounded-lg bg-[#eeeff2] p-3 sm:p-5">
              <div className="rounded-lg bg-card p-5 shadow-[var(--shadow-product)]">
                <p className="num text-[22px] leading-7">R$ 119,90</p>
                <p className="mt-1 text-[12px] leading-4 text-ink-muted">
                  Internet · Conta a pagar · Vence em 3 dias
                </p>
                <div className="mt-6 h-1 rounded-full bg-muted">
                  <div className="h-1 w-[22%] rounded-full bg-[#44b48b]" />
                </div>
                <div className="mt-2 flex justify-between text-[12px] leading-4">
                  <span>Setembro de 2026</span>
                  <span className="text-ink-muted">Pendente</span>
                </div>
              </div>
              <div className="mt-3 rounded-md px-3 py-3 font-mono text-[11.5px] leading-[1.7] text-ink-muted">
                <p className="mb-1 uppercase tracking-[0.06em]">Regras de categorização</p>
                {ruleLines.map(([a, b]) => (
                  <p key={a}>
                    <span className="text-[#167e6c]">{a}</span> →{" "}
                    <span className="text-foreground">{b}</span>
                  </p>
                ))}
              </div>
            </Reveal>
            <Reveal delay={140}>
              <Tag tone="blue">Feito para o dia a dia</Tag>
              <h2 className="mt-6 text-balance font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[36px]">
                A lista que você fazia na planilha, sem o trabalho de manter.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-[22px] text-ink-muted">
                Cadastre uma vez o que se repete. O mês seguinte já nasce pronto, e as regras de
                categorização arrumam o resto.
              </p>
              <Link
                to="/auth"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-[14px] leading-5 shadow-[var(--shadow-card)]"
              >
                Testar grátis <span aria-hidden>›</span>
              </Link>
              <div className="mt-12 grid gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="text-[15px] font-medium leading-[22px]">Sem julgamento</h3>
                  <p className="mt-2 text-[14px] leading-5 text-ink-muted">
                    FINLIST mostra o que aconteceu com o dinheiro. Não dá bronca nem promete
                    enriquecer ninguém.
                  </p>
                </div>
                <div>
                  <h3 className="text-[15px] font-medium leading-[22px]">Do seu tamanho</h3>
                  <p className="mt-2 text-[14px] leading-5 text-ink-muted">
                    Serve para a conta da casa e para quem também tem empresa. Você escolhe o plano.
                  </p>
                </div>
              </div>
            </Reveal>
          </Wrap>
        </section>

        {/* Seção escura */}
        <section className="px-2 pb-24 sm:px-2.5">
          <div className="rounded-lg bg-[#011821] px-6 py-20 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px] md:py-28">
            <Wrap className="!px-0 md:!px-16">
              <Reveal className="grid items-center gap-10 md:grid-cols-2">
                <div>
                  <span className="inline-block rounded-sm bg-[#0c3242] px-2 py-1 font-mono text-[11px] uppercase leading-none tracking-[0.06em] text-[#88deeb]">
                    Recursos
                  </span>
                  <h2 className="mt-6 text-balance font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#88deeb] sm:text-[44px]">
                    Blocos que se encaixam no seu mês
                  </h2>
                  <p className="mt-6 max-w-md text-[14px] leading-[22px] text-[#a9b6bd]">
                    Comece pelo básico e vá ligando o que faz sentido para você: lançamentos, contas
                    a pagar, regras, extrato e metas. Nada é obrigatório.
                  </p>
                </div>
                <div ref={stackRef} className="will-change-transform">
                  <LayerStack className="w-full" />
                </div>
              </Reveal>

              <div className="mt-24 space-y-24">
                <DarkFeature
                  title="Lançamentos"
                  desc="Valor, categoria, data e status. Marque como pago quando pagar e o saldo acompanha."
                  code={
                    <Terminal
                      lines={[
                        ["aluguel", "- R$ 1.450,00  pago"],
                        ["internet", "- R$ 119,90  vence em 3 dias"],
                        ["salário", "+ R$ 4.800,00  recebido"],
                      ]}
                    />
                  }
                  panel={
                    <>
                      <div className="space-y-2">
                        <MiniRow n="Salário" d="Recebido" v="+ R$ 4.800,00" i={0} />
                        <MiniRow n="Aluguel" d="Pago" v="- R$ 1.450,00" i={1} />
                        <MiniRow n="Internet" d="Vence em 3 dias" v="- R$ 119,90" i={2} />
                      </div>
                      <PanelChips items={["Entradas", "Saídas", "Recorrentes"]} active={0} />
                    </>
                  }
                />
                <DarkFeature
                  title="Regras de categorização"
                  desc="Diga uma vez que “iFood” é alimentação e nunca mais repita."
                  code={
                    <Terminal
                      lines={ruleLines.map(([a, b]) => [a, `→ ${b}`] as [string, string])}
                    />
                  }
                  panel={
                    <>
                      <div className="space-y-2">
                        <MiniRow n="iFood · pedido" d="Alimentação" v="- R$ 62,40" i={0} />
                        <MiniRow n="Uber · corrida" d="Transporte" v="- R$ 21,00" i={1} />
                      </div>
                      <PanelChips items={["Regras", "Categorias"]} active={0} />
                    </>
                  }
                />
                <DarkFeature
                  title="Extrato do banco"
                  desc="Traga o OFX ou o CSV em vez de digitar tudo. Com Open Finance, conecte a conta e acompanhe os lançamentos."
                  code={
                    <Terminal
                      lines={[
                        ["arquivo", "extrato-setembro.ofx"],
                        ["formato", "OFX"],
                        ["lançamentos", "42 encontrados"],
                      ]}
                    />
                  }
                  panel={
                    <>
                      <div className="space-y-2">
                        <MiniRow
                          n="extrato-setembro.ofx"
                          d="OFX · 42 lançamentos"
                          v="Importar"
                          i={0}
                        />
                        <MiniRow n="Conta conectada" d="Open Finance" v="Sincronizada" i={1} />
                      </div>
                      <PanelChips items={["OFX", "CSV", "Open Finance"]} active={0} />
                    </>
                  }
                />
                <DarkFeature
                  title="Metas de economia"
                  desc="Defina o valor e o prazo. O progresso fica sempre à vista, sem cobrança."
                  code={
                    <Terminal
                      lines={[
                        ["meta", "Reserva de emergência"],
                        ["alvo", "R$ 2.000,00"],
                        ["guardado", "R$ 800,00 (40%)"],
                      ]}
                    />
                  }
                  panel={
                    <>
                      <div className="rounded-md bg-white/[0.06] p-4 text-white">
                        <p className="text-[12px] text-[#a9b6bd]">Reserva de emergência</p>
                        <p className="num mt-1 text-[24px] leading-8">R$ 800,00</p>
                        <div className="mt-4 h-1.5 rounded-full bg-white/10">
                          <div className="h-1.5 w-[40%] rounded-full bg-[#44b48b]" />
                        </div>
                        <p className="mt-2 text-[12px] text-[#a9b6bd]">▲ 40% de R$ 2.000,00</p>
                      </div>
                      <PanelChips items={["Metas", "Progresso"]} active={0} />
                    </>
                  }
                />
              </div>
              <ExampleNote className="mt-12 !text-[#a9b6bd]" />
            </Wrap>
          </div>
        </section>

        {/* Para quem */}
        <section className="pb-20 md:pb-28">
          <Wrap className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <Tag tone="blue">FINLIST para</Tag>
              <ul className="relative mt-6">
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-16 rounded-lg bg-card shadow-[var(--shadow-product)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[68px]"
                  style={{ transform: `translateY(${aud * 100}%)` }}
                />
                {audiences.map((a, i) => (
                  <li key={a}>
                    <button
                      onClick={() => setAud(i)}
                      className={`relative z-10 flex h-16 w-full items-center rounded-lg px-4 text-left font-display text-[22px] font-medium leading-[1.2] tracking-[-0.02em] transition-colors duration-300 sm:h-[68px] sm:text-[34px] ${
                        aud === i ? "text-[#023247]" : "text-[#a9acb6] hover:text-[#7c7f88]"
                      }`}
                    >
                      {a}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-8 max-w-md text-[14px] leading-[22px]">
                Se hoje o seu controle está em planilhas, cadernos e extratos soltos, a FINLIST
                junta tudo no mesmo lugar. Serve tanto para a conta da casa quanto para quem também
                tem empresa e precisa precificar serviços.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <div key={aud} className="animate-fade-in">
                <GlyphDots className="mx-auto w-full max-w-[460px]" lite={!isDesktop} />
              </div>
            </Reveal>
          </Wrap>
        </section>

        {/* Elementos */}
        <section className="pb-20 md:pb-28">
          <Wrap>
            <Tag tone="violet">Recursos</Tag>
            <h2 className="mt-6 max-w-2xl text-balance font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#2a1a63] sm:text-[44px]">
              Tudo o que entra no seu mês
            </h2>
            <div className="mt-10 border-t border-border">
              {groups.map((g, gi) => (
                <Reveal
                  key={g.title}
                  delay={gi * 90}
                  className="grid gap-4 border-b border-transparent py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]"
                >
                  <h3 className="max-w-[240px] text-[16px] font-medium leading-[22px]">
                    {g.title}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map(([label, Icon], ii) => (
                      <div
                        key={label}
                        style={{ "--d": `${150 + ii * 80}ms` } as React.CSSProperties}
                        className="rc group spotlight flex items-center gap-3 rounded-md bg-[#eeeff2] px-3 py-2.5 text-[14px] leading-5 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-card shadow-[var(--shadow-card)] transition-transform duration-200 group-hover:scale-110">
                          <Icon
                            className="h-3.5 w-3.5 text-[#1e4199]"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </Wrap>
        </section>

        {/* Preços */}
        <section id="precos" className="scroll-mt-20 bg-card py-16 md:py-24">
          <Wrap>
            <Reveal>
              <Tag tone="cyan">Preços</Tag>
              <h2 className="mt-6 max-w-xl text-balance font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[36px]">
                Comece grátis.{" "}
                <span className="text-[#7c7f88]">Depois, um preço fixo por mês.</span>
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {plans.map((p, pi) => (
                <Reveal
                  key={p.name}
                  delay={pi * 120}
                  className={`spotlight flex flex-col rounded-lg bg-card p-7 hover:-translate-y-1 hover:shadow-[var(--shadow-product)] md:p-8 ${p.highlight ? "shadow-[var(--shadow-product)] ring-1 ring-primary" : "shadow-[var(--shadow-card)]"}`}
                >
                  <p className="text-[18px] font-medium leading-6">{p.name}</p>
                  <p className="mt-1 text-[14px] leading-5 text-ink-muted">{p.desc}</p>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-[14px] text-ink-muted">R$</span>
                    <span className="text-[44px] font-medium leading-[48px] tracking-[-0.02em]">
                      {p.price}
                    </span>
                    <span className="text-[14px] text-ink-muted">/mês</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {p.features.map((f, fi) => (
                      <li
                        key={f}
                        className="rc flex items-start gap-3 text-[14px] leading-5"
                        style={{ "--d": `${250 + fi * 80}ms` } as React.CSSProperties}
                      >
                        <Check
                          className="rc rc-pop mt-0.5 h-4 w-4 shrink-0 text-positive"
                          style={{ "--d": `${330 + fi * 80}ms` } as React.CSSProperties}
                          aria-hidden
                        />
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
                </Reveal>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 text-[13px] text-ink-muted">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Sem fidelidade. Cancele quando quiser.
            </p>
          </Wrap>
        </section>

        {/* Dúvidas */}
        <section id="faq" className="scroll-mt-20 py-16 md:py-24">
          <Wrap className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr]">
            <Reveal>
              <Tag>Dúvidas</Tag>
              <h2 className="mt-6 font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[36px]">
                Perguntas frequentes
              </h2>
              <p className="mt-4 max-w-xs text-[14px] leading-5 text-ink-muted">
                Não achou o que procurava? Escreva para contato@finlist.app.
              </p>
            </Reveal>
            <Reveal delay={120} className="divide-y divide-border border-y border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-medium leading-6 transition-colors hover:text-primary active:text-primary">
                    {f.q}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-3 max-w-xl text-[14px] leading-[22px] text-ink-muted group-open:animate-rise mb-5">
                    {f.a}
                  </p>
                </details>
              ))}
            </Reveal>
          </Wrap>
        </section>

        {/* Chamada final */}
        <section className="px-2 pb-2 sm:px-2.5">
          <div className="rounded-lg bg-[#eeeff2] py-20">
            <Wrap>
              <Reveal>
                <h2 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
                  Comece hoje mesmo
                </h2>
                <p className="mt-2 text-[16px] leading-6 text-ink-muted">
                  Crie a sua conta em menos de um minuto e use tudo por 30 dias.
                </p>
              </Reveal>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  ["Testar grátis", "Crie a conta e cadastre o primeiro lançamento.", "/auth"],
                  ["Ver os planos", "Pessoal ou Pessoal + PJ, sem fidelidade.", "/pricing"],
                  [
                    "Falar com a gente",
                    "Uma dúvida antes de começar? Escreva.",
                    "mailto:contato@finlist.app",
                  ],
                ].map(([t, d, href], i) => (
                  <Reveal key={t} delay={i * 100}>
                    <a
                      href={href}
                      className="group spotlight block rounded-lg bg-card p-5 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-product)]"
                    >
                      <p className="flex items-center justify-between text-[16px] font-medium leading-6">
                        {t}
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden
                        />
                      </p>
                      <p className="mt-2 text-[14px] leading-5 text-ink-muted">{d}</p>
                    </a>
                  </Reveal>
                ))}
              </div>
            </Wrap>
          </div>
        </section>
      </main>

      <footer className="px-6 py-12">
        <Reveal>
          <Wrap className="flex flex-col justify-between gap-8 !px-0 md:flex-row md:!px-16">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-[13px] leading-5 text-ink-muted">
                Seu dinheiro, em ordem. FINLIST não é banco, corretora nem consultoria.
              </p>
            </div>
            <div className="flex gap-12 text-[14px] leading-5">
              <ul className="space-y-2">
                <li>
                  <Link to="/pricing">Planos</Link>
                </li>
                <li>
                  <Link to="/auth">Entrar</Link>
                </li>
              </ul>
              <ul className="space-y-2">
                <li>
                  <Link to="/terms">Termos</Link>
                </li>
                <li>
                  <Link to="/privacy">Privacidade</Link>
                </li>
              </ul>
            </div>
          </Wrap>
          <Wrap className="mt-8 !px-0 md:!px-16">
            <p className="text-[12px] leading-4 text-ink-muted">
              © {new Date().getFullYear()} FINLIST. Valores e nomes de exemplo nesta página são
              ilustrativos.
            </p>
          </Wrap>
        </Reveal>
      </footer>
    </div>
  );
}
