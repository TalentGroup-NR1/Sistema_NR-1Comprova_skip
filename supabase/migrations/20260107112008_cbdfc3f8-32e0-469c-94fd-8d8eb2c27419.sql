
-- Enums para status de avaliação
CREATE TYPE public.avaliacao_status AS ENUM ('nao_iniciada', 'em_andamento', 'concluida');
CREATE TYPE public.avaliacao_link_tipo AS ENUM ('autoavaliacao', 'gestor');
CREATE TYPE public.respondente_avaliacao_tipo AS ENUM ('colaborador', 'gestor');

-- Tabela principal de avaliações (instância por colaborador por ciclo)
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  gestor_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  prazo_autoavaliacao DATE,
  prazo_avaliacao_gestor DATE,
  status_autoavaliacao public.avaliacao_status NOT NULL DEFAULT 'nao_iniciada',
  status_avaliacao_gestor public.avaliacao_status NOT NULL DEFAULT 'nao_iniciada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ciclo_id, colaborador_id)
);

-- Tabela de links/tokens para preenchimento
CREATE TABLE public.avaliacao_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  tipo public.avaliacao_link_tipo NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(avaliacao_id, tipo)
);

-- Tabela de respostas para competências
CREATE TABLE public.avaliacao_respostas_competencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  competencia_id UUID NOT NULL REFERENCES public.competencias_ciclo(id) ON DELETE CASCADE,
  respondente_tipo public.respondente_avaliacao_tipo NOT NULL,
  nota_valor TEXT NOT NULL,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(avaliacao_id, competencia_id, respondente_tipo)
);

-- Tabela de respostas para objetivos
CREATE TABLE public.avaliacao_respostas_objetivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  objetivo_id UUID NOT NULL REFERENCES public.objetivos_ciclo(id) ON DELETE CASCADE,
  respondente_tipo public.respondente_avaliacao_tipo NOT NULL,
  nota_valor TEXT NOT NULL,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(avaliacao_id, objetivo_id, respondente_tipo)
);

-- Trigger para updated_at
CREATE TRIGGER update_avaliacoes_updated_at
  BEFORE UPDATE ON public.avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_avaliacao_respostas_competencias_updated_at
  BEFORE UPDATE ON public.avaliacao_respostas_competencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_avaliacao_respostas_objetivos_updated_at
  BEFORE UPDATE ON public.avaliacao_respostas_objetivos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacao_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacao_respostas_competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacao_respostas_objetivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for avaliacoes
