-- ENUM de status
DO $$ BEGIN
  CREATE TYPE public.questionario_atribuicao_status AS ENUM ('pendente','em_andamento','preenchido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. MODELOS
CREATE TABLE public.questionario_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  instrucoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_modelos TO authenticated;
GRANT ALL ON public.questionario_modelos TO service_role;
ALTER TABLE public.questionario_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modelos_select" ON public.questionario_modelos FOR SELECT TO authenticated
  USING (public.estrut_can_read(company_id));
CREATE POLICY "modelos_write" ON public.questionario_modelos FOR ALL TO authenticated
  USING (public.estrut_can_read(company_id) AND (public.is_admin_master(auth.uid()) OR public.get_my_role() IN ('admin_empresa','analista_rh')))
  WITH CHECK (public.estrut_can_read(company_id) AND (public.is_admin_master(auth.uid()) OR public.get_my_role() IN ('admin_empresa','analista_rh')));

-- 2. SECOES
CREATE TABLE public.questionario_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.questionario_modelos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'padrao',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_secoes TO authenticated;
GRANT ALL ON public.questionario_secoes TO service_role;
ALTER TABLE public.questionario_secoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "secoes_all" ON public.questionario_secoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.questionario_modelos m WHERE m.id = modelo_id AND public.estrut_can_read(m.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.questionario_modelos m WHERE m.id = modelo_id AND public.estrut_can_read(m.company_id)));

-- 3. PERGUNTAS
CREATE TABLE public.questionario_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao_id uuid NOT NULL REFERENCES public.questionario_secoes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'texto_longo',
  titulo text NOT NULL,
  texto_ajuda text,
  obrigatorio boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_perguntas TO authenticated;
GRANT ALL ON public.questionario_perguntas TO service_role;
ALTER TABLE public.questionario_perguntas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perguntas_all" ON public.questionario_perguntas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.questionario_secoes s JOIN public.questionario_modelos m ON m.id = s.modelo_id WHERE s.id = secao_id AND public.estrut_can_read(m.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.questionario_secoes s JOIN public.questionario_modelos m ON m.id = s.modelo_id WHERE s.id = secao_id AND public.estrut_can_read(m.company_id)));

-- 4. OPCOES
CREATE TABLE public.questionario_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id uuid NOT NULL REFERENCES public.questionario_perguntas(id) ON DELETE CASCADE,
  valor text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_opcoes TO authenticated;
GRANT ALL ON public.questionario_opcoes TO service_role;
ALTER TABLE public.questionario_opcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opcoes_all" ON public.questionario_opcoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.questionario_perguntas p JOIN public.questionario_secoes s ON s.id = p.secao_id JOIN public.questionario_modelos m ON m.id = s.modelo_id WHERE p.id = pergunta_id AND public.estrut_can_read(m.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.questionario_perguntas p JOIN public.questionario_secoes s ON s.id = p.secao_id JOIN public.questionario_modelos m ON m.id = s.modelo_id WHERE p.id = pergunta_id AND public.estrut_can_read(m.company_id)));

-- 5. VINCULO DESCRICAO <-> QUESTIONARIO
CREATE TABLE public.descricao_questionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_cargo_id uuid NOT NULL REFERENCES public.descricoes_cargo(id) ON DELETE CASCADE,
  modelo_base_id uuid REFERENCES public.questionario_modelos(id) ON DELETE SET NULL,
  customizacao jsonb NOT NULL DEFAULT '{"secoes":[]}'::jsonb,
  instrucoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (descricao_cargo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.descricao_questionario TO authenticated;
GRANT ALL ON public.descricao_questionario TO service_role;
ALTER TABLE public.descricao_questionario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "descq_all" ON public.descricao_questionario FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.descricoes_cargo d WHERE d.id = descricao_cargo_id AND public.estrut_can_read(d.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.descricoes_cargo d WHERE d.id = descricao_cargo_id AND public.estrut_can_read(d.company_id)));

