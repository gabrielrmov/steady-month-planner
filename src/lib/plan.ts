import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanKey = "trial" | "pf" | "pfpj" | "expired";

export const PLAN_LABEL: Record<PlanKey, string> = {
  trial: "Teste grátis",
  pf: "Plano Pessoal",
  pfpj: "Pessoal + PJ",
  expired: "Teste expirado",
};

export const PLAN_PRICE = {
  pf: 19,
  pfpj: 39,
};

export type PlanState = {
  plan: PlanKey;
  /** acesso aos recursos avançados (relatórios, exportação, importação, cartões ilimitados) */
  hasAccess: boolean;
  /** acesso aos recursos de pessoa jurídica (precificação de serviços) */
  hasPj: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  trialEndsAt: Date | null;
};

const FREE_STATE: PlanState = {
  plan: "expired",
  hasAccess: false,
  hasPj: false,
  isTrial: false,
  trialDaysLeft: 0,
  trialEndsAt: null,
};

export function usePlan() {
  const query = useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<PlanState> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return FREE_STATE;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, plan, profile_type, trial_ends_at, current_period_end")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;

      const createdAt = userRes.user?.created_at ? new Date(userRes.user.created_at) : new Date();
      const trialEndsAt = data?.trial_ends_at
        ? new Date(data.trial_ends_at)
        : new Date(createdAt.getTime() + 30 * 86400000);

      const now = Date.now();
      const trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / 86400000));
      const active = data?.status === "active";
      const rawPlan = data?.plan ?? "trial";

      if (active && (rawPlan === "pfpj" || data?.profile_type === "pfpj")) {
        return { plan: "pfpj", hasAccess: true, hasPj: true, isTrial: false, trialDaysLeft: 0, trialEndsAt };
      }
      if (active && (rawPlan === "pf" || rawPlan === "pro")) {
        return { plan: "pf", hasAccess: true, hasPj: false, isTrial: false, trialDaysLeft: 0, trialEndsAt };
      }
      if (trialDaysLeft > 0) {
        return { plan: "trial", hasAccess: true, hasPj: true, isTrial: true, trialDaysLeft, trialEndsAt };
      }
      return { ...FREE_STATE, trialEndsAt };
    },
  });

  return query.data ?? FREE_STATE;
}
