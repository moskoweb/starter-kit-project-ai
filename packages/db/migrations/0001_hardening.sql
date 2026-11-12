-- Owners also obey RLS: tables are owned by the migration role, apps connect with restricted roles.
ALTER TABLE "event_outbox" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Recipient may mark read, never retarget notification or change payload.
CREATE FUNCTION public.protect_notification_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NEW.id, NEW.recipient_user_id, NEW.organization_id, NEW.event_id, NEW.payload, NEW.created_at)
    IS DISTINCT FROM (OLD.id, OLD.recipient_user_id, OLD.organization_id, OLD.event_id, OLD.payload, OLD.created_at) THEN
    RAISE EXCEPTION 'notification identity is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.protect_notification_identity() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER notification_identity BEFORE UPDATE ON "notifications" FOR EACH ROW EXECUTE FUNCTION public.protect_notification_identity();
--> statement-breakpoint
-- Storage rows are owned by one scope; moving them across users/tenants/entities is never allowed.
CREATE FUNCTION public.storage_object_scope_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NEW.id, NEW.owner_user_id, NEW.organization_id, NEW.entity_type, NEW.entity_id, NEW.object_key)
    IS DISTINCT FROM (OLD.id, OLD.owner_user_id, OLD.organization_id, OLD.entity_type, OLD.entity_id, OLD.object_key) THEN
    RAISE EXCEPTION 'storage object scope is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.storage_object_scope_immutable() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER storage_object_scope BEFORE UPDATE ON "storage_objects" FOR EACH ROW EXECUTE FUNCTION public.storage_object_scope_immutable();
