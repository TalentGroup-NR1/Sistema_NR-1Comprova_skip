
-- =========================================================
-- PGR: tabelas
-- =========================================================

CREATE TABLE public.pgr_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  titulo text NOT NULL DEFAULT 'Programa de Gerenciamento de Riscos (PGR)',
  vigencia_inicio date,
  vigencia_fim date,
  cnae text,
  grau_risco text,
  endereco text,
  responsavel_tecnico jsonb NOT NULL DEFAULT '{}'::jsonb,
  anexo_art_path text,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_documentos TO authenticated;
GRANT ALL ON public.pgr_documentos TO service_role;
ALTER TABLE public.pgr_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgr_documentos_admin_company" ON public.pgr_documentos
  FOR ALL TO authenticated
  USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))
  WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')));

CREATE TABLE public.pgr_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.pgr_documentos(id) ON DELETE CASCADE,
  numero text,
  titulo text NOT NULL,
  conteudo text DEFAULT '',
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','automatico')),
  chave_automatica text CHECK (chave_automatica IS NULL OR chave_automatica IN ('caracterizacao','relacao_cargos','inventario_ghe','adendo_psicossocial','plano_acao')),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pgr_secoes_documento ON public.pgr_secoes(documento_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_secoes TO authenticated;
GRANT ALL ON public.pgr_secoes TO service_role;
ALTER TABLE public.pgr_secoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgr_secoes_admin_company" ON public.pgr_secoes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgr_documentos d WHERE d.id = documento_id
    AND (public.is_admin_master(auth.uid()) OR (d.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pgr_documentos d WHERE d.id = documento_id
    AND (public.is_admin_master(auth.uid()) OR (d.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))));

CREATE TABLE public.pgr_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.pgr_documentos(id) ON DELETE CASCADE,
  numero text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  historico text NOT NULL DEFAULT '',
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pgr_alteracoes_documento ON public.pgr_alteracoes(documento_id, data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_alteracoes TO authenticated;
GRANT ALL ON public.pgr_alteracoes TO service_role;
ALTER TABLE public.pgr_alteracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgr_alteracoes_admin_company" ON public.pgr_alteracoes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgr_documentos d WHERE d.id = documento_id
    AND (public.is_admin_master(auth.uid()) OR (d.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pgr_documentos d WHERE d.id = documento_id
    AND (public.is_admin_master(auth.uid()) OR (d.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))));

CREATE TABLE public.pgr_risco_detalhes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_ghe_id uuid NOT NULL UNIQUE REFERENCES public.nr1_ghe_riscos(id) ON DELETE CASCADE,
  fundamentacao_legal text DEFAULT '',
  lesoes_agravos text DEFAULT '',
  fontes_circunstancias text DEFAULT '',
  meio_propagacao text DEFAULT '',
  acoes_necessarias text DEFAULT '',
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_risco_detalhes TO authenticated;
GRANT ALL ON public.pgr_risco_detalhes TO service_role;
ALTER TABLE public.pgr_risco_detalhes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgr_risco_detalhes_admin_company" ON public.pgr_risco_detalhes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nr1_ghe_riscos r WHERE r.id = risco_ghe_id
    AND (public.is_admin_master(auth.uid()) OR (r.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nr1_ghe_riscos r WHERE r.id = risco_ghe_id
    AND (public.is_admin_master(auth.uid()) OR (r.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))));

CREATE TABLE public.pgr_psicossocial_dominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.pgr_documentos(id) ON DELETE CASCADE,
  nome_dominio text NOT NULL,
  grupo text NOT NULL DEFAULT 'I' CHECK (grupo IN ('I','II')),
  peso numeric NOT NULL DEFAULT 1,
  mediana numeric,
  classificacao text,
  polaridade text NOT NULL DEFAULT 'menor_melhor' CHECK (polaridade IN ('menor_melhor','maior_melhor')),
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pgr_psico_dominios_doc ON public.pgr_psicossocial_dominios(documento_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_psicossocial_dominios TO authenticated;
GRANT ALL ON public.pgr_psicossocial_dominios TO service_role;
ALTER TABLE public.pgr_psicossocial_dominios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgr_psico_dominios_admin_company" ON public.pgr_psicossocial_dominios
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgr_documentos d WHERE d.id = documento_id
    AND (public.is_admin_master(auth.uid()) OR (d.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pgr_documentos d WHERE d.id = documento_id
    AND (public.is_admin_master(auth.uid()) OR (d.company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin','admin_empresa','analista_rh','admin_master')))));

CREATE TRIGGER trg_pgr_documentos_updated BEFORE UPDATE ON public.pgr_documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pgr_secoes_updated BEFORE UPDATE ON public.pgr_secoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pgr_alteracoes_updated BEFORE UPDATE ON public.pgr_alteracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pgr_risco_detalhes_updated BEFORE UPDATE ON public.pgr_risco_detalhes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pgr_psico_dominios_updated BEFORE UPDATE ON public.pgr_psicossocial_dominios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Helper interno: valida acesso ao documento
-- =========================================================
CREATE OR REPLACE FUNCTION public.pgr_assert_documento_acesso(p_documento_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid;
BEGIN
  PERFORM public.require_admin_role();
  SELECT company_id INTO v_company FROM public.pgr_documentos WHERE id = p_documento_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Documento PGR não encontrado';
  END IF;
  IF NOT public.is_admin_master(auth.uid()) AND v_company <> public.get_my_company_id() THEN
    RAISE EXCEPTION 'Acesso negado ao documento PGR';
  END IF;
  RETURN v_company;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pgr_assert_documento_acesso(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_assert_documento_acesso(uuid) TO authenticated;

-- =========================================================
-- RPC 1: criar documento + seções padrão
-- =========================================================
CREATE OR REPLACE FUNCTION public.pgr_criar_documento(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_doc uuid;
BEGIN
  PERFORM public.require_admin_role();
  IF NOT public.is_admin_master(auth.uid()) AND p_company_id <> public.get_my_company_id() THEN
    RAISE EXCEPTION 'Acesso negado à empresa informada';
  END IF;

  INSERT INTO public.pgr_documentos (company_id) VALUES (p_company_id) RETURNING id INTO v_doc;

  INSERT INTO public.pgr_secoes (documento_id, numero, titulo, tipo, chave_automatica, ordem) VALUES
    (v_doc, '1',  'Objetivo', 'texto', NULL, 1),
    (v_doc, '2',  'Base legal e normativa', 'texto', NULL, 2),
    (v_doc, '3',  'Termos e definições', 'texto', NULL, 3),
    (v_doc, '4',  'Responsabilidades', 'texto', NULL, 4),
    (v_doc, '5',  'Campo de aplicação', 'texto', NULL, 5),
    (v_doc, '6',  'Identificação da empresa', 'texto', NULL, 6),
    (v_doc, '7',  'Caracterização da organização', 'automatico', 'caracterizacao', 7),
    (v_doc, '8',  'Relação de cargos e descrições', 'automatico', 'relacao_cargos', 8),
    (v_doc, '9',  'Metodologia de identificação de perigos', 'texto', NULL, 9),
    (v_doc, '10', 'Critérios de avaliação de riscos (matriz 5x5)', 'texto', NULL, 10),
    (v_doc, '11', 'Níveis de risco e priorização', 'texto', NULL, 11),
    (v_doc, '12', 'Medidas de prevenção e controle', 'texto', NULL, 12),
    (v_doc, '13', 'Monitoramento e reavaliação', 'texto', NULL, 13),
    (v_doc, '14', 'Emergências e situações especiais', 'texto', NULL, 14),
    (v_doc, '15', 'Registro, documentação e retenção', 'texto', NULL, 15),
    (v_doc, '16', 'Inventário de riscos por GHE', 'automatico', 'inventario_ghe', 16),
    (v_doc, '17', 'Adendo psicossocial', 'automatico', 'adendo_psicossocial', 17),
    (v_doc, '17.1', 'Definição de risco psicossocial', 'texto', NULL, 18),
    (v_doc, '17.2', 'Base legal e normativa do adendo', 'texto', NULL, 19),
    (v_doc, '17.3', 'Metodologia e pesquisa', 'texto', NULL, 20),
    (v_doc, '17.4', 'Critérios de classificação', 'texto', NULL, 21),
    (v_doc, '17.5', 'Amostragem e procedimento', 'texto', NULL, 22),
    (v_doc, '18', 'Plano de ação', 'automatico', 'plano_acao', 23),
    (v_doc, '19', 'Encerramento e responsável técnico', 'texto', NULL, 24);

  RETURN v_doc;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pgr_criar_documento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_criar_documento(uuid) TO authenticated;

-- =========================================================
-- RPC 2: get documento + seções
-- =========================================================
CREATE OR REPLACE FUNCTION public.pgr_get_documento(p_documento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM public.pgr_assert_documento_acesso(p_documento_id);

  SELECT jsonb_build_object(
    'documento', to_jsonb(d),
    'empresa', jsonb_build_object('id', c.id, 'nome', c.name, 'cnpj', c.cnpj, 'logo_url', c.logo_url),
    'secoes', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.ordem) FROM public.pgr_secoes s WHERE s.documento_id = d.id), '[]'::jsonb),
    'alteracoes', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.data) FROM public.pgr_alteracoes a WHERE a.documento_id = d.id), '[]'::jsonb)
  )
  INTO v_result
  FROM public.pgr_documentos d
  JOIN public.companies c ON c.id = d.company_id
  WHERE d.id = p_documento_id;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pgr_get_documento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_get_documento(uuid) TO authenticated;

-- =========================================================
-- RPC 3: salvar documento (checagem otimista)
-- =========================================================
CREATE OR REPLACE FUNCTION public.pgr_save_documento(
  p_documento_id uuid,
  p_titulo text,
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_cnae text,
  p_grau_risco text,
  p_endereco text,
  p_responsavel_tecnico jsonb,
  p_anexo_art_path text,
  p_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_current timestamptz;
BEGIN
  PERFORM public.pgr_assert_documento_acesso(p_documento_id);

  SELECT updated_at INTO v_current FROM public.pgr_documentos WHERE id = p_documento_id FOR UPDATE;
  IF p_updated_at IS NOT NULL AND v_current IS DISTINCT FROM p_updated_at THEN
    RAISE EXCEPTION 'Este documento foi alterado por outro usuário. Recarregue antes de salvar.';
  END IF;

  UPDATE public.pgr_documentos SET
    titulo = COALESCE(p_titulo, titulo),
    vigencia_inicio = p_vigencia_inicio,
    vigencia_fim = p_vigencia_fim,
    cnae = p_cnae,
    grau_risco = p_grau_risco,
    endereco = p_endereco,
    responsavel_tecnico = COALESCE(p_responsavel_tecnico, '{}'::jsonb),
    anexo_art_path = p_anexo_art_path
  WHERE id = p_documento_id;

  RETURN (SELECT to_jsonb(d) FROM public.pgr_documentos d WHERE d.id = p_documento_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pgr_save_documento(uuid, text, date, date, text, text, text, jsonb, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_save_documento(uuid, text, date, date, text, text, text, jsonb, text, timestamptz) TO authenticated;

-- =========================================================
-- RPC 4: salvar seções em lote (upsert + checagem otimista)
-- =========================================================
CREATE OR REPLACE FUNCTION public.pgr_save_secoes(p_documento_id uuid, p_secoes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_current timestamptz;
  v_incoming timestamptz;
BEGIN
  PERFORM public.pgr_assert_documento_acesso(p_documento_id);

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_secoes, '[]'::jsonb))
  LOOP
    v_id := NULLIF(v_item->>'id', '')::uuid;
    v_incoming := NULLIF(v_item->>'updated_at', '')::timestamptz;

    IF v_id IS NULL THEN
      INSERT INTO public.pgr_secoes (documento_id, numero, titulo, conteudo, tipo, chave_automatica, ordem, ativo)
      VALUES (
        p_documento_id,
        v_item->>'numero',
        COALESCE(v_item->>'titulo', 'Nova seção'),
        COALESCE(v_item->>'conteudo', ''),
        COALESCE(v_item->>'tipo', 'texto'),
        NULLIF(v_item->>'chave_automatica', ''),
        COALESCE((v_item->>'ordem')::int, 0),
        COALESCE((v_item->>'ativo')::boolean, true)
      );
    ELSE
      SELECT updated_at INTO v_current FROM public.pgr_secoes WHERE id = v_id AND documento_id = p_documento_id FOR UPDATE;
      IF v_current IS NULL THEN
        RAISE EXCEPTION 'Seção % não pertence a este documento', v_id;
      END IF;
      IF v_incoming IS NOT NULL AND v_current IS DISTINCT FROM v_incoming THEN
        RAISE EXCEPTION 'A seção "%" foi alterada por outro usuário. Recarregue antes de salvar.', COALESCE(v_item->>'titulo', v_id::text);
      END IF;

      UPDATE public.pgr_secoes SET
        numero = v_item->>'numero',
        titulo = COALESCE(v_item->>'titulo', titulo),
        conteudo = COALESCE(v_item->>'conteudo', conteudo),
        tipo = COALESCE(v_item->>'tipo', tipo),
        chave_automatica = NULLIF(v_item->>'chave_automatica', ''),
        ordem = COALESCE((v_item->>'ordem')::int, ordem),
        ativo = COALESCE((v_item->>'ativo')::boolean, ativo)
      WHERE id = v_id;
    END IF;
  END LOOP;

  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.ordem) FROM public.pgr_secoes s WHERE s.documento_id = p_documento_id), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pgr_save_secoes(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_save_secoes(uuid, jsonb) TO authenticated;

-- =========================================================
-- RPC 5: dados automáticos
-- =========================================================
CREATE OR REPLACE FUNCTION public.pgr_get_dados_automaticos(p_documento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company uuid;
  v_result jsonb;
BEGIN
  v_company := public.pgr_assert_documento_acesso(p_documento_id);

  SELECT jsonb_build_object(
    'headcount_total', (SELECT count(*) FROM public.colaboradores c WHERE c.company_id = v_company AND c.status = 'ATIVO'),
    'setores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'nome', s.nome, 'ambiente_fisico', s.ambiente_fisico,
        'localizacao', s.localizacao, 'andar', s.andar
      ) ORDER BY s.nome)
      FROM public.setores s WHERE s.company_id = v_company AND s.ativo
    ), '[]'::jsonb),
    'cargos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cg.id, 'nome', cg.nome, 'cbo_codigo', cg.cbo_codigo, 'cbo_descricao', cg.cbo_descricao,
        'ghe_id', cg.ghe_id, 'tarefa_prescrita', cg.tarefa_prescrita, 'tarefa_real', cg.tarefa_real,
        'carga_horaria_semanal', cg.carga_horaria_semanal,
        'headcount', (SELECT count(*) FROM public.colaboradores c WHERE c.cargo_id = cg.id AND c.status = 'ATIVO')
      ) ORDER BY cg.nome)
      FROM public.cargos cg WHERE cg.company_id = v_company AND cg.ativo
    ), '[]'::jsonb),
    'descricoes_cargo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', dc.id, 'titulo', dc.titulo, 'cargo_id', dc.cargo_id, 'ghe_id', dc.ghe_id,
        'cbo_codigo', dc.cbo_codigo, 'descricao_sumaria', dc.descricao_sumaria,
        'responsabilidades', dc.responsabilidades, 'formacao_academica', dc.formacao_academica,
        'fator_experiencia', dc.fator_experiencia, 'fator_complexidade', dc.fator_complexidade
      ) ORDER BY dc.titulo)
      FROM public.descricoes_cargo dc WHERE dc.company_id = v_company AND dc.ativo
    ), '[]'::jsonb),
    'ghes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id, 'codigo', g.codigo, 'nome', g.nome, 'descricao', g.descricao,
        'tipo_exposicao', g.tipo_exposicao,
        'setor', (SELECT s.nome FROM public.setores s WHERE s.id = g.setor_id),
        'cargos', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', cg.id, 'nome', cg.nome, 'cbo_codigo', cg.cbo_codigo) ORDER BY cg.nome)
                            FROM public.cargos cg WHERE cg.ghe_id = g.id AND cg.ativo), '[]'::jsonb),
        'riscos', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', r.id, 'nome_risco', r.nome_risco, 'categoria', r.categoria,
            'probabilidade', r.probabilidade, 'severidade', r.severidade, 'nivel_risco', r.nivel_risco,
            'fonte', r.fonte, 'descricao', r.descricao, 'controles_existentes', r.controles_existentes,
            'detalhes', jsonb_build_object(
              'fundamentacao_legal', COALESCE(pd.fundamentacao_legal, ''),
              'lesoes_agravos', COALESCE(pd.lesoes_agravos, ''),
              'fontes_circunstancias', COALESCE(pd.fontes_circunstancias, ''),
              'meio_propagacao', COALESCE(pd.meio_propagacao, ''),
              'acoes_necessarias', COALESCE(pd.acoes_necessarias, ''),
              'observacao', COALESCE(pd.observacao, '')
            )
          ) ORDER BY r.nivel_risco DESC NULLS LAST)
          FROM public.nr1_ghe_riscos r
          LEFT JOIN public.pgr_risco_detalhes pd ON pd.risco_ghe_id = r.id
          WHERE r.ghe_id = g.id AND r.ativo
        ), '[]'::jsonb)
      ) ORDER BY g.codigo)
      FROM public.ghes g WHERE g.company_id = v_company AND g.ativo
    ), '[]'::jsonb),
    'planos_acao', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pa.id,
        'numero', row_number() OVER (ORDER BY pa.prazo NULLS LAST, pa.created_at),
        'acao', pa.titulo,
        'descricao', pa.descricao,
        'obrigatoriedade', CASE WHEN pa.nivel_risco IN ('critico','alto') THEN 'Obrigatória' ELSE 'Recomendada' END,
        'responsavel', (SELECT col.full_name FROM public.colaboradores col WHERE col.id = pa.responsavel_id),
        'metodo', pa.nivel_intervencao,
        'data_prevista', pa.prazo,
        'local', COALESCE(pa.grupo_nome, pa.departamento),
        'status', pa.status,
        'prioridade_dias', CASE WHEN pa.prazo IS NULL THEN NULL ELSE (pa.prazo - CURRENT_DATE) END
      ))
      FROM public.nr1_planos_acao pa WHERE pa.company_id = v_company
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pgr_get_dados_automaticos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_get_dados_automaticos(uuid) TO authenticated;

