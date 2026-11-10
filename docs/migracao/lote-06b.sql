-- ============================================================
-- LOTE 6B — Treinamentos (curso, módulos e aulas)
-- Depende de: companies (Lote 1), categorias_treinamento (Lote 3B)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.treinamento_tipo AS ENUM ('arquivo','link','video','pdf','ppt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.treinamento_status AS ENUM ('rascunho','publicado','arquivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.treinamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.categorias_treinamento(id) ON DELETE SET NULL,
  titulo varchar(255) NOT NULL,
  descricao text,
  tipo public.treinamento_tipo NOT NULL,
  url_conteudo text,
  nome_arquivo varchar(255),
  duracao_estimada_minutos integer,
  nivel varchar(50),
  idioma varchar(50) DEFAULT 'Português'::varchar,
  tags text[],
  tempo_minimo_minutos integer DEFAULT 0,
  quiz_obrigatorio boolean DEFAULT false,
  termo_ciencia_obrigatorio boolean DEFAULT false,
  texto_termo_ciencia text DEFAULT 'Li e compreendi todo o conteúdo deste treinamento.'::text,
  status public.treinamento_status DEFAULT 'rascunho'::public.treinamento_status,
  publicado_em timestamptz,
  publicado_por_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  target_company_ids uuid[],
  obrigatorio boolean NOT NULL DEFAULT false,
  target_contract_types text[],
  capa_path text,
  destaque boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_treinamentos_target_companies
  ON public.treinamentos USING gin (target_company_ids);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamentos TO authenticated;
GRANT ALL ON public.treinamentos TO service_role;

CREATE TABLE IF NOT EXISTS public.treinamento_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treinamento_modulos_treinamento
  ON public.treinamento_modulos (treinamento_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_modulos TO authenticated;
GRANT ALL ON public.treinamento_modulos TO service_role;

CREATE TABLE IF NOT EXISTS public.treinamento_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id uuid NOT NULL REFERENCES public.treinamento_modulos(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  titulo text NOT NULL,
  resumo text,
  tipo text NOT NULL DEFAULT 'video'::text,
  url_conteudo text,
  nome_arquivo text,
  duracao_estimada_minutos integer,
  tempo_minimo_minutos integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treinamento_aulas_modulo
  ON public.treinamento_aulas (modulo_id, ordem);
CREATE INDEX IF NOT EXISTS idx_treinamento_aulas_treinamento
  ON public.treinamento_aulas (treinamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_aulas TO authenticated;
GRANT ALL ON public.treinamento_aulas TO service_role;
