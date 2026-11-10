-- Create ENUMs for colaboradores
CREATE TYPE colaborador_status AS ENUM ('ATIVO', 'FERIAS', 'DESLIGADO', 'LICENCA');

CREATE TYPE marital_status AS ENUM (
  'Solteiro(a)', 'Casado(a)', 'Separado(a)', 
  'Divorciado(a)', 'Viúvo(a)', 'União Estável'
);

CREATE TYPE sex_type AS ENUM ('Feminino', 'Masculino', 'Outro', 'Não informar');

CREATE TYPE ethnicity_type AS ENUM (
  'Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não informar'
);

CREATE TYPE education_level AS ENUM (
  'Fundamental Incompleto', 'Fundamental Completo',
  'Médio Incompleto', 'Médio Completo',
  'Superior Incompleto', 'Superior Completo',
  'Pós-graduação', 'Mestrado', 'Doutorado'
);

CREATE TYPE contract_type AS ENUM (
  'CLT', 'Estágio', 'Aprendiz', 'PJ', 'Temporário', 'Voluntário', 'Outros'
);

CREATE TYPE job_level AS ENUM (
  'Júnior I', 'Júnior II', 'Júnior III',
  'Pleno I', 'Pleno II', 'Pleno III',
  'Sênior I', 'Sênior II', 'Sênior III', 'Especialista'
);

CREATE TYPE payment_method AS ENUM ('Mensalista', 'Horista', 'Comissionista');

CREATE TYPE work_shift_type AS ENUM (
  'Integral', 'Parcial', 'Aprendiz', 'Estagiário', 'Flexível'
);

CREATE TYPE relationship_type AS ENUM ('Filho(a)', 'Cônjuge', 'Pai/Mãe', 'Outro');

-- Create colaboradores table
CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  matricula VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  social_name VARCHAR(255),
  birth_date DATE NOT NULL,
  naturalidade VARCHAR(100),
  nacionalidade VARCHAR(100) DEFAULT 'Brasileira',
  marital_status marital_status,
  sex sex_type,
  ethnicity ethnicity_type,
  education_level education_level,
  avatar_url TEXT,
  cpf VARCHAR(14) NOT NULL,
  cnpj VARCHAR(18),
  contract_type contract_type NOT NULL,
  job_title VARCHAR(100) NOT NULL,
  job_level job_level,
  department VARCHAR(100) NOT NULL,
  manager_name VARCHAR(255),
  base_salary DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  work_shift_type work_shift_type,
  admission_date DATE NOT NULL,
  allocation VARCHAR(255),
  work_schedule VARCHAR(100),
  corporate_email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address_zip_code VARCHAR(10),
  address_country VARCHAR(100) DEFAULT 'Brasil',
  address_state VARCHAR(100),
  address_city VARCHAR(100),
  address_street VARCHAR(255),
  address_number VARCHAR(50),
  address_complement VARCHAR(255),
  address_neighborhood VARCHAR(255),
  status colaborador_status NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT colaboradores_matricula_company_unique UNIQUE(company_id, matricula),
  CONSTRAINT colaboradores_cpf_company_unique UNIQUE(company_id, cpf),
  CONSTRAINT colaboradores_cnpj_company_unique UNIQUE(company_id, cnpj),
  CONSTRAINT colaboradores_email_company_unique UNIQUE(company_id, corporate_email)
);

-- Create dependentes table
CREATE TABLE public.dependentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  relationship relationship_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependentes ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for colaboradores
CREATE POLICY "Admin master full access colaboradores"
  ON public.colaboradores FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company colaboradores"
  ON public.colaboradores FOR ALL
  USING (
    has_role(auth.uid(), 'admin_empresa'::app_role)
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_empresa'::app_role)
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  );

CREATE POLICY "Analista RH can manage own company colaboradores"
  ON public.colaboradores FOR ALL
  USING (
    has_role(auth.uid(), 'analista_rh'::app_role)
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  )
  WITH CHECK (
    has_role(auth.uid(), 'analista_rh'::app_role)
    AND company_id = get_user_company_id(auth.uid())
    AND company_id IS NOT NULL
  );

-- RLS Policies for dependentes (inherit via colaborador access)
CREATE POLICY "Admin master full access dependentes"
  ON public.dependentes FOR ALL
  USING (is_admin_master(auth.uid()))
  WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Users can manage dependentes of accessible colaboradores"
  ON public.dependentes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = dependentes.colaborador_id
      AND (
        is_admin_master(auth.uid())
        OR (
          (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
          AND c.company_id = get_user_company_id(auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = dependentes.colaborador_id
      AND (
        is_admin_master(auth.uid())
        OR (
          (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
          AND c.company_id = get_user_company_id(auth.uid())
        )
      )
    )
  );