-- ============================================================
-- LOTE 4C — Cuidar+ (conteúdos, insights, alertas, progressão)
-- Depende de: companies (Lote 1), auth.users
-- ============================================================

-- 1) cuidar_conteudos
CREATE TABLE IF NOT EXISTS public.cuidar_conteudos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo             text NOT NULL,
  descricao          text,
  tipo               text NOT NULL,
  url                text,
  categoria          text NOT NULL,
  status             text NOT NULL DEFAULT 'ativo'::text,
  criado_por         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  origem             text NOT NULL DEFAULT 'url'::text,
  storage_path       text,
  mime_type          text,
  tamanho_bytes      bigint,
  capa_path          text,
  conteudo_detalhado text,
  parceiro_nome      text,
  parceiro_url       text,
  parceiro_cta       text,
  permite_download   boolean NOT NULL DEFAULT true,
  destaque           boolean NOT NULL DEFAULT false,
  duracao_min        integer,
  CONSTRAINT cuidar_conteudos_tipo_check CHECK (tipo = ANY (ARRAY['video','artigo','cartilha'])),
  CONSTRAINT cuidar_conteudos_status_check CHECK (status = ANY (ARRAY['ativo','inativo'])),
  CONSTRAINT cuidar_conteudos_origem_check CHECK (origem = ANY (ARRAY['url','upload'])),
  CONSTRAINT cuidar_conteudos_origem_payload_check CHECK (
    (origem = 'url' AND url IS NOT NULL AND length(url) > 0)
    OR (origem = 'upload' AND storage_path IS NOT NULL AND length(storage_path) > 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_cuidar_conteudos_company ON public.cuidar_conteudos (company_id);
CREATE INDEX IF NOT EXISTS idx_cuidar_conteudos_status ON public.cuidar_conteudos (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_conteudos TO authenticated;
GRANT ALL ON public.cuidar_conteudos TO service_role;

-- 2) cuidar_insights
CREATE TABLE IF NOT EXISTS public.cuidar_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  escopo          text NOT NULL,
  ano             integer NOT NULL,
  semana_iso      integer,
  mes             integer,
  humor_medio     numeric(5,2),
  tendencia       numeric(5,2),
  total_respostas integer NOT NULL DEFAULT 0,
  alertas_json    jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculado_em    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cuidar_insights_escopo_check CHECK (escopo = ANY (ARRAY['semana','mes'])),
  CONSTRAINT cuidar_insights_company_id_escopo_ano_semana_iso_mes_key
    UNIQUE (company_id, escopo, ano, semana_iso, mes)
);
CREATE INDEX IF NOT EXISTS idx_cuidar_insights_company_periodo
  ON public.cuidar_insights (company_id, escopo, ano, semana_iso, mes);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_insights TO authenticated;
GRANT ALL ON public.cuidar_insights TO service_role;

-- 3) cuidar_alertas
CREATE TABLE IF NOT EXISTS public.cuidar_alertas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id       uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  departamento     text,
  ano              integer,
  semana_iso       integer,
  severidade       text NOT NULL,
  tipo             text NOT NULL,
  gatilho          text NOT NULL,
  mensagem         text NOT NULL,
  status           text NOT NULL DEFAULT 'aberto'::text,
  acao_registrada  text,
  acao_por         uuid REFERENCES auth.users(id),
  acao_em          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cuidar_alertas_severidade_check CHECK (severidade = ANY (ARRAY['baixo','moderado','alto'])),
  CONSTRAINT cuidar_alertas_tipo_check CHECK (tipo = ANY (ARRAY['individual','coletivo'])),
  CONSTRAINT cuidar_alertas_status_check CHECK (status = ANY (ARRAY['aberto','em_acao','resolvido','descartado']))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_individual ON public.cuidar_alertas
  (user_id, ano, semana_iso, gatilho) WHERE (tipo = 'individual' AND user_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_coletivo ON public.cuidar_alertas
  (company_id, departamento, ano, semana_iso, gatilho) WHERE (tipo = 'coletivo');
CREATE INDEX IF NOT EXISTS idx_cuidar_alertas_company
  ON public.cuidar_alertas (company_id, status, severidade, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_alertas TO authenticated;
GRANT ALL ON public.cuidar_alertas TO service_role;

-- 4) cuidar_progressao
CREATE TABLE IF NOT EXISTS public.cuidar_progressao (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id               uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  streak_semanal           integer NOT NULL DEFAULT 0,
  best_streak              integer NOT NULL DEFAULT 0,
  ultima_semana_respondida integer,
  ultimo_ano_respondido    integer,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cuidar_progressao_company ON public.cuidar_progressao (company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_progressao TO authenticated;
GRANT ALL ON public.cuidar_progressao TO service_role;
