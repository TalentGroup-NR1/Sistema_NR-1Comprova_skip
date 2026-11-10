
-- Table: comunicado_leituras
CREATE TABLE IF NOT EXISTS comunicado_leituras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  comunicado_id UUID NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, comunicado_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comunicado_leituras_user ON comunicado_leituras(company_id, user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_comunicado_leituras_comunicado ON comunicado_leituras(company_id, comunicado_id);

-- RLS
ALTER TABLE comunicado_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own leituras"
ON comunicado_leituras FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own leituras"
ON comunicado_leituras FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin master can read all leituras"
ON comunicado_leituras FOR SELECT
USING (get_my_role() = 'admin_master');

-- RPC: get_dashboard_comunicados
CREATE OR REPLACE FUNCTION get_dashboard_comunicados(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  titulo TEXT,
  resumo TEXT,
  autor_nome VARCHAR,
  data_publicacao TIMESTAMPTZ,
  is_pinned BOOLEAN,
  is_read BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.company_id,
    c.titulo,
    LEFT(c.conteudo, 160) AS resumo,
    c.autor_nome,
    c.data_publicacao,
    c.is_pinned,
    EXISTS (
      SELECT 1
      FROM comunicado_leituras cl
      WHERE cl.comunicado_id = c.id
        AND cl.user_id = auth.uid()
    ) AS is_read
  FROM comunicados c
  WHERE c.company_id = get_my_company_id()
    AND c.status = 'publicado'
    AND c.data_publicacao <= now()
  ORDER BY
    is_pinned DESC,
    (EXISTS (
      SELECT 1
      FROM comunicado_leituras cl
      WHERE cl.comunicado_id = c.id
        AND cl.user_id = auth.uid()
    )) ASC,
    c.data_publicacao DESC
  LIMIT p_limit;
$$;
