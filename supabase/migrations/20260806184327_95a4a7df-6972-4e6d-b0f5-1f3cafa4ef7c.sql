CREATE OR REPLACE FUNCTION public.pgr_save_risco_detalhe(p_risco_ghe_id uuid, p_detalhes jsonb)
RETURNS public.pgr_risco_detalhes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company uuid;
  v_row public.pgr_risco_detalhes;
BEGIN
  PERFORM public.require_admin_role();

  SELECT g.company_id INTO v_company
  FROM public.nr1_ghe_riscos r
  JOIN public.ghes g ON g.id = r.ghe_id
  WHERE r.id = p_risco_ghe_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Risco não encontrado';
  END IF;

  IF public.get_my_role() <> 'admin_master' AND v_company IS DISTINCT FROM public.get_my_company_id() THEN
    RAISE EXCEPTION 'Acesso negado a este risco';
  END IF;

  INSERT INTO public.pgr_risco_detalhes AS d (
    risco_ghe_id, fundamentacao_legal, lesoes_agravos, fontes_circunstancias,
    meio_propagacao, acoes_necessarias, observacao
  ) VALUES (
    p_risco_ghe_id,
    NULLIF(p_detalhes->>'fundamentacao_legal', ''),
    NULLIF(p_detalhes->>'lesoes_agravos', ''),
    NULLIF(p_detalhes->>'fontes_circunstancias', ''),
    NULLIF(p_detalhes->>'meio_propagacao', ''),
    NULLIF(p_detalhes->>'acoes_necessarias', ''),
    NULLIF(p_detalhes->>'observacao', '')
  )
  ON CONFLICT (risco_ghe_id) DO UPDATE SET
    fundamentacao_legal = EXCLUDED.fundamentacao_legal,
    lesoes_agravos = EXCLUDED.lesoes_agravos,
    fontes_circunstancias = EXCLUDED.fontes_circunstancias,
    meio_propagacao = EXCLUDED.meio_propagacao,
    acoes_necessarias = EXCLUDED.acoes_necessarias,
    observacao = EXCLUDED.observacao,
    updated_at = now()
  RETURNING d.* INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.pgr_save_risco_detalhe(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_save_risco_detalhe(uuid, jsonb) TO authenticated;