-- Migration: Sincronização Retroativa de Ações do PGR (Fase 3)

-- 1. Cria índice único para não duplicar ações ao re-sincronizar
CREATE UNIQUE INDEX IF NOT EXISTS uq_pgr_plano_acao_import_acao ON public.pgr_plano_acao (pgr_importacao_id, acao);

-- 2. RPC para extração idempotente e segura (Security Definer)
CREATE OR REPLACE FUNCTION public.sincronizar_pgr_acoes(p_importacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_user_company_id uuid;
  v_pgr_company_id uuid;
  v_is_master boolean;
BEGIN
  v_uid := auth.uid();
  
  -- Busca empresa do usuário e verifica se é master
  SELECT company_id INTO v_user_company_id FROM profiles WHERE id = v_uid;
  v_is_master := has_role(v_uid, 'admin_master'::app_role);
  
  -- Busca empresa do PGR
  SELECT company_id INTO v_pgr_company_id FROM pgr_importacoes WHERE id = p_importacao_id;
  
  IF v_pgr_company_id IS NULL THEN
    RAISE EXCEPTION 'PGR % não encontrado.', p_importacao_id;
  END IF;

  -- a) Validação de propriedade (anti cross-tenant)
  IF NOT v_is_master AND v_user_company_id != v_pgr_company_id THEN
    RAISE EXCEPTION 'Acesso negado: o PGR pertence a outra empresa.';
  END IF;

  -- b) Extrai e faz UPSERT das ações (ON CONFLICT DO NOTHING)
  -- Tentamos ler da coluna plano_acao, ou fallback pro extracao_raw->'plano_acao'
  INSERT INTO public.pgr_plano_acao (
    company_id, 
    pgr_importacao_id, 
    acao, 
    cargo_responsavel, 
    prioridade, 
    status,
    prazo
  )
  SELECT 
    v_pgr_company_id,
    p_importacao_id,
    COALESCE(act->>'acao', act->>'medida', 'Ação Indefinida'),
    COALESCE(act->>'responsavel', act->>'responsavel_sugerido'),
    COALESCE(
      NULLIF(LOWER(act->>'prioridade'), ''), 
      'media'
    ),
    'pendente',
    -- Se o prazo for parseável pra data, podemos tentar no futuro, mas por hora apenas null
    NULL
  FROM pgr_importacoes pi,
  jsonb_array_elements(COALESCE(pi.plano_acao, pi.extracao_raw->'plano_acao')) act
  WHERE pi.id = p_importacao_id
  ON CONFLICT (pgr_importacao_id, acao) DO NOTHING;
END;
$$;

-- c) Permissão de Execução
GRANT EXECUTE ON FUNCTION public.sincronizar_pgr_acoes(uuid) TO authenticated;

-- 3. Revisão RLS (Garantindo que a checagem use a mesma base sólida)
ALTER TABLE public.pgr_plano_acao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master acessa todo o plano de acao" ON public.pgr_plano_acao;
CREATE POLICY "Admin master acessa todo o plano de acao"
  ON public.pgr_plano_acao FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Acesso as acoes da propria empresa" ON public.pgr_plano_acao;
CREATE POLICY "Acesso as acoes da propria empresa"
  ON public.pgr_plano_acao FOR ALL
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin_empresa'::app_role) 
    OR has_role(auth.uid(), 'analista_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_departamento'::app_role))
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin_empresa'::app_role) 
    OR has_role(auth.uid(), 'analista_rh'::app_role)
    OR has_role(auth.uid(), 'gestor_departamento'::app_role))
    AND company_id = get_my_company_id()
  );
