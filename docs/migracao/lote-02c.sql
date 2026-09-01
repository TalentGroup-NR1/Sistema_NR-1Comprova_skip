-- =====================================================================
-- LOTE 2C — notifications, relatorios_executivos_salvos, comunicados, cuidar_templates_fixos
-- Pré-requisito: lote-02a.sql aplicado (enums criados).
-- =====================================================================

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios_executivos_salvos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_templates_fixos TO authenticated;
GRANT ALL ON public.notifications, public.relatorios_executivos_salvos, public.comunicados, public.cuidar_templates_fixos TO service_role;
