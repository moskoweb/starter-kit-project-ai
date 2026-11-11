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
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"organization_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_impersonated_by_user_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "projects_scope_idx" ON "projects" USING btree ("organization_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_scope_idx" ON "tasks" USING btree ("organization_id","owner_user_id");--> statement-breakpoint
CREATE POLICY "domain_read" ON "projects" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "projects"."organization_id" is null and "projects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "projects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "domain_create" ON "projects" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "projects"."organization_id" is null and "projects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "projects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) and "projects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "domain_update" ON "projects" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "projects"."organization_id" is null and "projects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "projects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "projects"."organization_id" is null and "projects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "projects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "domain_delete" ON "projects" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "projects"."organization_id" is null and "projects"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "projects"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "domain_read" ON "tasks" AS PERMISSIVE FOR SELECT TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "tasks"."organization_id" is null and "tasks"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "tasks"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "domain_create" ON "tasks" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "tasks"."organization_id" is null and "tasks"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "tasks"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) and "tasks"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "domain_update" ON "tasks" AS PERMISSIVE FOR UPDATE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "tasks"."organization_id" is null and "tasks"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "tasks"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)))) WITH CHECK (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "tasks"."organization_id" is null and "tasks"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "tasks"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));--> statement-breakpoint
CREATE POLICY "domain_delete" ON "tasks" AS PERMISSIVE FOR DELETE TO public USING (nullif(current_setting('app.current_user_id', true), '')::uuid is not null and ((nullif(current_setting('app.current_tenant_id', true), '')::uuid is null and "tasks"."organization_id" is null and "tasks"."owner_user_id" = nullif(current_setting('app.current_user_id', true), '')::uuid) or (nullif(current_setting('app.current_tenant_id', true), '')::uuid is not null and "tasks"."organization_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid and exists (select 1 from member m where m.organization_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid and m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid))));
--> statement-breakpoint
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE FUNCTION public.identity_scope_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'Domain identity and scope are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER projects_scope_immutable BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION public.identity_scope_immutable();
--> statement-breakpoint
CREATE TRIGGER tasks_scope_immutable BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION public.identity_scope_immutable();
--> statement-breakpoint
CREATE FUNCTION public.task_project_scope() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE parent public.projects%ROWTYPE;
BEGIN
  SELECT * INTO parent FROM public.projects WHERE id = NEW.project_id FOR SHARE;
  IF NOT FOUND OR parent.organization_id IS DISTINCT FROM NEW.organization_id OR parent.owner_user_id IS DISTINCT FROM NEW.owner_user_id THEN
    RAISE EXCEPTION 'Task project scope mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER tasks_project_scope BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION public.task_project_scope();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.identity_scope_immutable(), public.task_project_scope() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON public.projects, public.tasks FROM PUBLIC;