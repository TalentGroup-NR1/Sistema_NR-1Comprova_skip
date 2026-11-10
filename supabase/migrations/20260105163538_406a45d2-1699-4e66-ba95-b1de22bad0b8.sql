
-- Criar enum para status do ciclo de avaliação
CREATE TYPE public.ciclo_avaliacao_status AS ENUM ('configuracao', 'ativo', 'finalizado');

-- Criar enum para tipo de métrica
CREATE TYPE public.tipo_metrica AS ENUM ('numerica', 'descritiva');

-- Tabela de ciclos de avaliação
CREATE TABLE public.ciclos_avaliacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome_ciclo TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status public.ciclo_avaliacao_status NOT NULL DEFAULT 'configuracao',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de métricas de avaliação
CREATE TABLE public.metricas_avaliacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  nome_metrica TEXT NOT NULL,
  tipo_metrica public.tipo_metrica NOT NULL,
  valores_escala JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de competências por ciclo
CREATE TABLE public.competencias_ciclo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  metrica_id UUID REFERENCES public.metricas_avaliacao(id) ON DELETE SET NULL,
  nome_competencia TEXT NOT NULL,
  conceito_competencia TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de objetivos por ciclo
CREATE TABLE public.objetivos_ciclo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  metrica_id UUID REFERENCES public.metricas_avaliacao(id) ON DELETE SET NULL,
  nome_objetivo TEXT NOT NULL,
  descricao_objetivo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ciclos_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias_ciclo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objetivos_ciclo ENABLE ROW LEVEL SECURITY;

-- Políticas para ciclos_avaliacao
CREATE POLICY "Admin master full access ciclos_avaliacao"
ON public.ciclos_avaliacao FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company ciclos_avaliacao"
ON public.ciclos_avaliacao FOR ALL
USING (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid()) AND company_id IS NOT NULL)
WITH CHECK (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid()) AND company_id IS NOT NULL);

CREATE POLICY "Analista RH can manage own company ciclos_avaliacao"
ON public.ciclos_avaliacao FOR ALL
USING (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()) AND company_id IS NOT NULL)
WITH CHECK (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()) AND company_id IS NOT NULL);

CREATE POLICY "Gestor can view own company ciclos_avaliacao"
ON public.ciclos_avaliacao FOR SELECT
USING (has_role(auth.uid(), 'gestor_departamento') AND company_id = get_user_company_id(auth.uid()) AND company_id IS NOT NULL);

-- Políticas para metricas_avaliacao
CREATE POLICY "Admin master full access metricas_avaliacao"
ON public.metricas_avaliacao FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage metricas via ciclo"
ON public.metricas_avaliacao FOR ALL
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = metricas_avaliacao.ciclo_id AND has_role(auth.uid(), 'admin_empresa') AND c.company_id = get_user_company_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = metricas_avaliacao.ciclo_id AND has_role(auth.uid(), 'admin_empresa') AND c.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Analista RH can manage metricas via ciclo"
ON public.metricas_avaliacao FOR ALL
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = metricas_avaliacao.ciclo_id AND has_role(auth.uid(), 'analista_rh') AND c.company_id = get_user_company_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = metricas_avaliacao.ciclo_id AND has_role(auth.uid(), 'analista_rh') AND c.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Gestor can view metricas via ciclo"
ON public.metricas_avaliacao FOR SELECT
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = metricas_avaliacao.ciclo_id AND has_role(auth.uid(), 'gestor_departamento') AND c.company_id = get_user_company_id(auth.uid())));

-- Políticas para competencias_ciclo
CREATE POLICY "Admin master full access competencias_ciclo"
ON public.competencias_ciclo FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage competencias via ciclo"
ON public.competencias_ciclo FOR ALL
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = competencias_ciclo.ciclo_id AND has_role(auth.uid(), 'admin_empresa') AND c.company_id = get_user_company_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = competencias_ciclo.ciclo_id AND has_role(auth.uid(), 'admin_empresa') AND c.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Analista RH can manage competencias via ciclo"
ON public.competencias_ciclo FOR ALL
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = competencias_ciclo.ciclo_id AND has_role(auth.uid(), 'analista_rh') AND c.company_id = get_user_company_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = competencias_ciclo.ciclo_id AND has_role(auth.uid(), 'analista_rh') AND c.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Gestor can view competencias via ciclo"
ON public.competencias_ciclo FOR SELECT
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = competencias_ciclo.ciclo_id AND has_role(auth.uid(), 'gestor_departamento') AND c.company_id = get_user_company_id(auth.uid())));

-- Políticas para objetivos_ciclo
CREATE POLICY "Admin master full access objetivos_ciclo"
ON public.objetivos_ciclo FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage objetivos via ciclo"
ON public.objetivos_ciclo FOR ALL
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = objetivos_ciclo.ciclo_id AND has_role(auth.uid(), 'admin_empresa') AND c.company_id = get_user_company_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = objetivos_ciclo.ciclo_id AND has_role(auth.uid(), 'admin_empresa') AND c.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Analista RH can manage objetivos via ciclo"
ON public.objetivos_ciclo FOR ALL
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = objetivos_ciclo.ciclo_id AND has_role(auth.uid(), 'analista_rh') AND c.company_id = get_user_company_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = objetivos_ciclo.ciclo_id AND has_role(auth.uid(), 'analista_rh') AND c.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Gestor can view objetivos via ciclo"
ON public.objetivos_ciclo FOR SELECT
USING (EXISTS (SELECT 1 FROM ciclos_avaliacao c WHERE c.id = objetivos_ciclo.ciclo_id AND has_role(auth.uid(), 'gestor_departamento') AND c.company_id = get_user_company_id(auth.uid())));

-- Índices para performance
CREATE INDEX idx_ciclos_avaliacao_company ON public.ciclos_avaliacao(company_id);
CREATE INDEX idx_ciclos_avaliacao_status ON public.ciclos_avaliacao(status);
CREATE INDEX idx_metricas_avaliacao_ciclo ON public.metricas_avaliacao(ciclo_id);
CREATE INDEX idx_competencias_ciclo_ciclo ON public.competencias_ciclo(ciclo_id);
CREATE INDEX idx_objetivos_ciclo_ciclo ON public.objetivos_ciclo(ciclo_id);

-- Triggers para updated_at
CREATE TRIGGER update_ciclos_avaliacao_updated_at
BEFORE UPDATE ON public.ciclos_avaliacao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metricas_avaliacao_updated_at
BEFORE UPDATE ON public.metricas_avaliacao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competencias_ciclo_updated_at
BEFORE UPDATE ON public.competencias_ciclo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objetivos_ciclo_updated_at
BEFORE UPDATE ON public.objetivos_ciclo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
