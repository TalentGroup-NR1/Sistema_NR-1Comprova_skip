-- =====================================================================
-- LOTE 3A — work_schedules, banco_horas_perfis, ponto_configuracoes
-- Pré-requisito: Lotes 1 e 2 aplicados.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.work_schedules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  entrada_manha time without time zone,
  saida_manha time without time zone,
  entrada_tarde time without time zone,
  saida_tarde time without time zone,
  carga_diaria_minutos integer DEFAULT 480 NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  dias_semana integer[] DEFAULT '{1,2,3,4,5}'::integer[] NOT NULL,
  trabalha_feriados boolean DEFAULT false NOT NULL,
  horarios_por_dia jsonb,
  tolerancia_minutos integer DEFAULT 0 NOT NULL,
  CONSTRAINT work_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT work_schedules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_work_schedules_company ON public.work_schedules USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.banco_horas_perfis (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  periodo_fechamento_banco text DEFAULT 'mensal'::text NOT NULL,
  banco_horas_inicio date,
  ativo boolean DEFAULT true NOT NULL,
  is_padrao boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT banco_horas_perfis_pkey PRIMARY KEY (id),
  CONSTRAINT banco_horas_perfis_periodo_check CHECK (periodo_fechamento_banco = ANY (ARRAY['mensal'::text, 'bimestral'::text, 'trimestral'::text, 'quadrimestral'::text, 'semestral'::text, 'anual'::text])),
  CONSTRAINT banco_horas_perfis_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS banco_horas_perfis_padrao_unique ON public.banco_horas_perfis USING btree (company_id) WHERE (is_padrao = true);
CREATE INDEX IF NOT EXISTS idx_banco_horas_perfis_company ON public.banco_horas_perfis USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.ponto_configuracoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  jornada_diaria_minutos integer DEFAULT 480 NOT NULL,
  tolerancia_minutos integer DEFAULT 10 NOT NULL,
  intervalo_minutos integer DEFAULT 60 NOT NULL,
  inicio_noturno time without time zone DEFAULT '22:00:00'::time without time zone NOT NULL,
  fim_noturno time without time zone DEFAULT '05:00:00'::time without time zone NOT NULL,
  adicional_noturno_pct numeric(5,2) DEFAULT 20.00 NOT NULL,
  adicional_hora_extra_pct numeric(5,2) DEFAULT 50.00 NOT NULL,
  adicional_hora_extra_domingo_pct numeric(5,2) DEFAULT 100.00 NOT NULL,
  geolocation_required boolean DEFAULT false NOT NULL,
  banco_horas_ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  periodo_fechamento_banco text DEFAULT 'quadrimestral'::text NOT NULL,
  banco_horas_inicio date,
  banco_horas_fim date,
  faixas_hora_extra jsonb,
  bonus_fora_escala_ativo boolean DEFAULT false NOT NULL,
  bonus_sabado_pct numeric(5,2) DEFAULT 0 NOT NULL,
  bonus_domingo_pct numeric(5,2) DEFAULT 0 NOT NULL,
  bonus_feriado_pct numeric(5,2) DEFAULT 0 NOT NULL,
  CONSTRAINT ponto_configuracoes_pkey PRIMARY KEY (id),
  CONSTRAINT ponto_configuracoes_company_id_key UNIQUE (company_id),
  CONSTRAINT ponto_configuracoes_bonus_pct_check CHECK (
    bonus_sabado_pct >= 0 AND bonus_sabado_pct <= 500
    AND bonus_domingo_pct >= 0 AND bonus_domingo_pct <= 500
    AND bonus_feriado_pct >= 0 AND bonus_feriado_pct <= 500
  ),
  CONSTRAINT ponto_configuracoes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_ponto_configuracoes_company_id ON public.ponto_configuracoes USING btree (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_horas_perfis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_configuracoes TO authenticated;
GRANT ALL ON public.work_schedules, public.banco_horas_perfis, public.ponto_configuracoes TO service_role;
