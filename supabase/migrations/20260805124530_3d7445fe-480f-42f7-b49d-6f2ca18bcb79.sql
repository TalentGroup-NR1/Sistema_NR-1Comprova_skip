-- =========================================================
-- 1. TABELAS
-- =========================================================

CREATE TABLE public.psico_instrumentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  versao VARCHAR(30) NOT NULL DEFAULT '1.0',
  descricao TEXT,
  referencia_cientifica TEXT,
  editavel BOOLEAN NOT NULL DEFAULT TRUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_instrumentos TO authenticated;
GRANT ALL ON public.psico_instrumentos TO service_role;
ALTER TABLE public.psico_instrumentos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.psico_dimensoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrumento_id UUID NOT NULL REFERENCES public.psico_instrumentos(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  tipo_dimensao VARCHAR(30) NOT NULL DEFAULT 'negativa',
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT psico_dimensoes_tipo_chk CHECK (tipo_dimensao IN ('positiva','negativa'))
);
CREATE INDEX idx_psico_dimensoes_instrumento ON public.psico_dimensoes(instrumento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_dimensoes TO authenticated;
GRANT ALL ON public.psico_dimensoes TO service_role;
ALTER TABLE public.psico_dimensoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.psico_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrumento_id UUID NOT NULL REFERENCES public.psico_instrumentos(id) ON DELETE CASCADE,
  dimensao_id UUID REFERENCES public.psico_dimensoes(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  texto_pergunta TEXT NOT NULL,
  tipo_escala VARCHAR(50) NOT NULL DEFAULT 'likert_5',
  inverter_pontuacao BOOLEAN NOT NULL DEFAULT FALSE,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_psico_perguntas_instrumento ON public.psico_perguntas(instrumento_id);
CREATE INDEX idx_psico_perguntas_dimensao ON public.psico_perguntas(dimensao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_perguntas TO authenticated;
GRANT ALL ON public.psico_perguntas TO service_role;
ALTER TABLE public.psico_perguntas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.psico_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  instrumento_id UUID NOT NULL REFERENCES public.psico_instrumentos(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'rascunho',
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  modo_anonimato BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT psico_avaliacoes_status_chk CHECK (status IN ('rascunho','em_execucao','finalizada'))
);
CREATE INDEX idx_psico_avaliacoes_company ON public.psico_avaliacoes(company_id);
CREATE INDEX idx_psico_avaliacoes_instrumento ON public.psico_avaliacoes(instrumento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_avaliacoes TO authenticated;
GRANT ALL ON public.psico_avaliacoes TO service_role;
ALTER TABLE public.psico_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.psico_avaliacao_ghes (
  avaliacao_id UUID NOT NULL REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  ghe_id UUID NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  PRIMARY KEY (avaliacao_id, ghe_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_avaliacao_ghes TO authenticated;
GRANT ALL ON public.psico_avaliacao_ghes TO service_role;
ALTER TABLE public.psico_avaliacao_ghes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.psico_atribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  ghe_id UUID NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pendente',
  rascunho JSONB,
  data_atribuicao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resposta TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT psico_atribuicoes_status_chk CHECK (status IN ('pendente','em_andamento','preenchido')),
  UNIQUE (avaliacao_id, colaborador_id)
);
CREATE INDEX idx_psico_atribuicoes_avaliacao ON public.psico_atribuicoes(avaliacao_id);
CREATE INDEX idx_psico_atribuicoes_colaborador ON public.psico_atribuicoes(colaborador_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_atribuicoes TO authenticated;
GRANT ALL ON public.psico_atribuicoes TO service_role;
ALTER TABLE public.psico_atribuicoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.psico_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  ghe_id UUID NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  pergunta_id UUID NOT NULL REFERENCES public.psico_perguntas(id) ON DELETE CASCADE,
  valor_resposta INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_psico_respostas_avaliacao ON public.psico_respostas(avaliacao_id);
CREATE INDEX idx_psico_respostas_pergunta ON public.psico_respostas(pergunta_id);
GRANT SELECT ON public.psico_respostas TO authenticated;
GRANT ALL ON public.psico_respostas TO service_role;
ALTER TABLE public.psico_respostas ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. HELPERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.psico_is_rh()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.get_my_role() IN ('admin_master','admin_empresa','analista_rh');
$$;
REVOKE EXECUTE ON FUNCTION public.psico_is_rh() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_is_rh() TO authenticated;

CREATE OR REPLACE FUNCTION public.psico_instrumento_em_uso(_instrumento_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.psico_avaliacoes a
    WHERE a.instrumento_id = _instrumento_id
      AND a.status IN ('em_execucao','finalizada')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.psico_instrumento_em_uso(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psico_instrumento_em_uso(UUID) TO authenticated;

-- =========================================================
-- 3. POLICIES
-- =========================================================

CREATE POLICY "psico_instrumentos_select" ON public.psico_instrumentos
FOR SELECT TO authenticated
USING (company_id IS NULL OR company_id = public.get_my_company_id() OR public.is_admin_master(auth.uid()));

CREATE POLICY "psico_instrumentos_insert" ON public.psico_instrumentos
FOR INSERT TO authenticated
WITH CHECK (public.psico_is_rh() AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id()));

CREATE POLICY "psico_instrumentos_update" ON public.psico_instrumentos
FOR UPDATE TO authenticated
USING (public.psico_is_rh() AND editavel = TRUE AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id()))
WITH CHECK (public.psico_is_rh() AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id()));

CREATE POLICY "psico_instrumentos_delete" ON public.psico_instrumentos
FOR DELETE TO authenticated
USING (public.psico_is_rh() AND editavel = TRUE AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id()));

CREATE POLICY "psico_dimensoes_select" ON public.psico_dimensoes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.psico_instrumentos i
  WHERE i.id = instrumento_id
    AND (i.company_id IS NULL OR i.company_id = public.get_my_company_id() OR public.is_admin_master(auth.uid()))
));

CREATE POLICY "psico_dimensoes_write" ON public.psico_dimensoes
FOR ALL TO authenticated
USING (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_instrumentos i
  WHERE i.id = instrumento_id AND i.editavel = TRUE
    AND (public.is_admin_master(auth.uid()) OR i.company_id = public.get_my_company_id())
) AND NOT public.psico_instrumento_em_uso(instrumento_id))
WITH CHECK (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_instrumentos i
  WHERE i.id = instrumento_id AND i.editavel = TRUE
    AND (public.is_admin_master(auth.uid()) OR i.company_id = public.get_my_company_id())
) AND NOT public.psico_instrumento_em_uso(instrumento_id));

