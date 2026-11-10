-- Criação do Enum para status do acompanhamento
CREATE TYPE public.pulse_acompanhamento_status AS ENUM (
  'novo', 
  'em_andamento', 
  'aguardando_retorno', 
  'concluido', 
  'arquivado'
);

-- Criação da tabela pulse_acompanhamentos
CREATE TABLE public.pulse_acompanhamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  resposta_id uuid REFERENCES public.pulse_surveys(id) ON DELETE SET NULL,
  responsavel_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.pulse_acompanhamento_status NOT NULL DEFAULT 'novo',
  objetivo text,
  acoes jsonb DEFAULT '[]'::jsonb,
  anotacoes text,
  proximo_contato_em date,
  concluido_em timestamptz,
  resultado text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.pulse_acompanhamentos ENABLE ROW LEVEL SECURITY;

-- Grants de permissão de tabela (Obrigatório para authenticated no Supabase)
GRANT USAGE ON TYPE public.pulse_acompanhamento_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_acompanhamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_acompanhamentos TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Políticas de RLS: Fase 1 (admin_empresa da mesma company_id)
CREATE POLICY "Admins podem visualizar acompanhamentos de sua empresa"
  ON public.pulse_acompanhamentos
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_empresa'::app_role)
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins podem inserir acompanhamentos de sua empresa"
  ON public.pulse_acompanhamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_empresa'::app_role)
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins podem atualizar acompanhamentos de sua empresa"
  ON public.pulse_acompanhamentos
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_empresa'::app_role)
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins podem deletar acompanhamentos de sua empresa"
  ON public.pulse_acompanhamentos
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_empresa'::app_role)
    AND company_id = public.get_my_company_id()
  );

-- Trigger para atualização automática de updated_at
CREATE TRIGGER trg_pulse_acompanhamentos_updated_at
  BEFORE UPDATE ON public.pulse_acompanhamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
