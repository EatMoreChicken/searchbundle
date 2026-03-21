CREATE TYPE "public"."target_mode" AS ENUM('fixed', 'income_replacement');

CREATE TABLE "retirement_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"mode" "target_mode" DEFAULT 'fixed' NOT NULL,
	"target_amount" numeric(15, 2) NOT NULL,
	"target_age" integer NOT NULL,
	"annual_income" numeric(15, 2),
	"withdrawal_rate" numeric(5, 4) DEFAULT '0.04',
	"expected_return" numeric(5, 4) DEFAULT '0.07',
	"inflation_rate" numeric(5, 4) DEFAULT '0.03',
	"include_inflation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "retirement_targets_household" UNIQUE("household_id")
);

ALTER TABLE "retirement_targets" ADD CONSTRAINT "retirement_targets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
