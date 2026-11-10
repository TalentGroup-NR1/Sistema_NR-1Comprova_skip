ALTER TABLE public.beneficios_departamento
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2);

ALTER TABLE public.beneficios_tipo_contrato
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2);

ALTER TABLE public.beneficios_empresa_cliente
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2);