/** Tipos e constantes da área "Meu trabalho (PJ)". Os nomes das colunas seguem db/schema.sql. */

export type Regime = "" | "MEI" | "Simples Nacional" | "Outro";
export const REGIMES: Regime[] = ["", "MEI", "Simples Nacional", "Outro"];
export const MEI_LIMIT = 81000;

export type PjProfile = {
  id?: string;
  full_name: string | null;
  company: string | null;
  doc: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  pix: string | null;
  logo: string | null;
  regime: Regime;
  annual_limit: number | null;
  tax_rate: number;
  monthly_goal: number | null;
  desired_income: number | null;
  fixed_costs: number | null;
  billable_hours: number | null;
};

export const EMPTY_PROFILE: PjProfile = {
  full_name: "",
  company: "",
  doc: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  pix: "",
  logo: null,
  regime: "",
  annual_limit: null,
  tax_rate: 6,
  monthly_goal: null,
  desired_income: null,
  fixed_costs: null,
  billable_hours: null,
};

export type PjClient = {
  id: string;
  name: string;
  company: string | null;
  doc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export const LEAD_STAGES = [
  "Novo lead",
  "Primeiro contato",
  "Reunião marcada",
  "Proposta enviada",
  "Aguardando resposta",
  "Em negociação",
  "Fechado",
  "Perdido",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export type PjLead = {
  id: string;
  name: string;
  company: string | null;
  service: string | null;
  value: number;
  stage: LeadStage;
  contact: string | null;
  follow_up: string | null;
  notes: string | null;
};

export const PROPOSAL_STATUS = ["Rascunho", "Enviada", "Aprovada", "Recusada"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUS)[number];

export type PjProposal = {
  id: string;
  title: string;
  proposal_date: string | null;
  validity: string | null;
  client_id: string | null;
  client_name: string | null;
  company: string | null;
  intro: string | null;
  scope_of_work: string | null;
  deliverables: string | null;
  timeline: string | null;
  price: number;
  payment_terms: string | null;
  notes: string | null;
  status: ProposalStatus;
  updated_at: string;
};

export const CONTRACT_TYPES = {
  pontual: {
    label: "Prestação pontual",
    title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS",
    hint: "Projeto fechado: vídeo institucional, evento, conteúdo avulso.",
  },
  mensal: {
    label: "Gerenciamento mensal",
    title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS RECORRENTES",
    hint: "Conteúdo mensal, redes sociais, prestação continuada.",
  },
  terceirizado: {
    label: "Serviço terceirizado",
    title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS TERCEIRIZADOS",
    hint: "Quando uma agência contrata você para editar/filmar para o cliente dela.",
  },
  imagem: {
    label: "Autorização de imagem",
    title: "TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM",
    hint: "Pessoa autoriza o uso da imagem em fotos e vídeos.",
  },
} as const;
export type ContractType = keyof typeof CONTRACT_TYPES;

export type PjContract = {
  id: string;
  contract_type: ContractType;
  client_id: string | null;
  client_name: string | null;
  client_doc: string | null;
  client_address: string | null;
  representative: string | null;
  object: string | null;
  deliverables: string | null;
  value: number;
  payment_terms: string | null;
  term: string | null;
  revisions: number;
  cancel_fee: string | null;
  contract_date: string | null;
  proposal_id: string | null;
};

export const PROJECT_STAGES = [
  "Pré-produção",
  "Captação",
  "Edição",
  "Revisão",
  "Entregue",
  "Pago",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export const PROJECT_TYPES = [
  "Conteúdo mensal",
  "Evento",
  "Institucional",
  "Produto",
  "Depoimento",
  "Outro",
];

export type ChecklistItem = { t: string; done: boolean };
export type ProjectVideo = { title: string; url: string; note?: string };

export type PjProject = {
  id: string;
  title: string;
  client_id: string | null;
  client_name: string | null;
  project_type: string;
  stage: ProjectStage;
  value: number;
  shoot_date: string | null;
  due_date: string | null;
  delivery_link: string | null;
  delivery_message: string | null;
  notes: string | null;
  checklist: ChecklistItem[];
  videos: ProjectVideo[];
  proposal_id: string | null;
};

export const CHECKLISTS: Record<string, string[]> = {
  default: [
    "Briefing aprovado",
    "Contrato assinado",
    "Sinal recebido",
    "Roteiro / shot list",
    "Baterias e cartões carregados/formatados",
    "Captação feita",
    "Backup do material bruto",
    "Edição v1 enviada",
    "Ajustes aplicados",
    "Entrega final + link",
    "Pagamento final recebido",
  ],
  Evento: [
    "Briefing aprovado",
    "Contrato assinado",
    "Sinal recebido",
    "Visita técnica / horários",
    "Checklist de equipamentos",
    "Captação feita",
    "Backup do material bruto",
    "Edição v1 enviada",
    "Entrega final + link",
    "Pagamento final recebido",
  ],
};
export const checklistFor = (type: string): ChecklistItem[] =>
  (CHECKLISTS[type] ?? CHECKLISTS.default).map((t) => ({ t, done: false }));

export const EQUIPMENT_CATEGORIES = [
  "Câmera",
  "Lente",
  "Áudio",
  "Iluminação",
  "Estabilizador/Drone",
  "Computador/Armazenamento",
  "Acessórios",
];

export type PjEquipment = {
  id: string;
  name: string;
  category: string;
  cost: number;
  purchased_at: string | null;
  life_months: number;
};

/** Categorias do financeiro PJ (criadas sob demanda em `categories` com scope = business). */
export const BUSINESS_INCOME_CATEGORY = "Projeto/Job";
export const BUSINESS_CATEGORIES: { name: string; kind: "income" | "expense"; color: string }[] = [
  { name: "Projeto/Job", kind: "income", color: "#0b6e5f" },
  { name: "Mensalidade cliente", kind: "income", color: "#0a6c86" },
  { name: "Equipamento", kind: "expense", color: "#8a5a00" },
  { name: "Software/Assinatura", kind: "expense", color: "#4a5f59" },
  { name: "Transporte", kind: "expense", color: "#f2b01e" },
  { name: "Imposto", kind: "expense", color: "#b3261e" },
  { name: "Pró-labore", kind: "expense", color: "#3a7a6b" },
  { name: "Outros", kind: "expense", color: "#6B7280" },
];

export type Scope = "personal" | "business";
export type PjTransaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  status: "pending" | "paid";
  due_date: string;
  paid_at: string | null;
  category_id: string | null;
  project_id: string | null;
  scope: Scope;
  notes: string | null;
  categories?: { name: string; color: string } | null;
};
