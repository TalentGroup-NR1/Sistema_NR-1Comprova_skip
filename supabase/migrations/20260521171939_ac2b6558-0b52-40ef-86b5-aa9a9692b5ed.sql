
-- 1) Adicionar 'AJUSTE' ao enum de status do resumo diário
ALTER TYPE public.ponto_resumo_status ADD VALUE IF NOT EXISTS 'AJUSTE';

-- 2) Enum para ações de tratativa
DO $$ BEGIN
  CREATE TYPE public.tratativa_saldo_acao AS ENUM ('pagar','descontar','transferir','perdoar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tabela de tratativas
CREATE TABLE IF NOT EXISTS public.ponto_fechamento_tratativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  saldo_minutos integer NOT NULL,
  acao public.tratativa_saldo_acao NOT NULL,
  observacao text,
  decidido_por uuid NOT NULL,
  decidido_em timestamptz NOT NULL DEFAULT now(),
  ajuste_resumo_data date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, colaborador_id, periodo_inicio, periodo_fim)
);

CREATE INDEX IF NOT EXISTS idx_tratativas_company_periodo
  ON public.ponto_fechamento_tratativas (company_id, periodo_inicio, periodo_fim);

ALTER TABLE public.ponto_fechamento_tratativas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tratativas_select" ON public.ponto_fechamento_tratativas;
CREATE POLICY "tratativas_select" ON public.ponto_fechamento_tratativas
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin_master'
    OR (
      public.get_my_role() IN ('admin_empresa','analista_rh','gestor_departamento')
      AND company_id = public.get_my_company_id()
    )
    OR colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tratativas_modify" ON public.ponto_fechamento_tratativas;
CREATE POLICY "tratativas_modify" ON public.ponto_fechamento_tratativas
  FOR ALL TO authenticated
  USING (
    public.get_my_role() = 'admin_master'
    OR (
      public.get_my_role() IN ('admin_empresa','analista_rh')
      AND company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin_master'
    OR (
      public.get_my_role() IN ('admin_empresa','analista_rh')
      AND company_id = public.get_my_company_id()
    )
  );

-- 4) Snapshot da tratativa no próprio fechamento (sai no CSV/PDF)
ALTER TABLE public.banco_horas_fechamentos
  ADD COLUMN IF NOT EXISTS tratativa_acao public.tratativa_saldo_acao,
  ADD COLUMN IF NOT EXISTS tratativa_observacao text;

