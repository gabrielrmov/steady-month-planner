/** Textos prontos: briefing por tipo de projeto e mensagens de prospecção/follow-up. Funções puras. */
import { dateBR } from "./format.ts";

export const BRIEFING_TYPES = [
  "Conteúdo mensal",
  "Evento",
  "Institucional",
  "Produto",
  "Depoimento",
  "Outro",
];

export type BriefingData = {
  type: string;
  project?: string;
  client?: string;
  contact?: string;
  date?: string | null;
  place?: string;
  goal?: string;
  audience?: string;
  qty?: string;
  duration?: string;
  platforms?: string;
  people?: string;
  topics?: string;
  refs?: string;
  tone?: string;
  logistics?: string;
  deadline?: string;
};

/** Perguntas extras por tipo: entram no fim do briefing para o cliente responder. */
const EXTRA_QUESTIONS: Record<string, string[]> = {
  "Conteúdo mensal": [
    "Quantos temas por mês já estão definidos?",
    "Quem aprova os vídeos e em quanto tempo?",
  ],
  Evento: [
    "Horário de início e fim?",
    "Momentos que não podem ficar de fora?",
    "Há restrição de acesso, som ou iluminação?",
  ],
  Institucional: [
    "Qual a história da empresa que precisa aparecer?",
    "Há logomarca e manual de marca para usar?",
  ],
  Produto: [
    "Quais diferenciais do produto precisam aparecer?",
    "O produto estará disponível no dia da captação?",
  ],
  Depoimento: [
    "Quem dará o depoimento e já autorizou o uso de imagem?",
    "Perguntas que você quer que sejam feitas?",
  ],
  Outro: [],
};

export function briefingText(d: BriefingData): string {
  const v = (s: string | undefined | null) => (s && s.trim() ? s : "-");
  const extra = EXTRA_QUESTIONS[d.type] ?? [];
  return [
    `BRIEFING — ${d.type}${d.project ? ` · ${d.project}` : ""}`,
    `Cliente: ${v(d.client)}`,
    `Contato: ${v(d.contact)}`,
    `Data da captação: ${d.date ? dateBR(d.date) : "-"}  |  Local: ${v(d.place)}`,
    "",
    "OBJETIVO",
    v(d.goal),
    "",
    "PÚBLICO",
    v(d.audience),
    "",
    "CONTEÚDO",
    `• Quantidade de vídeos: ${v(d.qty)}`,
    `• Duração média: ${v(d.duration)}`,
    `• Plataformas: ${v(d.platforms)}`,
    `• Quem aparece: ${v(d.people)}`,
    `• Principais assuntos: ${v(d.topics)}`,
    "",
    "DIREÇÃO CRIATIVA",
    `Referências: ${v(d.refs)}`,
    `Tom: ${v(d.tone)}`,
    "",
    "LOGÍSTICA",
    `Equipamentos/acessos: ${v(d.logistics)}`,
    `Prazo de entrega: ${v(d.deadline)}`,
    ...(extra.length ? ["", "PERGUNTAS PARA ALINHAR", ...extra.map((q) => `• ${q}`)] : []),
  ].join("\n");
}

export const FOLLOW_SITUATIONS = [
  "Apresentei a proposta",
  "Cliente disse que ia analisar",
  "Achou o valor alto",
  "Cliente sumiu",
] as const;
export type FollowSituation = (typeof FOLLOW_SITUATIONS)[number];

export const FOLLOW_HINTS: Record<FollowSituation, string> = {
  "Apresentei a proposta": "Você enviou a proposta e o cliente sumiu.",
  "Cliente disse que ia analisar": "Pediu tempo para avaliar.",
  "Achou o valor alto":
    "Objeção de preço. Não ofereça desconto de cara: primeiro entenda a objeção.",
  "Cliente sumiu": "Sem resposta há dias.",
};

export function followUpMessages(sit: FollowSituation, name: string, project: string): string[] {
  const n = name || "[nome]";
  const p = project || "vídeo";
  switch (sit) {
    case "Apresentei a proposta":
      return [
        `Oi, ${n}! Tudo bem? Passando pra saber se deu pra olhar a proposta de ${p}. Qualquer dúvida eu explico por aqui mesmo.`,
        `Oi, ${n}! Ficou algum ponto da proposta que você queira ajustar? Consigo adaptar escopo e formato pra caber melhor aí.`,
      ];
    case "Cliente disse que ia analisar":
      return [
        `Oi, ${n}! Como combinamos, voltando aqui sobre ${p}. Conseguiu avaliar? Posso te ajudar com algum ponto?`,
        `${n}, só pra alinhar: a agenda de captação do mês está fechando. Se fizer sentido seguir com ${p}, consigo reservar sua data.`,
      ];
    case "Achou o valor alto":
      return [
        `${n}, entendo! Antes de mexer em valor, posso te mostrar uma versão enxuta de ${p} com menos entregas? Assim o investimento cabe sem perder qualidade.`,
        `${n}, o valor considera captação, edição e revisões. Se quiser, podemos dividir em etapas e começar pelo mais importante.`,
      ];
    case "Cliente sumiu":
      return [
        `Oi, ${n}! Imagino que a correria esteja grande. Vou deixar a proposta de ${p} em aberto por mais alguns dias; se não for o momento, sem problema, me avisa!`,
        `${n}, última por aqui: ainda faz sentido ${p} pra você? Se preferir retomar mais pra frente, é só chamar.`,
      ];
  }
}

export const PROSPECT_CHANNELS = ["Instagram / Direct", "WhatsApp", "E-mail", "LinkedIn"] as const;
export type ProspectChannel = (typeof PROSPECT_CHANNELS)[number];

export function prospectMessages(
  channel: ProspectChannel,
  name: string,
  company: string,
  obs: string,
  me: string,
): string[] {
  const n = name || "[nome]";
  const e = company || "[empresa]";
  switch (channel) {
    case "Instagram / Direct":
      return [
        `Oi, ${n}! Vi o perfil da ${e} e curti ${obs || "o conteúdo que vocês postam"}. Trabalho com vídeo pra negócios locais e vi uma ideia que combina com vocês. Posso te mandar rapidinho?`,
      ];
    case "WhatsApp":
      return [
        `Oi, ${n}, tudo bem? Sou ${me || "[seu nome]"}, videomaker. Conheci o trabalho da ${e}${obs ? ` (${obs})` : ""} e imaginei um formato de vídeo que mostraria isso melhor. Posso te explicar em 1 minuto?`,
      ];
    case "E-mail":
      return [
        `Assunto: Ideia de vídeo para a ${e}\n\nOlá, ${n}!\n\nAcompanhei a ${e}${obs ? ` e reparei em ${obs}` : ""}. Produzo vídeos para empresas e vi uma oportunidade de mostrar melhor o que vocês fazem. Posso enviar uma proposta curta, sem compromisso?\n\nAbraço!${me ? `\n${me}` : ""}`,
      ];
    case "LinkedIn":
      return [
        `Olá, ${n}! Vi o trabalho da ${e}${obs ? ` — ${obs}` : ""}. Sou videomaker e ajudo empresas a comunicar melhor com vídeo. Vamos conectar?`,
      ];
  }
}
