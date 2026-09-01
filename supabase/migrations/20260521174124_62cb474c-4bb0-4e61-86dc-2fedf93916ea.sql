CREATE OR REPLACE FUNCTION public.registrar_promocao_retroativa(
  p_colaborador_id uuid,
  p_company_id uuid,
  p_data_promocao date,
  p_cargo_anterior text,
  p_salario_anterior numeric,
  p_cargo_novo text,
  p_salario_novo numeric,
  p_nivel_anterior text DEFAULT NULL,
  p_departamento_anterior text DEFAULT NULL,
  p_nivel_novo text DEFAULT NULL,
  p_departamento_novo text DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_aprovado_por text DEFAULT '',
  p_observacoes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_promocao RECORD;
  v_role app_role;
  v_exists boolean;
BEGIN
  v_role := get_my_role();
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem registrar promoções';
  END IF;

  SELECT EXISTS(SELECT 1 FROM colaboradores WHERE id = p_colaborador_id AND company_id = p_company_id)
  INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Colaborador não encontrado nesta empresa';
  END IF;

  IF p_data_promocao > CURRENT_DATE THEN
    RAISE EXCEPTION 'A data da promoção não pode ser futura';
  END IF;

  INSERT INTO promocoes_colaborador (
    colaborador_id, company_id, data_promocao,
    cargo_anterior, salario_anterior, nivel_anterior, departamento_anterior,
    cargo_novo, salario_novo, nivel_novo, departamento_novo,
    motivo, aprovado_por, observacoes, created_by_user_id
  ) VALUES (
    p_colaborador_id, p_company_id, p_data_promocao,
    p_cargo_anterior, p_salario_anterior, p_nivel_anterior, p_departamento_anterior,
    p_cargo_novo, p_salario_novo, p_nivel_novo, p_departamento_novo,
    p_motivo, COALESCE(NULLIF(p_aprovado_por, ''), 'Importação histórica'), p_observacoes, auth.uid()
  )
  RETURNING * INTO v_new_promocao;

  RETURN row_to_json(v_new_promocao);
END;
$function$;