
-- ============================================================
-- ONDA 5 — FECHAMENTO OFICIAL DO PONTO (Etapas 1 + 2)
-- ============================================================

-- 1.1 Ampliar banco_horas_fechamentos
ALTER TABLE public.banco_horas_fechamentos
  ADD COLUMN IF NOT EXISTS fechado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reaberto_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reaberto_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_reabertura TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_jsonb JSONB,
  ADD COLUMN IF NOT EXISTS hash_assinatura TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS csv_url TEXT,
  ADD COLUMN IF NOT EXISTS horas_trabalhadas_minutos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_extras_minutos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_noturnas_minutos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_abonadas_minutos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_falta INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_abonados INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS ux_banco_horas_fechamentos_unico
  ON public.banco_horas_fechamentos (company_id, colaborador_id, periodo_inicio, periodo_fim);

CREATE INDEX IF NOT EXISTS ix_banco_horas_fechamentos_periodo
  ON public.banco_horas_fechamentos (company_id, periodo_fim DESC);

-- 1.2 Auditoria
CREATE TABLE IF NOT EXISTS public.banco_horas_fechamentos_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id UUID NOT NULL REFERENCES public.banco_horas_fechamentos(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('fechou','reabriu','refechou','exportou','assinou')),
  user_id UUID REFERENCES auth.users(id),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_fechamentos_auditoria_fechamento
  ON public.banco_horas_fechamentos_auditoria (fechamento_id, created_at DESC);

ALTER TABLE public.banco_horas_fechamentos_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read fechamentos auditoria" ON public.banco_horas_fechamentos_auditoria;
CREATE POLICY "Admins read fechamentos auditoria"
ON public.banco_horas_fechamentos_auditoria FOR SELECT TO authenticated
USING (
  public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (
    public.get_my_role() = 'admin_master'
    OR EXISTS (
      SELECT 1 FROM public.banco_horas_fechamentos f
      WHERE f.id = banco_horas_fechamentos_auditoria.fechamento_id
        AND f.company_id = public.get_my_company_id()
    )
  )
);

-- 1.3 RLS reforçada em banco_horas_fechamentos: restringir DELETE
DROP POLICY IF EXISTS "Admins can manage banco_horas_fechamentos" ON public.banco_horas_fechamentos;

DROP POLICY IF EXISTS "Admins select fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Admins select fechamentos"
ON public.banco_horas_fechamentos FOR SELECT TO authenticated
USING (
  public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (public.get_my_role() = 'admin_master' OR company_id = public.get_my_company_id())
);

DROP POLICY IF EXISTS "Admins insert fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Admins insert fechamentos"
ON public.banco_horas_fechamentos FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (public.get_my_role() = 'admin_master' OR company_id = public.get_my_company_id())
);

DROP POLICY IF EXISTS "Admins update fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Admins update fechamentos"
ON public.banco_horas_fechamentos FOR UPDATE TO authenticated
USING (
  public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
  AND (public.get_my_role() = 'admin_master' OR company_id = public.get_my_company_id())
);

DROP POLICY IF EXISTS "Only admin_master deletes fechamentos" ON public.banco_horas_fechamentos;
CREATE POLICY "Only admin_master deletes fechamentos"
ON public.banco_horas_fechamentos FOR DELETE TO authenticated
USING (public.get_my_role() = 'admin_master');

-- 1.4 Bucket privado para PDFs/CSVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('fechamentos-ponto', 'fechamentos-ponto', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage fechamentos bucket" ON storage.objects;
CREATE POLICY "Admins manage fechamentos bucket"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'fechamentos-ponto'
  AND public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
)
WITH CHECK (
  bucket_id = 'fechamentos-ponto'
  AND public.get_my_role() IN ('admin_master','admin_empresa','analista_rh')
);

-- ============================================================
-- 1.5 Função is_periodo_fechado
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_periodo_fechado(
  p_colaborador_id UUID,
  p_data DATE
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banco_horas_fechamentos
    WHERE colaborador_id = p_colaborador_id
      AND status = 'fechado'
      AND p_data BETWEEN periodo_inicio AND periodo_fim
  );
$$;

