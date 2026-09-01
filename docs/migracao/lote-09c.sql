-- ============================================================
-- LOTE 9C — PDIs (planos de desenvolvimento individual)
-- Depende de: avaliacoes (09A), ciclos_avaliacao, colaboradores
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pdis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  ciclo_id uuid NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  status public.pdi_status NOT NULL DEFAULT 'rascunho',
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim_prevista date,
  observacoes_gerais text,
  created_by_colaborador boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pdis_avaliacao_id_key UNIQUE (avaliacao_id)
);

CREATE INDEX IF NOT EXISTS idx_pdis_avaliacao ON public.pdis (avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_pdis_ciclo ON public.pdis (ciclo_id);
CREATE INDEX IF NOT EXISTS idx_pdis_colaborador ON public.pdis (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_pdis_gestor ON public.pdis (gestor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdis TO authenticated;
GRANT ALL ON public.pdis TO service_role;
