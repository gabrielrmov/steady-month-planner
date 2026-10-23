import {
  BarChart3,
  Briefcase,
  Calculator,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileSignature,
  FileText,
  FileUp,
  FolderKanban,
  Funnel,
  Home,
  Hourglass,
  Landmark,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  PieChart,
  PiggyBank,
  Receipt,
  Settings,
  Settings2,
  Tag,
  Users,
  Wand2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; group?: string };
export type NavSection = { key: string; label: string; icon: LucideIcon; items: NavItem[] };

/** Menu lateral: uma entrada por seção; as telas de cada seção aparecem como abas no topo da página. */
export const SECTIONS: NavSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    key: "contas",
    label: "Contas",
    icon: ListChecks,
    items: [
      { to: "/transactions", label: "Contas", icon: ListChecks },
      { to: "/installments", label: "Parcelas", icon: Hourglass },
      { to: "/cards", label: "Cartões", icon: CreditCard },
      { to: "/open-finance", label: "Open Finance", icon: Landmark },
    ],
  },
  {
    key: "planejamento",
    label: "Planejamento",
    icon: PiggyBank,
    items: [
      { to: "/savings", label: "Metas", icon: PiggyBank },
      { to: "/calendar", label: "Calendário", icon: CalendarDays },
      { to: "/divisao-ganhos", label: "Divisão de ganhos", icon: PieChart },
    ],
  },
  {
    key: "relatorios",
    label: "Relatórios",
    icon: BarChart3,
    items: [{ to: "/reports", label: "Relatórios", icon: BarChart3 }],
  },
  {
    key: "pj",
    label: "Meu trabalho (PJ)",
    icon: Briefcase,
    items: [
      { to: "/pj", label: "Início", icon: Home, group: "Início" },
      { to: "/pj/crm", label: "CRM", icon: Funnel, group: "Comercial" },
      { to: "/pj/clientes", label: "Clientes", icon: Users, group: "Comercial" },
      { to: "/pj/briefing", label: "Briefing", icon: ClipboardList, group: "Comercial" },
      { to: "/pj/mensagens", label: "Mensagens", icon: MessageSquareText, group: "Comercial" },
      { to: "/pj/propostas", label: "Propostas", icon: FileText, group: "Documentos" },
      { to: "/pj/contratos", label: "Contratos", icon: FileSignature, group: "Documentos" },
      { to: "/pj/projetos", label: "Projetos", icon: FolderKanban, group: "Projetos" },
      { to: "/pj/financeiro", label: "Financeiro", icon: Receipt, group: "Dinheiro" },
      { to: "/precificacao", label: "Orçamento", icon: Calculator, group: "Dinheiro" },
      { to: "/pj/relatorios", label: "Relatórios", icon: BarChart3, group: "Dinheiro" },
      { to: "/pj/equipamentos", label: "Equipamentos", icon: Wrench, group: "Dinheiro" },
    ],
  },
  {
    key: "ajustes",
    label: "Ajustes",
    icon: Settings,
    items: [
      { to: "/settings", label: "Geral", icon: Settings },
      { to: "/categories", label: "Categorias", icon: Tag },
      { to: "/rules", label: "Regras", icon: Wand2 },
      { to: "/import", label: "Importar", icon: FileUp },
      { to: "/pj/perfil", label: "Perfil PJ e backup", icon: Settings2 },
    ],
  },
];

export const itemActive = (pathname: string, to: string) =>
  pathname === to || (to !== "/pj" && pathname.startsWith(`${to}/`));

export const sectionOf = (pathname: string) =>
  SECTIONS.find((s) => s.items.some((i) => itemActive(pathname, i.to)));
