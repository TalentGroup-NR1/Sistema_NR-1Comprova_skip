CREATE OR REPLACE FUNCTION public.get_estrutura_organizacional(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
                    WHERE c3.ghe_id = g.id AND cc.status = 'ATIVO'::colaborador_status
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
$function$;