CREATE POLICY "psico_perguntas_select" ON public.psico_perguntas
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.psico_instrumentos i
  WHERE i.id = instrumento_id
    AND (i.company_id IS NULL OR i.company_id = public.get_my_company_id() OR public.is_admin_master(auth.uid()))
));

CREATE POLICY "psico_perguntas_write" ON public.psico_perguntas
FOR ALL TO authenticated
USING (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_instrumentos i
  WHERE i.id = instrumento_id AND i.editavel = TRUE
    AND (public.is_admin_master(auth.uid()) OR i.company_id = public.get_my_company_id())
) AND NOT public.psico_instrumento_em_uso(instrumento_id))
WITH CHECK (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_instrumentos i
  WHERE i.id = instrumento_id AND i.editavel = TRUE
    AND (public.is_admin_master(auth.uid()) OR i.company_id = public.get_my_company_id())
) AND NOT public.psico_instrumento_em_uso(instrumento_id));

CREATE POLICY "psico_avaliacoes_rh_all" ON public.psico_avaliacoes
FOR ALL TO authenticated
USING (public.psico_is_rh() AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id()))
WITH CHECK (public.psico_is_rh() AND (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id()));

CREATE POLICY "psico_avaliacoes_colab_select" ON public.psico_avaliacoes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.psico_atribuicoes t
  WHERE t.avaliacao_id = id AND t.colaborador_id = public.get_my_colaborador_id()
));

