CREATE TABLE IF NOT EXISTS public.pgr_ghe_setor (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    ghe_id uuid NOT NULL, -- references nr1_ghes(id) or whatever the actual table is
    departamento text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pgr_ghe_setor ENABLE ROW LEVEL SECURITY;

-- Policy de select/insert/update/delete baseada em company_id
CREATE POLICY "pgr_ghe_setor_policy"
ON public.pgr_ghe_setor
AS PERMISSIVE
FOR ALL
TO authenticated
USING (company_id = (select (auth.jwt() ->> 'company_id')::uuid))
WITH CHECK (company_id = (select (auth.jwt() ->> 'company_id')::uuid));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_current_timestamp_pgr_ghe_setor()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pgr_ghe_setor_updated_at
BEFORE UPDATE ON public.pgr_ghe_setor
FOR EACH ROW
EXECUTE FUNCTION set_current_timestamp_pgr_ghe_setor();
