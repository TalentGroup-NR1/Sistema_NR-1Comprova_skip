-- Atualiza estrut_can_read para FAIL-CLOSED para quem não for admin/analista
CREATE OR REPLACE FUNCTION public.estrut_can_read(_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_admin_master(auth.uid()) OR (
    _company_id = public.get_my_company_id() AND
    public.get_my_role() IN ('admin_empresa'::app_role, 'analista_rh'::app_role)
  );
$function$;

-- Atualiza a função get_estrutura_organizacional para retornar vazio e não estourar erro
CREATE OR REPLACE FUNCTION public.get_estrutura_organizacional(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT public.estrut_can_read(p_company_id) THEN
    RETURN '[]'::jsonb;
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
          'n_colaboradores', (
            SELECT count(*) FROM public.colaboradores cd
            JOIN public.cargos cdc ON cdc.id = cd.cargo_id
            JOIN public.ghes cdg ON cdg.id = cdc.ghe_id
            JOIN public.setores cds ON cds.id = cdg.setor_id
            WHERE cds.departamento_id = d.id AND cd.status = 'ATIVO'::colaborador_status
          ),
          'setores', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', s.id, 'nome', s.nome, 'ambiente_fisico', s.ambiente_fisico,
              'andar', s.andar, 'localizacao', s.localizacao, 'ativo', s.ativo,
              'n_colaboradores', (
                SELECT count(*) FROM public.colaboradores cs
                JOIN public.cargos csc ON csc.id = cs.cargo_id
                JOIN public.ghes csg ON csg.id = csc.ghe_id
                WHERE csg.setor_id = s.id AND cs.status = 'ATIVO'::colaborador_status
              ),
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
                      'tarefa_prescrita', c.tarefa_prescrita,
                      'tarefa_real', c.tarefa_real,
                      'descricao_atividades', c.descricao_atividades,
                      'carga_horaria_semanal', c.carga_horaria_semanal,
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

-- Atualiza RLS policies de Leitura para FAIL-CLOSED se não for admin
ALTER POLICY estrut_unidades_select ON public.unidades_organizacionais USING (admin_master_scope(company_id) OR (company_id = get_my_company_id() AND get_my_role() IN ('admin_empresa'::app_role, 'analista_rh'::app_role)));
ALTER POLICY estrut_departamentos_select ON public.departamentos USING (admin_master_scope(company_id) OR (company_id = get_my_company_id() AND get_my_role() IN ('admin_empresa'::app_role, 'analista_rh'::app_role)));
ALTER POLICY estrut_setores_select ON public.setores USING (admin_master_scope(company_id) OR (company_id = get_my_company_id() AND get_my_role() IN ('admin_empresa'::app_role, 'analista_rh'::app_role)));
ALTER POLICY estrut_ghes_select ON public.ghes USING (admin_master_scope(company_id) OR (company_id = get_my_company_id() AND get_my_role() IN ('admin_empresa'::app_role, 'analista_rh'::app_role)));
ALTER POLICY estrut_cargos_select ON public.cargos USING (admin_master_scope(company_id) OR (company_id = get_my_company_id() AND get_my_role() IN ('admin_empresa'::app_role, 'analista_rh'::app_role)));
