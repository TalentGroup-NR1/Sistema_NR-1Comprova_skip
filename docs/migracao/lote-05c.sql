-- ============================================================
-- LOTE 5C — Psicossocial (dependência: psico_instrumentos — Lote 3D)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.psico_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo varchar(200) NOT NULL,
  instrumento_id uuid NOT NULL REFERENCES public.psico_instrumentos(id) ON DELETE RESTRICT,
  status varchar(50) NOT NULL DEFAULT 'rascunho'::varchar,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  modo_anonimato boolean NOT NULL DEFAULT true,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT psico_avaliacoes_status_check
    CHECK (status::text = ANY (ARRAY['rascunho','em_execucao','finalizada']))
);
CREATE INDEX IF NOT EXISTS idx_psico_avaliacoes_company
  ON public.psico_avaliacoes USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_psico_avaliacoes_instrumento
  ON public.psico_avaliacoes USING btree (instrumento_id);

CREATE TABLE IF NOT EXISTS public.psico_dimensoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrumento_id uuid NOT NULL REFERENCES public.psico_instrumentos(id) ON DELETE CASCADE,
  nome varchar(150) NOT NULL,
  tipo_dimensao varchar(30) NOT NULL DEFAULT 'negativa'::varchar,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  corte_medio numeric(5,2) NOT NULL DEFAULT 40,
  corte_alto numeric(5,2) NOT NULL DEFAULT 60,
  CONSTRAINT psico_dimensoes_tipo_check
    CHECK (tipo_dimensao::text = ANY (ARRAY['positiva','negativa']))
);
CREATE INDEX IF NOT EXISTS idx_psico_dimensoes_instrumento
  ON public.psico_dimensoes USING btree (instrumento_id);

CREATE TABLE IF NOT EXISTS public.psico_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrumento_id uuid NOT NULL REFERENCES public.psico_instrumentos(id) ON DELETE CASCADE,
  dimensao_id uuid REFERENCES public.psico_dimensoes(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  texto_pergunta text NOT NULL,
  tipo_escala varchar(50) NOT NULL DEFAULT 'likert_5'::varchar,
  inverter_pontuacao boolean NOT NULL DEFAULT false,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psico_perguntas_instrumento
  ON public.psico_perguntas USING btree (instrumento_id);
CREATE INDEX IF NOT EXISTS idx_psico_perguntas_dimensao
  ON public.psico_perguntas USING btree (dimensao_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_avaliacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_dimensoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_perguntas TO authenticated;
GRANT ALL ON public.psico_avaliacoes TO service_role;
GRANT ALL ON public.psico_dimensoes TO service_role;
GRANT ALL ON public.psico_perguntas TO service_role;
