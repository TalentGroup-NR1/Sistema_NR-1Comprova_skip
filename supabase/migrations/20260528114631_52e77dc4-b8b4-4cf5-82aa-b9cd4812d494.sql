
-- 1) Add exige_leitura flag
ALTER TABLE public.campanhas_comunicados
  ADD COLUMN IF NOT EXISTS exige_leitura boolean NOT NULL DEFAULT true;

-- 2) Create campanha_leituras table
CREATE TABLE IF NOT EXISTS public.campanha_leituras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  campanha_id uuid NOT NULL REFERENCES public.campanhas_comunicados(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lido_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campanha_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campanha_leituras_campanha
  ON public.campanha_leituras (company_id, campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_leituras_user
  ON public.campanha_leituras (company_id, user_id, lido_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_leituras TO authenticated;
GRANT ALL ON public.campanha_leituras TO service_role;

ALTER TABLE public.campanha_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own campanha leituras"
  ON public.campanha_leituras FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own campanha leituras"
  ON public.campanha_leituras FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin master can read all campanha leituras"
  ON public.campanha_leituras FOR SELECT
  USING (get_my_role() = 'admin_master'::app_role);

CREATE POLICY "Admin empresa can read company campanha leituras"
  ON public.campanha_leituras FOR SELECT
  USING (has_role(auth.uid(), 'admin_empresa'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Analista RH can read company campanha leituras"
  ON public.campanha_leituras FOR SELECT
  USING (has_role(auth.uid(), 'analista_rh'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- 3) RPC: buscar campanhas pendentes
CREATE OR REPLACE FUNCTION public.buscar_campanhas_pendentes(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  titulo text,
  descricao text,
  imagem_url text,
  data_inicio date,
  data_fim date,
  materiais jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH me AS (
    SELECT p.user_id, p.company_id
    FROM public.profiles p
    WHERE p.user_id = p_user_id
    LIMIT 1
  )
  SELECT
    ca.id,
    ca.company_id,
    ca.titulo,
    ca.descricao,
    ca.imagem_url,
    ca.data_inicio,
    ca.data_fim,
    ca.materiais
  FROM public.campanhas_comunicados ca
  JOIN me ON ca.company_id = me.company_id
  WHERE ca.exige_leitura = true
    AND CURRENT_DATE BETWEEN ca.data_inicio AND ca.data_fim
    AND NOT EXISTS (
      SELECT 1 FROM public.campanha_leituras cl
      WHERE cl.campanha_id = ca.id
        AND cl.user_id = p_user_id
    )
  ORDER BY ca.data_inicio ASC;
$$;

-- 4) RPC: registrar leitura
CREATE OR REPLACE FUNCTION public.registrar_leitura_campanha(p_campanha_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.campanhas_comunicados WHERE id = p_campanha_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  INSERT INTO public.campanha_leituras (company_id, campanha_id, user_id, lido_em)
  VALUES (v_company_id, p_campanha_id, p_user_id, now())
  ON CONFLICT (campanha_id, user_id) DO NOTHING;
END;
$$;

-- 5) RPC: relatório de leituras
CREATE OR REPLACE FUNCTION public.relatorio_leituras_campanha(p_campanha_id uuid)
RETURNS TABLE (
  user_id uuid,
  nome text,
  departamento text,
  cargo text,
  lido boolean,
  lido_em timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_role app_role;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.campanhas_comunicados WHERE id = p_campanha_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  v_role := get_my_role();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF v_role <> 'admin_master' AND get_user_company_id(auth.uid()) <> v_company_id THEN
    RAISE EXCEPTION 'Não autorizado para essa empresa';
  END IF;

  RETURN QUERY
  SELECT
    c.user_id,
    c.full_name::text AS nome,
    c.department::text AS departamento,
    c.job_title::text AS cargo,
    (cl.lido_em IS NOT NULL) AS lido,
    cl.lido_em
  FROM public.colaboradores c
  LEFT JOIN public.campanha_leituras cl
    ON cl.campanha_id = p_campanha_id
   AND cl.user_id = c.user_id
  WHERE c.company_id = v_company_id
    AND c.status = 'ATIVO'
    AND c.user_id IS NOT NULL
  ORDER BY (cl.lido_em IS NULL) DESC, c.full_name;
END;
$$;
