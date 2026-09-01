-- ============================================================
-- LOTE 7D — Análise de perfil e descrições de cargo
-- Depende de: colaboradores (07b), cargos, departamentos, ghes,
--             descricao_modelos, questionario_modelos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analises_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  candidato_nome text NOT NULL,
  vaga text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  resultado jsonb,
  doc_alinhamento_path text,
  doc_anuncio_path text,
  doc_entrevista_path text,
  doc_curriculo_path text,
  created_by uuid NOT NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  colaborador_admission_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analises_perfil_status_check CHECK (status = ANY (ARRAY['pendente','processando','concluido','erro']))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analises_perfil TO authenticated;
GRANT ALL ON public.analises_perfil TO service_role;

CREATE TABLE IF NOT EXISTS public.descricoes_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  titulo text NOT NULL,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE RESTRICT,
  departamento_id uuid REFERENCES public.departamentos(id) ON DELETE RESTRICT,
  ghe_id uuid REFERENCES public.ghes(id) ON DELETE SET NULL,
  cbo_codigo text,
  cbo_descricao text,
  maturidade text,
  reporte text,
  alocacao text,
  descricao_sumaria text,
  grupo_organizacional text,
  nivel_maturidade text,
  responsabilidades jsonb NOT NULL DEFAULT '[]'::jsonb,
  formacao_academica text,
  cursos_necessarios text,
  cursos_desejaveis text,
  habilidades_comportamentais text,
  fator_experiencia text,
  fator_complexidade text,
  fator_responsabilidade_erros text,
  fator_responsabilidade_sigilo text,
  modelo_id uuid REFERENCES public.descricao_modelos(id) ON DELETE SET NULL,
  valores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_descricoes_cargo_company ON public.descricoes_cargo (company_id);
CREATE INDEX IF NOT EXISTS idx_descricoes_cargo_cargo ON public.descricoes_cargo (cargo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.descricoes_cargo TO authenticated;
GRANT ALL ON public.descricoes_cargo TO service_role;

CREATE TABLE IF NOT EXISTS public.descricao_questionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_cargo_id uuid NOT NULL UNIQUE REFERENCES public.descricoes_cargo(id) ON DELETE CASCADE,
  modelo_base_id uuid REFERENCES public.questionario_modelos(id) ON DELETE SET NULL,
  customizacao jsonb NOT NULL DEFAULT '{"secoes": []}'::jsonb,
  instrucoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.descricao_questionario TO authenticated;
GRANT ALL ON public.descricao_questionario TO service_role;
