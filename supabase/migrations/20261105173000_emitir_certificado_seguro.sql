-- Migration: 20261105173000_emitir_certificado_seguro.sql
-- ETAPA 9.5: Emissão de certificado condicionada à Regra de Ouro (pode_certificar)

CREATE OR REPLACE FUNCTION public.emitir_certificado_seguro(
  _treinamento_id uuid
) RETURNS TABLE (
  certificate_id uuid,
  certificate_code text,
  ja_existia boolean
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_colaborador_id uuid;
  v_colaborador_nome text;
  v_company uuid;
  v_gera boolean;
  v_tipo text;
  v_titulo text;
  v_duracao integer;
  v_carga integer;
  v_pode boolean;
  v_existente uuid;
  v_code text;
  v_novo uuid;
  v_progresso_id uuid;
  v_data_conclusao timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão não autenticada';
  END IF;

  SELECT t.gera_certificado, t.tipo, t.titulo, t.duracao_estimada_minutos
  INTO v_gera, v_tipo, v_titulo, v_duracao
  FROM public.treinamentos t WHERE t.id = _treinamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treinamento não encontrado';
  END IF;

  IF v_tipo = 'link' OR v_gera IS NOT TRUE THEN
    RAISE EXCEPTION 'Este treinamento não emite certificado da plataforma.';
  END IF;

  SELECT p.pode_certificar INTO v_pode
  FROM public.get_progresso_treinamento(_treinamento_id, v_user) p;

  IF v_pode IS NOT TRUE THEN
    RAISE EXCEPTION 'Requisitos de conclusão não atendidos (aulas ou avaliação pendentes).';
  END IF;

  -- Obter colaborador vinculado ao usuário autenticado
  SELECT col.id, col.company_id, col.full_name
  INTO v_colaborador_id, v_company, v_colaborador_nome
  FROM public.colaboradores col
  WHERE col.user_id = v_user
  LIMIT 1;

  IF v_colaborador_id IS NULL THEN
    RAISE EXCEPTION 'Registro de colaborador não encontrado para o usuário.';
  END IF;

  IF v_company IS NULL THEN
    SELECT prof.company_id INTO v_company FROM public.profiles prof WHERE prof.id = v_user;
  END IF;

  -- Idempotência: retorna o certificado existente se já emitido
  SELECT c.id, c.certificate_code INTO v_existente, v_code
  FROM public.certificates c
  WHERE c.treinamento_id = _treinamento_id
    AND c.colaborador_id = v_colaborador_id
    AND c.status <> 'revogado'
  LIMIT 1;

  IF v_existente IS NOT NULL THEN
    RETURN QUERY SELECT v_existente, v_code, true;
    RETURN;
  END IF;

  -- Obter ou criar registro de treinamento_progresso
  SELECT tp.id, tp.concluido_em INTO v_progresso_id, v_data_conclusao
  FROM public.treinamento_progresso tp
  WHERE tp.treinamento_id = _treinamento_id
    AND tp.colaborador_id = v_colaborador_id
  LIMIT 1;

  IF v_progresso_id IS NULL THEN
    INSERT INTO public.treinamento_progresso (
      treinamento_id, colaborador_id, status, concluido_em
    ) VALUES (
      _treinamento_id, v_colaborador_id, 'concluido', now()
    ) RETURNING id, concluido_em INTO v_progresso_id, v_data_conclusao;
  ELSE
    IF v_data_conclusao IS NULL THEN
      UPDATE public.treinamento_progresso
      SET status = 'concluido', concluido_em = now()
      WHERE id = v_progresso_id;
      v_data_conclusao := now();
    END IF;
  END IF;

  v_carga := round(COALESCE(v_duracao, 0)::numeric / 60.0);
  v_code := 'CERT-' || to_char(now(),'YYYY') || '-'
            || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  INSERT INTO public.certificates (
    company_id,
    colaborador_id,
    treinamento_id,
    progresso_id,
    certificate_code,
    colaborador_nome,
    treinamento_titulo,
    carga_horaria,
    data_conclusao,
    issue_date,
    issued_by,
    issued_by_type,
    status
  ) VALUES (
    v_company,
    v_colaborador_id,
    _treinamento_id,
    v_progresso_id,
    v_code,
    v_colaborador_nome,
    v_titulo,
    v_carga,
    COALESCE(v_data_conclusao, now()),
    now(),
    v_user,
    'colaborador',
    'ativo'
  ) RETURNING id INTO v_novo;

  -- Log de auditoria
  INSERT INTO public.certificates_audit_logs (
    certificate_id,
    action,
    performed_by,
    details
  ) VALUES (
    v_novo,
    'emitido',
    v_user,
    jsonb_build_object('issued_by_type', 'colaborador', 'emissao_segura', true)
  );

  RETURN QUERY SELECT v_novo, v_code, false;
END;
$$;

-- Permissões na RPC
REVOKE ALL ON FUNCTION public.emitir_certificado_seguro(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emitir_certificado_seguro(uuid) TO authenticated;

-- Bloqueio de inserção direta em public.certificates
REVOKE INSERT, DELETE ON public.certificates FROM authenticated;
REVOKE INSERT, DELETE ON public.certificates FROM anon;

DROP POLICY IF EXISTS "Colaborador can insert own certificate" ON public.certificates;
DROP POLICY IF EXISTS "Admin can insert certificates" ON public.certificates;
