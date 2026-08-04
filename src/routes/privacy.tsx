import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacidade | Finlist" },
      {
        name: "description",
        content: "Política de privacidade do Finlist. Saiba como seus dados financeiros são armazenados e protegidos.",
      },
      { property: "og:title", content: "Privacidade | Finlist" },
      { property: "og:description", content: "Como o Finlist protege seus dados financeiros." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steady-month-planner.lovable.app/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://steady-month-planner.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Política de privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {new Date().getFullYear()}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Dados que coletamos</h2>
            <p className="mt-2">
              Coletamos informações necessárias para o funcionamento do serviço: nome, email, senha criptografada, dados
              dos lançamentos financeiros que você cadastrar (descrição, valor, data, categoria, forma de pagamento,
              cartão), regras de categorização e conexões bancárias que você registrar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Como usamos seus dados</h2>
            <p className="mt-2">
              Seus dados são usados exclusivamente para exibir, organizar e permitir o gerenciamento das suas finanças
              dentro do Finlist. Não vendemos, alugamos ou compartilhamos dados com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Segurança</h2>
            <p className="mt-2">
              Os dados são armazenados em servidores seguros com criptografia em trânsito. Cada usuário acessa apenas
              seus próprios dados através de políticas de segurança em nível de linha (RLS). Recomendamos o uso de senha
              forte e autenticação de dois fatores quando disponível.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Provedores de pagamento</h2>
            <p className="mt-2">
              Pagamentos do plano Pro são processados por provedores especializados. Não armazenamos dados de cartão de
              crédito em nossos servidores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Open Finance e conexões bancárias</h2>
            <p className="mt-2">
              A sincronização automática com bancos depende de agregadores regulados pelo Banco Central. Você decide
              quais instituições conectar, e pode remover a conexão a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Seus direitos</h2>
            <p className="mt-2">
              Você pode acessar, corrigir ou excluir seus dados a qualquer momento dentro do aplicativo. Também pode
              solicitar uma cópia completa dos seus dados ou a exclusão definitiva da conta pelo email de contato.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Alterações na política</h2>
            <p className="mt-2">
              Podemos atualizar esta política ocasionalmente. Alterações relevantes serão comunicadas por email ou
              dentro do aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contato</h2>
            <p className="mt-2">
              Dúvidas sobre privacidade podem ser enviadas para{" "}
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
