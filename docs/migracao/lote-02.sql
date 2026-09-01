-- =====================================================================
-- MIGRAÇÃO — LOTE 2: AUXILIARES INDEPENDENTES + CONFIG DE EMPRESA (16 tabelas)
-- Pré-requisito: Lote 1 aplicado (companies, auth.users disponíveis).
-- Ordem: enums -> tabelas -> índices -> grants.
-- Observação: RLS e políticas NÃO estão incluídas neste lote.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ENUMS necessários
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comunicado_status') THEN
    CREATE TYPE public.comunicado_status AS ENUM ('rascunho', 'publicado', 'agendado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publico_alvo_tipo') THEN
    CREATE TYPE public.publico_alvo_tipo AS ENUM ('todos', 'departamento', 'cargo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unidade_tipo') THEN
    CREATE TYPE public.unidade_tipo AS ENUM ('matriz', 'filial', 'centro_distribuicao', 'escritorio');
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  company_id uuid,
  full_name character varying(255),
  email character varying(255),
  phone character varying(20),
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  must_change_password boolean DEFAULT false NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles USING btree (user_id);

-- ---------------------------------------------------------------------
-- 2. onboarding_progress
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  current_step integer DEFAULT 0 NOT NULL,
  completed_steps text[] DEFAULT '{}'::text[] NOT NULL,
  dismissed boolean DEFAULT false NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT onboarding_progress_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_progress_company_id_key UNIQUE (company_id),
  CONSTRAINT onboarding_progress_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. terms_acceptance
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  acceptor_name text NOT NULL,
  acceptor_email text NOT NULL,
  terms_version text DEFAULT '1.0'::text NOT NULL,
  privacy_version text DEFAULT '1.0'::text NOT NULL,
  ip_address text,
  user_agent text,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT terms_acceptance_pkey PRIMARY KEY (id),
  CONSTRAINT terms_acceptance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_company ON public.terms_acceptance USING btree (company_id);

-- ---------------------------------------------------------------------
-- 4. replication_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.replication_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_user_id uuid,
  record_type text NOT NULL,
  source_record_id uuid NOT NULL,
  source_company_id uuid,
  target_company_id uuid,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT replication_logs_pkey PRIMARY KEY (id),
  CONSTRAINT replication_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id),
  CONSTRAINT replication_logs_source_company_id_fkey FOREIGN KEY (source_company_id) REFERENCES public.companies(id),
  CONSTRAINT replication_logs_target_company_id_fkey FOREIGN KEY (target_company_id) REFERENCES public.companies(id)
);

