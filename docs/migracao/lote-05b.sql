-- ============================================================
-- LOTE 5B — PGR (dependência: pgr_documentos — Lote 3D)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pgr_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.pgr_documentos(id) ON DELETE CASCADE,
  numero text,
  titulo text NOT NULL,
  conteudo text DEFAULT ''::text,
  tipo text NOT NULL DEFAULT 'texto'::text,
  chave_automatica text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pgr_secoes_tipo_check CHECK (tipo = ANY (ARRAY['texto','automatico'])),
  CONSTRAINT pgr_secoes_chave_check CHECK (
    chave_automatica IS NULL OR chave_automatica = ANY (
      ARRAY['caracterizacao','relacao_cargos','inventario_ghe','adendo_psicossocial','plano_acao'])
  )
);
CREATE INDEX IF NOT EXISTS idx_pgr_secoes_documento
  ON public.pgr_secoes USING btree (documento_id, ordem);

CREATE TABLE IF NOT EXISTS public.pgr_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.pgr_documentos(id) ON DELETE CASCADE,
  numero text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  historico text NOT NULL DEFAULT ''::text,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pgr_alteracoes_documento
  ON public.pgr_alteracoes USING btree (documento_id, data);

CREATE TABLE IF NOT EXISTS public.pgr_psicossocial_dominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.pgr_documentos(id) ON DELETE CASCADE,
  nome_dominio text NOT NULL,
  grupo text NOT NULL DEFAULT 'I'::text,
  peso numeric NOT NULL DEFAULT 1,
  mediana numeric,
  classificacao text,
  polaridade text NOT NULL DEFAULT 'menor_melhor'::text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pgr_psico_grupo_check CHECK (grupo = ANY (ARRAY['I','II'])),
  CONSTRAINT pgr_psico_polaridade_check CHECK (polaridade = ANY (ARRAY['menor_melhor','maior_melhor']))
);
CREATE INDEX IF NOT EXISTS idx_pgr_psico_dominios_doc
  ON public.pgr_psicossocial_dominios USING btree (documento_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_secoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_alteracoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_psicossocial_dominios TO authenticated;
GRANT ALL ON public.pgr_secoes TO service_role;
GRANT ALL ON public.pgr_alteracoes TO service_role;
GRANT ALL ON public.pgr_psicossocial_dominios TO service_role;
