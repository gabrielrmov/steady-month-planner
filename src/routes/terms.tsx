import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de uso | Finlist" },
      {
        name: "description",
        content: "Termos de uso do Finlist. Regras para uso do organizador financeiro mensal.",
      },
      { property: "og:title", content: "Termos de uso | Finlist" },
      { property: "og:description", content: "Termos de uso do Finlist." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steady-month-planner.dsggabriel7.workers.dev/terms" },
      { name: "twitter:card", content: "summary" },
    ],
        links: [{ rel: "canonical", href: "https://steady-month-planner.dsggabriel7.workers.dev/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Finlist</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Termos de uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().getFullYear()}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Aceitação dos termos</h2>
            <p className="mt-2">
              Ao criar uma conta e usar o Finlist, você concorda com estes Termos de Uso. Se não
              concordar com alguma parte, não use o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Descrição do serviço</h2>
            <p className="mt-2">
              O Finlist é um organizador financeiro pessoal que ajuda a controlar contas,
              recebimentos, cartões e parcelamentos. Não somos uma instituição financeira, não
              emitimos cartões, não fazemos transferências e não intermediamos pagamentos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Conta e segurança</h2>
            <p className="mt-2">
              Você é responsável por manter a segurança de sua conta, senha e dispositivos.
              Notifique-nos imediatamente sobre qualquer uso não autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Planos e pagamentos</h2>
            <p className="mt-2">
              O Finlist oferece um plano gratuito e um plano pago (Pro). O plano Pro pode ser
              contratado e cancelado a qualquer momento, com cobrança recorrente mensal. Os valores
              e funcionalidades de cada plano estão descritos na página de preços.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Uso permitido</h2>
            <p className="mt-2">
              Você se compromete a usar o Finlist apenas para fins lícitos e pessoais. É proibido
              tentar acessar dados de outros usuários, violar a segurança da plataforma ou
              distribuir conteúdo malicioso.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Limitação de responsabilidade
            </h2>
            <p className="mt-2">
              O Finlist é fornecido "como está". Não nos responsabilizamos por decisões financeiras
              tomadas com base nas informações do aplicativo. Sempre confirme seus saldos e
              pagamentos diretamente com bancos e instituições financeiras.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Alterações nos termos</h2>
            <p className="mt-2">
              Podemos atualizar estes termos a qualquer momento. Mudanças significativas serão
              comunicadas por email ou dentro do aplicativo. O uso continuado do serviço após
              alterações constitui aceitação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contato</h2>
            <p className="mt-2">
              Dúvidas sobre estes termos podem ser enviadas para{" "}
              <a href="mailto:contato@finlist.app" className="text-primary hover:underline">
                contato@finlist.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
