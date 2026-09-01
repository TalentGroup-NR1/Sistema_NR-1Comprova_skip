-- ============================================================
-- LOTE 7E — Movimentações do colaborador e benefícios vinculados
-- Depende de: colaboradores (07b), companies, beneficios (Lote 3B)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promocoes_colaborador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_promocao date NOT NULL,
  cargo_anterior varchar NOT NULL,
  salario_anterior numeric(10,2) NOT NULL,
  nivel_anterior varchar,
  departamento_anterior varchar,
  cargo_novo varchar NOT NULL,
  salario_novo numeric(10,2) NOT NULL,
  nivel_novo varchar,
  departamento_novo varchar,
  motivo text,
  aprovado_por varchar NOT NULL,
  observacoes text,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promocoes_colaborador_id ON public.promocoes_colaborador (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_promocoes_company_id ON public.promocoes_colaborador (company_id);
CREATE INDEX IF NOT EXISTS idx_promocoes_data ON public.promocoes_colaborador (data_promocao DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promocoes_colaborador TO authenticated;
GRANT ALL ON public.promocoes_colaborador TO service_role;

CREATE TABLE IF NOT EXISTS public.transferencias_colaborador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_origem_id uuid NOT NULL REFERENCES public.companies(id),
  empresa_destino_id uuid NOT NULL REFERENCES public.companies(id),
  transferido_por uuid NOT NULL,
  motivo text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transferencias_colaborador_colab ON public.transferencias_colaborador (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_colaborador_created ON public.transferencias_colaborador (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transferencias_colaborador TO authenticated;
GRANT ALL ON public.transferencias_colaborador TO service_role;

CREATE TABLE IF NOT EXISTS public.desligamentos_colaborador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  acao text NOT NULL,
  data_desligamento date,
  tipo_desligamento text,
  motivo text,
  observacao text,
  criado_por_user_id uuid REFERENCES auth.users(id),
  criado_em timestamptz DEFAULT now(),
  CONSTRAINT desligamentos_colaborador_acao_check CHECK (acao = ANY (ARRAY['desligar','reativar']))
);

CREATE INDEX IF NOT EXISTS idx_desligamentos_colaborador_id ON public.desligamentos_colaborador (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_desligamentos_criado_em ON public.desligamentos_colaborador (criado_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desligamentos_colaborador TO authenticated;
GRANT ALL ON public.desligamentos_colaborador TO service_role;

CREATE TABLE IF NOT EXISTS public.colaborador_beneficios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  beneficio_id uuid NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  numero_cartao varchar(50),
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  status varchar(20) NOT NULL DEFAULT 'ativo'::varchar,
  observacoes text,
  valor numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT colaborador_beneficios_colab_benef_key UNIQUE (colaborador_id, beneficio_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaborador_beneficios TO authenticated;
GRANT ALL ON public.colaborador_beneficios TO service_role;
