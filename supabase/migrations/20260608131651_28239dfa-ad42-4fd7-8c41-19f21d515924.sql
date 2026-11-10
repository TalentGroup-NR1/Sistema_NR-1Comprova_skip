CREATE OR REPLACE FUNCTION public.fechar_espelho_mensal(p_company_id uuid, p_ano integer, p_mes integer, p_colaboradores_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inicio date;
  v_fim date;
  v_colab record;
  v_snapshot jsonb;
  v_totals record;
  v_sucesso int := 0;
  v_total int := 0;
  v_erros jsonb := '[]'::jsonb;
  v_uid uuid := auth.uid();
BEGIN
  IF NOT (
    public.has_role(v_uid,'admin_master')
    OR (
      (public.has_role(v_uid,'admin_empresa') OR public.has_role(v_uid,'analista_rh'))
      AND public.get_my_company_id() = p_company_id
    )
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  v_inicio := make_date(p_ano, p_mes, 1);
  v_fim := (v_inicio + interval '1 month - 1 day')::date;

  FOR v_colab IN
    SELECT id, full_name FROM public.colaboradores
    WHERE company_id = p_company_id
      AND status = 'ATIVO'
      AND contract_type IN ('CLT','Estágio','Aprendiz','Temporário')
      AND (p_colaboradores_ids IS NULL OR id = ANY(p_colaboradores_ids))
  LOOP
    v_total := v_total + 1;
    BEGIN
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.data), '[]'::jsonb)
        INTO v_snapshot
      FROM public.ponto_resumo_diario r
      WHERE r.colaborador_id = v_colab.id
        AND r.data BETWEEN v_inicio AND v_fim;

      SELECT
        COALESCE(SUM(horas_trabalhadas_minutos),0) AS trab,
        COALESCE(SUM(horas_extras_minutos),0) AS extras,
        COALESCE(SUM(horas_noturnas_minutos),0) AS noturnas,
        COALESCE(SUM(saldo_minutos),0) AS saldo,
        COUNT(*) FILTER (WHERE horas_trabalhadas_minutos = 0 AND horas_previstas_minutos > 0 AND status::text <> 'ABONADO') AS faltas,
        COUNT(*) FILTER (WHERE status::text = 'ABONADO') AS abonados
        INTO v_totals
      FROM public.ponto_resumo_diario
      WHERE colaborador_id = v_colab.id
        AND data BETWEEN v_inicio AND v_fim;

      INSERT INTO public.espelhos_ponto_mensais (
        company_id, colaborador_id, ano, mes, periodo_inicio, periodo_fim,
        status, horas_trabalhadas_minutos, horas_extras_minutos, horas_noturnas_minutos,
        horas_abonadas_minutos, saldo_minutos, dias_falta, dias_abonados,
        snapshot_jsonb, versao, fechado_por, fechado_em
      ) VALUES (
        p_company_id, v_colab.id, p_ano, p_mes, v_inicio, v_fim,
        'fechado', v_totals.trab, v_totals.extras, v_totals.noturnas,
        0, v_totals.saldo, v_totals.faltas, v_totals.abonados,
        v_snapshot, 1, v_uid, now()
      )
      ON CONFLICT (company_id, colaborador_id, ano, mes) DO UPDATE SET
        status = 'fechado',
        horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
        horas_extras_minutos = EXCLUDED.horas_extras_minutos,
        horas_noturnas_minutos = EXCLUDED.horas_noturnas_minutos,
        horas_abonadas_minutos = EXCLUDED.horas_abonadas_minutos,
        saldo_minutos = EXCLUDED.saldo_minutos,
        dias_falta = EXCLUDED.dias_falta,
        dias_abonados = EXCLUDED.dias_abonados,
        snapshot_jsonb = EXCLUDED.snapshot_jsonb,
        versao = espelhos_ponto_mensais.versao + 1,
        fechado_por = v_uid,
        fechado_em = now(),
        reaberto_por = NULL,
        reaberto_em = NULL,
        motivo_reabertura = NULL,
        assinatura_hash = NULL,
        assinatura_por = NULL,
        assinatura_em = NULL,
        assinatura_ip = NULL,
        pdf_url = NULL,
        updated_at = now();

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('colaborador_id', v_colab.id, 'nome', v_colab.full_name, 'erro', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'sucesso', v_sucesso, 'erros', v_erros,
                            'periodo_inicio', v_inicio, 'periodo_fim', v_fim);
END;
$function$;