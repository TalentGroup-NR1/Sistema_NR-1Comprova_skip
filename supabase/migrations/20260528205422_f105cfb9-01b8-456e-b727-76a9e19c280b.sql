
-- RPC: editar batida de ponto (admin/RH)
CREATE OR REPLACE FUNCTION public.editar_batida_ponto(
  p_batida_id uuid,
  p_novo_horario timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_colab uuid;
  v_data_old date;
  v_data_new date;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    has_role(v_caller, 'admin_master'::app_role)
    OR has_role(v_caller, 'admin_empresa'::app_role)
    OR has_role(v_caller, 'analista_rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT colaborador_id, (data_hora AT TIME ZONE 'America/Sao_Paulo')::date
    INTO v_colab, v_data_old
  FROM public.ponto_registros
  WHERE id = p_batida_id;

  IF v_colab IS NULL THEN
    RAISE EXCEPTION 'Batida não encontrada';
  END IF;

  UPDATE public.ponto_registros
     SET data_hora = p_novo_horario,
         ajuste_manual = true,
         ajustado_por = v_caller,
         ajuste_motivo = COALESCE(ajuste_motivo, 'Editado pelo admin')
   WHERE id = p_batida_id;

  v_data_new := (p_novo_horario AT TIME ZONE 'America/Sao_Paulo')::date;

  -- Trigger já recalcula a data nova; se mudou de dia, recalcula a antiga também
  IF v_data_old IS DISTINCT FROM v_data_new THEN
    PERFORM public.recalcular_resumo_diario(v_colab, v_data_old);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.editar_batida_ponto(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_batida_ponto(uuid, timestamptz) TO authenticated;

-- RPC: excluir batida de ponto (admin/RH)
CREATE OR REPLACE FUNCTION public.excluir_batida_ponto(p_batida_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    has_role(v_caller, 'admin_master'::app_role)
    OR has_role(v_caller, 'admin_empresa'::app_role)
    OR has_role(v_caller, 'analista_rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Trigger trg_ponto_recalc_resumo recalcula o dia automaticamente
  DELETE FROM public.ponto_registros WHERE id = p_batida_id;
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_batida_ponto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_batida_ponto(uuid) TO authenticated;
