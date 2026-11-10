
DROP FUNCTION IF EXISTS public.relatorio_leituras_comunicado(uuid);
DROP FUNCTION IF EXISTS public.relatorio_leituras_campanha(uuid);

CREATE OR REPLACE FUNCTION public.relatorio_leituras_comunicado(p_comunicado_id uuid)
 RETURNS TABLE(user_id uuid, nome text, departamento text, cargo text, cpf text, matricula text, email_pessoal text, lido boolean, lido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    c.cpf::text AS cpf,
    c.matricula::text AS matricula,
    c.email_pessoal::text AS email_pessoal,
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
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_leituras_campanha(p_campanha_id uuid)
 RETURNS TABLE(user_id uuid, nome text, departamento text, cargo text, cpf text, matricula text, email_pessoal text, lido boolean, lido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    c.cpf::text AS cpf,
    c.matricula::text AS matricula,
    c.email_pessoal::text AS email_pessoal,
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
$function$;
