
ALTER TABLE public.ponto_registros 
  ADD COLUMN status_aprovacao TEXT NOT NULL DEFAULT 'aprovado',
  ADD COLUMN aprovado_por UUID REFERENCES auth.users(id),
  ADD COLUMN aprovado_em TIMESTAMPTZ,
  ADD COLUMN justificativa TEXT;