-- 5) recalcular_resumo_diario: preservar linhas 'AJUSTE'
CREATE OR REPLACE FUNCTION public.recalcular_resumo_diario(p_colaborador_id uuid, p_data date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_jornada int;
  v_trab int := 0;
  v_intervalo int := 0;
  v_extras int := 0;
  v_saldo int := 0;
  v_noturno int := 0;
  v_status ponto_resumo_status;
  v_count int;
  v_skip boolean;
  v_override TEXT;
  r record;
  v_open timestamptz;
  v_break_open timestamptz;
  v_last_exit timestamptz;
  v_dh timestamptz;
  v_previsto boolean;
  v_bonus_ativo boolean := false;
  v_bonus_sab numeric := 0;
  v_bonus_dom numeric := 0;
  v_bonus_fer numeric := 0;
  v_is_feriado boolean := false;
  v_dow int;
  v_pct numeric := 0;
  v_bonus_min int := 0;
BEGIN
  v_override := current_setting('app.allow_fechado_override', true);
  IF v_override IS DISTINCT FROM 'true' AND public.is_periodo_fechado(p_colaborador_id, p_data) THEN
    RETURN;
  END IF;

  SELECT company_id INTO v_company_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_company_id IS NULL THEN RETURN; END IF;

  -- Pular se for ABONADO ou AJUSTE (lançamentos manuais/administrativos)
  SELECT EXISTS (
    SELECT 1 FROM public.ponto_resumo_diario
    WHERE colaborador_id = p_colaborador_id AND data = p_data
      AND status IN ('ABONADO','AJUSTE')
  ) INTO v_skip;
  IF v_skip THEN RETURN; END IF;

  SELECT COALESCE(jornada_diaria_minutos, 480),
         COALESCE(bonus_fora_escala_ativo, false),
         COALESCE(bonus_sabado_pct, 0),
         COALESCE(bonus_domingo_pct, 0),
         COALESCE(bonus_feriado_pct, 0)
    INTO v_jornada, v_bonus_ativo, v_bonus_sab, v_bonus_dom, v_bonus_fer
  FROM public.ponto_configuracoes
  WHERE company_id = v_company_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;
  v_jornada := COALESCE(v_jornada, 480);

  v_open := NULL; v_break_open := NULL; v_last_exit := NULL;

  FOR r IN
    SELECT tipo, date_trunc('minute', data_hora) AS data_hora
    FROM public.ponto_registros
    WHERE colaborador_id = p_colaborador_id
      AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data
      AND status_aprovacao = 'aprovado'
      AND COALESCE(exclusao_pendente, false) = false
    ORDER BY data_hora ASC
  LOOP
    v_dh := r.data_hora;
    IF r.tipo IN ('ENTRADA','INTERVALO_RETORNO') THEN
      v_open := v_dh;
      IF r.tipo = 'INTERVALO_RETORNO' AND v_break_open IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (v_dh - v_break_open)) / 60.0)::int;
        v_break_open := NULL;
      ELSIF r.tipo = 'ENTRADA' AND v_last_exit IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (v_dh - v_last_exit)) / 60.0)::int;
        v_last_exit := NULL;
      END IF;
    ELSIF r.tipo IN ('SAIDA','INTERVALO_SAIDA') THEN
      IF v_open IS NOT NULL THEN
        v_trab    := v_trab + (EXTRACT(EPOCH FROM (v_dh - v_open)) / 60.0)::int;
        v_noturno := v_noturno + public.calc_minutos_noturnos_br(v_open, v_dh);
        v_open := NULL;
      END IF;
      IF r.tipo = 'INTERVALO_SAIDA' THEN
        v_break_open := v_dh; v_last_exit := NULL;
      ELSE
        v_last_exit := v_dh;
      END IF;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_count FROM public.ponto_registros
   WHERE colaborador_id = p_colaborador_id
     AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data;

  IF v_count = 0 THEN
    DELETE FROM public.ponto_resumo_diario
     WHERE colaborador_id = p_colaborador_id AND data = p_data
       AND status NOT IN ('ABONADO','AJUSTE');
    RETURN;
  END IF;

  v_previsto := public.is_dia_previsto(p_colaborador_id, p_data);

  IF v_bonus_ativo AND NOT v_previsto AND v_trab > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.feriados WHERE company_id = v_company_id AND data = p_data
    ) INTO v_is_feriado;
    v_dow := EXTRACT(DOW FROM p_data)::int;
    IF v_is_feriado THEN v_pct := v_bonus_fer;
    ELSIF v_dow = 6 THEN v_pct := v_bonus_sab;
    ELSIF v_dow = 0 THEN v_pct := v_bonus_dom;
    ELSE v_pct := 0; END IF;
    v_bonus_min := ROUND(v_trab * v_pct / 100.0)::int;
  ELSE
    v_bonus_min := 0;
  END IF;

  IF v_previsto THEN
    v_saldo  := v_trab - v_jornada;
    v_extras := GREATEST(0, v_trab - v_jornada);
  ELSE
    v_saldo  := v_trab + v_bonus_min;
    v_extras := v_trab + v_bonus_min;
  END IF;

  v_status := CASE WHEN v_open IS NOT NULL THEN 'INCONSISTENTE'::ponto_resumo_status
                   ELSE 'REGULAR'::ponto_resumo_status END;

  INSERT INTO public.ponto_resumo_diario (
    colaborador_id, company_id, data,
    horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
    horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
  ) VALUES (
    p_colaborador_id, v_company_id, p_data,
    CASE WHEN v_previsto THEN v_jornada ELSE 0 END,
    v_trab, v_intervalo, v_noturno, v_extras, v_saldo, v_status
  )
  ON CONFLICT (colaborador_id, data) DO UPDATE SET
    horas_previstas_minutos   = EXCLUDED.horas_previstas_minutos,
    horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
    horas_intervalo_minutos   = EXCLUDED.horas_intervalo_minutos,
    horas_noturnas_minutos    = EXCLUDED.horas_noturnas_minutos,
    horas_extras_minutos      = EXCLUDED.horas_extras_minutos,
    saldo_minutos             = EXCLUDED.saldo_minutos,
    status                    = EXCLUDED.status,
    updated_at                = now();
END;
$function$;

