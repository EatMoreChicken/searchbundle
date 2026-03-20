-- Net Worth Tracker tables
CREATE TYPE "public"."category_type" AS ENUM('asset', 'liability');

CREATE TABLE "net_worth_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "type" "category_type" NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "net_worth_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "value" numeric(15, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "net_worth_categories" ADD CONSTRAINT "net_worth_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "net_worth_entries" ADD CONSTRAINT "net_worth_entries_category_id_net_worth_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."net_worth_categories"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "net_worth_entries" ADD CONSTRAINT "net_worth_entries_category_year_month" UNIQUE("category_id", "year", "month");
