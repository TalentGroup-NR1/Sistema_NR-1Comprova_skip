-- Aprovar férias gozo
CREATE OR REPLACE FUNCTION public.aprovar_ferias_gozo(p_gozo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_my_colab uuid;
  v_gozo RECORD;
BEGIN
  v_role := get_my_role();
  v_my_company := get_my_company_id();
  
  SELECT g.*, c.company_id as col_company_id, c.gestor_id
  INTO v_gozo
  FROM ferias_gozo g
  JOIN colaboradores c ON c.id = g.colaborador_id
  WHERE g.id = p_gozo_id;
  
  IF v_gozo IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  -- Authorization
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSIF v_role = 'gestor_departamento' THEN
    SELECT id INTO v_my_colab FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    IF v_gozo.gestor_id IS DISTINCT FROM v_my_colab THEN
      RAISE EXCEPTION 'Sem permissão para aprovar';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissão para aprovar';
  END IF;
  
  IF v_gozo.status <> 'planejado' THEN
    RAISE EXCEPTION 'Apenas solicitações planejadas podem ser aprovadas';
  END IF;
  
  UPDATE ferias_gozo
  SET status = 'aprovado',
      aprovado_por = auth.uid(),
      aprovado_em = now(),
      updated_at = now()
  WHERE id = p_gozo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_ferias_gozo(uuid) TO authenticated;

-- Recusar férias gozo
CREATE OR REPLACE FUNCTION public.recusar_ferias_gozo(p_gozo_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_my_colab uuid;
  v_gozo RECORD;
BEGIN
  v_role := get_my_role();
  v_my_company := get_my_company_id();
  
  SELECT g.*, c.company_id as col_company_id, c.gestor_id
  INTO v_gozo
  FROM ferias_gozo g
  JOIN colaboradores c ON c.id = g.colaborador_id
  WHERE g.id = p_gozo_id;
  
  IF v_gozo IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSIF v_role = 'gestor_departamento' THEN
    SELECT id INTO v_my_colab FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    IF v_gozo.gestor_id IS DISTINCT FROM v_my_colab THEN
      RAISE EXCEPTION 'Sem permissão para recusar';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissão para recusar';
  END IF;
  
  IF v_gozo.status NOT IN ('planejado','aprovado') THEN
    RAISE EXCEPTION 'Status atual não permite recusa';
  END IF;
  
  UPDATE ferias_gozo
  SET status = 'cancelado',
      observacoes = COALESCE(observacoes,'') || E'\n[Recusado em ' || to_char(now(),'DD/MM/YYYY') || ']: ' || COALESCE(p_motivo,'Sem motivo informado'),
      updated_at = now()
  WHERE id = p_gozo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recusar_ferias_gozo(uuid, text) TO authenticated;

-- Marcar como gozado
CREATE OR REPLACE FUNCTION public.marcar_ferias_gozadas(p_gozo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_gozo RECORD;
BEGIN
  v_role := get_my_role();
  v_my_company := get_my_company_id();
  
  SELECT g.*, c.company_id as col_company_id
  INTO v_gozo
  FROM ferias_gozo g
  JOIN colaboradores c ON c.id = g.colaborador_id
  WHERE g.id = p_gozo_id;
  
  IF v_gozo IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;
  
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  
  UPDATE ferias_gozo SET status='gozado', updated_at=now() WHERE id = p_gozo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_ferias_gozadas(uuid) TO authenticated;