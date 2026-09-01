-- ============================================================
-- LOTE 5E — nr1_planos_acao (última: depende de 5C + Lote 2D)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nr1_planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  origem text NOT NULL,
  ativacao_id uuid REFERENCES public.nr1_proart_ativacoes(id) ON DELETE SET NULL,
  departamento text,
  escala integer,
  media numeric(4,2),
  nivel_risco text NOT NULL,
  titulo text,
  descricao text,
  nivel_intervencao text,
  participacao_trabalhadores boolean NOT NULL DEFAULT false,
  responsavel_id uuid,
  prazo date,
  status text NOT NULL DEFAULT 'pendente'::text,
  concluido_em timestamptz,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  avaliacao_id uuid REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  dimensao_id uuid REFERENCES public.psico_dimensoes(id) ON DELETE SET NULL,
  dimensao_nome text,
  grupo_tipo text,
  grupo_id uuid,
  grupo_nome text,
  indice numeric(6,2),
  CONSTRAINT nr1_planos_origem_check CHECK (origem = ANY (ARRAY['automatico','manual'])),
  CONSTRAINT nr1_planos_escala_check CHECK (escala >= 1 AND escala <= 4),
  CONSTRAINT nr1_planos_nivel_risco_check CHECK (nivel_risco = ANY (ARRAY['Vermelho','Laranja'])),
  CONSTRAINT nr1_planos_nivel_interv_check
    CHECK (nivel_intervencao = ANY (ARRAY['primaria','secundaria','terciaria'])),
  CONSTRAINT nr1_planos_status_check
    CHECK (status = ANY (ARRAY['pendente','planejado','em_andamento','atrasado','concluido'])),
  CONSTRAINT nr1_planos_grupo_tipo_check
    CHECK (grupo_tipo IS NULL OR grupo_tipo = ANY (ARRAY['ghe','departamento']))
);

CREATE INDEX IF NOT EXISTS idx_nr1_planos_acao_company
  ON public.nr1_planos_acao USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_nr1_planos_acao_ativacao
  ON public.nr1_planos_acao USING btree (ativacao_id);
CREATE INDEX IF NOT EXISTS idx_nr1_planos_acao_status
  ON public.nr1_planos_acao USING btree (company_id, status);
CREATE INDEX IF NOT EXISTS idx_nr1_planos_acao_avaliacao
  ON public.nr1_planos_acao USING btree (avaliacao_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_nr1_planos_acao_aberto
  ON public.nr1_planos_acao USING btree (company_id, ativacao_id, departamento, escala)
  WHERE (status = ANY (ARRAY['pendente','planejado']));
CREATE UNIQUE INDEX IF NOT EXISTS uniq_nr1_planos_psico_aberto
  ON public.nr1_planos_acao USING btree (avaliacao_id, grupo_tipo, grupo_nome, dimensao_id)
  WHERE (avaliacao_id IS NOT NULL AND status = ANY (ARRAY['pendente','planejado']));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_planos_acao TO authenticated;
GRANT ALL ON public.nr1_planos_acao TO service_role;
