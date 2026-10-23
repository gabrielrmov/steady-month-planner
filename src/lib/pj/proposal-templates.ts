/** Modelos de proposta por tipo de trabalho e preço sugerido. Funções puras: tudo preenchido sozinho, editável depois. */
import { budget, minHourlyRate } from "./calc.ts";
import { toNumber } from "./format.ts";

export const PROPOSAL_TYPES = [
  "Conteúdo mensal",
  "Evento",
  "Institucional",
  "Produto",
  "Depoimento",
  "Casamento",
  "Diária avulsa",
  "Outro",
] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

type Hours = { days: number; shoot: number; edit: number };

/** Horas típicas de cada trabalho (por diária de captação), usadas para sugerir o preço. */
export function typicalHours(type: ProposalType, qty = 4): Hours {
  switch (type) {
    case "Conteúdo mensal":
      return { days: 1, shoot: 4, edit: Math.max(2, qty * 2) };
    case "Evento":
      return { days: 1, shoot: 6, edit: 8 };
    case "Institucional":
      return { days: 1, shoot: 6, edit: 16 };
    case "Produto":
      return { days: 1, shoot: 4, edit: 8 };
    case "Depoimento":
      return { days: 1, shoot: 3, edit: 6 };
    case "Casamento":
      return { days: 1, shoot: 10, edit: 24 };
    case "Diária avulsa":
      return { days: 1, shoot: 8, edit: 0 };
    default:
      return { days: 1, shoot: 4, edit: 6 };
  }
}

export type PriceContext = {
  desiredIncome?: number | null;
  fixedCosts?: number | null;
  billableHours?: number | null;
  taxRate?: number | null;
  kitMonthly?: number;
  margin?: number;
};

/** Preço sugerido (arredondado para 10) a partir do seu valor/hora mínimo, das horas típicas, imposto e margem. */
export function suggestPrice(
  type: ProposalType,
  ctx: PriceContext = {},
  qty = 4,
): { price: number; hourly: number } {
  const hourly = Math.ceil(
    minHourlyRate({
      income: toNumber(ctx.desiredIncome) || 5000,
      fixed: toNumber(ctx.fixedCosts),
      kitMonthly: toNumber(ctx.kitMonthly),
      hours: toNumber(ctx.billableHours) || 80,
      tax: toNumber(ctx.taxRate),
    }),
  );
  const h = typicalHours(type, qty);
  const r = budget({
    days: h.days,
    shootHours: h.shoot,
    editHours: h.edit,
    rate: hourly,
    equipment: 0,
    travel: 0,
    extras: 0,
    margin: ctx.margin ?? 20,
    tax: toNumber(ctx.taxRate),
  });
  return { price: Math.round(r.price / 10) * 10, hourly };
}

export type ProposalFill = {
  title: string;
  validity: string;
  intro: string;
  scope_of_work: string;
  deliverables: string;
  timeline: string;
  payment_terms: string;
  notes: string;
};

const firstName = (s: string | null | undefined) => (s ?? "").trim().split(/\s+/)[0] ?? "";

