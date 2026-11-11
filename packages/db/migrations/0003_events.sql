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
	CONSTRAINT "event_outbox_type" CHECK ("event_outbox"."type" = 'project.created'),
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
	CONSTRAINT "notification_payload" CHECK (jsonb_typeof("notifications"."payload") = 'object' and "notifications"."payload"->>'type' = 'project.created' and "notifications"."payload" ? 'projectId' and "notifications"."payload" - 'type' - 'projectId' = '{}'::jsonb)
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outbox" ADD CONSTRAINT "event_outbox_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_event_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_outbox_pending_idx" ON "event_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id","organization_id");--> statement-breakpoint
CREATE POLICY "outbox_actor_read" ON "event_outbox" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "event_outbox"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "event_outbox"."organization_id" is null) or ("event_outbox"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "outbox_actor_insert" ON "event_outbox" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "event_outbox"."actor_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "event_outbox"."organization_id" is null) or ("event_outbox"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))) and "event_outbox"."status" = 'pending');--> statement-breakpoint
CREATE POLICY "notification_read" ON "notifications" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "notification_insert" ON "notifications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))) and exists (select 1 from event_outbox e where e.id = "notifications"."event_id" and e.actor_user_id = "notifications"."recipient_user_id" and e.organization_id is not distinct from "notifications"."organization_id" and "notifications"."payload" = jsonb_build_object('type', e.type, 'projectId', e.entity_id::text)));--> statement-breakpoint
CREATE POLICY "notification_update" ON "notifications" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "notification_delete" ON "notifications" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and "notifications"."recipient_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "notifications"."organization_id" is null) or ("notifications"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid and m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid))));
--> statement-breakpoint
ALTER TABLE "event_outbox" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Recipient may mark read, never retarget notification or change payload.
CREATE FUNCTION protect_notification_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id, NEW.recipient_user_id, NEW.organization_id, NEW.event_id, NEW.payload, NEW.created_at)
   IS DISTINCT FROM (OLD.id, OLD.recipient_user_id, OLD.organization_id, OLD.event_id, OLD.payload, OLD.created_at) THEN
   RAISE EXCEPTION 'notification identity is immutable';
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER notification_identity BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION protect_notification_identity();