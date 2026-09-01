-- ============================================================
-- LOTE 9A — Avaliações (base) e links de acesso
-- Depende de: ciclos_avaliacao, colaboradores
-- ============================================================

CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  gestor_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  prazo_autoavaliacao date,
  prazo_avaliacao_gestor date,
  status_autoavaliacao public.avaliacao_status NOT NULL DEFAULT 'nao_iniciada',
  status_avaliacao_gestor public.avaliacao_status NOT NULL DEFAULT 'nao_iniciada',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avaliacoes_ciclo_id_colaborador_id_key UNIQUE (ciclo_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_ciclo ON public.avaliacoes (ciclo_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_colaborador ON public.avaliacoes (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_gestor ON public.avaliacoes (gestor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;

CREATE TABLE IF NOT EXISTS public.avaliacao_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  tipo public.avaliacao_link_tipo NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avaliacao_links_token_key UNIQUE (token),
  CONSTRAINT avaliacao_links_avaliacao_id_tipo_key UNIQUE (avaliacao_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_avaliacao_links_avaliacao ON public.avaliacao_links (avaliacao_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacao_links TO authenticated;
GRANT ALL ON public.avaliacao_links TO service_role;
