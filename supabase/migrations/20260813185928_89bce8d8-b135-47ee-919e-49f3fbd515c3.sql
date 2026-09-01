-- 1. Função de escopo do admin_master (somente empresas internas)
CREATE OR REPLACE FUNCTION public.admin_master_scope(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin_master(auth.uid())
     AND (
       _company_id IS NULL
       OR EXISTS (
         SELECT 1 FROM public.companies c
         WHERE c.id = _company_id AND c.is_internal = true
       )
     );
$$;

REVOKE EXECUTE ON FUNCTION public.admin_master_scope(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_master_scope(uuid) TO authenticated, service_role;

-- 2. Reescrita automatizada das policies que mencionam admin_master
DO $do$
DECLARE
  r record;
  expr text;
  nq text;
  nc text;
  stmt text;
  n int := 0;
  child_map jsonb := jsonb_build_object(
    'companies', 'companies.id',
    'avaliacoes', '(SELECT ca.company_id FROM public.ciclos_avaliacao ca WHERE ca.id = avaliacoes.ciclo_id)',
    'avaliacao_links', '(SELECT ca.company_id FROM public.avaliacoes av JOIN public.ciclos_avaliacao ca ON ca.id = av.ciclo_id WHERE av.id = avaliacao_links.avaliacao_id)',
    'avaliacao_respostas_competencias', '(SELECT ca.company_id FROM public.avaliacoes av JOIN public.ciclos_avaliacao ca ON ca.id = av.ciclo_id WHERE av.id = avaliacao_respostas_competencias.avaliacao_id)',
    'avaliacao_respostas_objetivos', '(SELECT ca.company_id FROM public.avaliacoes av JOIN public.ciclos_avaliacao ca ON ca.id = av.ciclo_id WHERE av.id = avaliacao_respostas_objetivos.avaliacao_id)',
    'competencias_ciclo', '(SELECT ca.company_id FROM public.ciclos_avaliacao ca WHERE ca.id = competencias_ciclo.ciclo_id)',
    'objetivos_ciclo', '(SELECT ca.company_id FROM public.ciclos_avaliacao ca WHERE ca.id = objetivos_ciclo.ciclo_id)',
    'metricas_avaliacao', '(SELECT ca.company_id FROM public.ciclos_avaliacao ca WHERE ca.id = metricas_avaliacao.ciclo_id)',
    'metricas_valores', '(SELECT ca.company_id FROM public.metricas_avaliacao ma JOIN public.ciclos_avaliacao ca ON ca.id = ma.ciclo_id WHERE ma.id = metricas_valores.metrica_id)',
    'banco_horas_fechamentos_auditoria', '(SELECT f.company_id FROM public.banco_horas_fechamentos f WHERE f.id = banco_horas_fechamentos_auditoria.fechamento_id)',
    'beneficios_materiais', '(SELECT b.company_id FROM public.beneficios b WHERE b.id = beneficios_materiais.beneficio_id)',
    'certificates_audit_logs', '(SELECT ce.company_id FROM public.certificates ce WHERE ce.id = certificates_audit_logs.certificate_id)',
    'colaborador_beneficios', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = colaborador_beneficios.colaborador_id)',
    'comunicados_anexos', '(SELECT cm.company_id FROM public.comunicados cm WHERE cm.id = comunicados_anexos.comunicado_id)',
    'comunicados_visualizacoes', '(SELECT cm.company_id FROM public.comunicados cm WHERE cm.id = comunicados_visualizacoes.comunicado_id)',
    'dependentes', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = dependentes.colaborador_id)',
    'desligamentos_colaborador', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = desligamentos_colaborador.colaborador_id)',
    'transferencias_colaborador', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = transferencias_colaborador.colaborador_id)',
    'envios_cuidar_plus', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = envios_cuidar_plus.colaborador_id)',
    'psico_atribuicoes', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = psico_atribuicoes.colaborador_id)',
    'treinamento_logs_acesso', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = treinamento_logs_acesso.colaborador_id)',
    'treinamento_progresso', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = treinamento_progresso.colaborador_id)',
    'treinamento_aula_progresso', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = treinamento_aula_progresso.colaborador_id)',
    'treinamento_quiz_tentativas', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = treinamento_quiz_tentativas.colaborador_id)',
    'treinamento_quiz_config', '(SELECT t.company_id FROM public.treinamentos t WHERE t.id = treinamento_quiz_config.treinamento_id)',
    'treinamento_quiz_perguntas', '(SELECT t.company_id FROM public.treinamentos t WHERE t.id = treinamento_quiz_perguntas.treinamento_id)',
    'treinamento_quiz_alternativas', '(SELECT t.company_id FROM public.treinamento_quiz_perguntas qp JOIN public.treinamentos t ON t.id = qp.treinamento_id WHERE qp.id = treinamento_quiz_alternativas.pergunta_id)',
    'pulse_responses', '(SELECT pc.company_id FROM public.pulse_campaigns pc WHERE pc.id = pulse_responses.campaign_id)',
    'pulse_questions', '(SELECT pc.company_id FROM public.pulse_campaigns pc WHERE pc.id = pulse_questions.campaign_id)',
    'pulse_access_logs', '(SELECT pc.company_id FROM public.pulse_campaigns pc WHERE pc.id = pulse_access_logs.campaign_id)',
    'dimensoes_questionario_cuidar_plus', '(SELECT q.company_id FROM public.questionarios_cuidar_plus q WHERE q.id = dimensoes_questionario_cuidar_plus.questionario_id)',
    'perguntas_cuidar_plus', '(SELECT q.company_id FROM public.questionarios_cuidar_plus q WHERE q.id = perguntas_cuidar_plus.questionario_id)',
    'respostas_cuidar_plus', '(SELECT q.company_id FROM public.perguntas_cuidar_plus pg JOIN public.questionarios_cuidar_plus q ON q.id = pg.questionario_id WHERE pg.id = respostas_cuidar_plus.pergunta_id)',
    'feedback_responses', '(SELECT fc.company_id FROM public.feedback_cycles fc WHERE fc.id = feedback_responses.feedback_cycle_id)',
    'questions', '(SELECT qt.company_id FROM public.questionnaire_templates qt WHERE qt.id = questions.questionnaire_template_id)',
    'pgr_alteracoes', '(SELECT d.company_id FROM public.pgr_documentos d WHERE d.id = pgr_alteracoes.documento_id)',
    'pgr_psicossocial_dominios', '(SELECT d.company_id FROM public.pgr_documentos d WHERE d.id = pgr_psicossocial_dominios.documento_id)',
    'pgr_secoes', '(SELECT d.company_id FROM public.pgr_documentos d WHERE d.id = pgr_secoes.documento_id)',
    'pgr_risco_detalhes', '(SELECT gr.company_id FROM public.nr1_ghe_riscos gr WHERE gr.id = pgr_risco_detalhes.risco_ghe_id)',
    'psico_avaliacao_ghes', '(SELECT pa.company_id FROM public.psico_avaliacoes pa WHERE pa.id = psico_avaliacao_ghes.avaliacao_id)',
    'psico_respostas', '(SELECT pa.company_id FROM public.psico_avaliacoes pa WHERE pa.id = psico_respostas.avaliacao_id)',
    'psico_dimensoes', '(SELECT pi.company_id FROM public.psico_instrumentos pi WHERE pi.id = psico_dimensoes.instrumento_id)',
    'psico_perguntas', '(SELECT pi.company_id FROM public.psico_instrumentos pi WHERE pi.id = psico_perguntas.instrumento_id)',
    'pdis', '(SELECT co.company_id FROM public.colaboradores co WHERE co.id = pdis.colaborador_id)',
    'pdi_itens', '(SELECT co.company_id FROM public.pdis p JOIN public.colaboradores co ON co.id = p.colaborador_id WHERE p.id = pdi_itens.pdi_id)',
    'pdi_checkins', '(SELECT co.company_id FROM public.pdi_itens pi2 JOIN public.pdis p ON p.id = pi2.pdi_id JOIN public.colaboradores co ON co.id = p.colaborador_id WHERE pi2.id = pdi_checkins.pdi_item_id)'
  );
  globais text[] := ARRAY['cbo_ocupacoes','cuidar_templates_fixos','nr1_regras_sugestao','replication_logs','security_rate_limit_logs','user_roles','platform_audit_logs'];
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname, p.qual, p.with_check,
           EXISTS (
             SELECT 1 FROM information_schema.columns c
             WHERE c.table_schema = 'public' AND c.table_name = p.tablename AND c.column_name = 'company_id'
           ) AS has_cid
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (coalesce(p.qual,'') || coalesce(p.with_check,'')) ILIKE '%admin_master%'
      AND NOT (p.tablename = ANY(globais))
  LOOP
    IF r.has_cid THEN
      expr := format('%I.company_id', r.tablename);
    ELSIF child_map ? r.tablename THEN
      expr := child_map ->> r.tablename;
    ELSE
      RAISE NOTICE 'SEM MAPEAMENTO: %.%', r.tablename, r.policyname;
      CONTINUE;
    END IF;

    nq := r.qual;
    nc := r.with_check;

    IF nq IS NOT NULL THEN
      nq := replace(nq, 'is_admin_master(auth.uid())', format('public.admin_master_scope(%s)', expr));
      nq := replace(nq, '(get_my_role() = ''admin_master''::app_role)', format('(public.admin_master_scope(%s))', expr));
      nq := replace(nq, 'has_role(auth.uid(), ''admin_master''::app_role)', format('public.admin_master_scope(%s)', expr));
    END IF;
    IF nc IS NOT NULL THEN
      nc := replace(nc, 'is_admin_master(auth.uid())', format('public.admin_master_scope(%s)', expr));
      nc := replace(nc, '(get_my_role() = ''admin_master''::app_role)', format('(public.admin_master_scope(%s))', expr));
      nc := replace(nc, 'has_role(auth.uid(), ''admin_master''::app_role)', format('public.admin_master_scope(%s)', expr));
    END IF;

    IF nq IS NOT DISTINCT FROM r.qual AND nc IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;
    END IF;

    stmt := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
    IF nq IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', nq);
    END IF;
    IF nc IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', nc);
    END IF;

    EXECUTE stmt;
    n := n + 1;
  END LOOP;

  RAISE NOTICE 'Policies ajustadas: %', n;
END
$do$;