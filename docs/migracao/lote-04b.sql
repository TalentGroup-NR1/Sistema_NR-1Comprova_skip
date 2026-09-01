-- ============================================================
-- LOTE 4B — Comunicados (leituras/anexos/visualizações), tarefas e denúncias
-- Depende de: companies (Lote 1), tasks (Lote 1), comunicados (Lote 2C)
-- ============================================================

-- 1) comunicado_leituras
CREATE TABLE IF NOT EXISTS public.comunicado_leituras (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id),
  comunicado_id uuid NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at       timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT comunicado_leituras_company_id_comunicado_id_user_id_key
    UNIQUE (company_id, comunicado_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comunicado_leituras_user
  ON public.comunicado_leituras USING btree (company_id, user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_comunicado_leituras_comunicado
  ON public.comunicado_leituras USING btree (company_id, comunicado_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicado_leituras TO authenticated;
GRANT ALL ON public.comunicado_leituras TO service_role;

-- 2) comunicados_anexos
CREATE TABLE IF NOT EXISTS public.comunicados_anexos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id uuid NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  nome_arquivo  text NOT NULL,
  url_arquivo   text NOT NULL,
  tipo_arquivo  text,
  tamanho_bytes integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicados_anexos TO authenticated;
GRANT ALL ON public.comunicados_anexos TO service_role;

-- 3) comunicados_visualizacoes
CREATE TABLE IF NOT EXISTS public.comunicados_visualizacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id  uuid NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL,
  visualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comunicados_visualizacoes_comunicado_id_colaborador_id_key
    UNIQUE (comunicado_id, colaborador_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicados_visualizacoes TO authenticated;
GRANT ALL ON public.comunicados_visualizacoes TO service_role;

-- 4) tasks_reminders
CREATE TABLE IF NOT EXISTS public.tasks_reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remind_at   timestamptz NOT NULL,
  notified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_reminders_user_remind
  ON public.tasks_reminders USING btree (user_id, remind_at);
CREATE INDEX IF NOT EXISTS idx_tasks_reminders_task
  ON public.tasks_reminders USING btree (task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks_reminders TO authenticated;
GRANT ALL ON public.tasks_reminders TO service_role;

-- 5) denuncias
CREATE TABLE IF NOT EXISTS public.denuncias (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  titulo                  text NOT NULL,
  mensagem                text NOT NULL,
  anonimo                 boolean NOT NULL DEFAULT false,
  user_id                 uuid,
  status                  text NOT NULL DEFAULT 'novo'::text,
  criado_em               timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  tipo                    text NOT NULL DEFAULT 'denuncia'::text,
  categoria_comportamento text,
  origem_ofensa           text,
  CONSTRAINT denuncias_titulo_check CHECK (char_length(titulo) BETWEEN 1 AND 200),
  CONSTRAINT denuncias_mensagem_check CHECK (char_length(mensagem) BETWEEN 1 AND 5000),
  CONSTRAINT denuncias_status_check CHECK (status = ANY (ARRAY['novo','em_analise','concluido'])),
  CONSTRAINT denuncias_tipo_check CHECK (tipo = ANY (ARRAY['denuncia','sugestao','duvida'])),
  CONSTRAINT denuncias_categoria_check CHECK (categoria_comportamento IS NULL OR categoria_comportamento = ANY (ARRAY['assedio_sexual','ameaca_violencia','violencia_fisica','bullying_assedio_moral'])),
  CONSTRAINT denuncias_origem_check CHECK (origem_ofensa IS NULL OR origem_ofensa = ANY (ARRAY['lideranca_cliente','lideranca_interna','colegas_pares','subordinados','clientes_terceiros']))
);
CREATE INDEX IF NOT EXISTS idx_denuncias_company_status ON public.denuncias (company_id, status);
CREATE INDEX IF NOT EXISTS idx_denuncias_criado_em ON public.denuncias (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_denuncias_tipo ON public.denuncias (tipo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.denuncias TO authenticated;
GRANT ALL ON public.denuncias TO service_role;
