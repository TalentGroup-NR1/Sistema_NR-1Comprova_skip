-- 1) Tabela
CREATE TABLE public.nr1_proart_ativacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  titulo text NOT NULL DEFAULT 'Avaliação PROART',
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nr1_proart_ativacoes_datas_check CHECK (data_fim >= data_inicio)
);

GRANT SELECT, INSERT, UPDATE ON public.nr1_proart_ativacoes TO authenticated;
GRANT ALL ON public.nr1_proart_ativacoes TO service_role;

ALTER TABLE public.nr1_proart_ativacoes ENABLE ROW LEVEL SECURITY;

-- Trigger: preencher company_id e updated_at
CREATE OR REPLACE FUNCTION public.set_proart_ativacao_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_company uuid;
BEGIN
  SELECT public.get_my_role() INTO v_role;
  SELECT public.get_my_company_id() INTO v_company;

  IF TG_OP = 'INSERT' THEN
    IF NEW.company_id IS NULL THEN
      IF v_role = 'admin_master' THEN
        -- admin_master deve informar company_id explicitamente
        RAISE EXCEPTION 'company_id obrigatório para admin_master';
      END IF;
      NEW.company_id := v_company;
    END IF;
    IF NEW.criado_por IS NULL THEN
      NEW.criado_por := auth.uid();
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_proart_ativacao_company_id
BEFORE INSERT OR UPDATE ON public.nr1_proart_ativacoes
FOR EACH ROW EXECUTE FUNCTION public.set_proart_ativacao_company_id();

-- RLS
CREATE POLICY "Admins veem ativações da empresa"
ON public.nr1_proart_ativacoes
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master')
  OR (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND company_id = public.get_my_company_id()
  )
);

CREATE POLICY "Colaborador vê ativações vigentes da sua empresa"
ON public.nr1_proart_ativacoes
FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND ativo = true
  AND data_inicio <= CURRENT_DATE
  AND data_fim >= CURRENT_DATE
);

CREATE POLICY "Admins criam ativações"
ON public.nr1_proart_ativacoes
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master')
  OR (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND company_id = public.get_my_company_id()
  )
);

CREATE POLICY "Admins atualizam ativações"
ON public.nr1_proart_ativacoes
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master')
  OR (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND company_id = public.get_my_company_id()
  )
);

-- 2) RPC para colaborador verificar ativação vigente
CREATE OR REPLACE FUNCTION public.get_proart_ativacao_vigente()
RETURNS TABLE (
  id uuid,
  company_id uuid,
  titulo text,
  data_inicio date,
  data_fim date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.company_id, a.titulo, a.data_inicio, a.data_fim
  FROM public.nr1_proart_ativacoes a
  WHERE a.company_id = public.get_my_company_id()
    AND a.ativo = true
    AND a.data_inicio <= CURRENT_DATE
    AND a.data_fim >= CURRENT_DATE
  ORDER BY a.data_inicio DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_proart_ativacao_vigente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_proart_ativacao_vigente() TO authenticated;