-- 6) get_saldos_para_fechamento
DROP FUNCTION IF EXISTS public.get_saldos_para_fechamento(uuid, date, date);
CREATE OR REPLACE FUNCTION public.get_saldos_para_fechamento(
  p_company_id uuid, p_periodo_inicio date, p_periodo_fim date
) RETURNS TABLE (
  colaborador_id uuid,
  full_name text,
  matricula text,
  department text,
  saldo_minutos integer,
  tratativa_id uuid,
  tratativa_acao public.tratativa_saldo_acao,
  tratativa_observacao text,
  decidido_em timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.matricula,
    c.department,
    COALESCE(s.saldo, 0)::int,
    t.id,
    t.acao,
    t.observacao,
    t.decidido_em
  FROM public.colaboradores c
  LEFT JOIN LATERAL (
    SELECT SUM(r.saldo_minutos)::int AS saldo
    FROM public.ponto_resumo_diario r
    WHERE r.colaborador_id = c.id
      AND r.data BETWEEN p_periodo_inicio AND p_periodo_fim
  ) s ON true
  LEFT JOIN public.ponto_fechamento_tratativas t
    ON t.colaborador_id = c.id
   AND t.periodo_inicio = p_periodo_inicio
   AND t.periodo_fim    = p_periodo_fim
  WHERE c.company_id = p_company_id
    AND c.status = 'ATIVO'
    AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
  ORDER BY c.full_name;
END;
$$;
REVOKE ALL ON FUNCTION public.get_saldos_para_fechamento(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_saldos_para_fechamento(uuid, date, date) TO authenticated;

-- 7) registrar_tratativa_fechamento
DROP FUNCTION IF EXISTS public.registrar_tratativa_fechamento(uuid, uuid, date, date, public.tratativa_saldo_acao, text);
CREATE OR REPLACE FUNCTION public.registrar_tratativa_fechamento(
  p_company_id uuid,
  p_colaborador_id uuid,
  p_periodo_inicio date,
  p_periodo_fim date,
  p_acao public.tratativa_saldo_acao,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_uid uuid := auth.uid();
  v_saldo int := 0;
  v_id uuid;
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;

  SELECT COALESCE(SUM(saldo_minutos),0)::int INTO v_saldo
  FROM public.ponto_resumo_diario
  WHERE colaborador_id = p_colaborador_id
    AND data BETWEEN p_periodo_inicio AND p_periodo_fim;

  -- Coerência ação x sinal
  IF v_saldo > 0 AND p_acao NOT IN ('pagar','transferir') THEN
    RAISE EXCEPTION 'Saldo positivo só pode ser pago ou transferido';
  END IF;
  IF v_saldo < 0 AND p_acao NOT IN ('descontar','transferir','perdoar') THEN
    RAISE EXCEPTION 'Saldo negativo só pode ser descontado, transferido ou perdoado';
  END IF;
  IF v_saldo = 0 THEN
    RAISE EXCEPTION 'Colaborador sem saldo no período não requer tratativa';
  END IF;

  INSERT INTO public.ponto_fechamento_tratativas (
    company_id, colaborador_id, periodo_inicio, periodo_fim,
    saldo_minutos, acao, observacao, decidido_por
  ) VALUES (
    p_company_id, p_colaborador_id, p_periodo_inicio, p_periodo_fim,
    v_saldo, p_acao, NULLIF(p_observacao,''), v_uid
  )
  ON CONFLICT (company_id, colaborador_id, periodo_inicio, periodo_fim)
  DO UPDATE SET
    saldo_minutos = EXCLUDED.saldo_minutos,
    acao = EXCLUDED.acao,
    observacao = EXCLUDED.observacao,
    decidido_por = EXCLUDED.decidido_por,
    decidido_em = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_tratativa_fechamento(uuid, uuid, date, date, public.tratativa_saldo_acao, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_tratativa_fechamento(uuid, uuid, date, date, public.tratativa_saldo_acao, text) TO authenticated;

-- 8) fechar_periodo_ponto: exige tratativas e cria ajuste de transferência
CREATE OR REPLACE FUNCTION public.fechar_periodo_ponto(
  p_company_id UUID,
  p_periodo_inicio DATE,
  p_periodo_fim DATE,
  p_colaboradores_ids UUID[] DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
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
  v_tratativa RECORD;
  v_pendentes JSONB := '[]'::JSONB;
  v_data_ajuste DATE;
BEGIN
  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;
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

  -- Gate: bloquear se houver colaborador com saldo != 0 SEM tratativa
  FOR v_colab IN
    SELECT s.colaborador_id, s.full_name, s.saldo_minutos
    FROM public.get_saldos_para_fechamento(p_company_id, p_periodo_inicio, p_periodo_fim) s
    WHERE s.saldo_minutos <> 0
      AND s.tratativa_id IS NULL
      AND (p_colaboradores_ids IS NULL OR s.colaborador_id = ANY(p_colaboradores_ids))
  LOOP
    v_pendentes := v_pendentes || jsonb_build_object(
      'colaborador_id', v_colab.colaborador_id,
      'full_name', v_colab.full_name,
      'saldo_minutos', v_colab.saldo_minutos
    );
  END LOOP;

  IF jsonb_array_length(v_pendentes) > 0 THEN
    RAISE EXCEPTION 'TRATATIVAS_PENDENTES: % colaborador(es) com saldo sem tratativa', jsonb_array_length(v_pendentes)
      USING DETAIL = v_pendentes::text;
  END IF;

  v_data_ajuste := p_periodo_fim + 1;

  FOR v_colab IN
    SELECT c.id, c.full_name
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND c.status = 'ATIVO'
      AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
      AND (p_colaboradores_ids IS NULL OR c.id = ANY(p_colaboradores_ids))
  LOOP
    v_total := v_total + 1;
    BEGIN
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

      -- Buscar tratativa (pode não existir se saldo == 0)
      SELECT acao, observacao INTO v_tratativa
      FROM public.ponto_fechamento_tratativas
      WHERE company_id = p_company_id
        AND colaborador_id = v_colab.id
        AND periodo_inicio = p_periodo_inicio
        AND periodo_fim = p_periodo_fim;

      v_hash := encode(extensions.digest(
        v_snapshot::text || v_colab.id::text || p_periodo_inicio::text || p_periodo_fim::text
          || COALESCE(v_tratativa.acao::text,'sem_saldo'),
        'sha256'), 'hex');

      INSERT INTO public.banco_horas_fechamentos (
        company_id, colaborador_id, periodo_inicio, periodo_fim,
        snapshot_jsonb, horas_trabalhadas_minutos, horas_extras_minutos,
        horas_noturnas_minutos, horas_abonadas_minutos, dias_falta, dias_abonados,
        saldo_minutos, hash_assinatura, status, fechado_por, fechado_em, versao,
        tratativa_acao, tratativa_observacao
      ) VALUES (
        p_company_id, v_colab.id, p_periodo_inicio, p_periodo_fim,
        v_snapshot, v_h_trab, v_h_extra, v_h_not, v_h_aban, v_dias_falta, v_dias_aban,
        v_saldo, v_hash, 'fechado', v_uid, now(), 1,
        v_tratativa.acao, v_tratativa.observacao
      )
      ON CONFLICT (company_id, colaborador_id, periodo_inicio, periodo_fim)
      DO UPDATE SET
        snapshot_jsonb = EXCLUDED.snapshot_jsonb,
        horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
        horas_extras_minutos = EXCLUDED.horas_extras_minutos,
        horas_noturnas_minutos = EXCLUDED.horas_noturnas_minutos,
        horas_abonadas_minutos = EXCLUDED.horas_abonadas_minutos,
        dias_falta = EXCLUDED.dias_falta,
        dias_abonados = EXCLUDED.dias_abonados,
        saldo_minutos = EXCLUDED.saldo_minutos,
        hash_assinatura = EXCLUDED.hash_assinatura,
        status = 'fechado',
        fechado_por = v_uid,
        fechado_em = now(),
        versao = COALESCE(public.banco_horas_fechamentos.versao, 1) + 1,
        csv_url = NULL,
        pdf_url = NULL,
        tratativa_acao = EXCLUDED.tratativa_acao,
        tratativa_observacao = EXCLUDED.tratativa_observacao,
        updated_at = now()
      RETURNING id INTO v_fechamento_id;

      -- Se tratativa = transferir, criar/atualizar AJUSTE no dia periodo_fim+1
      IF v_tratativa.acao = 'transferir' AND v_saldo <> 0 THEN
        INSERT INTO public.ponto_resumo_diario (
          colaborador_id, company_id, data,
          horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
          horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
        ) VALUES (
          v_colab.id, p_company_id, v_data_ajuste,
          0, 0, 0, 0, 0, v_saldo, 'AJUSTE'::ponto_resumo_status
        )
        ON CONFLICT (colaborador_id, data) DO UPDATE SET
          saldo_minutos = EXCLUDED.saldo_minutos,
          status = 'AJUSTE'::ponto_resumo_status,
          updated_at = now();

        UPDATE public.ponto_fechamento_tratativas
        SET ajuste_resumo_data = v_data_ajuste
        WHERE company_id = p_company_id
          AND colaborador_id = v_colab.id
          AND periodo_inicio = p_periodo_inicio
          AND periodo_fim = p_periodo_fim;
      END IF;

      INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
      VALUES (v_fechamento_id, 'fechou', v_uid,
        jsonb_build_object('hash', v_hash, 'tratativa', v_tratativa.acao));

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('colaborador', v_colab.full_name, 'erro', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'sucesso', v_sucesso, 'erros', v_erros);
END;
$$;
