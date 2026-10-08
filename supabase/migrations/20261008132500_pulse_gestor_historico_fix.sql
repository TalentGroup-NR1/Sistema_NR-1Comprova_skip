-- Correção Histórico Colaborador e Performance Resultados
CREATE OR REPLACE FUNCTION public.get_employee_pulse_history(p_employee_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(campaign_id uuid, campaign_title text, campaign_date date, question_id uuid, pergunta text, tipo text, resposta text, resposta_numerica integer, comentario text, esfera text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_gestor_id UUID;
BEGIN
  v_role := public.get_my_role()::TEXT;
  IF v_role IS NULL OR v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_role = 'gestor_departamento' THEN
    v_gestor_id := public.get_my_colaborador_id();
    IF v_gestor_id IS NULL THEN
      RETURN; -- Fail-closed
    END IF;
    -- Verificar subordinação
    IF NOT EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = p_employee_id AND c.gestor_id = v_gestor_id
    ) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    pc.id                                                      AS campaign_id,
    pc.titulo::TEXT                                            AS campaign_title,
    pc.data_inicio                                             AS campaign_date,
    pq.id                                                      AS question_id,
    pq.pergunta,
    pq.tipo::TEXT,
    pr.resposta,
    CASE
      WHEN pq.tipo = 'escala_0_5'                        THEN pr.resposta::INTEGER
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim'   THEN 5
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'nao'   THEN 0
      ELSE NULL
    END                                                        AS resposta_numerica,
    pr.comentario,
    pr.esfera,
    pr.created_at
  FROM public.pulse_responses pr
  JOIN public.pulse_campaigns pc ON pr.campaign_id = pc.id
  JOIN public.pulse_questions pq ON pr.question_id = pq.id
  WHERE pr.employee_id = p_employee_id
  ORDER BY pr.created_at DESC
  LIMIT p_limit;
END;
$function$;

-- Índices para Performance e Etapas Futuras
CREATE INDEX IF NOT EXISTS idx_pulse_responses_campaign_created ON public.pulse_responses (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_acompanhamentos_colab ON public.pulse_acompanhamentos (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_pulse_acompanhamentos_resp ON public.pulse_acompanhamentos (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_pulse_acompanhamentos_status ON public.pulse_acompanhamentos (status);
