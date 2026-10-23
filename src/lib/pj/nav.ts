import { FileSignature, FileText, FolderKanban, Funnel, Settings2, Users } from "lucide-react";

/** Itens da área "Meu trabalho (PJ)", usados na barra lateral e na faixa de navegação das telas. */
export const PJ_NAV = [
  { to: "/pj/crm", label: "CRM comercial", icon: Funnel, tab: undefined },
  { to: "/pj/clientes", label: "Clientes", icon: Users, tab: undefined },
  { to: "/pj/propostas", label: "Propostas", icon: FileText, tab: undefined },
  { to: "/pj/contratos", label: "Contratos", icon: FileSignature, tab: undefined },
  { to: "/pj/projetos", label: "Projetos", icon: FolderKanban, tab: undefined },
  { to: "/pj/perfil", label: "Perfil e backup", icon: Settings2, tab: undefined },
] as const;
