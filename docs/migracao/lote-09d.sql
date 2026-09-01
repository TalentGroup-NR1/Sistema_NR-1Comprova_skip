-- ============================================================
-- LOTE 9D — Itens de PDI e check-ins
-- Depende de: pdis (09C), competencias_ciclo, objetivos_ciclo, treinamentos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pdi_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id uuid NOT NULL REFERENCES public.pdis(id) ON DELETE CASCADE,
  tipo_alvo public.pdi_item_tipo_alvo NOT NULL DEFAULT 'geral',
  competencia_id uuid REFERENCES public.competencias_ciclo(id) ON DELETE SET NULL,
  objetivo_id uuid REFERENCES public.objetivos_ciclo(id) ON DELETE SET NULL,
  treinamento_id uuid REFERENCES public.treinamentos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  tipo_acao public.pdi_item_tipo_acao NOT NULL DEFAULT 'outro',
  responsavel public.pdi_item_responsavel NOT NULL DEFAULT 'colaborador',
  prazo date,
  status public.pdi_item_status NOT NULL DEFAULT 'nao_iniciado',
  progresso_percentual integer NOT NULL DEFAULT 0,
  evidencias text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pdi_itens_progresso_chk CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100)
);

CREATE INDEX IF NOT EXISTS idx_pdi_itens_pdi ON public.pdi_itens (pdi_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdi_itens TO authenticated;
GRANT ALL ON public.pdi_itens TO service_role;

CREATE TABLE IF NOT EXISTS public.pdi_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_item_id uuid NOT NULL REFERENCES public.pdi_itens(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  progresso_percentual integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pdi_checkins_progresso_chk CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100)
);

CREATE INDEX IF NOT EXISTS idx_pdi_checkins_item ON public.pdi_checkins (pdi_item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdi_checkins TO authenticated;
GRANT ALL ON public.pdi_checkins TO service_role;
