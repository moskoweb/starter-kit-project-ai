CREATE TABLE "ai_usage_daily" (
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"usage_date" date NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"reserved_output_tokens" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_daily_positive" CHECK ("ai_usage_daily"."requests" > 0 and "ai_usage_daily"."reserved_output_tokens" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"organization_id" uuid,
	"event_id" uuid NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_status_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_deliveries_status" CHECK ("webhook_deliveries"."status" in ('pending', 'queued', 'delivered', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"body_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_receipts_hash" CHECK ("webhook_receipts"."body_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "rate_limit_windows" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"organization_id" uuid,
	"project_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storage_objects_size_check" CHECK ("storage_objects"."size" between 1 and 10485760),
	CONSTRAINT "storage_objects_status_check" CHECK ("storage_objects"."status" in ('pending', 'ready'))
);
--> statement-breakpoint
ALTER TABLE "storage_objects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_daily_personal_unique" ON "ai_usage_daily" USING btree ("user_id","usage_date") WHERE "ai_usage_daily"."organization_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_daily_tenant_unique" ON "ai_usage_daily" USING btree ("user_id","usage_date","organization_id") WHERE "ai_usage_daily"."organization_id" is not null;--> statement-breakpoint
CREATE INDEX "webhook_deliveries_due_idx" ON "webhook_deliveries" USING btree ("status","next_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_event_unique" ON "webhook_deliveries" USING btree ("actor_user_id","organization_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_receipts_endpoint_event_unique" ON "webhook_receipts" USING btree ("endpoint_id","event_id");--> statement-breakpoint
CREATE INDEX "storage_objects_scope_idx" ON "storage_objects" USING btree ("organization_id","owner_user_id","project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "storage_objects_key_idx" ON "storage_objects" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "projects_id_organization_scope_idx" ON "projects" USING btree ("id","organization_id");--> statement-breakpoint
CREATE POLICY "ai_usage_daily_read" ON "ai_usage_daily" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id");--> statement-breakpoint
CREATE POLICY "ai_usage_daily_insert" ON "ai_usage_daily" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id");--> statement-breakpoint
CREATE POLICY "ai_usage_daily_update" ON "ai_usage_daily" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id") WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id");--> statement-breakpoint
CREATE POLICY "webhook_deliveries_actor_read" ON "webhook_deliveries" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "webhook_deliveries_actor_insert" ON "webhook_deliveries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))) and "webhook_deliveries"."status" = 'pending');--> statement-breakpoint
CREATE POLICY "webhook_deliveries_actor_update" ON "webhook_deliveries" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "storage_objects_read" ON "storage_objects" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "storage_objects_create" ON "storage_objects" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "storage_objects_update" ON "storage_objects" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "storage_objects_delete" ON "storage_objects" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));