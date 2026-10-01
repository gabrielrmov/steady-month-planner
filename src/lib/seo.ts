/**
 * SEO central: metas, canonical, Open Graph e Schema.org (JSON-LD) de todas as páginas públicas.
 *
 * Endereço atual: Render. Ao ligar um domínio próprio, troque SITE_URL aqui, as URLs dos três arquivos
 * estáticos em /public (robots.txt, sitemap.xml e llms.txt), que não podem importar este módulo,
 * e a variável APP_URL no Render (e o redirecionamento no Google Cloud).
 */

export const SITE_URL = "https://finlist.onrender.com";
export const SITE_NAME = "FINLIST";
export const CONTACT_EMAIL = "contato@finlist.app";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const LOGO_URL = `${SITE_URL}/icon.svg`;

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#software`;

export const absolute = (path: string) => `${SITE_URL}${path === "/" ? "/" : path}`;

type JsonLd = Record<string, unknown>;

type SeoOptions = {
  title: string;
  description: string;
  /** Caminho canônico, sempre relativo ao domínio (ex.: "/pricing"). */
  path: string;
  /** Páginas sem valor de busca (login, app): noindex, mas seguem os links. */
  noindex?: boolean;
  ogType?: "website" | "article";
  /** Um ou mais objetos Schema.org, publicados num único bloco @graph. */
  jsonLd?: JsonLd[];
};

/** Monta meta, link e scripts de uma rota. Uso: `head: () => seo({ ... })`. */
export function seo({ title, description, path, noindex, ogType = "website", jsonLd }: SeoOptions) {
  const url = absolute(path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: noindex
          ? "noindex, follow"
          : "index, follow, max-image-preview:large, max-snippet:-1",
      },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:type", content: ogType },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "FINLIST: seu dinheiro, em ordem." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts:
      jsonLd && jsonLd.length > 0
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLd }),
            },
          ]
        : [],
  };
}

/* ------------------------------------------------------------------ */
/* Blocos Schema.org reutilizáveis                                     */
/* ------------------------------------------------------------------ */

export const organizationLd = (): JsonLd => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: { "@type": "ImageObject", url: LOGO_URL },
  email: CONTACT_EMAIL,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: CONTACT_EMAIL,
    availableLanguage: ["pt-BR"],
  },
});

export const websiteLd = (): JsonLd => ({
  "@type": "WebSite",
  "@id": SITE_ID,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  inLanguage: "pt-BR",
  publisher: { "@id": ORG_ID },
});

const offer = (name: string, price: string, description: string, path = "/pricing"): JsonLd => ({
  "@type": "Offer",
  name,
  price,
  priceCurrency: "BRL",
  description,
  url: absolute(path),
  availability: "https://schema.org/InStock",
});

/** Aplicativo e seus planos. Só preços e recursos que existem de fato no produto. */
export const softwareLd = (): JsonLd => ({
  "@type": "SoftwareApplication",
  "@id": APP_ID,
  name: SITE_NAME,
  description:
    "Dashboard de gestão financeira com checklist mensal de contas a pagar, entradas, cartões, parcelas, metas de economia e relatórios, para pessoa física e PJ.",
  url: `${SITE_URL}/`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  publisher: { "@id": ORG_ID },
  featureList: [
    "Checklist mensal de contas a pagar e receber",
    "Cartões de crédito, faturas e parcelamentos",
    "Calendário de vencimentos e alertas",
    "Metas de economia com progresso",
    "Relatórios por categoria",
    "Importação de extratos OFX e CSV",
    "Regras de categorização automática",
    "Precificação de serviços para PJ",
  ],
  offers: [
    offer("Teste grátis", "0", "30 dias com todos os recursos, sem cartão de crédito."),
    offer("Pessoal (PF)", "19", "R$ 19 por mês. Finanças pessoais, sem fidelidade."),
    offer("Pessoal + PJ", "39", "R$ 39 por mês. Inclui precificação de serviços, sem fidelidade."),
  ],
});

export const faqLd = (items: { q: string; a: string }[]): JsonLd => ({
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export const breadcrumbLd = (items: { name: string; path: string }[]): JsonLd => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: absolute(it.path),
  })),
});

export const webPageLd = (opts: {
  path: string;
  name: string;
  description: string;
  type?: "WebPage" | "AboutPage" | "ContactPage";
}): JsonLd => ({
  "@type": opts.type ?? "WebPage",
  "@id": `${absolute(opts.path)}#webpage`,
  url: absolute(opts.path),
  name: opts.name,
  description: opts.description,
  inLanguage: "pt-BR",
  isPartOf: { "@id": SITE_ID },
  publisher: { "@id": ORG_ID },
});
