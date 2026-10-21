-- Migration: alinhar department no trigger sync_colaborador_cargo quando cargo_id possui GHE e departamento vinculado
CREATE OR REPLACE FUNCTION public.sync_colaborador_cargo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nome text;
  v_dep_nome text;
BEGIN
  IF NEW.cargo_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.cargo_id IS DISTINCT FROM OLD.cargo_id) THEN
    SELECT c.nome, d.nome
      INTO v_nome, v_dep_nome
    FROM public.cargos c
    LEFT JOIN public.ghes g ON g.id = c.ghe_id
    LEFT JOIN public.setores s ON s.id = g.setor_id
    LEFT JOIN public.departamentos d ON d.id = s.departamento_id
    WHERE c.id = NEW.cargo_id;

    IF v_nome IS NOT NULL THEN
      NEW.job_title := v_nome;
    END IF;
    IF v_dep_nome IS NOT NULL THEN
      NEW.department := v_dep_nome;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
