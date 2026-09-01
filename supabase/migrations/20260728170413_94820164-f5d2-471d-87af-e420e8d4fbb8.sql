ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_colaboradores_cargo ON public.colaboradores(cargo_id);

CREATE OR REPLACE FUNCTION public.sync_colaborador_cargo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cargo_nome text;
  v_dep_nome text;
BEGIN
  IF NEW.cargo_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.nome, d.nome
    INTO v_cargo_nome, v_dep_nome
  FROM public.cargos c
  JOIN public.ghes g ON g.id = c.ghe_id
  JOIN public.setores s ON s.id = g.setor_id
  JOIN public.departamentos d ON d.id = s.departamento_id
  WHERE c.id = NEW.cargo_id;

  IF v_cargo_nome IS NOT NULL THEN
    NEW.job_title := v_cargo_nome;
  END IF;
  IF v_dep_nome IS NOT NULL THEN
    NEW.department := v_dep_nome;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_colaborador_cargo ON public.colaboradores;
CREATE TRIGGER trg_sync_colaborador_cargo
BEFORE INSERT OR UPDATE OF cargo_id ON public.colaboradores
FOR EACH ROW EXECUTE FUNCTION public.sync_colaborador_cargo();