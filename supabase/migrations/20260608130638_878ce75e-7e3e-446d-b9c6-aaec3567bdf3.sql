
-- =====================================================================
-- ESPELHO MENSAL DE PONTO — fechamento mensal independente do banco
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.espelhos_ponto_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  status text NOT NULL DEFAULT 'fechado' CHECK (status IN ('fechado','reaberto','assinado')),
  horas_trabalhadas_minutos integer NOT NULL DEFAULT 0,
  horas_extras_minutos integer NOT NULL DEFAULT 0,
  horas_noturnas_minutos integer NOT NULL DEFAULT 0,
  horas_abonadas_minutos integer NOT NULL DEFAULT 0,
  saldo_minutos integer NOT NULL DEFAULT 0,
  dias_falta integer NOT NULL DEFAULT 0,
  dias_abonados integer NOT NULL DEFAULT 0,
  snapshot_jsonb jsonb,
  versao integer NOT NULL DEFAULT 1,
  fechado_por uuid,
  fechado_em timestamptz,
  reaberto_por uuid,
  reaberto_em timestamptz,
  motivo_reabertura text,
  assinatura_hash text,
  assinatura_por uuid,
  assinatura_em timestamptz,
  assinatura_ip text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_espelho_mensal_unico UNIQUE (company_id, colaborador_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS ix_espelho_mensal_periodo
  ON public.espelhos_ponto_mensais (company_id, ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS ix_espelho_mensal_colab
  ON public.espelhos_ponto_mensais (colaborador_id, ano DESC, mes DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.espelhos_ponto_mensais TO authenticated;
GRANT ALL ON public.espelhos_ponto_mensais TO service_role;

ALTER TABLE public.espelhos_ponto_mensais ENABLE ROW LEVEL SECURITY;

-- Admin/RH/Gestor da empresa veem tudo da empresa
CREATE POLICY "espelho_mensal_admin_company" ON public.espelhos_ponto_mensais
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin_master')
  OR (
    company_id = public.get_my_company_id()
    AND (
      public.has_role(auth.uid(),'admin_empresa')
      OR public.has_role(auth.uid(),'analista_rh')
      OR public.has_role(auth.uid(),'gestor_departamento')
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(),'admin_master')
  OR (
    company_id = public.get_my_company_id()
    AND (
      public.has_role(auth.uid(),'admin_empresa')
      OR public.has_role(auth.uid(),'analista_rh')
    )
  )
);

-- Colaborador vê apenas os próprios
CREATE POLICY "espelho_mensal_colab_select" ON public.espelhos_ponto_mensais
FOR SELECT TO authenticated
USING (
  colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE user_id = auth.uid()
  )
);

-- Update updated_at
DROP TRIGGER IF EXISTS trg_espelho_mensal_updated_at ON public.espelhos_ponto_mensais;
CREATE TRIGGER trg_espelho_mensal_updated_at
  BEFORE UPDATE ON public.espelhos_ponto_mensais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Estender is_periodo_fechado para considerar espelho mensal
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_periodo_fechado(p_colaborador_id uuid, p_data date)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banco_horas_fechamentos
    WHERE colaborador_id = p_colaborador_id
      AND status IN ('fechado','assinado')
      AND p_data BETWEEN periodo_inicio AND periodo_fim
  ) OR EXISTS (
    SELECT 1 FROM public.espelhos_ponto_mensais
    WHERE colaborador_id = p_colaborador_id
      AND status IN ('fechado','assinado')
      AND p_data BETWEEN periodo_inicio AND periodo_fim
  );
$$;

-- =====================================================================
-- RPC: fechar espelho mensal (admin)
-- =====================================================================
DROP FUNCTION IF EXISTS public.fechar_espelho_mensal(uuid,integer,integer,uuid[]);
CREATE OR REPLACE FUNCTION public.fechar_espelho_mensal(
  p_company_id uuid,
  p_ano integer,
  p_mes integer,
  p_colaboradores_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_inicio date;
  v_fim date;
  v_colab record;
  v_snapshot jsonb;
  v_totals record;
  v_sucesso int := 0;
  v_total int := 0;
  v_erros jsonb := '[]'::jsonb;
  v_uid uuid := auth.uid();
BEGIN
  -- Autorização: admin_master OU admin/rh da empresa
  IF NOT (
    public.has_role(v_uid,'admin_master')
    OR (
      (public.has_role(v_uid,'admin_empresa') OR public.has_role(v_uid,'analista_rh'))
      AND public.get_my_company_id() = p_company_id
    )
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  v_inicio := make_date(p_ano, p_mes, 1);
  v_fim := (v_inicio + interval '1 month - 1 day')::date;

  FOR v_colab IN
    SELECT id, full_name FROM public.colaboradores
    WHERE company_id = p_company_id
      AND status = 'ATIVO'
      AND contract_type IN ('CLT','Estágio','Aprendiz','Temporário')
      AND (p_colaboradores_ids IS NULL OR id = ANY(p_colaboradores_ids))
  LOOP
    v_total := v_total + 1;
    BEGIN
      -- Snapshot do resumo diário do mês
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.data), '[]'::jsonb)
        INTO v_snapshot
      FROM public.ponto_resumo_diario r
      WHERE r.colaborador_id = v_colab.id
        AND r.data BETWEEN v_inicio AND v_fim;

      SELECT
        COALESCE(SUM(horas_trabalhadas_minutos),0) AS trab,
        COALESCE(SUM(horas_extras_minutos),0) AS extras,
        COALESCE(SUM(horas_noturnas_minutos),0) AS noturnas,
        COALESCE(SUM(horas_abonadas_minutos),0) AS abonadas,
        COALESCE(SUM(saldo_minutos),0) AS saldo,
        COUNT(*) FILTER (WHERE status = 'FALTA') AS faltas,
        COUNT(*) FILTER (WHERE COALESCE(horas_abonadas_minutos,0) > 0) AS abonados
        INTO v_totals
      FROM public.ponto_resumo_diario
      WHERE colaborador_id = v_colab.id
        AND data BETWEEN v_inicio AND v_fim;

      INSERT INTO public.espelhos_ponto_mensais (
        company_id, colaborador_id, ano, mes, periodo_inicio, periodo_fim,
        status, horas_trabalhadas_minutos, horas_extras_minutos, horas_noturnas_minutos,
        horas_abonadas_minutos, saldo_minutos, dias_falta, dias_abonados,
        snapshot_jsonb, versao, fechado_por, fechado_em
      ) VALUES (
        p_company_id, v_colab.id, p_ano, p_mes, v_inicio, v_fim,
        'fechado', v_totals.trab, v_totals.extras, v_totals.noturnas,
        v_totals.abonadas, v_totals.saldo, v_totals.faltas, v_totals.abonados,
        v_snapshot, 1, v_uid, now()
      )
      ON CONFLICT (company_id, colaborador_id, ano, mes) DO UPDATE SET
        status = 'fechado',
        horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
        horas_extras_minutos = EXCLUDED.horas_extras_minutos,
        horas_noturnas_minutos = EXCLUDED.horas_noturnas_minutos,
        horas_abonadas_minutos = EXCLUDED.horas_abonadas_minutos,
        saldo_minutos = EXCLUDED.saldo_minutos,
        dias_falta = EXCLUDED.dias_falta,
        dias_abonados = EXCLUDED.dias_abonados,
        snapshot_jsonb = EXCLUDED.snapshot_jsonb,
        versao = espelhos_ponto_mensais.versao + 1,
        fechado_por = v_uid,
        fechado_em = now(),
        reaberto_por = NULL,
        reaberto_em = NULL,
        motivo_reabertura = NULL,
        assinatura_hash = NULL,
        assinatura_por = NULL,
        assinatura_em = NULL,
        assinatura_ip = NULL,
        pdf_url = NULL,
        updated_at = now();

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('colaborador_id', v_colab.id, 'nome', v_colab.full_name, 'erro', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'sucesso', v_sucesso, 'erros', v_erros,
                            'periodo_inicio', v_inicio, 'periodo_fim', v_fim);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fechar_espelho_mensal(uuid,integer,integer,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fechar_espelho_mensal(uuid,integer,integer,uuid[]) TO authenticated;

-- =====================================================================
-- RPC: reabrir espelho mensal (admin) — derruba assinatura
-- =====================================================================
DROP FUNCTION IF EXISTS public.reabrir_espelho_mensal(uuid,text);
CREATE OR REPLACE FUNCTION public.reabrir_espelho_mensal(
  p_espelho_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_row public.espelhos_ponto_mensais;
  v_uid uuid := auth.uid();
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'MOTIVO_OBRIGATORIO';
  END IF;

  SELECT * INTO v_row FROM public.espelhos_ponto_mensais WHERE id = p_espelho_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF NOT (
    public.has_role(v_uid,'admin_master')
    OR (
      (public.has_role(v_uid,'admin_empresa') OR public.has_role(v_uid,'analista_rh'))
      AND public.get_my_company_id() = v_row.company_id
    )
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  UPDATE public.espelhos_ponto_mensais
     SET status = 'reaberto',
         reaberto_por = v_uid,
         reaberto_em = now(),
         motivo_reabertura = p_motivo,
         assinatura_hash = NULL,
         assinatura_por = NULL,
         assinatura_em = NULL,
         assinatura_ip = NULL,
         pdf_url = NULL,
         updated_at = now()
   WHERE id = p_espelho_id;

  RETURN jsonb_build_object('id', p_espelho_id, 'status', 'reaberto');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reabrir_espelho_mensal(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reabrir_espelho_mensal(uuid,text) TO authenticated;

-- =====================================================================
-- RPC: assinar espelho mensal (colaborador)
-- =====================================================================
DROP FUNCTION IF EXISTS public.assinar_espelho_mensal(uuid);
CREATE OR REPLACE FUNCTION public.assinar_espelho_mensal(p_espelho_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_row public.espelhos_ponto_mensais;
  v_uid uuid := auth.uid();
  v_colab_user uuid;
  v_hash text;
  v_payload text;
BEGIN
  SELECT * INTO v_row FROM public.espelhos_ponto_mensais WHERE id = p_espelho_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT user_id INTO v_colab_user FROM public.colaboradores WHERE id = v_row.colaborador_id;
  IF v_colab_user IS NULL OR v_colab_user <> v_uid THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF v_row.status NOT IN ('fechado','reaberto') THEN
    RAISE EXCEPTION 'STATUS_INVALIDO: %', v_row.status;
  END IF;

  v_payload := concat_ws('|',
    v_row.id::text, v_row.colaborador_id::text,
    v_row.periodo_inicio::text, v_row.periodo_fim::text,
    v_row.horas_trabalhadas_minutos, v_row.horas_extras_minutos,
    v_row.horas_abonadas_minutos, v_row.saldo_minutos,
    v_row.versao::text, now()::text
  );
  v_hash := encode(digest(v_payload, 'sha256'), 'hex');

  UPDATE public.espelhos_ponto_mensais
     SET status = 'assinado',
         assinatura_hash = v_hash,
         assinatura_por = v_uid,
         assinatura_em = now(),
         updated_at = now()
   WHERE id = p_espelho_id;

  RETURN jsonb_build_object(
    'id', p_espelho_id,
    'status', 'assinado',
    'hash', v_hash,
    'assinado_em', now(),
    'versao', v_row.versao
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assinar_espelho_mensal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assinar_espelho_mensal(uuid) TO authenticated;

-- =====================================================================
-- RPC: get_meus_espelhos_mensais (colaborador)
-- =====================================================================
DROP FUNCTION IF EXISTS public.get_meus_espelhos_mensais();
CREATE OR REPLACE FUNCTION public.get_meus_espelhos_mensais()
RETURNS SETOF public.espelhos_ponto_mensais
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT e.*
    FROM public.espelhos_ponto_mensais e
    JOIN public.colaboradores c ON c.id = e.colaborador_id
   WHERE c.user_id = auth.uid()
   ORDER BY e.ano DESC, e.mes DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_meus_espelhos_mensais() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_meus_espelhos_mensais() TO authenticated;
