
ALTER TABLE public.comunicados
  ADD COLUMN IF NOT EXISTS exige_leitura boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Admin empresa can read company leituras" ON public.comunicado_leituras;
CREATE POLICY "Admin empresa can read company leituras"
ON public.comunicado_leituras FOR SELECT
USING (
  has_role(auth.uid(), 'admin_empresa'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Analista RH can read company leituras" ON public.comunicado_leituras;
CREATE POLICY "Analista RH can read company leituras"
ON public.comunicado_leituras FOR SELECT
USING (
  has_role(auth.uid(), 'analista_rh'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);

DROP FUNCTION IF EXISTS public.buscar_comunicados_pendentes(uuid);
CREATE OR REPLACE FUNCTION public.buscar_comunicados_pendentes(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  titulo text,
  conteudo text,
  autor_nome varchar,
  data_publicacao timestamptz,
  image_url text,
  is_pinned boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT p.user_id, p.company_id,
           c.department AS colab_dept,
           c.job_title  AS colab_cargo
    FROM public.profiles p
    LEFT JOIN public.colaboradores c
      ON c.user_id = p.user_id AND c.status = 'ATIVO'
    WHERE p.user_id = p_user_id
    LIMIT 1
  )
  SELECT
    co.id,
    co.company_id,
    co.titulo,
    co.conteudo,
    co.autor_nome,
    co.data_publicacao,
    co.image_url,
    co.is_pinned
  FROM public.comunicados co
  JOIN me ON co.company_id = me.company_id
  WHERE co.status = 'publicado'
    AND co.exige_leitura = true
    AND co.data_publicacao <= now()
    AND (
      co.publico_alvo_tipo = 'todos'
      OR (co.publico_alvo_tipo = 'departamento' AND co.publico_alvo_valor = me.colab_dept)
      OR (co.publico_alvo_tipo = 'cargo' AND co.publico_alvo_valor = me.colab_cargo)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.comunicado_leituras cl
      WHERE cl.comunicado_id = co.id
        AND cl.user_id = p_user_id
    )
  ORDER BY co.is_pinned DESC, co.data_publicacao ASC;
$$;
GRANT EXECUTE ON FUNCTION public.buscar_comunicados_pendentes(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.registrar_leitura_comunicado(uuid, uuid);
CREATE OR REPLACE FUNCTION public.registrar_leitura_comunicado(
  p_comunicado_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.comunicados WHERE id = p_comunicado_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Comunicado não encontrado';
  END IF;

  INSERT INTO public.comunicado_leituras (company_id, comunicado_id, user_id, read_at)
  VALUES (v_company_id, p_comunicado_id, p_user_id, now())
  ON CONFLICT (company_id, comunicado_id, user_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.registrar_leitura_comunicado(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.relatorio_leituras_comunicado(uuid);
CREATE OR REPLACE FUNCTION public.relatorio_leituras_comunicado(p_comunicado_id uuid)
RETURNS TABLE (
  user_id uuid,
  nome text,
  departamento text,
  cargo text,
  lido boolean,
  lido_em timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_publico_tipo publico_alvo_tipo;
  v_publico_valor text;
  v_role app_role;
BEGIN
  SELECT company_id, publico_alvo_tipo, publico_alvo_valor
    INTO v_company_id, v_publico_tipo, v_publico_valor
  FROM public.comunicados WHERE id = p_comunicado_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Comunicado não encontrado';
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
    (cl.read_at IS NOT NULL) AS lido,
    cl.read_at AS lido_em
  FROM public.colaboradores c
  LEFT JOIN public.comunicado_leituras cl
    ON cl.comunicado_id = p_comunicado_id
   AND cl.user_id = c.user_id
  WHERE c.company_id = v_company_id
    AND c.status = 'ATIVO'
    AND c.user_id IS NOT NULL
    AND (
      v_publico_tipo = 'todos'
      OR (v_publico_tipo = 'departamento' AND v_publico_valor = c.department)
      OR (v_publico_tipo = 'cargo' AND v_publico_valor = c.job_title)
    )
  ORDER BY (cl.read_at IS NULL) DESC, c.full_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.relatorio_leituras_comunicado(uuid) TO authenticated;
