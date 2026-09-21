-- Migration: 20260921151500_get_employee_report_data_rpc.sql
-- Descrição: Cria a RPC get_employee_report_data para o dossiê individual do colaborador no módulo Cuidar+ (Aba Relatório).
-- Finalidade: Fiscalização trabalhista (MTE / NR-1) e instrução de defesa em reclamatórias trabalhistas.

CREATE OR REPLACE FUNCTION public.get_employee_report_data(
  p_employee_id uuid,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_company_id uuid;
  v_colaborador jsonb;
  v_pulsos jsonb;
  v_acompanhamentos jsonb;
  v_regras text;
BEGIN
  -- 1) Validação de perfil com privilégio para auditar dados de RH/SST
  IF public.get_my_role() NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 2) Identificação do tenant da sessão ativa
  v_company_id := public.get_my_company_id();

  -- 3) Segurança de tenant estrita: o colaborador DEVE pertencer à empresa da sessão
  IF NOT EXISTS (
    SELECT 1 FROM public.colaboradores 
    WHERE id = p_employee_id 
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 4) Dados Cadastrais com Mascaramento de CPF (LGPD / Sigilo Fiscal)
  SELECT jsonb_build_object(
    'id', c.id,
    'full_name', c.full_name,
    'cpf', CASE
      WHEN c.cpf IS NULL OR TRIM(c.cpf) = '' THEN NULL
      WHEN length(regexp_replace(c.cpf, '\D', '', 'g')) = 11 THEN
        '***.' || substring(regexp_replace(c.cpf, '\D', '', 'g') from 4 for 3) || '.' || substring(regexp_replace(c.cpf, '\D', '', 'g') from 7 for 3) || '-**'
      ELSE '***.***.***-**'
    END,
    'cargo', c.job_title,
    'departamento', c.department,
    'admissao', c.admission_date,
    'status', c.status
  )
  INTO v_colaborador
  FROM public.colaboradores c
  WHERE c.id = p_employee_id
    AND c.company_id = v_company_id;

  -- 5) Consolidação dos Pulsos (Campanhas + Surveys Diretos)
  SELECT COALESCE(jsonb_agg(p_row), '[]'::jsonb)
  INTO v_pulsos
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'origem', p.origem,
      'campanha', p.campanha,
      'data_hora', p.data_hora,
      'pergunta', p.pergunta,
      'resposta', p.resposta,
      'score_numeric', p.score_numeric,
      'esfera', p.esfera,
      'comentario', p.comentario
    ) AS p_row
    FROM (
      -- A. Respostas de campanhas periódicas (pulse_responses)
      SELECT 
        pr.id,
        'campanha' AS origem,
        pc.titulo AS campanha,
        pr.created_at AS data_hora,
        pq.pergunta,
        pr.resposta,
        COALESCE(
          pr.score_numeric, 
          CASE WHEN pq.tipo = 'escala_0_5' AND pr.resposta ~ '^[0-9]+$' THEN pr.resposta::numeric ELSE NULL END
        ) AS score_numeric,
        pr.esfera,
        pr.comentario
      FROM public.pulse_responses pr
      JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
      LEFT JOIN public.pulse_questions pq ON pq.id = pr.question_id
      WHERE pr.employee_id = p_employee_id
        AND pc.company_id = v_company_id
        AND (p_data_inicio IS NULL OR pr.created_at::date >= p_data_inicio)
        AND (p_data_fim IS NULL OR pr.created_at::date <= p_data_fim)

      UNION ALL

      -- B. Respostas de surveys diretos (pulse_surveys)
      SELECT 
        ps.id,
        'pulso_direto' AS origem,
        NULL AS campanha,
        ps.created_at AS data_hora,
        'Como você avalia sua semana?' AS pergunta,
        ps.score::text AS resposta,
        ps.score::numeric AS score_numeric,
        NULL AS esfera,
        ps.comment AS comentario
      FROM public.pulse_surveys ps
      WHERE ps.employee_id = p_employee_id
        AND ps.company_id = v_company_id
        AND (p_data_inicio IS NULL OR ps.created_at::date >= p_data_inicio)
        AND (p_data_fim IS NULL OR ps.created_at::date <= p_data_fim)
    ) p
    ORDER BY p.data_hora ASC
  ) sub_pulsos;

  -- 6) Acompanhamentos e Ações Registradas (com resolução de nome e preservação de sigilo de e-mail)
  SELECT COALESCE(jsonb_agg(a_row), '[]'::jsonb)
  INTO v_acompanhamentos
  FROM (
    SELECT jsonb_build_object(
      'id', pa.id,
      'status', pa.status,
      'objetivo', pa.objetivo,
      'acoes', COALESCE(pa.acoes, '[]'::jsonb),
      'anotacoes', pa.anotacoes,
      'resultado', pa.resultado,
      'responsavel_nome', COALESCE(
        (SELECT NULLIF(TRIM(pr.full_name), '') FROM public.profiles pr WHERE pr.user_id = pa.responsavel_id LIMIT 1),
        (SELECT NULLIF(TRIM(col.full_name), '') FROM public.colaboradores col WHERE col.user_id = pa.responsavel_id LIMIT 1),
        (SELECT NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), '') FROM auth.users u WHERE u.id = pa.responsavel_id LIMIT 1),
        'RH'
      ),
      'criado_em', pa.created_at,
      'atualizado_em', pa.updated_at,
      'concluido_em', pa.concluido_em,
      'proximo_contato_em', pa.proximo_contato_em,
      'updated_by_nome', CASE 
        WHEN pa.updated_by IS NULL THEN NULL
        ELSE COALESCE(
          (SELECT NULLIF(TRIM(pr.full_name), '') FROM public.profiles pr WHERE pr.user_id = pa.updated_by LIMIT 1),
          (SELECT NULLIF(TRIM(col.full_name), '') FROM public.colaboradores col WHERE col.user_id = pa.updated_by LIMIT 1),
          (SELECT NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), '') FROM auth.users u WHERE u.id = pa.updated_by LIMIT 1),
          'RH'
        )
      END
    ) AS a_row
    FROM public.pulse_acompanhamentos pa
    WHERE pa.colaborador_id = p_employee_id
      AND pa.company_id = v_company_id
    ORDER BY pa.created_at ASC
  ) sub_acomp;

  -- 7) Registro Formal das Regras Aplicadas (Evidência Pericial/Fiscal)
  v_regras := 'Dossiê individual confidencial emitido em conformidade com a NR-1. ' ||
              'Apenas pulsos vinculados nominalmente ao colaborador solicitado foram incluídos; registros anônimos ou sem identificador foram estritamente excluídos. ' ||
              'Origens de pulso unificadas: pulse_responses (campanhas periódicas com perguntas e esferas) e pulse_surveys (pulsos diretos). ' ||
              'Nomes dos responsáveis foram resolvidos através da tabela institucional de perfis (public.profiles) com fallback neutro para RH, impedindo exposição de e-mails ou credenciais. ' ||
              'Mascaramento de CPF efetuado no nível de banco de dados (formato ***.XXX.XXX-**).';

  -- 8) Montagem do Payload Consolidado
  RETURN jsonb_build_object(
    'colaborador', v_colaborador,
    'filtro_aplicado', jsonb_build_object(
      'data_inicio', p_data_inicio,
      'data_fim', p_data_fim
    ),
    'pulsos', v_pulsos,
    'acompanhamentos', v_acompanhamentos,
    'regras_aplicadas', v_regras
  );
END;
$$;
