-- ============================================================================
-- MIGRATION: 20261019150000_fix_guard_module_enabled_tables_without_company_id.sql
-- OBJETIVO:
--   Corrigir a função genérica check_module_enabled_trigger() para suportar
--   tabelas que não possuem a coluna direta company_id (ex.: public.tasks
--   e public.desligamentos_colaborador), evitando a exceção PL/pgSQL
--   42703: record "new" has no field "company_id".
--
-- REGRAS:
--   a) Extração segura via to_jsonb(NEW) sem acesso direto estático a NEW.company_id.
--   b) Se a tabela tiver company_id não nulo -> utiliza diretamente (13 tabelas).
--   c) Se a tabela tiver user_id (ex.: tasks) -> resolve empresa do usuário via
--      public.get_user_company_id() / public.user_companies.
--   d) Se a tabela tiver colaborador_id (ex.: desligamentos_colaborador) -> resolve
--      empresa via public.colaboradores.
--   e) Se nenhuma empresa for resolvida -> RETURN NEW (não bloqueia operações sem escopo comercial).
--   f) Mantém exceção P0001 (fail-closed comercial) e assinatura SECURITY DEFINER intactas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_module_enabled_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_module_key text := TG_ARGV[0];
  v_company_id uuid;
  v_data jsonb;
  v_user_id uuid;
  v_colab_id uuid;
BEGIN
  v_data := to_jsonb(NEW);

  -- a) Se a tabela possui company_id direto e preenchido
  IF (v_data ? 'company_id') AND (v_data->>'company_id') IS NOT NULL THEN
    v_company_id := (v_data->>'company_id')::uuid;

  -- b) Se a tabela é indexada por user_id (ex.: public.tasks)
  ELSIF (v_data ? 'user_id') AND (v_data->>'user_id') IS NOT NULL THEN
    v_user_id := (v_data->>'user_id')::uuid;
    v_company_id := public.get_user_company_id(v_user_id);
    IF v_company_id IS NULL THEN
      SELECT company_id INTO v_company_id
      FROM public.user_companies
      WHERE user_id = v_user_id AND is_default = true
      LIMIT 1;
    END IF;
    IF v_company_id IS NULL THEN
      SELECT company_id INTO v_company_id
      FROM public.user_companies
      WHERE user_id = v_user_id
      LIMIT 1;
    END IF;

  -- c) Se a tabela é vinculada por colaborador_id (ex.: public.desligamentos_colaborador)
  ELSIF (v_data ? 'colaborador_id') AND (v_data->>'colaborador_id') IS NOT NULL THEN
    v_colab_id := (v_data->>'colaborador_id')::uuid;
    SELECT company_id INTO v_company_id
    FROM public.colaboradores
    WHERE id = v_colab_id;
  END IF;

  -- d) Se nenhuma empresa for resolvida, permite a operação
  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validação comercial com exceção P0001
  IF NOT public.is_module_enabled(v_company_id, v_module_key) THEN
    RAISE EXCEPTION 'Operação bloqueada: o módulo "%" não está contratado para esta empresa.', v_module_key
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
