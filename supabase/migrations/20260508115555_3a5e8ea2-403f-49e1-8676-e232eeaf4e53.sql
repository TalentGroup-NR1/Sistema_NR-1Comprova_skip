
-- 1. Add ABONADO status to enum
ALTER TYPE ponto_resumo_status ADD VALUE IF NOT EXISTS 'ABONADO';

-- 2. Create tipos de abono table
CREATE TABLE IF NOT EXISTS public.ponto_tipos_abono (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  dias_maximos_sugeridos INTEGER,
  base_legal TEXT,
  exige_anexo BOOLEAN NOT NULL DEFAULT false,
  abona_horas BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_ponto_tipos_abono_company ON public.ponto_tipos_abono(company_id);

ALTER TABLE public.ponto_tipos_abono ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manage all tipos abono"
  ON public.ponto_tipos_abono FOR ALL TO authenticated
  USING (get_my_role() = 'admin_master')
  WITH CHECK (get_my_role() = 'admin_master');

CREATE POLICY "Admin empresa manage own tipos abono"
  ON public.ponto_tipos_abono FOR ALL TO authenticated
  USING (get_my_role() IN ('admin_empresa','analista_rh') AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() IN ('admin_empresa','analista_rh') AND company_id = get_my_company_id());

CREATE POLICY "All authenticated read own company tipos abono"
  ON public.ponto_tipos_abono FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() OR get_my_role() = 'admin_master');

CREATE TRIGGER update_ponto_tipos_abono_updated_at
  BEFORE UPDATE ON public.ponto_tipos_abono
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create abonos table
CREATE TABLE IF NOT EXISTS public.ponto_abonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo_abono_id UUID NOT NULL REFERENCES public.ponto_tipos_abono(id) ON DELETE RESTRICT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  justificativa TEXT NOT NULL,
  anexo_url TEXT,
  anexo_nome TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','cancelado')),
  motivo_cancelamento TEXT,
  lancado_por UUID REFERENCES auth.users(id),
  lancado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_ponto_abonos_colaborador ON public.ponto_abonos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ponto_abonos_company ON public.ponto_abonos(company_id);
CREATE INDEX IF NOT EXISTS idx_ponto_abonos_periodo ON public.ponto_abonos(data_inicio, data_fim);

ALTER TABLE public.ponto_abonos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manage all abonos"
  ON public.ponto_abonos FOR ALL TO authenticated
  USING (get_my_role() = 'admin_master')
  WITH CHECK (get_my_role() = 'admin_master');

CREATE POLICY "Admin empresa manage own abonos"
  ON public.ponto_abonos FOR ALL TO authenticated
  USING (get_my_role() IN ('admin_empresa','analista_rh') AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() IN ('admin_empresa','analista_rh') AND company_id = get_my_company_id());

CREATE POLICY "Colaborador read own abonos"
  ON public.ponto_abonos FOR SELECT TO authenticated
  USING (colaborador_id IN (SELECT id FROM colaboradores WHERE user_id = auth.uid()));

CREATE POLICY "Gestor read team abonos"
  ON public.ponto_abonos FOR SELECT TO authenticated
  USING (
    get_my_role() = 'gestor_departamento' AND colaborador_id IN (
      SELECT id FROM colaboradores 
      WHERE gestor_id IN (SELECT id FROM colaboradores WHERE user_id = auth.uid())
    )
  );

CREATE TRIGGER update_ponto_abonos_updated_at
  BEFORE UPDATE ON public.ponto_abonos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Function: aplicar abono no resumo diario
CREATE OR REPLACE FUNCTION public.aplicar_abono_resumo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia DATE;
  v_jornada INTEGER;
  v_abona BOOLEAN;
BEGIN
  IF NEW.status != 'ativo' THEN
    RETURN NEW;
  END IF;

  SELECT abona_horas INTO v_abona FROM ponto_tipos_abono WHERE id = NEW.tipo_abono_id;
  IF NOT v_abona THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(jornada_diaria_minutos, 480) INTO v_jornada
  FROM ponto_configuracoes WHERE company_id = NEW.company_id;
  v_jornada := COALESCE(v_jornada, 480);

  v_dia := NEW.data_inicio;
  WHILE v_dia <= NEW.data_fim LOOP
    -- Skip Sundays (0) - keep saturdays since many CLT regimes work them
    IF EXTRACT(DOW FROM v_dia) <> 0 THEN
      INSERT INTO ponto_resumo_diario (
        colaborador_id, company_id, data,
        horas_previstas_minutos, horas_trabalhadas_minutos,
        saldo_minutos, status, observacoes
      ) VALUES (
        NEW.colaborador_id, NEW.company_id, v_dia,
        v_jornada, v_jornada, 0, 'ABONADO',
        'Abonado: ' || NEW.justificativa
      )
      ON CONFLICT (colaborador_id, data) DO UPDATE SET
        horas_trabalhadas_minutos = EXCLUDED.horas_previstas_minutos,
        saldo_minutos = 0,
        status = 'ABONADO',
        observacoes = 'Abonado: ' || NEW.justificativa,
        updated_at = now();
    END IF;
    v_dia := v_dia + INTERVAL '1 day';
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aplicar_abono_resumo
  AFTER INSERT ON public.ponto_abonos
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_abono_resumo();

