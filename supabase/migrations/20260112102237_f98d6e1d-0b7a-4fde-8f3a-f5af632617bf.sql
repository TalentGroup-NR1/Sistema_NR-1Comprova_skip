-- Enums para PDI
CREATE TYPE public.pdi_status AS ENUM ('rascunho', 'em_andamento', 'concluido', 'cancelado');
CREATE TYPE public.pdi_item_tipo_alvo AS ENUM ('competencia', 'objetivo', 'geral');
CREATE TYPE public.pdi_item_tipo_acao AS ENUM ('treinamento', 'mentoria', 'projeto_pratico', 'leitura', 'coaching', 'feedbacks_periodicos', 'outro');
CREATE TYPE public.pdi_item_responsavel AS ENUM ('colaborador', 'gestor', 'rh');
CREATE TYPE public.pdi_item_status AS ENUM ('nao_iniciado', 'em_andamento', 'concluido', 'bloqueado');

-- Tabela principal PDI (1 por avaliação)
CREATE TABLE public.pdis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avaliacao_id UUID NOT NULL UNIQUE REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  gestor_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  status public.pdi_status NOT NULL DEFAULT 'rascunho',
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim_prevista DATE,
  observacoes_gerais TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens/ações do PDI
CREATE TABLE public.pdi_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdi_id UUID NOT NULL REFERENCES public.pdis(id) ON DELETE CASCADE,
  tipo_alvo public.pdi_item_tipo_alvo NOT NULL DEFAULT 'geral',
  competencia_id UUID REFERENCES public.competencias_ciclo(id) ON DELETE SET NULL,
  objetivo_id UUID REFERENCES public.objetivos_ciclo(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo_acao public.pdi_item_tipo_acao NOT NULL DEFAULT 'outro',
  responsavel public.pdi_item_responsavel NOT NULL DEFAULT 'colaborador',
  prazo DATE,
  status public.pdi_item_status NOT NULL DEFAULT 'nao_iniciado',
  progresso_percentual INTEGER NOT NULL DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),
  evidencias TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de check-ins/acompanhamentos
CREATE TABLE public.pdi_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdi_item_id UUID NOT NULL REFERENCES public.pdi_itens(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  progresso_percentual INTEGER CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_pdis_avaliacao ON public.pdis(avaliacao_id);
CREATE INDEX idx_pdis_ciclo ON public.pdis(ciclo_id);
CREATE INDEX idx_pdis_colaborador ON public.pdis(colaborador_id);
CREATE INDEX idx_pdis_gestor ON public.pdis(gestor_id);
CREATE INDEX idx_pdi_itens_pdi ON public.pdi_itens(pdi_id);
CREATE INDEX idx_pdi_checkins_item ON public.pdi_checkins(pdi_item_id);

-- Triggers para updated_at
CREATE TRIGGER update_pdis_updated_at
  BEFORE UPDATE ON public.pdis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdi_itens_updated_at
  BEFORE UPDATE ON public.pdi_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.pdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdis
-- RH/Admin: acesso total
CREATE POLICY "pdis_admin_all" ON public.pdis
  FOR ALL USING (
    public.is_admin_master(auth.uid()) OR 
    public.has_role(auth.uid(), 'admin_empresa') OR
    public.has_role(auth.uid(), 'analista_rh')
  );

-- Gestor: acesso quando é o gestor do PDI
CREATE POLICY "pdis_gestor_access" ON public.pdis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE c.id = pdis.gestor_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );

-- Colaborador: pode ler seu próprio PDI
CREATE POLICY "pdis_colaborador_read" ON public.pdis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE c.id = pdis.colaborador_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );

-- RLS Policies for pdi_itens
-- RH/Admin: acesso total
CREATE POLICY "pdi_itens_admin_all" ON public.pdi_itens
  FOR ALL USING (
    public.is_admin_master(auth.uid()) OR 
    public.has_role(auth.uid(), 'admin_empresa') OR
    public.has_role(auth.uid(), 'analista_rh')
  );

-- Gestor: acesso via PDI
CREATE POLICY "pdi_itens_gestor_access" ON public.pdi_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pdis pdi
      JOIN public.colaboradores c ON c.id = pdi.gestor_id
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE pdi.id = pdi_itens.pdi_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );

-- Colaborador: pode ler seus itens
CREATE POLICY "pdi_itens_colaborador_read" ON public.pdi_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pdis pdi
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE pdi.id = pdi_itens.pdi_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );

-- Colaborador: pode atualizar progresso/status/evidencias dos seus itens
CREATE POLICY "pdi_itens_colaborador_update" ON public.pdi_itens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pdis pdi
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE pdi.id = pdi_itens.pdi_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );

-- RLS Policies for pdi_checkins
-- RH/Admin: acesso total
CREATE POLICY "pdi_checkins_admin_all" ON public.pdi_checkins
  FOR ALL USING (
    public.is_admin_master(auth.uid()) OR 
    public.has_role(auth.uid(), 'admin_empresa') OR
    public.has_role(auth.uid(), 'analista_rh')
  );

-- Gestor: acesso via PDI item
CREATE POLICY "pdi_checkins_gestor_access" ON public.pdi_checkins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pdi_itens pi
      JOIN public.pdis pdi ON pdi.id = pi.pdi_id
      JOIN public.colaboradores c ON c.id = pdi.gestor_id
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE pi.id = pdi_checkins.pdi_item_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );

-- Colaborador: pode ler e criar check-ins nos seus itens
CREATE POLICY "pdi_checkins_colaborador_read" ON public.pdi_checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pdi_itens pi
      JOIN public.pdis pdi ON pdi.id = pi.pdi_id
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE pi.id = pdi_checkins.pdi_item_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );

CREATE POLICY "pdi_checkins_colaborador_insert" ON public.pdi_checkins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pdi_itens pi
      JOIN public.pdis pdi ON pdi.id = pi.pdi_id
      JOIN public.colaboradores c ON c.id = pdi.colaborador_id
      JOIN public.profiles p ON p.company_id = c.company_id
      WHERE pi.id = pdi_checkins.pdi_item_id
      AND p.user_id = auth.uid()
      AND c.corporate_email = p.email
    )
  );