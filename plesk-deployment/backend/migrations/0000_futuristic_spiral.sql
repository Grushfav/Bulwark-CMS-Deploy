CREATE TABLE IF NOT EXISTS "client_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"agent_id" integer NOT NULL,
	"note" text NOT NULL,
	"note_type" varchar(50) DEFAULT 'general',
	"is_private" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"date_of_birth" date,
	"employer" varchar(255),
	"status" varchar(20) DEFAULT 'prospect' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_text" text,
	"description" text,
	"content_url" varchar(500),
	"file_path" varchar(500),
	"file_name" varchar(255),
	"file_size" integer,
	"file_type" varchar(100),
	"file_extension" varchar(20),
	"mime_type" varchar(100),
	"author_id" integer NOT NULL,
	"category_id" integer,
	"tags" json,
	"is_featured" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_published" boolean DEFAULT false,
	"is_public" boolean DEFAULT true,
	"status" varchar(50) DEFAULT 'draft',
	"published_at" timestamp,
	"slug" varchar(255),
	"meta_description" text,
	"meta_keywords" text,
	"view_count" integer DEFAULT 0,
	"download_count" integer DEFAULT 0,
	"share_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "content_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"goal_type" varchar(20) NOT NULL,
	"metric_type" varchar(30) NOT NULL,
	"title" varchar(100),
	"target_value" numeric(12, 2) NOT NULL,
	"current_value" numeric(12, 2) DEFAULT '0',
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"reminder_date" timestamp NOT NULL,
	"is_completed" boolean DEFAULT false,
	"priority" varchar(20) DEFAULT 'medium',
	"type" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"premium_amount" numeric(10, 2) NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"commission_rate" numeric(5, 2),
	"sale_date" date NOT NULL,
	"policy_number" varchar(100),
	"status" varchar(20) DEFAULT 'active',
	"product_name" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"manager_id" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" varchar(20) DEFAULT 'agent' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"created_by" integer,
	"bio" text,
	"avatar_path" varchar(500),
	"phone" varchar(20),
	"date_of_birth" date,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"zip_code" varchar(20),
	"country" varchar(100),
	"linkedin_url" varchar(255),
	"twitter_url" varchar(255),
	"facebook_url" varchar(255),
	"website_url" varchar(255),
	"employee_id" varchar(50),
	"department" varchar(100),
	"position" varchar(100),
	"hire_date" date,
	"manager_id" integer,
	"timezone" varchar(50) DEFAULT 'UTC',
	"language" varchar(10) DEFAULT 'en',
	"date_format" varchar(20) DEFAULT 'MM/DD/YYYY',
	"time_format" varchar(10) DEFAULT '12h',
	"email_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"push_notifications" boolean DEFAULT true,
	"notify_sales_updates" boolean DEFAULT true,
	"notify_client_activities" boolean DEFAULT true,
	"notify_goal_progress" boolean DEFAULT true,
	"notify_reminders" boolean DEFAULT true,
	"notify_team_updates" boolean DEFAULT true,
	"profile_visibility" varchar(20) DEFAULT 'team',
	"show_contact_info" boolean DEFAULT true,
	"show_performance_stats" boolean DEFAULT true,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar(255),
	"password_changed_at" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"account_locked_until" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_client_idx" ON "client_notes" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_agent_idx" ON "client_notes" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "note_type_idx" ON "client_notes" ("note_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_agent_idx" ON "clients" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_status_idx" ON "clients" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_email_idx" ON "clients" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_author_idx" ON "content" ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_category_idx" ON "content" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_type_idx" ON "content" ("content_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_status_idx" ON "content" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_slug_idx" ON "content" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_agent_idx" ON "goals" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_type_idx" ON "goals" ("goal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_active_idx" ON "goals" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_agent_idx" ON "reminders" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_client_idx" ON "reminders" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_date_idx" ON "reminders" ("reminder_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_completed_idx" ON "reminders" ("is_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_agent_idx" ON "sales" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_client_idx" ON "sales" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_product_idx" ON "sales" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_date_idx" ON "sales" ("sale_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_status_idx" ON "sales" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_member_team_idx" ON "team_members" ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_member_user_idx" ON "team_members" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_team_user" ON "team_members" ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_idx" ON "users" ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manager_idx" ON "users" ("manager_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content" ADD CONSTRAINT "content_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content" ADD CONSTRAINT "content_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "content_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_parent_id_content_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "content_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminders" ADD CONSTRAINT "reminders_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminders" ADD CONSTRAINT "reminders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales" ADD CONSTRAINT "sales_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
