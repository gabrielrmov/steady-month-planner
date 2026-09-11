import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Finlist" },
      {
        name: "description",
        content: "Acesse o Finlist para organizar contas a pagar, receber, cartões e parcelas do mês.",
      },
      { property: "og:title", content: "Entrar | Finlist" },
      { property: "og:description", content: "Acesse o Finlist e organize suas contas do mês." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steady-month-planner.dsggabriel7.workers.dev/auth" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://steady-month-planner.dsggabriel7.workers.dev/auth" }],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.5-4.6 2.6-7.7 2.6-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.6 5.6C41.9 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" }) as { plan?: string };
  const isProIntent = search.plan === "pro";
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (profile?.onboarding_completed) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/onboarding", search: isProIntent ? { plan: "pro" } : {} });
      }
    });
  }, [navigate, isProIntent]);

  const handleGoogle = async () => {
    // Direct Supabase OAuth (no third-party proxy). Configure the Google
    // provider (Client ID/Secret + redirect URL) in your Supabase project's
    // Authentication > Providers settings for this to work.
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${isProIntent ? "/auth?plan=pro" : ""}`,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Falha no login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">Finlist</span>
        </Link>

        <Card className="border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-foreground">
              {isProIntent ? "Criar conta e assinar o Pro" : "Entrar no Finlist"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use sua conta Google para entrar ou criar sua conta em segundos.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2.5"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            {loading ? "Redirecionando..." : "Continuar com Google"}
          </Button>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com os nossos{" "}
          <Link to="/terms" className="text-foreground hover:underline">
            termos de uso
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
