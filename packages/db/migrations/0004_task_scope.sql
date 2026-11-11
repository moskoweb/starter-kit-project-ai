-- Organization collaborators own their own tasks; personal parents remain owner-bound.
CREATE OR REPLACE FUNCTION public.task_project_scope() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE parent public.projects%ROWTYPE;
BEGIN
  SELECT * INTO parent FROM public.projects WHERE id = NEW.project_id FOR SHARE;
  IF NOT FOUND
    OR parent.organization_id IS DISTINCT FROM NEW.organization_id
    OR (parent.organization_id IS NULL AND parent.owner_user_id IS DISTINCT FROM NEW.owner_user_id) THEN
    RAISE EXCEPTION 'Task project scope mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