-- =========================================================
-- RPC 6: dados psicossociais
-- =========================================================
CREATE OR REPLACE FUNCTION public.pgr_get_dados_psicossociais(p_documento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company uuid;
  v_dominios jsonb;
  v_score numeric;
  v_classificacao text;
BEGIN
  v_company := public.pgr_assert_documento_acesso(p_documento_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id, 'nome_dominio', d.nome_dominio, 'grupo', d.grupo, 'peso', d.peso,
    'mediana', d.mediana, 'classificacao', d.classificacao, 'polaridade', d.polaridade, 'ordem', d.ordem
  ) ORDER BY d.grupo, d.ordem), '[]'::jsonb)
  INTO v_dominios
  FROM public.pgr_psicossocial_dominios d
  WHERE d.documento_id = p_documento_id;

  SELECT CASE WHEN sum(d.peso) > 0 THEN round(sum(d.peso * COALESCE(d.mediana, 0)) / sum(d.peso), 2) END
  INTO v_score
  FROM public.pgr_psicossocial_dominios d
  WHERE d.documento_id = p_documento_id AND d.mediana IS NOT NULL;

  v_classificacao := CASE
    WHEN v_score IS NULL THEN 'Sem dados'
    WHEN v_score < 2.0 THEN 'Irrelevante'
    WHEN v_score < 2.6 THEN 'Baixo'
    WHEN v_score < 3.4 THEN 'Moderado'
    WHEN v_score < 4.2 THEN 'Alto'
    ELSE 'Crítico'
  END;

  RETURN jsonb_build_object(
    'dominios', v_dominios,
    'score_ponderado', v_score,
    'classificacao_geral', v_classificacao,
    'resultados_por_setor', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object(
          'setor', COALESCE(r.departamento, 'Não informado'),
          'respondentes', count(*),
          'escala_1', round(avg(r.escala_1_media)::numeric, 2),
          'escala_2', round(avg(r.escala_2_media)::numeric, 2),
          'escala_3', round(avg(r.escala_3_media)::numeric, 2),
          'escala_4', round(avg(r.escala_4_media)::numeric, 2)
        ) AS x
        FROM public.nr1_proart_respostas r
        WHERE r.company_id = v_company
        GROUP BY COALESCE(r.departamento, 'Não informado')
        ORDER BY COALESCE(r.departamento, 'Não informado')
      ) sub
    ), '[]'::jsonb),
    'planos_acao', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pa.id,
        'numero', row_number() OVER (ORDER BY pa.prazo NULLS LAST, pa.created_at),
        'acao', pa.titulo,
        'descricao', pa.descricao,
        'obrigatoriedade', CASE WHEN pa.nivel_risco IN ('critico','alto') THEN 'Obrigatória' ELSE 'Recomendada' END,
        'responsavel', (SELECT col.full_name FROM public.colaboradores col WHERE col.id = pa.responsavel_id),
        'metodo', pa.nivel_intervencao,
        'data_prevista', pa.prazo,
        'local', COALESCE(pa.grupo_nome, pa.departamento),
        'status', pa.status,
        'prioridade_dias', CASE WHEN pa.prazo IS NULL THEN NULL ELSE (pa.prazo - CURRENT_DATE) END,
        'dimensao', pa.dimensao_nome
      ))
      FROM public.nr1_planos_acao pa
      WHERE pa.company_id = v_company AND (pa.origem IS NULL OR pa.origem <> 'ocupacional')
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pgr_get_dados_psicossociais(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_get_dados_psicossociais(uuid) TO authenticated;
