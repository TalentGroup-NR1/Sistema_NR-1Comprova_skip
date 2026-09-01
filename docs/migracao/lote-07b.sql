-- ============================================================
-- LOTE 7B — colaboradores (tabela central)
-- Depende de: companies, work_schedules, banco_horas_perfis, cargos
-- e dos enums do lote-07a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  matricula varchar(50),
  full_name varchar(255) NOT NULL,
  social_name varchar(255),
  birth_date date NOT NULL,
  naturalidade varchar(100),
  nacionalidade varchar(100) DEFAULT 'Brasileira'::varchar,
  marital_status public.marital_status,
  sex public.sex_type,
  ethnicity public.ethnicity_type,
  education_level public.education_level,
  avatar_url text,
  cpf varchar(14) NOT NULL,
  cnpj varchar(18),
  contract_type public.contract_type NOT NULL,
  job_title varchar(100) NOT NULL,
  job_level text,
  department varchar(100) NOT NULL,
  manager_name varchar(255),
  base_salary numeric(12,2) NOT NULL,
  payment_method public.payment_method NOT NULL,
  work_shift_type public.work_shift_type,
  admission_date date NOT NULL,
  work_schedule varchar(100),
  corporate_email varchar(255) NOT NULL,
  phone varchar(20),
  address_zip_code varchar(10),
  address_country varchar(100) DEFAULT 'Brasil'::varchar,
  address_state varchar(100),
  address_city varchar(100),
  address_street varchar(255),
  address_number varchar(50),
  address_complement varchar(255),
  address_neighborhood varchar(255),
  status public.colaborador_status NOT NULL DEFAULT 'ATIVO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  termination_date date,
  gestor_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo_desligamento text,
  motivo_desligamento text,
  motivo_detalhado text,
  desligado_por_user_id uuid REFERENCES auth.users(id),
  desligado_em timestamptz,
  email_pessoal text,
  telefone_secundario text,
  gestao_tecnica varchar(255),
  is_substituicao boolean NOT NULL DEFAULT false,
  substituicao_colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  cursos_realizados text,
  razao_social varchar(255),
  data_pagamento varchar(10),
  is_banco_horas boolean NOT NULL DEFAULT false,
  jornada_diaria_minutos integer DEFAULT 480,
  alinhamento_notas text,
  curriculo_path text,
  humanguide_notas text,
  humanguide_path text,
  work_schedule_id uuid REFERENCES public.work_schedules(id) ON DELETE SET NULL,
  ultima_ferias_inicio date,
  ultima_ferias_fim date,
  data_corte_ferias date,
  pis text,
  ctps_numero text,
  ctps_serie text,
  rg text,
  empresa_cliente text,
  banco_horas_perfil_id uuid REFERENCES public.banco_horas_perfis(id) ON DELETE SET NULL,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL,
  CONSTRAINT colaboradores_cpf_company_unique UNIQUE (company_id, cpf),
  CONSTRAINT colaboradores_cnpj_company_unique UNIQUE (company_id, cnpj),
  CONSTRAINT colaboradores_email_company_unique UNIQUE (company_id, corporate_email),
  CONSTRAINT colaboradores_matricula_company_unique UNIQUE (company_id, matricula)
);

CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON public.colaboradores (status);
CREATE INDEX IF NOT EXISTS idx_colaboradores_gestor_id ON public.colaboradores (gestor_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id ON public.colaboradores (user_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_admission_date ON public.colaboradores (admission_date);
CREATE INDEX IF NOT EXISTS idx_colaboradores_birth_date ON public.colaboradores (birth_date);
CREATE INDEX IF NOT EXISTS idx_colaboradores_email_pessoal ON public.colaboradores (email_pessoal);
CREATE INDEX IF NOT EXISTS idx_colaboradores_work_schedule ON public.colaboradores (work_schedule_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_banco_horas_perfil ON public.colaboradores (banco_horas_perfil_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_cargo ON public.colaboradores (cargo_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_termination_date ON public.colaboradores (termination_date) WHERE termination_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_colaboradores_substituicao ON public.colaboradores (substituicao_colaborador_id) WHERE substituicao_colaborador_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores TO authenticated;
GRANT ALL ON public.colaboradores TO service_role;

-- FK pendente do Lote 6D (departamentos.responsavel_id → colaboradores)
ALTER TABLE public.departamentos
  ADD CONSTRAINT departamentos_responsavel_id_fkey
  FOREIGN KEY (responsavel_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;