CREATE POLICY "Admin master full access avaliacoes"
  ON public.avaliacoes FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company avaliacoes"
  ON public.avaliacoes FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM ciclos_avaliacao c
      WHERE c.id = avaliacoes.ciclo_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM ciclos_avaliacao c
      WHERE c.id = avaliacoes.ciclo_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Analista RH can manage own company avaliacoes"
  ON public.avaliacoes FOR ALL
  USING (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM ciclos_avaliacao c
      WHERE c.id = avaliacoes.ciclo_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM ciclos_avaliacao c
      WHERE c.id = avaliacoes.ciclo_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Gestor can view own avaliacoes"
  ON public.avaliacoes FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor_departamento') AND
    EXISTS (
      SELECT 1 FROM ciclos_avaliacao c
      WHERE c.id = avaliacoes.ciclo_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

-- RLS Policies for avaliacao_links
CREATE POLICY "Admin master full access avaliacao_links"
  ON public.avaliacao_links FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company avaliacao_links"
  ON public.avaliacao_links FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_links.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_links.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Analista RH can manage own company avaliacao_links"
  ON public.avaliacao_links FOR ALL
  USING (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_links.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_links.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

-- RLS Policies for avaliacao_respostas_competencias
CREATE POLICY "Admin master full access avaliacao_respostas_competencias"
  ON public.avaliacao_respostas_competencias FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company respostas_competencias"
  ON public.avaliacao_respostas_competencias FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_competencias.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_competencias.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Analista RH can manage own company respostas_competencias"
  ON public.avaliacao_respostas_competencias FOR ALL
  USING (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_competencias.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_competencias.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

-- RLS Policies for avaliacao_respostas_objetivos
CREATE POLICY "Admin master full access avaliacao_respostas_objetivos"
  ON public.avaliacao_respostas_objetivos FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company respostas_objetivos"
  ON public.avaliacao_respostas_objetivos FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_objetivos.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_objetivos.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Analista RH can manage own company respostas_objetivos"
  ON public.avaliacao_respostas_objetivos FOR ALL
  USING (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_objetivos.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'analista_rh') AND
    EXISTS (
      SELECT 1 FROM avaliacoes a
      JOIN ciclos_avaliacao c ON c.id = a.ciclo_id
      WHERE a.id = avaliacao_respostas_objetivos.avaliacao_id
      AND c.company_id = get_user_company_id(auth.uid())
    )
  );

-- Function to get avaliacao data by token (for public form)
CREATE OR REPLACE FUNCTION public.get_avaliacao_by_token(p_token TEXT)
RETURNS TABLE (
  avaliacao_id UUID,
  ciclo_id UUID,
  ciclo_nome TEXT,
  colaborador_id UUID,
  colaborador_nome TEXT,
  gestor_nome TEXT,
  link_tipo public.avaliacao_link_tipo,
  status public.avaliacao_status,
  already_completed BOOLEAN,
  expired BOOLEAN,
  competencias JSON,
  objetivos JSON,
  metricas JSON,
  respostas_competencias JSON,
  respostas_objetivos JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link avaliacao_links%ROWTYPE;
  v_avaliacao avaliacoes%ROWTYPE;
  v_ciclo ciclos_avaliacao%ROWTYPE;
  v_colaborador colaboradores%ROWTYPE;
  v_gestor colaboradores%ROWTYPE;
  v_status public.avaliacao_status;
  v_respondente public.respondente_avaliacao_tipo;
BEGIN
  -- Get link by token
  SELECT * INTO v_link FROM avaliacao_links WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get avaliacao
  SELECT * INTO v_avaliacao FROM avaliacoes WHERE id = v_link.avaliacao_id;
  
  -- Get ciclo
  SELECT * INTO v_ciclo FROM ciclos_avaliacao WHERE id = v_avaliacao.ciclo_id;
  
  -- Get colaborador
  SELECT * INTO v_colaborador FROM colaboradores WHERE id = v_avaliacao.colaborador_id;
  
  -- Get gestor
  SELECT * INTO v_gestor FROM colaboradores WHERE id = v_avaliacao.gestor_id;
  
  -- Determine status based on link type
  IF v_link.tipo = 'autoavaliacao' THEN
    v_status := v_avaliacao.status_autoavaliacao;
    v_respondente := 'colaborador';
  ELSE
    v_status := v_avaliacao.status_avaliacao_gestor;
    v_respondente := 'gestor';
  END IF;
  
  RETURN QUERY
  SELECT
    v_avaliacao.id,
    v_ciclo.id,
    v_ciclo.nome_ciclo,
    v_colaborador.id,
    v_colaborador.full_name,
    v_gestor.full_name,
    v_link.tipo,
    v_status,
    v_status = 'concluida',
    v_link.expires_at IS NOT NULL AND v_link.expires_at < now(),
    (
      SELECT json_agg(json_build_object(
        'id', c.id,
        'nome_competencia', c.nome_competencia,
        'conceito_competencia', c.conceito_competencia,
        'texto_pergunta', CASE WHEN v_link.tipo = 'autoavaliacao' THEN c.texto_pergunta_autoavaliacao ELSE c.texto_pergunta_gestor END,
        'metrica_id', c.metrica_id,
        'ordem', c.ordem
      ) ORDER BY c.ordem)
      FROM competencias_ciclo c WHERE c.ciclo_id = v_ciclo.id
    ),
    (
      SELECT json_agg(json_build_object(
        'id', o.id,
        'nome_objetivo', o.nome_objetivo,
        'descricao_objetivo', o.descricao_objetivo,
        'texto_pergunta', CASE WHEN v_link.tipo = 'autoavaliacao' THEN o.texto_pergunta_autoavaliacao ELSE o.texto_pergunta_gestor END,
        'metrica_id', o.metrica_id,
        'ordem', o.ordem
      ) ORDER BY o.ordem)
      FROM objetivos_ciclo o WHERE o.ciclo_id = v_ciclo.id
    ),
    (
      SELECT json_agg(json_build_object(
        'id', m.id,
        'nome_metrica', m.nome_metrica,
        'tipo_metrica', m.tipo_metrica,
        'valores_escala', m.valores_escala
      ))
      FROM metricas_avaliacao m WHERE m.ciclo_id = v_ciclo.id
    ),
    (
      SELECT json_agg(json_build_object(
        'competencia_id', rc.competencia_id,
        'nota_valor', rc.nota_valor,
        'comentario', rc.comentario
      ))
      FROM avaliacao_respostas_competencias rc 
      WHERE rc.avaliacao_id = v_avaliacao.id AND rc.respondente_tipo = v_respondente
    ),
    (
      SELECT json_agg(json_build_object(
        'objetivo_id', ro.objetivo_id,
        'nota_valor', ro.nota_valor,
        'comentario', ro.comentario
      ))
      FROM avaliacao_respostas_objetivos ro 
      WHERE ro.avaliacao_id = v_avaliacao.id AND ro.respondente_tipo = v_respondente
    );
END;
$$;

-- Function to submit avaliacao responses
CREATE OR REPLACE FUNCTION public.submit_avaliacao_responses(
  p_token TEXT,
  p_respostas_competencias JSON,
  p_respostas_objetivos JSON,
  p_finalizar BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link avaliacao_links%ROWTYPE;
  v_avaliacao avaliacoes%ROWTYPE;
  v_respondente public.respondente_avaliacao_tipo;
  v_status public.avaliacao_status;
  v_resp RECORD;
BEGIN
  -- Get and validate link
  SELECT * INTO v_link FROM avaliacao_links WHERE token = p_token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Token expirado';
  END IF;
  
  -- Get avaliacao
  SELECT * INTO v_avaliacao FROM avaliacoes WHERE id = v_link.avaliacao_id;
  
  -- Determine respondente and check status
  IF v_link.tipo = 'autoavaliacao' THEN
    v_respondente := 'colaborador';
    IF v_avaliacao.status_autoavaliacao = 'concluida' THEN
      RAISE EXCEPTION 'Avaliação já foi finalizada';
    END IF;
  ELSE
    v_respondente := 'gestor';
    IF v_avaliacao.status_avaliacao_gestor = 'concluida' THEN
      RAISE EXCEPTION 'Avaliação já foi finalizada';
    END IF;
  END IF;
  
  -- Determine new status
  IF p_finalizar THEN
    v_status := 'concluida';
  ELSE
    v_status := 'em_andamento';
  END IF;
  
  -- Upsert competencia responses
  IF p_respostas_competencias IS NOT NULL THEN
    FOR v_resp IN SELECT * FROM json_to_recordset(p_respostas_competencias) AS x(competencia_id UUID, nota_valor TEXT, comentario TEXT)
    LOOP
      INSERT INTO avaliacao_respostas_competencias (avaliacao_id, competencia_id, respondente_tipo, nota_valor, comentario)
      VALUES (v_avaliacao.id, v_resp.competencia_id, v_respondente, v_resp.nota_valor, v_resp.comentario)
      ON CONFLICT (avaliacao_id, competencia_id, respondente_tipo)
      DO UPDATE SET nota_valor = EXCLUDED.nota_valor, comentario = EXCLUDED.comentario, updated_at = now();
    END LOOP;
  END IF;
  
  -- Upsert objetivo responses
  IF p_respostas_objetivos IS NOT NULL THEN
    FOR v_resp IN SELECT * FROM json_to_recordset(p_respostas_objetivos) AS x(objetivo_id UUID, nota_valor TEXT, comentario TEXT)
    LOOP
      INSERT INTO avaliacao_respostas_objetivos (avaliacao_id, objetivo_id, respondente_tipo, nota_valor, comentario)
      VALUES (v_avaliacao.id, v_resp.objetivo_id, v_respondente, v_resp.nota_valor, v_resp.comentario)
      ON CONFLICT (avaliacao_id, objetivo_id, respondente_tipo)
      DO UPDATE SET nota_valor = EXCLUDED.nota_valor, comentario = EXCLUDED.comentario, updated_at = now();
    END LOOP;
  END IF;
  
  -- Update avaliacao status
  IF v_link.tipo = 'autoavaliacao' THEN
    UPDATE avaliacoes SET status_autoavaliacao = v_status, updated_at = now() WHERE id = v_avaliacao.id;
  ELSE
    UPDATE avaliacoes SET status_avaliacao_gestor = v_status, updated_at = now() WHERE id = v_avaliacao.id;
  END IF;
  
  -- Mark link as used if finalizing
  IF p_finalizar THEN
    UPDATE avaliacao_links SET used_at = now() WHERE id = v_link.id;
  END IF;
  
  RETURN TRUE;
END;
$$;