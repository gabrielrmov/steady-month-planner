import { createFileRoute, redirect } from "@tanstack/react-router";

// Provisório: o painel "Início PJ" chega junto com o financeiro (etapa 3).
export const Route = createFileRoute("/_authenticated/pj/")({
  beforeLoad: () => {
    throw redirect({ to: "/pj/clientes" });
  },
});
