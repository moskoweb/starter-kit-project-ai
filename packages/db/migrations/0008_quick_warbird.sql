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
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_deliveries_event_subscription_unique" ON "push_deliveries" USING btree ("event_id","subscription_id");--> statement-breakpoint
CREATE INDEX "push_deliveries_due_idx" ON "push_deliveries" USING btree ("status","next_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_scope_idx" ON "push_subscriptions" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_read" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_insert" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_update" ON "push_subscriptions" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "push_subscriptions_actor_delete" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "push_subscriptions"."user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "push_subscriptions"."organization_id" is null) or ("push_subscriptions"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));
--> statement-breakpoint
ALTER TABLE "push_deliveries" ENABLE ROW LEVEL SECURITY;