-- ============================================================
-- 1.6 fechar_periodo_ponto
-- ============================================================
CREATE OR REPLACE FUNCTION public.fechar_periodo_ponto(
  p_company_id UUID,
  p_periodo_inicio DATE,
  p_periodo_fim DATE,
  p_colaboradores_ids UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_colab RECORD;
  v_snapshot JSONB;
  v_h_trab INT;
  v_h_extra INT;
  v_h_not INT;
  v_h_aban INT;
  v_dias_falta INT;
  v_dias_aban INT;
  v_saldo INT;
  v_hash TEXT;
  v_fechamento_id UUID;
  v_total INT := 0;
  v_sucesso INT := 0;
  v_erros JSONB := '[]'::JSONB;
  v_uid UUID := auth.uid();
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;
  IF p_periodo_inicio > p_periodo_fim THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;

  FOR v_colab IN
    SELECT c.id, c.full_name
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND c.status = 'ATIVO'
      AND (p_colaboradores_ids IS NULL OR c.id = ANY(p_colaboradores_ids))
  LOOP
    v_total := v_total + 1;
    BEGIN
      -- Snapshot a partir do resumo diário canônico
      SELECT
        COALESCE(jsonb_agg(
          jsonb_build_object(
            'data', r.data,
            'horas_previstas_minutos', r.horas_previstas_minutos,
            'horas_trabalhadas_minutos', r.horas_trabalhadas_minutos,
            'horas_intervalo_minutos', r.horas_intervalo_minutos,
            'horas_noturnas_minutos', r.horas_noturnas_minutos,
            'horas_extras_minutos', r.horas_extras_minutos,
            'saldo_minutos', r.saldo_minutos,
            'status', r.status
          ) ORDER BY r.data
        ), '[]'::JSONB),
        COALESCE(SUM(r.horas_trabalhadas_minutos), 0),
        COALESCE(SUM(r.horas_extras_minutos), 0),
        COALESCE(SUM(r.horas_noturnas_minutos), 0),
        COALESCE(SUM(CASE WHEN r.status = 'ABONADO' THEN r.horas_previstas_minutos ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.status = 'FALTA' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.status = 'ABONADO' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(r.saldo_minutos), 0)
      INTO v_snapshot, v_h_trab, v_h_extra, v_h_not, v_h_aban, v_dias_falta, v_dias_aban, v_saldo
      FROM public.ponto_resumo_diario r
      WHERE r.colaborador_id = v_colab.id
        AND r.data BETWEEN p_periodo_inicio AND p_periodo_fim;

      v_hash := encode(digest(
        v_snapshot::text || v_colab.id::text || p_periodo_inicio::text || p_periodo_fim::text,
        'sha256'
      ), 'hex');

      INSERT INTO public.banco_horas_fechamentos AS f (
        company_id, colaborador_id, periodo_inicio, periodo_fim,
        saldo_minutos, status,
        snapshot_jsonb, hash_assinatura,
        horas_trabalhadas_minutos, horas_extras_minutos, horas_noturnas_minutos,
        horas_abonadas_minutos, dias_falta, dias_abonados,
        fechado_por, fechado_em, versao
      ) VALUES (
        p_company_id, v_colab.id, p_periodo_inicio, p_periodo_fim,
        v_saldo, 'fechado',
        v_snapshot, v_hash,
        v_h_trab, v_h_extra, v_h_not,
        v_h_aban, v_dias_falta, v_dias_aban,
        v_uid, now(), 1
      )
      ON CONFLICT (company_id, colaborador_id, periodo_inicio, periodo_fim)
      DO UPDATE SET
        saldo_minutos = EXCLUDED.saldo_minutos,
        status = 'fechado',
        snapshot_jsonb = EXCLUDED.snapshot_jsonb,
        hash_assinatura = EXCLUDED.hash_assinatura,
        horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
        horas_extras_minutos = EXCLUDED.horas_extras_minutos,
        horas_noturnas_minutos = EXCLUDED.horas_noturnas_minutos,
        horas_abonadas_minutos = EXCLUDED.horas_abonadas_minutos,
        dias_falta = EXCLUDED.dias_falta,
        dias_abonados = EXCLUDED.dias_abonados,
        fechado_por = v_uid,
        fechado_em = now(),
        versao = f.versao + 1,
        updated_at = now()
      WHERE f.status <> 'fechado'
      RETURNING id INTO v_fechamento_id;

      IF v_fechamento_id IS NULL THEN
        SELECT id INTO v_fechamento_id
        FROM public.banco_horas_fechamentos
        WHERE company_id = p_company_id AND colaborador_id = v_colab.id
          AND periodo_inicio = p_periodo_inicio AND periodo_fim = p_periodo_fim;
      END IF;

      INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
      VALUES (
        v_fechamento_id,
        CASE WHEN v_fechamento_id IS NOT NULL THEN 'refechou' ELSE 'fechou' END,
        v_uid,
        jsonb_build_object('saldo', v_saldo, 'hash', v_hash)
      );

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object(
        'colaborador_id', v_colab.id,
        'colaborador_nome', v_colab.full_name,
        'erro', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'total', v_total,
    'sucesso', v_sucesso,
    'erros', v_erros,
    'periodo_inicio', p_periodo_inicio,
    'periodo_fim', p_periodo_fim,
    'company_id', p_company_id
  );
END;
$$;

-- ============================================================
-- 1.7 reabrir_periodo_ponto
-- ============================================================
CREATE OR REPLACE FUNCTION public.reabrir_periodo_ponto(
  p_fechamento_id UUID,
  p_motivo TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_fechamento RECORD;
  v_uid UUID := auth.uid();
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'Apenas admin_master ou admin_empresa podem reabrir';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;

  SELECT * INTO v_fechamento FROM public.banco_horas_fechamentos WHERE id = p_fechamento_id;
  IF v_fechamento IS NULL THEN
    RAISE EXCEPTION 'Fechamento não encontrado';
  END IF;
  IF v_role <> 'admin_master' AND v_fechamento.company_id <> v_my_company THEN
    RAISE EXCEPTION 'Fora do escopo';
  END IF;
  IF v_fechamento.status <> 'fechado' THEN
    RAISE EXCEPTION 'Fechamento não está em estado fechado (atual: %)', v_fechamento.status;
  END IF;

  UPDATE public.banco_horas_fechamentos
  SET status = 'reaberto',
      reaberto_por = v_uid,
      reaberto_em = now(),
      motivo_reabertura = p_motivo,
      updated_at = now()
  WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (p_fechamento_id, 'reabriu', v_uid, jsonb_build_object('motivo', p_motivo));

  RETURN jsonb_build_object('ok', true, 'fechamento_id', p_fechamento_id);
END;
$$;

-- ============================================================
-- 2.1 block_ponto_periodo_fechado: trigger universal
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_ponto_periodo_fechado()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab UUID;
  v_data DATE;
  v_data2 DATE;
  v_override TEXT;
BEGIN
  v_override := current_setting('app.allow_fechado_override', true);
  IF v_override = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'ponto_registros' THEN
    v_colab := COALESCE(NEW.colaborador_id, OLD.colaborador_id);
    v_data := (COALESCE(NEW.data_hora, OLD.data_hora) AT TIME ZONE 'America/Sao_Paulo')::date;
    IF public.is_periodo_fechado(v_colab, v_data) THEN
      RAISE EXCEPTION 'PERIODO_FECHADO: registro em % não permitido (período fechado)', v_data
        USING ERRCODE = 'P0001';
    END IF;

  ELSIF TG_TABLE_NAME = 'ponto_abonos' THEN
    v_colab := COALESCE(NEW.colaborador_id, OLD.colaborador_id);
    v_data := COALESCE(NEW.data_inicio, OLD.data_inicio);
    v_data2 := COALESCE(NEW.data_fim, OLD.data_fim);
    IF EXISTS (
      SELECT 1 FROM generate_series(v_data, v_data2, '1 day'::interval) g(d)
      WHERE public.is_periodo_fechado(v_colab, g.d::date)
    ) THEN
      RAISE EXCEPTION 'PERIODO_FECHADO: abono em período fechado'
        USING ERRCODE = 'P0001';
    END IF;

  ELSIF TG_TABLE_NAME = 'ponto_compensacoes' THEN
    v_data := COALESCE(NEW.data_inicio, OLD.data_inicio);
    v_data2 := COALESCE(NEW.data_fim, OLD.data_fim);
    -- ponto_compensacoes não tem colaborador_id; bloqueio só consultivo via UI
    -- (escopo de empresa). Aqui não bloqueamos por colaborador.
    RETURN COALESCE(NEW, OLD);

  ELSIF TG_TABLE_NAME = 'ponto_resumo_diario' THEN
    v_colab := COALESCE(NEW.colaborador_id, OLD.colaborador_id);
    v_data := COALESCE(NEW.data, OLD.data);
    IF public.is_periodo_fechado(v_colab, v_data) THEN
      RAISE EXCEPTION 'PERIODO_FECHADO: resumo de % está fechado', v_data
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2.2 Anexar triggers (nomes alfabéticos forçam ordem antes dos demais)
DROP TRIGGER IF EXISTS a1_block_ponto_periodo_fechado ON public.ponto_registros;
CREATE TRIGGER a1_block_ponto_periodo_fechado
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.block_ponto_periodo_fechado();

DROP TRIGGER IF EXISTS a1_block_ponto_periodo_fechado ON public.ponto_abonos;
CREATE TRIGGER a1_block_ponto_periodo_fechado
  BEFORE INSERT OR UPDATE OR DELETE ON public.ponto_abonos
  FOR EACH ROW EXECUTE FUNCTION public.block_ponto_periodo_fechado();

DROP TRIGGER IF EXISTS a1_block_resumo_periodo_fechado ON public.ponto_resumo_diario;
CREATE TRIGGER a1_block_resumo_periodo_fechado
  BEFORE UPDATE OR DELETE ON public.ponto_resumo_diario
  FOR EACH ROW EXECUTE FUNCTION public.block_ponto_periodo_fechado();

-- 2.3 recalcular_resumo_diario com early-return para dias fechados
CREATE OR REPLACE FUNCTION public.recalcular_resumo_diario(p_colaborador_id uuid, p_data date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_jornada int;
  v_tolerancia int;
  v_trab int := 0;
  v_intervalo int := 0;
  v_extras int := 0;
  v_saldo int := 0;
  v_noturno int := 0;
  v_status ponto_resumo_status;
  v_count int;
  v_abonado boolean;
  v_override TEXT;
  r record;
  v_open timestamptz;
  v_break_open timestamptz;
BEGIN
  -- Bloqueio retroativo: dia fechado não é recalculado
  v_override := current_setting('app.allow_fechado_override', true);
  IF v_override IS DISTINCT FROM 'true' AND public.is_periodo_fechado(p_colaborador_id, p_data) THEN
    RETURN;
  END IF;

  SELECT company_id INTO v_company_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_company_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ponto_resumo_diario
    WHERE colaborador_id = p_colaborador_id AND data = p_data AND status = 'ABONADO'
  ) INTO v_abonado;
  IF v_abonado THEN RETURN; END IF;

  SELECT COALESCE(jornada_diaria_minutos, 480), COALESCE(tolerancia_minutos, 10)
    INTO v_jornada, v_tolerancia
  FROM public.ponto_configuracoes
  WHERE company_id = v_company_id
  LIMIT 1;
  v_jornada := COALESCE(v_jornada, 480);
  v_tolerancia := COALESCE(v_tolerancia, 10);

  v_open := NULL;
  v_break_open := NULL;

  FOR r IN
    SELECT tipo, data_hora
    FROM public.ponto_registros
    WHERE colaborador_id = p_colaborador_id
      AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data
      AND status_aprovacao = 'aprovado'
      AND COALESCE(exclusao_pendente, false) = false
    ORDER BY data_hora ASC
  LOOP
    IF r.tipo IN ('ENTRADA','INTERVALO_RETORNO') THEN
      v_open := r.data_hora;
      IF r.tipo = 'INTERVALO_RETORNO' AND v_break_open IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (r.data_hora - v_break_open))::int / 60);
        v_break_open := NULL;
      END IF;
    ELSIF r.tipo IN ('SAIDA','INTERVALO_SAIDA') THEN
      IF v_open IS NOT NULL THEN
        v_trab    := v_trab + (EXTRACT(EPOCH FROM (r.data_hora - v_open))::int / 60);
        v_noturno := v_noturno + public.calc_minutos_noturnos_br(v_open, r.data_hora);
        v_open := NULL;
      END IF;
      IF r.tipo = 'INTERVALO_SAIDA' THEN
        v_break_open := r.data_hora;
      END IF;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_count FROM public.ponto_registros
   WHERE colaborador_id = p_colaborador_id
     AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data;

  IF v_count = 0 THEN
    DELETE FROM public.ponto_resumo_diario
     WHERE colaborador_id = p_colaborador_id AND data = p_data AND status <> 'ABONADO';
    RETURN;
  END IF;

  v_saldo := v_trab - v_jornada;
  IF abs(v_saldo) <= v_tolerancia THEN v_saldo := 0; END IF;
  IF v_trab > v_jornada + v_tolerancia THEN
    v_extras := v_trab - v_jornada;
  ELSE
    v_extras := 0;
  END IF;

  v_status := CASE WHEN v_open IS NOT NULL THEN 'INCONSISTENTE'::ponto_resumo_status
                   ELSE 'REGULAR'::ponto_resumo_status END;

  INSERT INTO public.ponto_resumo_diario (
    colaborador_id, company_id, data,
    horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
    horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
  ) VALUES (
    p_colaborador_id, v_company_id, p_data,
    v_jornada, v_trab, v_intervalo, v_noturno, v_extras, v_saldo, v_status
  )
  ON CONFLICT (colaborador_id, data) DO UPDATE SET
    horas_previstas_minutos   = EXCLUDED.horas_previstas_minutos,
    horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
    horas_intervalo_minutos   = EXCLUDED.horas_intervalo_minutos,
    horas_noturnas_minutos    = EXCLUDED.horas_noturnas_minutos,
    horas_extras_minutos      = EXCLUDED.horas_extras_minutos,
    saldo_minutos             = EXCLUDED.saldo_minutos,
    status                    = EXCLUDED.status,
    updated_at                = now()
  WHERE public.ponto_resumo_diario.status <> 'ABONADO';
END;
$function$;

-- Trigger updated_at em banco_horas_fechamentos
DROP TRIGGER IF EXISTS update_banco_horas_fechamentos_updated_at ON public.banco_horas_fechamentos;
CREATE TRIGGER update_banco_horas_fechamentos_updated_at
  BEFORE UPDATE ON public.banco_horas_fechamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