/** Todos os textos da proposta para o tipo escolhido. `qty` é a quantidade de vídeos (conteúdo mensal). */
export function fillProposal(
  type: ProposalType,
  who: { name?: string | null; company?: string | null },
  me: { name?: string | null; company?: string | null },
  qty = 4,
): ProposalFill {
  const greeting = firstName(who.name) || firstName(who.company) || "";
  const forWhom = who.company || who.name || "sua empresa";
  const by = me.company || me.name || "nosso estúdio";
  const intro = (what: string) =>
    `${greeting ? `Olá, ${greeting}! ` : ""}Foi um prazer conversar sobre ${what} para ${forWhom}. Preparei esta proposta com o escopo, os prazos e o investimento, para você aprovar com tranquilidade. Qualquer ponto pode ser ajustado.`;
  const base = {
    validity: "7 dias",
    notes:
      "Alterações de escopo, diárias extras ou novos formatos são orçados à parte. O material bruto fica arquivado por 30 dias após a entrega final.",
  };
  const fifty = "50% na aprovação (reserva da data) e 50% na entrega, via Pix";
  switch (type) {
    case "Conteúdo mensal":
      return {
        ...base,
        title: "Proposta de conteúdo mensal em vídeo",
        intro: intro("a produção de conteúdo em vídeo para as redes sociais"),
        scope_of_work: `Captação e edição de ${qty} vídeos por mês para as redes sociais, com pauta alinhada previamente, trilha, legendas e identidade visual da marca.`,
        deliverables: `${qty} vídeos verticais (Reels/TikTok/Shorts) de até 60 segundos\n1 reunião mensal de pauta\nEdição com trilha, legendas e identidade visual\n2 rodadas de ajustes por vídeo\nEntrega em alta resolução por link`,
        timeline:
          "Pauta definida até o dia 5; captação na primeira quinzena do mês; entrega em até 5 dias úteis após cada captação.",
        payment_terms: "Mensalidade paga todo dia 10, via Pix",
      };
    case "Evento":
      return {
        ...base,
        title: "Proposta de cobertura audiovisual de evento",
        intro: intro("a cobertura em vídeo do evento"),
        scope_of_work:
          "Cobertura audiovisual do evento, com captação dos momentos-chave, ambiente, falas e depoimentos rápidos, e edição de um vídeo resumo.",
        deliverables:
          "Cobertura de até 6 horas no local\nVídeo resumo (highlights) de 1 a 3 minutos\nUm corte curto para redes sociais\nMaterial bruto selecionado\n2 rodadas de ajustes",
        timeline: "Entrega do vídeo resumo em até 7 dias corridos após o evento.",
        payment_terms: fifty,
      };
    case "Institucional":
      return {
        ...base,
        title: "Proposta de vídeo institucional",
        intro: intro("o vídeo institucional"),
        scope_of_work:
          "Produção completa de vídeo institucional: roteiro, plano de gravação, captação, edição, trilha e finalização.",
        deliverables:
          "Roteiro e plano de gravação\n1 diária de captação\nVídeo institucional de 1 a 2 minutos\nVersão curta para redes sociais\nTrilha licenciada e legendas\n2 rodadas de ajustes",
        timeline:
          "Roteiro em 3 dias úteis; captação em data a combinar; entrega em até 15 dias úteis após a captação.",
        payment_terms: fifty,
      };
    case "Produto":
      return {
        ...base,
        title: "Proposta de vídeo de produto",
        intro: intro("o vídeo de produto"),
        scope_of_work:
          "Produção de vídeo para destacar o produto, seus diferenciais e uso, com captação em estúdio ou no local e edição dinâmica.",
        deliverables:
          "1 diária de captação\nVídeo principal de até 60 segundos\n2 cortes para redes sociais\nImagens de detalhe do produto\n2 rodadas de ajustes",
        timeline: "Entrega em até 10 dias úteis após a captação.",
        payment_terms: fifty,
      };
    case "Depoimento":
      return {
        ...base,
        title: "Proposta de vídeo de depoimento",
        intro: intro("o vídeo de depoimento"),
        scope_of_work:
          "Gravação de depoimento com direção das perguntas, captação de áudio limpo e edição com imagens de apoio.",
        deliverables:
          "Gravação de até 3 horas\nVídeo de depoimento de até 2 minutos\nCorte curto para redes sociais\nLegendas\n2 rodadas de ajustes",
        timeline: "Entrega em até 7 dias úteis após a gravação.",
        payment_terms: fifty,
      };
    case "Casamento":
      return {
        ...base,
        title: "Proposta de filmagem de casamento",
        intro: intro("a filmagem do casamento"),
        scope_of_work:
          "Cobertura em vídeo da cerimônia e da festa, com captação de áudio dos votos e edição de um filme emocionante.",
        deliverables:
          "Cobertura da cerimônia e da festa\nTeaser de 1 minuto\nFilme completo de 8 a 12 minutos\nMaterial bruto selecionado\nEntrega em alta resolução por link",
        timeline: "Teaser em até 15 dias e filme completo em até 60 dias após o casamento.",
        payment_terms: "30% na reserva da data, 40% até 7 dias antes e 30% na entrega, via Pix",
      };
    case "Diária avulsa":
      return {
        ...base,
        title: "Proposta de diária de captação",
        intro: intro("a diária de captação"),
        scope_of_work: `Diária de captação${by ? ` por ${by}` : ""}, com equipamento próprio, para o material combinado.`,
        deliverables:
          "Diária de até 8 horas\nEquipamento de câmera e áudio\nMaterial bruto organizado e entregue por link",
        timeline: "Material bruto entregue em até 2 dias úteis.",
        payment_terms: "À vista na entrega, via Pix",
      };
    default:
      return {
        ...base,
        title: "Proposta comercial",
        intro: intro("o projeto em vídeo"),
        scope_of_work: "",
        deliverables: "",
        timeline: "",
        payment_terms: fifty,
      };
  }
}

/** Número da proposta: PROP-AAAAMMDD-XXXX (data da proposta + 4 primeiros caracteres do id). Vazio até salvar. */
export function proposalNumber(
  date: string | null | undefined,
  id: string | null | undefined,
): string {
  if (!id) return "";
  const day = (date ?? "").replace(/-/g, "").slice(0, 8);
  return `PROP-${/^\d{8}$/.test(day) ? day : "00000000"}-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}
