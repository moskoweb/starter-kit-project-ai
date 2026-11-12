CREATE TABLE "app_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"impersonated_by" uuid,
	"active_organization_id" uuid,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" uuid NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "totp_replay" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"last_step" bigint NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"organization_id" uuid,
	"entity_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "event_outbox_type" CHECK (char_length("event_outbox"."type") <= 100 and "event_outbox"."type" ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
	CONSTRAINT "event_outbox_status" CHECK ("event_outbox"."status" in ('pending', 'dispatched', 'done')),
	CONSTRAINT "event_outbox_attempts" CHECK ("event_outbox"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "event_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"organization_id" uuid,
	"event_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_event_id_unique" UNIQUE("event_id"),
	CONSTRAINT "notification_payload" CHECK (jsonb_typeof("notifications"."payload") = 'object' and jsonb_typeof("notifications"."payload"->'type') = 'string' and jsonb_typeof("notifications"."payload"->'entityId') = 'string' and "notifications"."payload" - 'type' - 'entityId' = '{}'::jsonb)
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
CREATE TABLE "push_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "push_deliveries_attempts" CHECK ("push_deliveries"."attempts" >= 0),
	CONSTRAINT "push_deliveries_status" CHECK ("push_deliveries"."status" in ('pending', 'leased', 'delivered', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "push_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_enabled" CHECK ("push_subscriptions"."enabled" in (true, false))
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "storage_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"organization_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storage_objects_entity_type_check" CHECK ("storage_objects"."entity_type" ~ '^[a-z][a-z0-9_-]{0,63}$'),
	CONSTRAINT "storage_objects_size_check" CHECK ("storage_objects"."size" between 1 and 10485760),
	CONSTRAINT "storage_objects_status_check" CHECK ("storage_objects"."status" in ('pending', 'ready'))
);
--> statement-breakpoint
ALTER TABLE "storage_objects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_impersonated_by_user_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "totp_replay" ADD CONSTRAINT "totp_replay_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_unique" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_daily_personal_unique" ON "ai_usage_daily" USING btree ("user_id","usage_date") WHERE "ai_usage_daily"."organization_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_daily_tenant_unique" ON "ai_usage_daily" USING btree ("user_id","usage_date","organization_id") WHERE "ai_usage_daily"."organization_id" is not null;--> statement-breakpoint
CREATE INDEX "event_outbox_pending_idx" ON "event_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id","organization_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_due_idx" ON "webhook_deliveries" USING btree ("status","next_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_event_unique" ON "webhook_deliveries" USING btree ("actor_user_id","organization_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_personal_event_unique" ON "webhook_deliveries" USING btree ("actor_user_id","event_id") WHERE "webhook_deliveries"."organization_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_receipts_endpoint_event_unique" ON "webhook_receipts" USING btree ("endpoint_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_deliveries_event_subscription_unique" ON "push_deliveries" USING btree ("event_id","subscription_id");--> statement-breakpoint
CREATE INDEX "push_deliveries_due_idx" ON "push_deliveries" USING btree ("status","next_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_scope_idx" ON "push_subscriptions" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "storage_objects_scope_idx" ON "storage_objects" USING btree ("organization_id","owner_user_id","entity_type","entity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "storage_objects_key_idx" ON "storage_objects" USING btree ("object_key");--> statement-breakpoint
CREATE POLICY "ai_usage_daily_read" ON "ai_usage_daily" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id");--> statement-breakpoint
CREATE POLICY "ai_usage_daily_insert" ON "ai_usage_daily" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id");--> statement-breakpoint
CREATE POLICY "ai_usage_daily_update" ON "ai_usage_daily" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id") WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and nullif(current_setting('app.current_user_id', true), '')::uuid = "ai_usage_daily"."user_id" and nullif(current_setting('app.current_tenant_id', true), '')::uuid is not distinct from "ai_usage_daily"."organization_id");--> statement-breakpoint
CREATE POLICY "outbox_actor_read" ON "event_outbox" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "event_outbox"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "event_outbox"."organization_id" is null) or ("event_outbox"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "outbox_actor_insert" ON "event_outbox" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "event_outbox"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "event_outbox"."organization_id" is null) or ("event_outbox"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))) and "event_outbox"."status" = 'pending');--> statement-breakpoint
CREATE POLICY "notification_read" ON "notifications" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "notification_insert" ON "notifications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))) and exists (select 1 from event_outbox e where e.id = "notifications"."event_id" and e.actor_user_id = "notifications"."recipient_user_id" and e.organization_id is not distinct from "notifications"."organization_id" and "notifications"."payload" = jsonb_build_object('type', e.type, 'entityId', e.entity_id::text)));--> statement-breakpoint
CREATE POLICY "notification_update" ON "notifications" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "notification_delete" ON "notifications" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "webhook_deliveries_actor_read" ON "webhook_deliveries" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "webhook_deliveries_actor_insert" ON "webhook_deliveries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))) and "webhook_deliveries"."status" = 'pending');--> statement-breakpoint
CREATE POLICY "webhook_deliveries_actor_update" ON "webhook_deliveries" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "webhook_deliveries"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "webhook_deliveries"."organization_id" is null) or ("webhook_deliveries"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_read" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_insert" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_update" ON "push_subscriptions" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_delete" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "storage_objects_read" ON "storage_objects" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "storage_objects_create" ON "storage_objects" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "storage_objects_update" ON "storage_objects" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "storage_objects_delete" ON "storage_objects" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "storage_objects"."organization_id" is null and "storage_objects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "storage_objects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));