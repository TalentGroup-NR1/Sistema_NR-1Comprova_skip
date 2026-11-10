-- ============================================================
-- LOTE 9F — Questionários de descrição de cargo e psicossocial
-- Depende de: descricao_questionario, colaboradores, psico_avaliacoes, ghes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.questionario_atribuicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_questionario_id uuid NOT NULL REFERENCES public.descricao_questionario(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  status public.questionario_atribuicao_status NOT NULL DEFAULT 'pendente',
  data_atribuicao timestamptz NOT NULL DEFAULT now(),
  data_resposta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT questionario_atribuicoes_unq UNIQUE (descricao_questionario_id, colaborador_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_atribuicoes TO authenticated;
GRANT ALL ON public.questionario_atribuicoes TO service_role;

CREATE TABLE IF NOT EXISTS public.questionario_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atribuicao_id uuid NOT NULL REFERENCES public.questionario_atribuicoes(id) ON DELETE CASCADE,
  pergunta_id text NOT NULL,
  valor jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT questionario_respostas_unq UNIQUE (atribuicao_id, pergunta_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_respostas TO authenticated;
GRANT ALL ON public.questionario_respostas TO service_role;

CREATE TABLE IF NOT EXISTS public.psico_atribuicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  status varchar(50) NOT NULL DEFAULT 'pendente',
  rascunho jsonb,
  data_atribuicao timestamptz NOT NULL DEFAULT now(),
  data_resposta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT psico_atribuicoes_unq UNIQUE (avaliacao_id, colaborador_id),
  CONSTRAINT psico_atribuicoes_status_chk CHECK (status IN ('pendente','em_andamento','preenchido'))
);

CREATE INDEX IF NOT EXISTS idx_psico_atribuicoes_avaliacao ON public.psico_atribuicoes (avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_psico_atribuicoes_colaborador ON public.psico_atribuicoes (colaborador_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_atribuicoes TO authenticated;
GRANT ALL ON public.psico_atribuicoes TO service_role;
