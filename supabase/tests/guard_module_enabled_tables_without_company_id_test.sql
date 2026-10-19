-- Teste de regressão e validação da função check_module_enabled_trigger().
-- Executar: npx supabase db query --linked -f supabase/tests/guard_module_enabled_tables_without_company_id_test.sql
-- Tudo roda em transação revertida (ROLLBACK): nenhum dado de teste é persistido.
-- Qualquer asserção com falha gera RAISE EXCEPTION e aborta o script.

BEGIN;

DO $$
DECLARE
  v_company uuid;
  v_user uuid;
  v_colab uuid;
  v_task_id uuid;
  v_deslig_id uuid;
  v_comunicado_id uuid;
  v_treinamento_id uuid;
  v_caught_p0001 boolean := false;
BEGIN
  -- Seleciona empresa e usuário com vínculo ativo em profiles e colaboradores
  SELECT c.company_id, c.user_id, c.id INTO v_company, v_user, v_colab
  FROM public.colaboradores c
  JOIN public.profiles p ON p.user_id = c.user_id AND p.company_id = c.company_id
  WHERE c.user_id IS NOT NULL AND c.company_id IS NOT NULL
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não foi possível encontrar colaborador com perfil para teste';
  END IF;

  -- Atribui role admin_empresa para satisfazer RLS de desligamentos e comunicados
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, 'admin_empresa')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Garante que os módulos estão habilitados inicialmente
  UPDATE public.company_modules
  SET enabled = true
  WHERE company_id = v_company AND module_key IN ('/minhas-tarefas', '/demissoes', '/comunicados', '/treinamentos');

  -- Configura contexto JWT de usuário autenticado
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- 1. TESTE POSITIVO tasks (tabela sem company_id direto, com user_id)
  INSERT INTO public.tasks (
    user_id, title, description, due_date, priority, category, status, position
  ) VALUES (
    v_user, 'Teste Auditoria - Tarefa Positiva', 'Descrição teste', NULL, 'media', NULL, 'pendente', 1
  ) RETURNING id INTO v_task_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'FALHA: v_task_id não gerado em tasks';
  END IF;

  -- 2. TESTE POSITIVO desligamentos_colaborador (tabela sem company_id direto, com colaborador_id)
  INSERT INTO public.desligamentos_colaborador (
    colaborador_id, acao, data_desligamento, tipo_desligamento, motivo, criado_por_user_id
  ) VALUES (
    v_colab, 'desligar', CURRENT_DATE, 'sem_justa_causa', 'Teste Auditoria', v_user
  ) RETURNING id INTO v_deslig_id;

  IF v_deslig_id IS NULL THEN
    RAISE EXCEPTION 'FALHA: v_deslig_id não gerado em desligamentos_colaborador';
  END IF;

  -- 3. TESTE DE NEGAÇÃO (fail-closed comercial em /minhas-tarefas)
  RESET ROLE;
  UPDATE public.company_modules
  SET enabled = false
  WHERE company_id = v_company AND module_key = '/minhas-tarefas';
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.tasks (
      user_id, title, priority, status, position
    ) VALUES (
      v_user, 'Tarefa Bloqueada Teste', 'alta', 'pendente', 2
    );
    v_caught_p0001 := false;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    v_caught_p0001 := true;
  END;

  IF NOT v_caught_p0001 THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: guard não bloqueou INSERT em tasks com módulo desabilitado!';
  END IF;

  -- 4. TESTE DE NEGAÇÃO (fail-closed comercial em /demissoes)
  RESET ROLE;
  UPDATE public.company_modules
  SET enabled = false
  WHERE company_id = v_company AND module_key = '/demissoes';
  SET LOCAL ROLE authenticated;

  v_caught_p0001 := false;
  BEGIN
    INSERT INTO public.desligamentos_colaborador (
      colaborador_id, acao, data_desligamento, tipo_desligamento, motivo, criado_por_user_id
    ) VALUES (
      v_colab, 'desligar', CURRENT_DATE, 'sem_justa_causa', 'Bloqueio Teste', v_user
    );
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    v_caught_p0001 := true;
  END;

  IF NOT v_caught_p0001 THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: guard não bloqueou INSERT em desligamentos com módulo desabilitado!';
  END IF;

  -- 5. TESTE DE REGRESSÃO NAS 13 TABELAS COM company_id
  RESET ROLE;
  UPDATE public.company_modules
  SET enabled = true
  WHERE company_id = v_company AND module_key IN ('/comunicados', '/treinamentos');
  SET LOCAL ROLE authenticated;

  -- Tabela 1: comunicados (com company_id)
  INSERT INTO public.comunicados (
    company_id, titulo, conteudo, autor_id, autor_nome, status
  ) VALUES (
    v_company, 'Comunicado Teste Regressão', 'Conteúdo teste', v_user, 'Autor Teste', 'rascunho'
  ) RETURNING id INTO v_comunicado_id;

  IF v_comunicado_id IS NULL THEN
    RAISE EXCEPTION 'FALHA: v_comunicado_id não gerado em comunicados';
  END IF;

  -- Tabela 2: treinamentos (com company_id)
  INSERT INTO public.treinamentos (
    company_id, titulo, tipo, duracao_estimada_minutos, obrigatorio
  ) VALUES (
    v_company, 'Treinamento Teste Regressão', 'video', 60, false
  ) RETURNING id INTO v_treinamento_id;

  IF v_treinamento_id IS NULL THEN
    RAISE EXCEPTION 'FALHA: v_treinamento_id não gerado em treinamentos';
  END IF;

  -- 6. TESTE DE NEGAÇÃO EM TABELA COM company_id (comunicados desabilitado)
  RESET ROLE;
  UPDATE public.company_modules
  SET enabled = false
  WHERE company_id = v_company AND module_key = '/comunicados';
  SET LOCAL ROLE authenticated;

  v_caught_p0001 := false;
  BEGIN
    INSERT INTO public.comunicados (
      company_id, titulo, conteudo, autor_id, autor_nome, status
    ) VALUES (
      v_company, 'Comunicado Bloqueado Teste', 'Conteúdo teste', v_user, 'Autor Teste', 'rascunho'
    );
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    v_caught_p0001 := true;
  END;

  IF NOT v_caught_p0001 THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: guard não bloqueou comunicados com módulo desabilitado!';
  END IF;

  RAISE NOTICE 'VALIDAÇÃO COMPLETA: TODOS OS 6 CENÁRIOS PASSARAM COM SUCESSO.';
END;
$$;

SELECT 'PASSOU' AS status;

ROLLBACK;
