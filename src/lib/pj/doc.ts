/**
 * Documentos (proposta e contrato) como dados + um renderizador em React.
 * Todo texto entra como filho de elemento (nunca como HTML), então o que o usuário digitar vira texto na
 * tela, no PDF e na página pública do cliente. Sem JSX e sem imports do app para rodar no teste do Node.
 */
import { createElement as h, Fragment, type ReactNode } from "react";
import { brl, dateBR } from "./format.ts";
import { safeHttpUrl, safeLogo } from "./safe.ts";

export type DocBlock =
  | { t: "header"; logo: string; name: string; lines: string[] }
  | { t: "hero"; kicker: string; title: string; meta: { label: string; value: string }[] }
  | { t: "heading"; text: string }
  | { t: "title"; text: string; muted?: boolean }
  | { t: "p"; text: string }
  | { t: "party"; label: string; text: string }
  | { t: "ul"; items: string[] }
  | { t: "invest"; total: string; terms: string; pix: string }
  | { t: "note"; text: string }
  | { t: "accept"; left: string; right: string }
  | { t: "sign"; labels: string[] };

export type Brand = {
  name?: string;
  logo?: string;
  doc?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pix?: string;
};

export { safeHttpUrl, safeLogo };

export type ProposalData = {
  title?: string | null;
  proposal_date?: string | null;
  validity?: string | null;
  client_name?: string | null;
  company?: string | null;
  intro?: string | null;
  scope_of_work?: string | null;
  deliverables?: string | null;
  timeline?: string | null;
  price?: number | null;
  payment_terms?: string | null;
  notes?: string | null;
};

