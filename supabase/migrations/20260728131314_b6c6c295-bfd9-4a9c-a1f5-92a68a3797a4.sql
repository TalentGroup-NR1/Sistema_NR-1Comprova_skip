ALTER TABLE public.cuidar_conteudos
  ADD COLUMN IF NOT EXISTS capa_path text,
  ADD COLUMN IF NOT EXISTS conteudo_detalhado text,
  ADD COLUMN IF NOT EXISTS parceiro_nome text,
  ADD COLUMN IF NOT EXISTS parceiro_url text,
  ADD COLUMN IF NOT EXISTS parceiro_cta text,
  ADD COLUMN IF NOT EXISTS permite_download boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duracao_min integer;