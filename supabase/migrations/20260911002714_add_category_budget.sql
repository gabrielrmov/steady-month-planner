-- Adds an optional monthly budget to each category, used to show
-- budget-vs-actual progress and over-budget alerts in the dashboard.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(14,2) CHECK (monthly_budget IS NULL OR monthly_budget >= 0);
