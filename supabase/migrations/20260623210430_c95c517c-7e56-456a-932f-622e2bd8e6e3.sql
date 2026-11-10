
-- 1) TABLE
CREATE TABLE public.nr1_planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  origem text NOT NULL CHECK (origem IN ('automatico', 'manual')),
  ativacao_id uuid REFERENCES public.nr1_proart_ativacoes(id) ON DELETE SET NULL,
  departamento text NOT NULL,
  escala int NOT NULL CHECK (escala BETWEEN 1 AND 4),
  media numeric(4,2) NOT NULL,
  nivel_risco text NOT NULL CHECK (nivel_risco IN ('Vermelho', 'Laranja')),
  titulo text,
  descricao text,
  nivel_intervencao text CHECK (nivel_intervencao IN ('primaria', 'secundaria', 'terciaria')),
  participacao_trabalhadores boolean NOT NULL DEFAULT false,
  responsavel_id uuid,
  prazo date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','planejado','em_andamento','atrasado','concluido')),
  concluido_em timestamptz,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nr1_planos_acao_company ON public.nr1_planos_acao(company_id);
CREATE INDEX idx_nr1_planos_acao_ativacao ON public.nr1_planos_acao(ativacao_id);
CREATE INDEX idx_nr1_planos_acao_status ON public.nr1_planos_acao(company_id, status);

-- Dedup parcial: não permite dois cards abertos para mesmo (ativação, depto, escala)
CREATE UNIQUE INDEX uniq_nr1_planos_acao_aberto
  ON public.nr1_planos_acao(company_id, ativacao_id, departamento, escala)
  WHERE status IN ('pendente','planejado');

-- 2) GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_planos_acao TO authenticated;
GRANT ALL ON public.nr1_planos_acao TO service_role;

-- 3) RLS
ALTER TABLE public.nr1_planos_acao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master gerencia todos os planos NR1"
  ON public.nr1_planos_acao FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin empresa e RH gerenciam planos da empresa"
  ON public.nr1_planos_acao FOR ALL
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
    AND company_id = get_my_company_id()
  );

-- 4) TRIGGER updated_at
CREATE TRIGGER trg_nr1_planos_acao_updated_at
  BEFORE UPDATE ON public.nr1_planos_acao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) RPC: gerar planos automaticamente a partir das respostas da ativação
CREATE OR REPLACE FUNCTION public.gerar_planos_acao_proart(p_ativacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid := auth.uid();
  v_criados int := 0;
  v_ja_existentes int := 0;
  v_data_inicio date;
  v_data_fim date;
  r record;
  v_media numeric;
  v_nivel text;
  v_nome_escala text;
  v_titulo text;
  v_inserted boolean;
BEGIN
  -- Autorização: somente admin_master, admin_empresa, analista_rh
  IF NOT (
    has_role(v_user_id, 'admin_master'::app_role)
    OR has_role(v_user_id, 'admin_empresa'::app_role)
    OR has_role(v_user_id, 'analista_rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT company_id, data_inicio, data_fim
    INTO v_company_id, v_data_inicio, v_data_fim
  FROM public.nr1_proart_ativacoes
  WHERE id = p_ativacao_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Ativação não encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- Admin empresa/RH só na própria empresa
  IF NOT has_role(v_user_id, 'admin_master'::app_role) THEN
    IF v_company_id <> get_my_company_id() THEN
      RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Itera por (departamento, escala) calculando média
  FOR r IN
    SELECT
      departamento,
      AVG(escala_1_media) AS m1,
      AVG(escala_3_media) AS m3,
      AVG(escala_4_media) AS m4
    FROM public.nr1_proart_respostas
    WHERE company_id = v_company_id
      AND departamento IS NOT NULL
      AND submitted_at::date BETWEEN v_data_inicio AND v_data_fim
    GROUP BY departamento
  LOOP
    FOR escala_num IN 1..4 LOOP
      CONTINUE WHEN escala_num = 2;

      v_media := CASE escala_num WHEN 1 THEN r.m1 WHEN 3 THEN r.m3 WHEN 4 THEN r.m4 END;
      CONTINUE WHEN v_media IS NULL;

      -- Classificação:
      -- Escala 1 invertida: <2,30 Vermelho ; 2,30–3,69 Laranja
      -- Escalas 3 e 4: ≥3,70 Vermelho ; 2,30–3,69 Laranja
      v_nivel := NULL;
      IF escala_num = 1 THEN
        IF v_media < 2.30 THEN v_nivel := 'Vermelho';
        ELSIF v_media < 3.70 THEN v_nivel := 'Laranja';
        END IF;
      ELSE
        IF v_media >= 3.70 THEN v_nivel := 'Vermelho';
        ELSIF v_media >= 2.30 THEN v_nivel := 'Laranja';
        END IF;
      END IF;

      CONTINUE WHEN v_nivel IS NULL;

      v_nome_escala := CASE escala_num
        WHEN 1 THEN 'Organização Prescrita do Trabalho'
        WHEN 3 THEN 'Sofrimento Patogênico no Trabalho'
        WHEN 4 THEN 'Danos Relacionados ao Trabalho'
      END;
      v_titulo := '⚠️ ' || r.departamento || ' — ' || v_nome_escala || ' em ' || v_nivel;

      BEGIN
        INSERT INTO public.nr1_planos_acao
          (company_id, origem, ativacao_id, departamento, escala, media, nivel_risco, titulo, status, criado_por)
        VALUES
          (v_company_id, 'automatico', p_ativacao_id, r.departamento, escala_num,
           ROUND(v_media::numeric, 2), v_nivel, v_titulo, 'pendente', v_user_id);
        v_criados := v_criados + 1;
      EXCEPTION WHEN unique_violation THEN
        v_ja_existentes := v_ja_existentes + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('criados', v_criados, 'ja_existentes', v_ja_existentes);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gerar_planos_acao_proart(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_planos_acao_proart(uuid) TO authenticated;