const lines = (s: string | null | undefined) =>
  String(s ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

export type ProposalOptions = {
  /** Número exibido (ex.: PROP-20261023-AB12). */
  number?: string;
  /** Na página do cliente não há linha de assinatura: ele aprova pelos botões. */
  web?: boolean;
};

export function proposalBlocks(
  d: ProposalData,
  brand: Brand = {},
  opts: ProposalOptions = {},
): DocBlock[] {
  const who =
    [d.client_name, d.company].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ") ||
    "Cliente";
  const out: DocBlock[] = [
    {
      t: "header",
      logo: safeLogo(brand.logo),
      name: brand.name || "Sua empresa",
      lines: [brand.doc, brand.address, brand.city, brand.phone, brand.email].filter(
        (x): x is string => !!x,
      ),
    },
    {
      t: "hero",
      kicker: "PROPOSTA COMERCIAL",
      title: d.title || "Proposta Comercial",
      meta: [
        { label: "Para", value: who },
        { label: "Data", value: dateBR(d.proposal_date) },
        { label: "Válida por", value: d.validity ?? "" },
        { label: "Nº", value: opts.number ?? "" },
      ].filter((m) => m.value),
    },
  ];
  if (d.intro) out.push({ t: "p", text: d.intro });
  else if (d.client_name) out.push({ t: "p", text: `Olá, ${d.client_name}.` });
  if (d.scope_of_work)
    out.push({ t: "heading", text: "Escopo" }, { t: "p", text: d.scope_of_work });
  if (lines(d.deliverables).length)
    out.push(
      { t: "heading", text: "O que está incluído" },
      { t: "ul", items: lines(d.deliverables) },
    );
  if (d.timeline) out.push({ t: "heading", text: "Prazos" }, { t: "p", text: d.timeline });
  out.push(
    { t: "heading", text: "Investimento" },
    { t: "invest", total: brl(d.price), terms: d.payment_terms ?? "", pix: brand.pix ?? "" },
  );
  if (d.notes) out.push({ t: "heading", text: "Condições" }, { t: "p", text: d.notes });
  if (!opts.web)
    out.push({
      t: "accept",
      left: brand.name || "Contratada",
      right: d.company || d.client_name || "Contratante",
    });
  const foot = [brand.name, brand.doc, brand.phone, brand.email].filter(Boolean).join(" · ");
  if (foot) out.push({ t: "note", text: foot });
  return out;
}

export type ContractData = {
  contract_type?: string | null;
  client_name?: string | null;
  client_doc?: string | null;
  client_address?: string | null;
  representative?: string | null;
  object?: string | null;
  deliverables?: string | null;
  value?: number | null;
  payment_terms?: string | null;
  term?: string | null;
  revisions?: number | null;
  cancel_fee?: string | null;
  contract_date?: string | null;
};

export type Issuer = {
  full_name?: string | null;
  company?: string | null;
  doc?: string | null;
  address?: string | null;
  city?: string | null;
  pix?: string | null;
};

export const CONTRACT_TITLES: Record<string, string> = {
  pontual: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS",
  mensal: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS RECORRENTES",
  terceirizado: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS TERCEIRIZADOS",
  imagem: "TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM",
};

export function contractBlocks(d: ContractData, me: Issuer): DocBlock[] {
  const type = d.contract_type && CONTRACT_TITLES[d.contract_type] ? d.contract_type : "pontual";
  const image = type === "imagem";
  const rec = type === "mensal";
  const issuer = me.company || me.full_name || "[seus dados]";
  const date = dateBR(d.contract_date);
  const blocks: DocBlock[] = [
    { t: "title", text: CONTRACT_TITLES[type] },
    {
      t: "title",
      text: "Modelo-base. Não substitui revisão jurídica individualizada.",
      muted: true,
    },
    {
      t: "party",
      label: image ? "AUTORIZADO (produtor):" : "CONTRATADA:",
      text: `${issuer}, inscrita no CPF/CNPJ sob nº ${me.doc || "[__]"}, com sede em ${me.address || me.city || "[endereço]"}.`,
    },
    {
      t: "party",
      label: image ? "AUTORIZANTE:" : "CONTRATANTE:",
      text: `${d.client_name || "[nome]"}, inscrito(a) no CPF/CNPJ sob nº ${d.client_doc || "[__]"}, com endereço em ${
        d.client_address || "[endereço]"
      }${d.representative ? `, representado(a) por ${d.representative}` : ""}.`,
    },
  ];
  if (image) {
    blocks.push(
      { t: "heading", text: "1. Autorização" },
      {
        t: "p",
        text: `O(a) AUTORIZANTE autoriza, de forma gratuita, o uso de sua imagem e voz captadas em ${date}, para ${
          d.object || "o projeto descrito"
        }, em redes sociais, site e materiais de divulgação, sem limite de tempo, no território nacional e internet.`,
      },
      { t: "heading", text: "2. Limites" },
      {
        t: "p",
        text: "O uso não poderá ter finalidade ofensiva ou que desrespeite a honra do(a) AUTORIZANTE.",
      },
    );
  } else {
    blocks.push(
      { t: "heading", text: "1. Do objeto" },
      {
        t: "p",
        text: `1.1. O presente contrato tem por objeto: ${d.object || "[descreva o serviço]"}.`,
      },
      { t: "p", text: `1.2. Entregáveis: ${d.deliverables || "[liste]"}.` },
      { t: "heading", text: "2. Do prazo e cronograma" },
      {
        t: "p",
        text: `${
          rec
            ? `Vigência de ${d.term || "6 meses"} a partir de ${date}, renovável por acordo entre as partes.`
            : `Prazo de entrega: ${d.term || "[prazo]"}, contado da captação/aprovação do material bruto.`
        } Atrasos causados pela falta de material, aprovações ou informações do CONTRATANTE prorrogam o prazo na mesma medida.`,
      },
      { t: "heading", text: "3. Do valor e pagamento" },
      {
        t: "p",
        text: `O CONTRATANTE pagará à CONTRATADA ${brl(d.value)}${rec ? " mensais" : ""}, da seguinte forma: ${
          d.payment_terms || "à vista"
        }${me.pix ? `. Chave Pix: ${me.pix}` : ""}. Atraso: multa de 2% e juros de 1% ao mês.`,
      },
      { t: "heading", text: "4. Das revisões" },
      {
        t: "p",
        text: `Estão incluídas ${d.revisions ?? 2} rodada(s) de ajustes por entrega. Alterações além disso serão orçadas à parte.`,
      },
      { t: "heading", text: "5. Dos direitos autorais e uso de imagem" },
      {
        t: "p",
        text: `${
          type === "terceirizado"
            ? "O material é produzido para o cliente final da CONTRATANTE, que responde pelas autorizações de uso de imagem."
            : "Após a quitação integral, o CONTRATANTE recebe licença de uso do material final."
        } A CONTRATADA poderá exibir o trabalho em portfólio, salvo cláusula de sigilo.`,
      },
      { t: "heading", text: "6. Da rescisão" },
      {
        t: "p",
        text: `Qualquer parte pode rescindir com aviso de ${rec ? "30 dias" : "5 dias"}. Serviços já executados serão pagos proporcionalmente.${
          d.cancel_fee ? ` Cancelamento após a captação: ${d.cancel_fee}.` : ""
        }`,
      },
      { t: "heading", text: "7. Do foro" },
      {
        t: "p",
        text: `Fica eleito o foro da comarca de ${me.city || "[cidade/UF]"} para dirimir dúvidas deste contrato.`,
      },
    );
  }
  blocks.push(
    { t: "p", text: `${me.city ? `${me.city}, ` : ""}${date}.` },
    { t: "sign", labels: image ? ["AUTORIZADO", "AUTORIZANTE"] : ["CONTRATADA", "CONTRATANTE"] },
  );
  return blocks;
}

/** Texto com quebras de linha vira <br/>, sempre como nó de texto. */
const multiline = (text: string): ReactNode[] =>
  text.split("\n").flatMap((l, i) => (i === 0 ? [l] : [h("br", { key: `b${i}` }), l]));

export function renderBlocks(blocks: DocBlock[]): ReactNode {
  return h(
    Fragment,
    null,
    blocks.map((b, i) => {
      const key = `${b.t}-${i}`;
      switch (b.t) {
        case "header":
          return h(
            "div",
            { key, className: "doc-header" },
            h(
              "div",
              { className: "doc-brand" },
              b.logo ? h("img", { className: "doc-logo", src: b.logo, alt: "" }) : null,
              h("b", null, b.name),
            ),
            h(
              "div",
              { className: "doc-issuer" },
              b.lines.map((l, j) => h("span", { key: j }, l)),
            ),
          );
        case "hero":
          return h(
            "div",
            { key, className: "doc-hero" },
            h("small", null, b.kicker),
            h("h2", null, b.title),
            h(
              "dl",
              null,
              b.meta.map((m) =>
                h("div", { key: m.label }, h("dt", null, m.label), h("dd", null, m.value)),
              ),
            ),
          );
        case "heading":
          return h("h3", { key }, b.text);
        case "title":
          return h("h2", { key, className: b.muted ? "doc-title doc-muted" : "doc-title" }, b.text);
        case "p":
          return h("p", { key }, multiline(b.text));
        case "party":
          return h("p", { key }, h("b", null, b.label), " ", b.text);
        case "ul":
          return h(
            "ul",
            { key },
            b.items.map((x, j) => h("li", { key: j }, x)),
          );
        case "invest":
          return h(
            "div",
            { key, className: "doc-invest" },
            h("div", { className: "doc-price" }, b.total),
            b.terms ? h("p", null, h("b", null, "Forma de pagamento: "), b.terms) : null,
            b.pix ? h("p", null, h("b", null, "Chave Pix: "), b.pix) : null,
          );
        case "note":
          return h("div", { key, className: "doc-note" }, b.text);
        case "accept":
          return h(
            "div",
            { key, className: "doc-accept" },
            h(
              "p",
              null,
              h("b", null, "De acordo."),
              " Ao assinar, as partes aprovam o escopo, os prazos e o investimento desta proposta.",
            ),
            h("div", { className: "doc-sign" }, h("div", null, b.left), h("div", null, b.right)),
          );
        case "sign":
          return h(
            "div",
            { key, className: "doc-sign" },
            b.labels.map((l) => h("div", { key: l }, l)),
          );
      }
    }),
  );
}
