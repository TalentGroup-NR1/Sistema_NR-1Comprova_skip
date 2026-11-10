CREATE TABLE IF NOT EXISTS public.acesso_colaborador_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_destino TEXT NOT NULL,
  disparado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  email_enviado BOOLEAN NOT NULL DEFAULT false,
  erro_envio TEXT,
  reenvio BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.acesso_colaborador_audit TO authenticated;
GRANT ALL ON public.acesso_colaborador_audit TO service_role;

ALTER TABLE public.acesso_colaborador_audit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read audit for their company"
    ON public.acesso_colaborador_audit FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin_master')
      OR (
        public.has_role(auth.uid(), 'admin_empresa')
        AND company_id = public.get_my_company_id()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage audit"
    ON public.acesso_colaborador_audit FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_acesso_colaborador_audit_colaborador
  ON public.acesso_colaborador_audit(colaborador_id);

CREATE INDEX IF NOT EXISTS idx_acesso_colaborador_audit_company
  ON public.acesso_colaborador_audit(company_id);

CREATE INDEX IF NOT EXISTS idx_acesso_colaborador_audit_created
  ON public.acesso_colaborador_audit(created_at DESC);