-- 5. Function: bloquear ponto em dias abonados
CREATE OR REPLACE FUNCTION public.block_ponto_em_abono()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ponto_abonos
    WHERE colaborador_id = NEW.colaborador_id
      AND status = 'ativo'
      AND NEW.data_hora::date BETWEEN data_inicio AND data_fim
  ) THEN
    RAISE EXCEPTION 'Não é possível registrar ponto em dia abonado.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_ponto_em_abono
  BEFORE INSERT ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.block_ponto_em_abono();

-- 6. Storage bucket privado para anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('abonos-anexos', 'abonos-anexos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin master manage abonos anexos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'abonos-anexos' AND get_my_role() = 'admin_master')
  WITH CHECK (bucket_id = 'abonos-anexos' AND get_my_role() = 'admin_master');

CREATE POLICY "Admin empresa manage abonos anexos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'abonos-anexos' AND get_my_role() IN ('admin_empresa','analista_rh'))
  WITH CHECK (bucket_id = 'abonos-anexos' AND get_my_role() IN ('admin_empresa','analista_rh'));

CREATE POLICY "Colaborador read own abono anexos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'abonos-anexos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM colaboradores WHERE user_id = auth.uid()
    )
  );

-- 7. Seed tipos padrão CLT para todas as empresas existentes
INSERT INTO public.ponto_tipos_abono (company_id, codigo, nome, dias_maximos_sugeridos, base_legal, exige_anexo)
SELECT c.id, t.codigo, t.nome, t.dias, t.base_legal, t.exige_anexo
FROM public.companies c
CROSS JOIN (VALUES
  ('ATESTADO_MEDICO', 'Atestado Médico', 15, 'Lei 8.213/91 Art. 60', false),
  ('LICENCA_CASAMENTO', 'Licença Casamento', 3, 'CLT Art. 473, II', false),
  ('LICENCA_OBITO', 'Licença Óbito (família)', 2, 'CLT Art. 473, I', false),
  ('LICENCA_PATERNIDADE', 'Licença Paternidade', 5, 'CF Art. 7º, XIX', false),
  ('DOACAO_SANGUE', 'Doação de Sangue', 1, 'CLT Art. 473, IV', false),
  ('ALISTAMENTO', 'Alistamento Militar/Eleitoral', 2, 'CLT Art. 473, III/VI', false),
  ('VESTIBULAR', 'Vestibular/ENEM', 3, 'CLT Art. 473, VII', false),
  ('OUTROS', 'Outros (motivo livre)', NULL, NULL, false)
) t(codigo, nome, dias, base_legal, exige_anexo)
ON CONFLICT (company_id, codigo) DO NOTHING;

-- 8. Trigger seed em novas empresas
CREATE OR REPLACE FUNCTION public.seed_tipos_abono_nova_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ponto_tipos_abono (company_id, codigo, nome, dias_maximos_sugeridos, base_legal, exige_anexo)
  VALUES
    (NEW.id, 'ATESTADO_MEDICO', 'Atestado Médico', 15, 'Lei 8.213/91 Art. 60', false),
    (NEW.id, 'LICENCA_CASAMENTO', 'Licença Casamento', 3, 'CLT Art. 473, II', false),
    (NEW.id, 'LICENCA_OBITO', 'Licença Óbito (família)', 2, 'CLT Art. 473, I', false),
    (NEW.id, 'LICENCA_PATERNIDADE', 'Licença Paternidade', 5, 'CF Art. 7º, XIX', false),
    (NEW.id, 'DOACAO_SANGUE', 'Doação de Sangue', 1, 'CLT Art. 473, IV', false),
    (NEW.id, 'ALISTAMENTO', 'Alistamento Militar/Eleitoral', 2, 'CLT Art. 473, III/VI', false),
    (NEW.id, 'VESTIBULAR', 'Vestibular/ENEM', 3, 'CLT Art. 473, VII', false),
    (NEW.id, 'OUTROS', 'Outros (motivo livre)', NULL, NULL, false)
  ON CONFLICT (company_id, codigo) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_tipos_abono_nova_empresa
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.seed_tipos_abono_nova_empresa();
