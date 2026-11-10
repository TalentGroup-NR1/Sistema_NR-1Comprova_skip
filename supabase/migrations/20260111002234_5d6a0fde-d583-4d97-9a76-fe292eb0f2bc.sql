-- 1) Criar tabela metricas_valores para mapear pesos para valores de métricas
CREATE TABLE public.metricas_valores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metrica_id UUID NOT NULL REFERENCES public.metricas_avaliacao(id) ON DELETE CASCADE,
  valor_label TEXT NOT NULL,
  peso NUMERIC NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (metrica_id, valor_label)
);

-- Enable RLS
ALTER TABLE public.metricas_valores ENABLE ROW LEVEL SECURITY;

-- RLS policies para metricas_valores (acessível por quem pode ver metricas_avaliacao via ciclo)
CREATE POLICY "Usuarios podem ver metricas_valores de seus ciclos"
ON public.metricas_valores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM metricas_avaliacao ma
    JOIN ciclos_avaliacao ca ON ca.id = ma.ciclo_id
    WHERE ma.id = metricas_valores.metrica_id
    AND (
      public.is_admin_master(auth.uid())
      OR ca.company_id = public.get_user_company_id(auth.uid())
    )
  )
);

CREATE POLICY "RH/Admin podem inserir metricas_valores"
ON public.metricas_valores
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM metricas_avaliacao ma
    JOIN ciclos_avaliacao ca ON ca.id = ma.ciclo_id
    WHERE ma.id = metricas_valores.metrica_id
    AND (
      public.is_admin_master(auth.uid())
      OR ca.company_id = public.get_user_company_id(auth.uid())
    )
  )
);

CREATE POLICY "RH/Admin podem atualizar metricas_valores"
ON public.metricas_valores
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM metricas_avaliacao ma
    JOIN ciclos_avaliacao ca ON ca.id = ma.ciclo_id
    WHERE ma.id = metricas_valores.metrica_id
    AND (
      public.is_admin_master(auth.uid())
      OR ca.company_id = public.get_user_company_id(auth.uid())
    )
  )
);

CREATE POLICY "RH/Admin podem deletar metricas_valores"
ON public.metricas_valores
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM metricas_avaliacao ma
    JOIN ciclos_avaliacao ca ON ca.id = ma.ciclo_id
    WHERE ma.id = metricas_valores.metrica_id
    AND (
      public.is_admin_master(auth.uid())
      OR ca.company_id = public.get_user_company_id(auth.uid())
    )
  )
);

-- 2) Criar trigger para popular metricas_valores automaticamente ao criar/atualizar métrica
CREATE OR REPLACE FUNCTION public.sync_metricas_valores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor JSONB;
  v_ordem INT := 0;
  v_peso NUMERIC;
BEGIN
  -- Remover valores antigos se existirem
  DELETE FROM metricas_valores WHERE metrica_id = NEW.id;
  
  -- Inserir novos valores baseados em valores_escala
  FOR v_valor IN SELECT * FROM jsonb_array_elements(NEW.valores_escala::jsonb)
  LOOP
    v_ordem := v_ordem + 1;
    
    -- Para métricas numéricas, o peso é igual ao valor numérico
    -- Para métricas descritivas, o peso é a ordem (crescente)
    IF NEW.tipo_metrica = 'numerica' THEN
      v_peso := COALESCE((v_valor->>'valor')::NUMERIC, v_ordem);
    ELSE
      v_peso := v_ordem;
    END IF;
    
    INSERT INTO metricas_valores (metrica_id, valor_label, peso, ordem)
    VALUES (
      NEW.id,
      COALESCE(v_valor->>'valor', v_valor->>'label')::TEXT,
      v_peso,
      v_ordem
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger para INSERT e UPDATE em metricas_avaliacao
CREATE TRIGGER sync_metricas_valores_trigger
AFTER INSERT OR UPDATE ON public.metricas_avaliacao
FOR EACH ROW
EXECUTE FUNCTION public.sync_metricas_valores();

-- 3) Popular metricas_valores para métricas existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM metricas_avaliacao
  LOOP
    -- O trigger já cuida de tudo, então basta forçar um "update"
    UPDATE metricas_avaliacao 
    SET updated_at = now() 
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 4) Atualizar RPC submit_avaliacao_responses para verificar se ciclo está finalizado
CREATE OR REPLACE FUNCTION public.submit_avaliacao_responses(
  p_token text, 
  p_respostas_competencias json, 
  p_respostas_objetivos json, 
  p_finalizar boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link avaliacao_links%ROWTYPE;
  v_avaliacao avaliacoes%ROWTYPE;
  v_ciclo ciclos_avaliacao%ROWTYPE;
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
  
  -- Get ciclo and check if finalized
  SELECT * INTO v_ciclo FROM ciclos_avaliacao WHERE id = v_avaliacao.ciclo_id;
  
  IF v_ciclo.status = 'finalizado' THEN
    RAISE EXCEPTION 'Este ciclo de avaliação foi finalizado e não aceita mais respostas';
  END IF;
  
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