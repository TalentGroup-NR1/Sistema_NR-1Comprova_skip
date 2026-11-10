
-- Tabela de auditoria
CREATE TABLE public.transferencias_colaborador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_origem_id uuid NOT NULL REFERENCES public.companies(id),
  empresa_destino_id uuid NOT NULL REFERENCES public.companies(id),
  transferido_por uuid NOT NULL,
  motivo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transferencias_colaborador_colab ON public.transferencias_colaborador(colaborador_id);
CREATE INDEX idx_transferencias_colaborador_created ON public.transferencias_colaborador(created_at DESC);

GRANT SELECT ON public.transferencias_colaborador TO authenticated;
GRANT ALL  ON public.transferencias_colaborador TO service_role;

ALTER TABLE public.transferencias_colaborador ENABLE ROW LEVEL SECURITY;

-- SELECT: admin_master vê tudo; admin_empresa/analista_rh vê quando a empresa atual está envolvida
CREATE POLICY "transf_select_admin_rh"
ON public.transferencias_colaborador
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master')
  OR (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND (
      empresa_origem_id  = public.get_my_company_id()
      OR empresa_destino_id = public.get_my_company_id()
    )
  )
);

-- INSERT: somente via RPC SECURITY DEFINER. Bloqueia inserts diretos.
CREATE POLICY "transf_insert_block"
ON public.transferencias_colaborador
FOR INSERT
TO authenticated
WITH CHECK (false);

-- RPC de transferência
CREATE OR REPLACE FUNCTION public.transferir_colaborador(
  p_colaborador_id uuid,
  p_empresa_destino_id uuid,
  p_motivo text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin_master boolean;
  v_is_admin_empresa boolean;
  v_is_analista_rh boolean;
  v_my_company uuid;
  v_origem uuid;
  v_destino_status text;
  v_destino_nome text;
  v_destino_cliente text;
  v_transf_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_is_admin_master  := public.has_role(v_uid, 'admin_master');
  v_is_admin_empresa := public.has_role(v_uid, 'admin_empresa');
  v_is_analista_rh   := public.has_role(v_uid, 'analista_rh');

  IF NOT (v_is_admin_master OR v_is_admin_empresa OR v_is_analista_rh) THEN
    RAISE EXCEPTION 'Sem permissão para transferir colaborador' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_origem
  FROM public.colaboradores WHERE id = p_colaborador_id;

  IF v_origem IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  SELECT status, name, empresa_cliente
    INTO v_destino_status, v_destino_nome, v_destino_cliente
  FROM public.companies WHERE id = p_empresa_destino_id;

  IF v_destino_nome IS NULL THEN
    RAISE EXCEPTION 'Empresa destino não encontrada';
  END IF;

  IF v_destino_status <> 'active' THEN
    RAISE EXCEPTION 'Empresa destino inativa';
  END IF;

  IF v_origem = p_empresa_destino_id THEN
    RAISE EXCEPTION 'Colaborador já pertence a esta empresa';
  END IF;

  IF NOT v_is_admin_master THEN
    v_my_company := public.get_my_company_id();
    IF v_my_company IS NULL OR v_origem <> v_my_company THEN
      RAISE EXCEPTION 'Você só pode transferir colaboradores da sua empresa' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.colaboradores
     SET company_id = p_empresa_destino_id,
         updated_at = now()
   WHERE id = p_colaborador_id;

  INSERT INTO public.transferencias_colaborador
    (colaborador_id, empresa_origem_id, empresa_destino_id, transferido_por, motivo)
  VALUES
    (p_colaborador_id, v_origem, p_empresa_destino_id, v_uid, COALESCE(p_motivo, ''))
  RETURNING id INTO v_transf_id;

  RETURN jsonb_build_object(
    'transferencia_id', v_transf_id,
    'colaborador_id', p_colaborador_id,
    'empresa_origem_id', v_origem,
    'empresa_destino_id', p_empresa_destino_id,
    'empresa_destino_nome', COALESCE(NULLIF(TRIM(v_destino_cliente), ''), v_destino_nome)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transferir_colaborador(uuid, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.transferir_colaborador(uuid, uuid, text) TO authenticated;
