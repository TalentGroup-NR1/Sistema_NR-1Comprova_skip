ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_cnpj_key;
CREATE UNIQUE INDEX IF NOT EXISTS companies_cnpj_cliente_unique ON public.companies (cnpj, COALESCE(empresa_cliente, ''));