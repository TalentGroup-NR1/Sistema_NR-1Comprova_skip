-- ============================================================
-- LOTE 4A — Comunicados / Campanhas (parte 1)
-- Depende de: companies (Lote 1), comunicados (Lote 2C), auth.users
-- ============================================================

-- 1) campanhas_comunicados
CREATE TABLE IF NOT EXISTS public.campanhas_comunicados (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  titulo        text NOT NULL,
  descricao     text,
  imagem_url    text,
  data_inicio   date NOT NULL,
  data_fim      date NOT NULL,
  criado_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  materiais     jsonb NOT NULL DEFAULT '[]'::jsonb,
  exige_leitura boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_campanhas_comunicados_company
  ON public.campanhas_comunicados USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_comunicados_periodo
  ON public.campanhas_comunicados USING btree (data_inicio, data_fim);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas_comunicados TO authenticated;
GRANT ALL ON public.campanhas_comunicados TO service_role;

-- 2) campanha_leituras
CREATE TABLE IF NOT EXISTS public.campanha_leituras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id),
  campanha_id uuid NOT NULL REFERENCES public.campanhas_comunicados(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lido_em     timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campanha_leituras_campanha_id_user_id_key UNIQUE (campanha_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campanha_leituras_campanha
  ON public.campanha_leituras USING btree (company_id, campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_leituras_user
  ON public.campanha_leituras USING btree (company_id, user_id, lido_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_leituras TO authenticated;
GRANT ALL ON public.campanha_leituras TO service_role;
