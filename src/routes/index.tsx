import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, LineChart, ListChecks, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Finlist</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Organizador financeiro mensal
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Toda conta do mês,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                sob controle.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Checklist mês a mês de contas a pagar e receber, categorias, recorrência
              e um dashboard claro do que vai entrar e sair.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="shadow-[var(--shadow-elegant)]">
                  Criar minha conta
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 pb-20 md:grid-cols-3">
          {[
            {
              icon: ListChecks,
              title: "Checklist mensal",
              desc: "Marque as contas conforme paga. Veja o que ainda falta em segundos.",
            },
            {
              icon: LineChart,
              title: "Dashboard claro",
              desc: "Entradas, saídas, saldo previsto e a saúde do seu mês em um lugar.",
            },
            {
              icon: CheckCircle2,
              title: "Recorrência",
              desc: "Cadastre contas fixas uma vez e replique todo mês automaticamente.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Finlist
      </footer>
    </div>
  );
}