-- 6. ATRIBUICOES
CREATE TABLE public.questionario_atribuicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_questionario_id uuid NOT NULL REFERENCES public.descricao_questionario(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  status public.questionario_atribuicao_status NOT NULL DEFAULT 'pendente',
  data_atribuicao timestamptz NOT NULL DEFAULT now(),
  data_resposta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (descricao_questionario_id, colaborador_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_atribuicoes TO authenticated;
GRANT ALL ON public.questionario_atribuicoes TO service_role;
ALTER TABLE public.questionario_atribuicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "atrib_admin_all" ON public.questionario_atribuicoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.descricao_questionario dq JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id WHERE dq.id = descricao_questionario_id AND public.estrut_can_read(d.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.descricao_questionario dq JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id WHERE dq.id = descricao_questionario_id AND public.estrut_can_read(d.company_id)));
CREATE POLICY "atrib_colab_select" ON public.questionario_atribuicoes FOR SELECT TO authenticated
  USING (colaborador_id = public.get_my_colaborador_id());
CREATE POLICY "atrib_colab_update" ON public.questionario_atribuicoes FOR UPDATE TO authenticated
  USING (colaborador_id = public.get_my_colaborador_id())
  WITH CHECK (colaborador_id = public.get_my_colaborador_id());

-- 7. RESPOSTAS
CREATE TABLE public.questionario_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atribuicao_id uuid NOT NULL REFERENCES public.questionario_atribuicoes(id) ON DELETE CASCADE,
  pergunta_id text NOT NULL,
  valor jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (atribuicao_id, pergunta_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_respostas TO authenticated;
GRANT ALL ON public.questionario_respostas TO service_role;
ALTER TABLE public.questionario_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resp_admin_all" ON public.questionario_respostas FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.questionario_atribuicoes a
    JOIN public.descricao_questionario dq ON dq.id = a.descricao_questionario_id
    JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id
    WHERE a.id = atribuicao_id AND public.estrut_can_read(d.company_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.questionario_atribuicoes a
    JOIN public.descricao_questionario dq ON dq.id = a.descricao_questionario_id
    JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id
    WHERE a.id = atribuicao_id AND public.estrut_can_read(d.company_id)));
CREATE POLICY "resp_colab_all" ON public.questionario_respostas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.questionario_atribuicoes a WHERE a.id = atribuicao_id AND a.colaborador_id = public.get_my_colaborador_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.questionario_atribuicoes a WHERE a.id = atribuicao_id AND a.colaborador_id = public.get_my_colaborador_id() AND a.status <> 'preenchido'));

-- updated_at triggers
CREATE TRIGGER trg_qm_updated BEFORE UPDATE ON public.questionario_modelos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qs_updated BEFORE UPDATE ON public.questionario_secoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qp_updated BEFORE UPDATE ON public.questionario_perguntas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dq_updated BEFORE UPDATE ON public.descricao_questionario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qa_updated BEFORE UPDATE ON public.questionario_atribuicoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qr_updated BEFORE UPDATE ON public.questionario_respostas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notificacao ao atribuir
CREATE OR REPLACE FUNCTION public.notify_questionario_atribuido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_user uuid; v_company uuid; v_titulo text;
BEGIN
  SELECT c.user_id, c.company_id INTO v_user, v_company FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;
  SELECT d.titulo INTO v_titulo FROM public.descricao_questionario dq JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id WHERE dq.id = NEW.descricao_questionario_id;
  IF v_user IS NOT NULL THEN
    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (v_company, v_user, 'questionario_cargo', 'Você tem um questionário para responder',
      'Questionário de descrição de cargo: ' || COALESCE(v_titulo,''), '/minhas-atividades', 'questionario_atribuicao', NEW.id, 'high');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_questionario_atribuido AFTER INSERT ON public.questionario_atribuicoes
FOR EACH ROW EXECUTE FUNCTION public.notify_questionario_atribuido();

