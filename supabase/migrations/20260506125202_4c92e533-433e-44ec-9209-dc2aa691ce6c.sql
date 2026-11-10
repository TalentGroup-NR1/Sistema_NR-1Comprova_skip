
-- Tabela de feriados
CREATE TABLE public.feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  data date NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('NACIONAL','ESTADUAL','MUNICIPAL','EMPRESA')),
  uf char(2),
  recorrente boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX feriados_unique_idx ON public.feriados (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), data, nome);
CREATE INDEX feriados_company_idx ON public.feriados (company_id);
CREATE INDEX feriados_data_idx ON public.feriados (data);

ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feriados visíveis para empresa e globais"
ON public.feriados FOR SELECT
USING (
  company_id IS NULL
  OR public.is_admin_master(auth.uid())
  OR company_id = public.get_my_company_id()
);

CREATE POLICY "Admin master gerencia feriados globais e qualquer empresa"
ON public.feriados FOR ALL
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa gerencia feriados da empresa"
ON public.feriados FOR ALL
USING (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'admin_empresa')
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'admin_empresa')
);

-- Seed feriados nacionais (recorrentes; ano arbitrário 2000 — usado só para mês/dia)
INSERT INTO public.feriados (company_id, data, nome, tipo, recorrente) VALUES
  (NULL, '2000-01-01', 'Confraternização Universal', 'NACIONAL', true),
  (NULL, '2000-04-21', 'Tiradentes', 'NACIONAL', true),
  (NULL, '2000-05-01', 'Dia do Trabalho', 'NACIONAL', true),
  (NULL, '2000-09-07', 'Independência do Brasil', 'NACIONAL', true),
  (NULL, '2000-10-12', 'Nossa Senhora Aparecida', 'NACIONAL', true),
  (NULL, '2000-11-02', 'Finados', 'NACIONAL', true),
  (NULL, '2000-11-15', 'Proclamação da República', 'NACIONAL', true),
  (NULL, '2000-11-20', 'Consciência Negra', 'NACIONAL', true),
  (NULL, '2000-12-25', 'Natal', 'NACIONAL', true);

-- Trigger para bloquear ponto durante férias
CREATE OR REPLACE FUNCTION public.block_ponto_em_ferias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ferias_gozo
    WHERE colaborador_id = NEW.colaborador_id
      AND status IN ('aprovado','gozado','planejado')
      AND (NEW.data_hora AT TIME ZONE 'America/Sao_Paulo')::date
          BETWEEN data_inicio_gozo AND data_fim_gozo
  ) THEN
    RAISE EXCEPTION 'Colaborador está de férias nesta data — registro de ponto bloqueado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_ponto_em_ferias
  BEFORE INSERT ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.block_ponto_em_ferias();
