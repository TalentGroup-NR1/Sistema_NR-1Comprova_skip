
CREATE OR REPLACE FUNCTION public.ponto_registros_block_collab_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Bypass for server-side / admin contexts
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  -- Admins and HR analysts can edit freely
  IF v_role IN ('admin_master','admin_empresa','analista_rh','gestor_departamento') THEN
    RETURN NEW;
  END IF;

  -- Collaborators may only change exclusion request columns
  IF NEW.status_aprovacao IS DISTINCT FROM OLD.status_aprovacao
     OR NEW.ajuste_manual  IS DISTINCT FROM OLD.ajuste_manual
     OR NEW.tipo           IS DISTINCT FROM OLD.tipo
     OR NEW.data_hora      IS DISTINCT FROM OLD.data_hora
     OR NEW.colaborador_id IS DISTINCT FROM OLD.colaborador_id
     OR NEW.company_id     IS DISTINCT FROM OLD.company_id
     OR NEW.aprovado_por   IS DISTINCT FROM OLD.aprovado_por
     OR NEW.aprovado_em    IS DISTINCT FROM OLD.aprovado_em
     OR NEW.motivo_ajuste  IS DISTINCT FROM OLD.motivo_ajuste
  THEN
    RAISE EXCEPTION 'Colaboradores nao podem alterar este campo do registro de ponto (somente solicitar exclusao).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_registros_block_collab_changes ON public.ponto_registros;
CREATE TRIGGER trg_ponto_registros_block_collab_changes
BEFORE UPDATE ON public.ponto_registros
FOR EACH ROW
EXECUTE FUNCTION public.ponto_registros_block_collab_changes();
