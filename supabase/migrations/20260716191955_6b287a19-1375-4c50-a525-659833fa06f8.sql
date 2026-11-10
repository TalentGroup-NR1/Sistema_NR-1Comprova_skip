
CREATE OR REPLACE FUNCTION public.get_espelho_responsavel(p_espelho_id uuid)
RETURNS TABLE (nome text, cargo text, fechado_em timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_fechado_em timestamptz;
  v_company_id uuid;
  v_colab_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  SELECT e.fechado_por, e.fechado_em, e.company_id, e.colaborador_id
    INTO v_user_id, v_fechado_em, v_company_id, v_colab_id
  FROM public.espelhos_ponto_mensais e
  WHERE e.id = p_espelho_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Autorização: dono do espelho OU admin/rh/gestor da mesma empresa
  IF NOT (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = v_colab_id AND c.user_id = v_caller)
    OR public.get_my_role() IN ('admin_master','admin_empresa','analista_rh','gestor_departamento')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(TRIM(c.full_name), ''),
      split_part(p.email, '@', 1),
      'Responsável pelo fechamento'
    )::text AS nome,
    c.job_title::text AS cargo,
    v_fechado_em AS fechado_em
  FROM (SELECT 1) x
  LEFT JOIN public.profiles p ON p.user_id = v_user_id
  LEFT JOIN public.colaboradores c ON c.user_id = v_user_id
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_espelho_responsavel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_espelho_responsavel(uuid) TO authenticated;
