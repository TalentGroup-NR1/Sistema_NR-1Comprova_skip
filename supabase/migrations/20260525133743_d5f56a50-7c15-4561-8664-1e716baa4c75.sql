
DROP FUNCTION IF EXISTS public.replicate_beneficios_to_all_companies(uuid);

CREATE OR REPLACE FUNCTION public.replicate_beneficios_to_all_companies(p_source_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_target record;
  v_src_ben record;
  v_new_ben_id uuid;
  v_total_targets int := 0;
  v_total_created int := 0;
  v_total_skipped int := 0;
BEGIN
  -- Apenas admin_master pode replicar
  IF NOT is_admin_master(v_user_id) THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar benefícios';
  END IF;

  IF p_source_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa de origem é obrigatória';
  END IF;

  -- Itera sobre todas as outras empresas ativas
  FOR v_target IN
    SELECT id, name FROM companies
    WHERE status = 'active' AND id <> p_source_company_id
  LOOP
    v_total_targets := v_total_targets + 1;

    -- Para cada benefício da empresa de origem
    FOR v_src_ben IN
      SELECT * FROM beneficios WHERE company_id = p_source_company_id
    LOOP
      -- Pula se já existir benefício com mesmo nome na empresa alvo
      IF EXISTS (
        SELECT 1 FROM beneficios
        WHERE company_id = v_target.id AND lower(nome) = lower(v_src_ben.nome)
      ) THEN
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;

      INSERT INTO beneficios (
        company_id, nome, descricao, valor_mensal, operadora_fornecedor,
        ativo, empresa, instrucoes, importancia, link_externo, imagem_capa, categoria
      ) VALUES (
        v_target.id, v_src_ben.nome, v_src_ben.descricao, v_src_ben.valor_mensal,
        v_src_ben.operadora_fornecedor, v_src_ben.ativo, v_src_ben.empresa,
        v_src_ben.instrucoes, v_src_ben.importancia, v_src_ben.link_externo,
        v_src_ben.imagem_capa, v_src_ben.categoria
      )
      RETURNING id INTO v_new_ben_id;

      -- Copia materiais (PDF/PPT/Vídeo/Link) — reaproveita as URLs originais
      INSERT INTO beneficios_materiais (beneficio_id, tipo, titulo, arquivo_url, descricao, link_externo)
      SELECT v_new_ben_id, tipo, titulo, arquivo_url, descricao, link_externo
      FROM beneficios_materiais WHERE beneficio_id = v_src_ben.id;

      -- Copia tipos de contrato
      INSERT INTO beneficios_tipo_contrato (beneficio_id, tipo_contrato, company_id)
      SELECT v_new_ben_id, tipo_contrato, v_target.id
      FROM beneficios_tipo_contrato WHERE beneficio_id = v_src_ben.id;

      v_total_created := v_total_created + 1;

      INSERT INTO replication_logs (
        admin_user_id, record_type, source_record_id,
        source_company_id, target_company_id, success
      ) VALUES (
        v_user_id, 'beneficio', v_src_ben.id,
        p_source_company_id, v_target.id, true
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'total_target_companies', v_total_targets,
    'total_created', v_total_created,
    'total_skipped', v_total_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replicate_beneficios_to_all_companies(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.replicate_beneficios_to_all_companies(uuid) TO authenticated;