CREATE POLICY "psico_avaliacao_ghes_rh_all" ON public.psico_avaliacao_ghes
FOR ALL TO authenticated
USING (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_avaliacoes a
  WHERE a.id = avaliacao_id AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
))
WITH CHECK (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_avaliacoes a
  WHERE a.id = avaliacao_id AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
));

CREATE POLICY "psico_avaliacao_ghes_colab_select" ON public.psico_avaliacao_ghes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.psico_atribuicoes t
  WHERE t.avaliacao_id = avaliacao_id AND t.colaborador_id = public.get_my_colaborador_id()
));

CREATE POLICY "psico_atribuicoes_rh_all" ON public.psico_atribuicoes
FOR ALL TO authenticated
USING (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_avaliacoes a
  WHERE a.id = avaliacao_id AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
))
WITH CHECK (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_avaliacoes a
  WHERE a.id = avaliacao_id AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
));

CREATE POLICY "psico_atribuicoes_colab_select" ON public.psico_atribuicoes
FOR SELECT TO authenticated
USING (colaborador_id = public.get_my_colaborador_id());

CREATE POLICY "psico_atribuicoes_colab_update" ON public.psico_atribuicoes
FOR UPDATE TO authenticated
USING (colaborador_id = public.get_my_colaborador_id() AND status <> 'preenchido')
WITH CHECK (colaborador_id = public.get_my_colaborador_id());

CREATE POLICY "psico_respostas_rh_select" ON public.psico_respostas
FOR SELECT TO authenticated
USING (public.psico_is_rh() AND EXISTS (
  SELECT 1 FROM public.psico_avaliacoes a
  WHERE a.id = avaliacao_id AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
));

-- =========================================================
-- 4. TRIGGERS
-- =========================================================

CREATE TRIGGER trg_psico_instrumentos_updated BEFORE UPDATE ON public.psico_instrumentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_psico_dimensoes_updated BEFORE UPDATE ON public.psico_dimensoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_psico_perguntas_updated BEFORE UPDATE ON public.psico_perguntas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_psico_avaliacoes_updated BEFORE UPDATE ON public.psico_avaliacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_psico_atribuicoes_updated BEFORE UPDATE ON public.psico_atribuicoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.psico_notify_atribuicao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_company UUID;
  v_titulo TEXT;
BEGIN
  SELECT c.user_id INTO v_user_id FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;
  SELECT a.company_id, a.titulo INTO v_company, v_titulo FROM public.psico_avaliacoes a WHERE a.id = NEW.avaliacao_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (v_company, v_user_id, 'avaliacao_psicossocial',
            'Nova avaliação psicossocial',
            'Você foi convidado a responder: ' || COALESCE(v_titulo, 'Avaliação psicossocial'),
            '/minhas-atividades', 'psico_atribuicao', NEW.id, 'normal');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_psico_notify_atribuicao AFTER INSERT ON public.psico_atribuicoes
FOR EACH ROW EXECUTE FUNCTION public.psico_notify_atribuicao();

CREATE OR REPLACE FUNCTION public.psico_notify_preenchido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company UUID;
  v_titulo TEXT;
BEGIN
  IF NEW.status = 'preenchido' AND COALESCE(OLD.status,'') <> 'preenchido' THEN
    SELECT a.company_id, a.titulo INTO v_company, v_titulo
    FROM public.psico_avaliacoes a WHERE a.id = NEW.avaliacao_id;

    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    SELECT v_company, p.id, 'avaliacao_psicossocial',
           'Questionário psicossocial concluído',
           'Um colaborador concluiu o preenchimento de: ' || COALESCE(v_titulo, 'Avaliação psicossocial'),
           '/mapa-riscos-nr1', 'psico_avaliacao', NEW.avaliacao_id, 'normal'
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.company_id = v_company
      AND ur.role IN ('admin_empresa','analista_rh');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_psico_notify_preenchido AFTER UPDATE ON public.psico_atribuicoes
FOR EACH ROW EXECUTE FUNCTION public.psico_notify_preenchido();

-- =========================================================
-- 5. REALTIME
-- =========================================================
ALTER TABLE public.psico_atribuicoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.psico_atribuicoes;