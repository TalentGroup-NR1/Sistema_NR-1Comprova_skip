
CREATE OR REPLACE FUNCTION public.registrar_promocao(
  p_colaborador_id UUID,
  p_company_id UUID,
  p_data_promocao DATE,
  p_cargo_novo TEXT,
  p_salario_novo NUMERIC,
  p_nivel_novo TEXT DEFAULT NULL,
  p_departamento_novo TEXT DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL,
  p_aprovado_por TEXT DEFAULT '',
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_colaborador RECORD;
  v_new_promocao RECORD;
  v_role app_role;
BEGIN
  -- Permission check
  v_role := get_my_role();
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem registrar promoções';
  END IF;

  -- Fetch current colaborador data
  SELECT job_title, base_salary, job_level, department
  INTO v_colaborador
  FROM colaboradores
  WHERE id = p_colaborador_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  -- Insert promotion record
  INSERT INTO promocoes_colaborador (
    colaborador_id, company_id, data_promocao,
    cargo_anterior, salario_anterior, nivel_anterior, departamento_anterior,
    cargo_novo, salario_novo, nivel_novo, departamento_novo,
    motivo, aprovado_por, observacoes
  ) VALUES (
    p_colaborador_id, p_company_id, p_data_promocao,
    v_colaborador.job_title, v_colaborador.base_salary, 
    v_colaborador.job_level, v_colaborador.department,
    p_cargo_novo, p_salario_novo,
    COALESCE(p_nivel_novo, v_colaborador.job_level::TEXT),
    COALESCE(p_departamento_novo, v_colaborador.department),
    p_motivo, p_aprovado_por, p_observacoes
  )
  RETURNING * INTO v_new_promocao;

  -- Update colaborador current data
  UPDATE colaboradores SET
    job_title = p_cargo_novo,
    base_salary = p_salario_novo,
    department = COALESCE(p_departamento_novo, department),
    job_level = CASE 
      WHEN p_nivel_novo IS NOT NULL AND p_nivel_novo != '' 
      THEN p_nivel_novo::job_level 
      ELSE job_level 
    END,
    updated_at = now()
  WHERE id = p_colaborador_id;

  RETURN row_to_json(v_new_promocao);
END;
$$;
