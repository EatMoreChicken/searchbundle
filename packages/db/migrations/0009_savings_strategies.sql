CREATE TYPE "public"."savings_strategy" AS ENUM('traditional', 'front_loaded', 'coast_fire', 'barista_fire', 'back_loaded');

ALTER TABLE "retirement_targets" ADD COLUMN "savings_strategy" "savings_strategy" DEFAULT 'traditional' NOT NULL;
ALTER TABLE "retirement_targets" ADD COLUMN "strategy_phase1_monthly" numeric(14, 2);
ALTER TABLE "retirement_targets" ADD COLUMN "strategy_phase1_years" integer;
ALTER TABLE "retirement_targets" ADD COLUMN "strategy_phase2_monthly" numeric(14, 2);
ALTER TABLE "retirement_targets" ADD COLUMN "strategy_annual_change_rate" numeric(5, 4);