-- Notificacao ao concluir / reabrir
CREATE OR REPLACE FUNCTION public.notify_questionario_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_company uuid; v_titulo text; v_nome text; v_colab_user uuid; r record;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT d.company_id, d.titulo INTO v_company, v_titulo
  FROM public.descricao_questionario dq JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id
  WHERE dq.id = NEW.descricao_questionario_id;
  SELECT c.full_name, c.user_id INTO v_nome, v_colab_user FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;

  IF NEW.status = 'preenchido' THEN
    FOR r IN
      SELECT DISTINCT p.id AS user_id
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.company_id = v_company AND ur.role IN ('admin_empresa','analista_rh')
    LOOP
      INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
      VALUES (v_company, r.user_id, 'questionario_cargo_preenchido', 'Questionário preenchido',
        COALESCE(v_nome,'Colaborador') || ' respondeu o questionário de ' || COALESCE(v_titulo,'descrição de cargo'),
        '/estrutura-organizacional', 'questionario_atribuicao', NEW.id, 'normal');
    END LOOP;
  ELSIF OLD.status = 'preenchido' AND NEW.status = 'em_andamento' AND v_colab_user IS NOT NULL THEN
    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (v_company, v_colab_user, 'questionario_cargo', 'Questionário reaberto',
      'O RH reabriu o questionário de ' || COALESCE(v_titulo,'descrição de cargo') || ' para ajustes.',
      '/minhas-atividades', 'questionario_atribuicao', NEW.id, 'high');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_questionario_status AFTER UPDATE OF status ON public.questionario_atribuicoes
FOR EACH ROW EXECUTE FUNCTION public.notify_questionario_status();

-- Realtime
ALTER TABLE public.questionario_atribuicoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questionario_atribuicoes;

-- RPC: questionario do colaborador
CREATE OR REPLACE FUNCTION public.get_questionario_para_colaborador(p_atribuicao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_colab uuid; v_row record; v_ident jsonb; v_respostas jsonb;
BEGIN
  v_colab := public.get_my_colaborador_id();
  IF v_colab IS NULL THEN RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  SELECT a.id, a.status, a.data_atribuicao, a.data_resposta, dq.customizacao, dq.instrucoes,
         m.instrucoes AS instrucoes_modelo, d.titulo, d.id AS descricao_id
  INTO v_row
  FROM public.questionario_atribuicoes a
  JOIN public.descricao_questionario dq ON dq.id = a.descricao_questionario_id
  LEFT JOIN public.questionario_modelos m ON m.id = dq.modelo_base_id
  JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id
  WHERE a.id = p_atribuicao_id AND a.colaborador_id = v_colab;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='42501'; END IF;

  SELECT jsonb_build_object(
    'nome', c.full_name,
    'cargo', COALESCE(cg.nome, c.job_title),
    'nivel', c.job_level,
    'empresa', co.name,
    'empresa_cliente', c.empresa_cliente,
    'departamento', c.department,
    'gestao_tecnica', c.gestao_tecnica
  ) INTO v_ident
  FROM public.colaboradores c
  LEFT JOIN public.cargos cg ON cg.id = c.cargo_id
  LEFT JOIN public.companies co ON co.id = c.company_id
  WHERE c.id = v_colab;

  SELECT COALESCE(jsonb_object_agg(r.pergunta_id, r.valor), '{}'::jsonb) INTO v_respostas
  FROM public.questionario_respostas r WHERE r.atribuicao_id = p_atribuicao_id;

  RETURN jsonb_build_object(
    'atribuicao_id', v_row.id,
    'status', v_row.status,
    'titulo', v_row.titulo,
    'instrucoes', COALESCE(v_row.instrucoes, v_row.instrucoes_modelo),
    'customizacao', v_row.customizacao,
    'identificacao', v_ident,
    'respostas', v_respostas
  );
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_questionario_para_colaborador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_questionario_para_colaborador(uuid) TO authenticated;

-- RPC: reabrir questionario (admin/RH)
CREATE OR REPLACE FUNCTION public.reabrir_questionario(p_atribuicao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.require_admin_role();
  UPDATE public.questionario_atribuicoes
  SET status = 'em_andamento', data_resposta = NULL
  WHERE id = p_atribuicao_id AND status = 'preenchido';
END; $$;
REVOKE EXECUTE ON FUNCTION public.reabrir_questionario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reabrir_questionario(uuid) TO authenticated;