-- ---------------------------------------------------------------------
-- 5. unidades_organizacionais
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unidades_organizacionais (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  tipo public.unidade_tipo DEFAULT 'matriz'::public.unidade_tipo NOT NULL,
  endereco text,
  cidade text,
  estado text,
  cep text,
  ativa boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unidades_organizacionais_pkey PRIMARY KEY (id),
  CONSTRAINT unidades_organizacionais_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_unidades_company ON public.unidades_organizacionais USING btree (company_id);

-- ---------------------------------------------------------------------
-- 6. empresas_clientes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresas_clientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  codigo text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT empresas_clientes_pkey PRIMARY KEY (id),
  CONSTRAINT empresas_clientes_company_id_nome_key UNIQUE (company_id, nome),
  CONSTRAINT empresas_clientes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_company ON public.empresas_clientes USING btree (company_id);

-- ---------------------------------------------------------------------
-- 7. niveis_maturidade
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.niveis_maturidade (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  ordem integer DEFAULT 0 NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT niveis_maturidade_pkey PRIMARY KEY (id),
  CONSTRAINT niveis_maturidade_company_id_nome_key UNIQUE (company_id, nome),
  CONSTRAINT niveis_maturidade_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_niveis_maturidade_company ON public.niveis_maturidade USING btree (company_id);

-- ---------------------------------------------------------------------
-- 8. feriados
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feriados (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid,
  data date NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  uf character(2),
  recorrente boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT feriados_pkey PRIMARY KEY (id),
  CONSTRAINT feriados_tipo_check CHECK (tipo = ANY (ARRAY['NACIONAL'::text, 'ESTADUAL'::text, 'MUNICIPAL'::text, 'EMPRESA'::text])),
  CONSTRAINT feriados_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS feriados_unique_idx ON public.feriados USING btree (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), data, nome);
CREATE INDEX IF NOT EXISTS feriados_company_idx ON public.feriados USING btree (company_id);
CREATE INDEX IF NOT EXISTS feriados_data_idx ON public.feriados USING btree (data);

-- ---------------------------------------------------------------------
-- 9. notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  action_url text,
  entity_type text,
  entity_id uuid,
  priority text DEFAULT 'normal'::text,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications USING btree (company_id, user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------
-- 10. relatorios_executivos_salvos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.relatorios_executivos_salvos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  ano integer NOT NULL,
  parecer_html text DEFAULT ''::text NOT NULL,
  criado_por_user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT relatorios_executivos_salvos_pkey PRIMARY KEY (id),
  CONSTRAINT relatorios_executivos_salvos_company_id_ano_key UNIQUE (company_id, ano),
  CONSTRAINT relatorios_executivos_salvos_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 11. comunicados
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comunicados (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  autor_id uuid NOT NULL,
  autor_nome character varying(255) NOT NULL,
  data_publicacao timestamp with time zone,
  status public.comunicado_status DEFAULT 'rascunho'::public.comunicado_status NOT NULL,
  publico_alvo_tipo public.publico_alvo_tipo DEFAULT 'todos'::public.publico_alvo_tipo NOT NULL,
  publico_alvo_valor text,
  is_pinned boolean DEFAULT false NOT NULL,
  views_count integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  image_url text,
  exige_leitura boolean DEFAULT true NOT NULL,
  CONSTRAINT comunicados_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_comunicados_company ON public.comunicados USING btree (company_id);

-- ---------------------------------------------------------------------
-- 12. cuidar_templates_fixos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cuidar_templates_fixos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_key text NOT NULL,
  nome text NOT NULL,
  descricao text,
  perguntas_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT cuidar_templates_fixos_pkey PRIMARY KEY (id),
  CONSTRAINT cuidar_templates_fixos_template_key_key UNIQUE (template_key)
);

-- ---------------------------------------------------------------------
-- 13. nr1_matriz_config
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nr1_matriz_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  corte_verde integer DEFAULT 4 NOT NULL,
  corte_amarelo integer DEFAULT 9 NOT NULL,
  corte_laranja integer DEFAULT 14 NOT NULL,
  corte_vermelho integer DEFAULT 25 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT nr1_matriz_config_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_matriz_config_company_id_key UNIQUE (company_id)
);

-- ---------------------------------------------------------------------
-- 14. nr1_proart_ativacoes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nr1_proart_ativacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  titulo text DEFAULT 'Avaliação PROART'::text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  criado_por uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tamanho_censo integer DEFAULT 0 NOT NULL,
  CONSTRAINT nr1_proart_ativacoes_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_proart_ativacoes_datas_check CHECK (data_fim >= data_inicio)
);
CREATE INDEX IF NOT EXISTS idx_nr1_proart_ativacoes_company ON public.nr1_proart_ativacoes USING btree (company_id);

-- ---------------------------------------------------------------------
-- 15. nr1_proart_perguntas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nr1_proart_perguntas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  escala integer NOT NULL,
  numero integer NOT NULL,
  texto text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT nr1_proart_perguntas_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_proart_perguntas_escala_numero_key UNIQUE (escala, numero),
  CONSTRAINT nr1_proart_perguntas_escala_check CHECK (escala >= 1 AND escala <= 4)
);

-- ---------------------------------------------------------------------
-- 16. nr1_riscos_catalogo
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nr1_riscos_catalogo (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid,
  nome character varying(200) NOT NULL,
  categoria character varying(30) NOT NULL,
  descricao text,
  fatores_risco text,
  medidas_controle text,
  palavras_chave text,
  editavel boolean DEFAULT true NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT nr1_riscos_catalogo_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_riscos_catalogo_categoria_chk CHECK ((categoria)::text = ANY ((ARRAY['fisico'::character varying, 'quimico'::character varying, 'biologico'::character varying, 'ergonomico'::character varying, 'psicossocial'::character varying, 'acidente'::character varying])::text[]))
);
CREATE INDEX IF NOT EXISTS idx_nr1_riscos_catalogo_company ON public.nr1_riscos_catalogo USING btree (company_id);

-- ---------------------------------------------------------------------
-- 17. GRANTS
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms_acceptance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replication_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades_organizacionais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.niveis_maturidade TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feriados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios_executivos_salvos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_templates_fixos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_matriz_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_proart_ativacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_proart_perguntas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_riscos_catalogo TO authenticated;

GRANT ALL ON public.profiles, public.onboarding_progress, public.terms_acceptance,
  public.replication_logs, public.unidades_organizacionais, public.empresas_clientes,
  public.niveis_maturidade, public.feriados, public.notifications,
  public.relatorios_executivos_salvos, public.comunicados, public.cuidar_templates_fixos,
  public.nr1_matriz_config, public.nr1_proart_ativacoes, public.nr1_proart_perguntas,
  public.nr1_riscos_catalogo TO service_role;

-- Leitura anônima necessária para formulários públicos (PROART por token):
GRANT SELECT ON public.nr1_proart_perguntas TO anon;
