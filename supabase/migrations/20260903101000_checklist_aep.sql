-- 1. checklist_templates
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  is_official boolean DEFAULT false,
  nome varchar(200) NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estrut_checklist_templates_select" ON public.checklist_templates FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id IS NULL OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_checklist_templates_insert" ON public.checklist_templates FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_templates_update" ON public.checklist_templates FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_templates_delete" ON public.checklist_templates FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- 2. checklist_secoes
CREATE TABLE public.checklist_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  nome varchar(200) NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_secoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estrut_checklist_secoes_select" ON public.checklist_secoes FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id IS NULL OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_checklist_secoes_insert" ON public.checklist_secoes FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_secoes_update" ON public.checklist_secoes FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_secoes_delete" ON public.checklist_secoes FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- 3. checklist_perguntas
CREATE TABLE public.checklist_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  secao_id uuid NOT NULL REFERENCES public.checklist_secoes(id) ON DELETE CASCADE,
  texto text NOT NULL,
  referencia_legal text,
  perigo_associado_id uuid REFERENCES public.nr1_riscos_catalogo(id) ON DELETE SET NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_perguntas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estrut_checklist_perguntas_select" ON public.checklist_perguntas FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id IS NULL OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_checklist_perguntas_insert" ON public.checklist_perguntas FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_perguntas_update" ON public.checklist_perguntas FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_perguntas_delete" ON public.checklist_perguntas FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- 4. checklist_aplicacoes
CREATE TABLE public.checklist_aplicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  tipo_aplicacao varchar(10) CHECK (tipo_aplicacao IN ('ghe','posto')),
  ghe_id uuid,
  posto_trabalho varchar(150),
  status varchar(20) DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_aplicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estrut_checklist_aplicacoes_select" ON public.checklist_aplicacoes FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_checklist_aplicacoes_insert" ON public.checklist_aplicacoes FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_aplicacoes_update" ON public.checklist_aplicacoes FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_aplicacoes_delete" ON public.checklist_aplicacoes FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- 5. checklist_respostas
CREATE TABLE public.checklist_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  aplicacao_id uuid NOT NULL REFERENCES public.checklist_aplicacoes(id) ON DELETE CASCADE,
  pergunta_id uuid NOT NULL REFERENCES public.checklist_perguntas(id) ON DELETE CASCADE,
  resposta_valor varchar(5) CHECK (resposta_valor IN ('C','NC','NA')),
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(aplicacao_id, pergunta_id)
);

ALTER TABLE public.checklist_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estrut_checklist_respostas_select" ON public.checklist_respostas FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_checklist_respostas_insert" ON public.checklist_respostas FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_respostas_update" ON public.checklist_respostas FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_respostas_delete" ON public.checklist_respostas FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- 6. checklist_fotos
CREATE TABLE public.checklist_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  resposta_id uuid NOT NULL REFERENCES public.checklist_respostas(id) ON DELETE CASCADE,
  url_foto text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estrut_checklist_fotos_select" ON public.checklist_fotos FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());
CREATE POLICY "estrut_checklist_fotos_insert" ON public.checklist_fotos FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_fotos_update" ON public.checklist_fotos FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')))
WITH CHECK (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin_empresa','analista_rh')));
CREATE POLICY "estrut_checklist_fotos_delete" ON public.checklist_fotos FOR DELETE TO authenticated
USING (public.is_admin_master(auth.uid()) OR (company_id = public.get_my_company_id() AND public.get_my_role() = 'admin_empresa'));

-- =========================================================================
-- RPC: aep_sugerir_perigos
-- =========================================================================
CREATE OR REPLACE FUNCTION public.aep_sugerir_perigos(p_aplicacao_id uuid)
RETURNS TABLE (
  perigo_id uuid,
  nome varchar,
  categoria varchar,
  referencia_legal text,
  texto_pergunta text,
  observacao_especifica text,
  qtd_itens_nc integer,
  ja_existe boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
  v_ghe_id uuid;
BEGIN
  -- 1. Descobrir ghe_id e company_id da aplicação
  SELECT company_id, ghe_id 
  INTO v_company_id, v_ghe_id
  FROM public.checklist_aplicacoes
  WHERE id = p_aplicacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aplicação % não encontrada', p_aplicacao_id;
  END IF;

  -- 2. Validar permissão (usuário deve pertencer à empresa ou ser admin master)
  IF NOT public.is_admin_master(auth.uid()) AND v_company_id <> public.get_my_company_id() THEN
    RAISE EXCEPTION 'Acesso negado. Você não pertence à empresa desta aplicação.';
  END IF;

  -- 3. Retornar os perigos baseados nas respostas NC
  RETURN QUERY
  WITH ncs AS (
    SELECT
      cp.perigo_associado_id,
      cp.referencia_legal,
      cp.texto AS texto_pergunta,
      cr.observacao AS observacao_especifica,
      ROW_NUMBER() OVER(PARTITION BY cp.perigo_associado_id ORDER BY cr.created_at ASC) as rn
    FROM public.checklist_respostas cr
    JOIN public.checklist_perguntas cp ON cp.id = cr.pergunta_id
    WHERE cr.aplicacao_id = p_aplicacao_id
      AND cr.resposta_valor = 'NC'
      AND cp.perigo_associado_id IS NOT NULL
  ),
  agrupado AS (
    SELECT 
      n.perigo_associado_id,
      MAX(CASE WHEN n.rn = 1 THEN n.referencia_legal END) as max_ref_legal,
      MAX(CASE WHEN n.rn = 1 THEN n.texto_pergunta END) as max_texto,
      MAX(CASE WHEN n.rn = 1 THEN n.observacao_especifica END) as max_obs,
      COUNT(*)::integer as total_ncs
    FROM ncs n
    GROUP BY n.perigo_associado_id
  )
  SELECT 
    a.perigo_associado_id as perigo_id,
    c.nome::varchar,
    c.categoria::varchar,
    a.max_ref_legal as referencia_legal,
    a.max_texto as texto_pergunta,
    a.max_obs as observacao_especifica,
    a.total_ncs as qtd_itens_nc,
    false as ja_existe -- Se excluímos os que já existem, ele sempre será false
  FROM agrupado a
  JOIN public.nr1_riscos_catalogo c ON c.id = a.perigo_associado_id
  WHERE NOT EXISTS (
    -- Excluir perigos que já existem na tabela nr1_ghe_riscos para o mesmo GHE
    SELECT 1 FROM public.nr1_ghe_riscos gr
    WHERE gr.ghe_id = v_ghe_id 
      AND gr.risco_id = a.perigo_associado_id
      AND gr.ativo = true
  )
  ORDER BY c.categoria;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aep_sugerir_perigos(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.aep_sugerir_perigos(uuid) TO authenticated;
