
-- Enum for ponto registro type
CREATE TYPE public.ponto_registro_tipo AS ENUM ('ENTRADA', 'SAIDA', 'INTERVALO_SAIDA', 'INTERVALO_RETORNO');

-- Enum for resumo diario status
CREATE TYPE public.ponto_resumo_status AS ENUM ('REGULAR', 'INCONSISTENTE', 'FALTA', 'FERIADO');

-- Configurações de ponto por empresa
CREATE TABLE public.ponto_configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  jornada_diaria_minutos INTEGER NOT NULL DEFAULT 480,
  tolerancia_minutos INTEGER NOT NULL DEFAULT 10,
  intervalo_minutos INTEGER NOT NULL DEFAULT 60,
  inicio_noturno TIME NOT NULL DEFAULT '22:00:00',
  fim_noturno TIME NOT NULL DEFAULT '05:00:00',
  adicional_noturno_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  adicional_hora_extra_pct NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  adicional_hora_extra_domingo_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  geolocation_required BOOLEAN NOT NULL DEFAULT false,
  banco_horas_ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Registros individuais de ponto (cada batida)
CREATE TABLE public.ponto_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  tipo public.ponto_registro_tipo NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacao TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  ajuste_manual BOOLEAN NOT NULL DEFAULT false,
  ajuste_motivo TEXT,
  ajustado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resumo diário calculado
CREATE TABLE public.ponto_resumo_diario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  data DATE NOT NULL,
  horas_previstas_minutos INTEGER NOT NULL DEFAULT 480,
  horas_trabalhadas_minutos INTEGER NOT NULL DEFAULT 0,
  horas_noturnas_minutos INTEGER NOT NULL DEFAULT 0,
  horas_extras_minutos INTEGER NOT NULL DEFAULT 0,
  horas_intervalo_minutos INTEGER NOT NULL DEFAULT 0,
  saldo_minutos INTEGER NOT NULL DEFAULT 0,
  status public.ponto_resumo_status NOT NULL DEFAULT 'REGULAR',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, data)
);

-- Indexes
CREATE INDEX idx_ponto_registros_colaborador ON public.ponto_registros(colaborador_id);
CREATE INDEX idx_ponto_registros_company ON public.ponto_registros(company_id);
CREATE INDEX idx_ponto_registros_data_hora ON public.ponto_registros(data_hora);
CREATE INDEX idx_ponto_resumo_diario_colaborador ON public.ponto_resumo_diario(colaborador_id);
CREATE INDEX idx_ponto_resumo_diario_data ON public.ponto_resumo_diario(data);

-- Updated_at triggers
CREATE TRIGGER update_ponto_configuracoes_updated_at BEFORE UPDATE ON public.ponto_configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ponto_resumo_diario_updated_at BEFORE UPDATE ON public.ponto_resumo_diario FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.ponto_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_resumo_diario ENABLE ROW LEVEL SECURITY;

-- ponto_configuracoes policies
CREATE POLICY "Admin master can manage all ponto config"
ON public.ponto_configuracoes FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin_master')
WITH CHECK (public.get_my_role() = 'admin_master');

CREATE POLICY "Admin empresa can manage own company ponto config"
ON public.ponto_configuracoes FOR ALL
TO authenticated
USING (public.get_my_role() IN ('admin_empresa', 'analista_rh') AND company_id = public.get_my_company_id())
WITH CHECK (public.get_my_role() IN ('admin_empresa', 'analista_rh') AND company_id = public.get_my_company_id());

CREATE POLICY "All authenticated can read own company ponto config"
ON public.ponto_configuracoes FOR SELECT
TO authenticated
USING (public.get_my_role() = 'admin_master' OR company_id = public.get_my_company_id());

-- ponto_registros policies
CREATE POLICY "Admin master can manage all ponto registros"
ON public.ponto_registros FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin_master')
WITH CHECK (public.get_my_role() = 'admin_master');

CREATE POLICY "Admin empresa can manage own company ponto registros"
ON public.ponto_registros FOR ALL
TO authenticated
USING (public.get_my_role() IN ('admin_empresa', 'analista_rh') AND company_id = public.get_my_company_id())
WITH CHECK (public.get_my_role() IN ('admin_empresa', 'analista_rh') AND company_id = public.get_my_company_id());

CREATE POLICY "Colaborador can insert own ponto registros"
ON public.ponto_registros FOR INSERT
TO authenticated
WITH CHECK (
  colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
  AND ajuste_manual = false
);

CREATE POLICY "Colaborador can read own ponto registros"
ON public.ponto_registros FOR SELECT
TO authenticated
USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid()));

CREATE POLICY "Gestor can read team ponto registros"
ON public.ponto_registros FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'gestor_departamento'
  AND colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE gestor_id IN (
      SELECT id FROM public.colaboradores WHERE user_id = auth.uid()
    )
  )
);

-- ponto_resumo_diario policies
CREATE POLICY "Admin master can manage all ponto resumo"
ON public.ponto_resumo_diario FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin_master')
WITH CHECK (public.get_my_role() = 'admin_master');

CREATE POLICY "Admin empresa can manage own company ponto resumo"
ON public.ponto_resumo_diario FOR ALL
TO authenticated
USING (public.get_my_role() IN ('admin_empresa', 'analista_rh') AND company_id = public.get_my_company_id())
WITH CHECK (public.get_my_role() IN ('admin_empresa', 'analista_rh') AND company_id = public.get_my_company_id());

CREATE POLICY "Colaborador can read own ponto resumo"
ON public.ponto_resumo_diario FOR SELECT
TO authenticated
USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid()));

CREATE POLICY "Gestor can read team ponto resumo"
ON public.ponto_resumo_diario FOR SELECT
TO authenticated
USING (
  public.get_my_role() = 'gestor_departamento'
  AND colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE gestor_id IN (
      SELECT id FROM public.colaboradores WHERE user_id = auth.uid()
    )
  )
);
