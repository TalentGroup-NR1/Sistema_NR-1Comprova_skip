CREATE TABLE public.treinamento_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_modulos TO authenticated;
GRANT ALL ON public.treinamento_modulos TO service_role;
ALTER TABLE public.treinamento_modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver modulos"
  ON public.treinamento_modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam modulos"
  ON public.treinamento_modulos FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin_master' OR (public.get_my_role() IN ('admin_empresa','analista_rh') AND company_id = public.get_my_company_id()))
  WITH CHECK (public.get_my_role() = 'admin_master' OR (public.get_my_role() IN ('admin_empresa','analista_rh') AND company_id = public.get_my_company_id()));

CREATE INDEX idx_treinamento_modulos_treinamento ON public.treinamento_modulos(treinamento_id, ordem);

CREATE TABLE public.treinamento_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id uuid NOT NULL REFERENCES public.treinamento_modulos(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  titulo text NOT NULL,
  resumo text,
  tipo text NOT NULL DEFAULT 'video',
  url_conteudo text,
  nome_arquivo text,
  duracao_estimada_minutos integer,
  tempo_minimo_minutos integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_aulas TO authenticated;
GRANT ALL ON public.treinamento_aulas TO service_role;
ALTER TABLE public.treinamento_aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver aulas"
  ON public.treinamento_aulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam aulas"
  ON public.treinamento_aulas FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin_master' OR (public.get_my_role() IN ('admin_empresa','analista_rh') AND company_id = public.get_my_company_id()))
  WITH CHECK (public.get_my_role() = 'admin_master' OR (public.get_my_role() IN ('admin_empresa','analista_rh') AND company_id = public.get_my_company_id()));

CREATE INDEX idx_treinamento_aulas_modulo ON public.treinamento_aulas(modulo_id, ordem);
CREATE INDEX idx_treinamento_aulas_treinamento ON public.treinamento_aulas(treinamento_id);

CREATE TABLE public.treinamento_aula_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.treinamento_aulas(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  concluida boolean NOT NULL DEFAULT false,
  tempo_assistido_segundos integer NOT NULL DEFAULT 0,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aula_id, colaborador_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamento_aula_progresso TO authenticated;
GRANT ALL ON public.treinamento_aula_progresso TO service_role;
ALTER TABLE public.treinamento_aula_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colaborador gerencia seu progresso de aula"
  ON public.treinamento_aula_progresso FOR ALL TO authenticated
  USING (colaborador_id = public.get_my_colaborador_id())
  WITH CHECK (colaborador_id = public.get_my_colaborador_id());

CREATE POLICY "Admins veem progresso de aulas"
  ON public.treinamento_aula_progresso FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin_master','admin_empresa','analista_rh','gestor_departamento'));

CREATE INDEX idx_aula_progresso_colab ON public.treinamento_aula_progresso(colaborador_id, treinamento_id);

CREATE TRIGGER trg_treinamento_modulos_updated BEFORE UPDATE ON public.treinamento_modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_treinamento_aulas_updated BEFORE UPDATE ON public.treinamento_aulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_treinamento_aula_progresso_updated BEFORE UPDATE ON public.treinamento_aula_progresso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();