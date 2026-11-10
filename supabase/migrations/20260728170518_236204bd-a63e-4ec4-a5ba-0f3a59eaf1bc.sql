CREATE OR REPLACE FUNCTION public.estrut_can_read(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_admin_master(auth.uid()) OR _company_id = public.get_my_company_id();
$$;
REVOKE EXECUTE ON FUNCTION public.estrut_can_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estrut_can_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_estrutura_organizacional(p_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.estrut_can_read(p_company_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COALESCE(jsonb_agg(un ORDER BY un->>'nome'), '[]'::jsonb) INTO v
  FROM (
    SELECT jsonb_build_object(
      'id', u.id, 'nome', u.nome, 'tipo', u.tipo, 'endereco', u.endereco,
      'cidade', u.cidade, 'estado', u.estado, 'cep', u.cep, 'ativa', u.ativa,
      'departamentos', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'nome', d.nome, 'codigo', d.codigo, 'ativo', d.ativo,
          'responsavel_id', d.responsavel_id,
          'responsavel_nome', (SELECT c2.full_name FROM public.colaboradores c2 WHERE c2.id = d.responsavel_id),
          'setores', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', s.id, 'nome', s.nome, 'ambiente_fisico', s.ambiente_fisico,
              'andar', s.andar, 'localizacao', s.localizacao, 'ativo', s.ativo,
              'ghes', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                  'id', g.id, 'codigo', g.codigo, 'nome', g.nome, 'descricao', g.descricao,
                  'tipo_exposicao', g.tipo_exposicao, 'ativo', g.ativo,
                  'n_trabalhadores', (
                    SELECT count(*) FROM public.colaboradores cc
                    JOIN public.cargos c3 ON c3.id = cc.cargo_id
                    WHERE c3.ghe_id = g.id AND cc.is_active IS DISTINCT FROM false
                  ),
                  'cargos', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'id', c.id, 'nome', c.nome, 'cbo_codigo', c.cbo_codigo,
                      'cbo_descricao', c.cbo_descricao, 'ativo', c.ativo,
                      'risco_exposicao', c.risco_exposicao,
                      'tempo_exposicao_horas_dia', c.tempo_exposicao_horas_dia,
                      'n_colaboradores', (SELECT count(*) FROM public.colaboradores cc2 WHERE cc2.cargo_id = c.id)
                    ) ORDER BY c.nome)
                    FROM public.cargos c WHERE c.ghe_id = g.id
                  ), '[]'::jsonb)
                ) ORDER BY g.codigo NULLS LAST, g.nome)
                FROM public.ghes g WHERE g.setor_id = s.id
              ), '[]'::jsonb)
            ) ORDER BY s.nome)
            FROM public.setores s WHERE s.departamento_id = d.id
          ), '[]'::jsonb)
        ) ORDER BY d.nome)
        FROM public.departamentos d WHERE d.unidade_id = u.id
      ), '[]'::jsonb)
    ) AS un
    FROM public.unidades_organizacionais u
    WHERE u.company_id = p_company_id
  ) t;

  RETURN COALESCE(v, '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_estrutura_organizacional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_estrutura_organizacional(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_cargos_by_ghe(p_ghe_id uuid)
RETURNS SETOF public.cargos LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY SELECT * FROM public.cargos WHERE ghe_id = p_ghe_id ORDER BY nome;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_cargos_by_ghe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cargos_by_ghe(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_colaboradores_by_cargo(p_cargo_id uuid)
RETURNS TABLE(id uuid, full_name text, matricula text, status text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.cargos WHERE cargos.id = p_cargo_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
    SELECT c.id, c.full_name, c.matricula, c.status::text, c.avatar_url
    FROM public.colaboradores c WHERE c.cargo_id = p_cargo_id ORDER BY c.full_name;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_colaboradores_by_cargo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_colaboradores_by_cargo(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.calc_trabalhadores_ghe(p_ghe_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid; v_n integer;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT count(*) INTO v_n FROM public.colaboradores cc
  JOIN public.cargos c ON c.id = cc.cargo_id WHERE c.ghe_id = p_ghe_id;
  RETURN COALESCE(v_n, 0);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.calc_trabalhadores_ghe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calc_trabalhadores_ghe(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ghe_epis(p_ghe_id uuid)
RETURNS SETOF public.ghe_epis LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY SELECT * FROM public.ghe_epis WHERE ghe_id = p_ghe_id ORDER BY nome_epi;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ghe_epis(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ghe_epis(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_cbo(p_termo text)
RETURNS TABLE(codigo text, titulo text, descricao text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.codigo, c.titulo, c.descricao
  FROM public.cbo_ocupacoes c
  WHERE p_termo IS NULL OR btrim(p_termo) = ''
     OR c.codigo ILIKE '%' || btrim(p_termo) || '%'
     OR c.titulo ILIKE '%' || btrim(p_termo) || '%'
  ORDER BY c.titulo
  LIMIT 30;
$$;
REVOKE EXECUTE ON FUNCTION public.search_cbo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_cbo(text) TO authenticated;