import {
  BarChart3,
  ClipboardList,
  Calculator,
  FileSignature,
  FileText,
  FolderKanban,
  Funnel,
  Home,
  MessageSquareText,
  Receipt,
  Settings2,
  Users,
  Wrench,
} from "lucide-react";

/** Itens da área "Meu trabalho (PJ)", usados na barra lateral e na faixa de navegação das telas. */
export const PJ_NAV = [
  { to: "/pj", label: "Início PJ", icon: Home, tab: undefined },
  { to: "/pj/crm", label: "CRM comercial", icon: Funnel, tab: undefined },
  { to: "/pj/clientes", label: "Clientes", icon: Users, tab: undefined },
  { to: "/pj/propostas", label: "Propostas", icon: FileText, tab: undefined },
  { to: "/pj/contratos", label: "Contratos", icon: FileSignature, tab: undefined },
  { to: "/pj/projetos", label: "Projetos", icon: FolderKanban, tab: undefined },
  { to: "/pj/financeiro", label: "Financeiro PJ", icon: Receipt, tab: undefined },
  { to: "/precificacao", label: "Orçamento", icon: Calculator, tab: undefined },
  { to: "/pj/equipamentos", label: "Equipamentos", icon: Wrench, tab: undefined },
  { to: "/pj/relatorios", label: "Relatórios PJ", icon: BarChart3, tab: undefined },
  { to: "/pj/briefing", label: "Briefing", icon: ClipboardList, tab: undefined },
  { to: "/pj/mensagens", label: "Prospecção e follow-up", icon: MessageSquareText, tab: undefined },
  { to: "/pj/perfil", label: "Perfil e backup", icon: Settings2, tab: undefined },
] as const;
