import { Settings2, Users } from "lucide-react";

/** Itens da área "Meu trabalho (PJ)", usados na barra lateral e na faixa de navegação das telas. */
export const PJ_NAV = [
  { to: "/pj/clientes", label: "Clientes", icon: Users, tab: undefined },
  { to: "/pj/perfil", label: "Perfil e backup", icon: Settings2, tab: undefined },
] as const;
