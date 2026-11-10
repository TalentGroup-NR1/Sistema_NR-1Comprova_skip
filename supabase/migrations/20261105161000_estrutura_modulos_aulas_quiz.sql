-- Migration: estrutura_modulos_aulas_quiz
-- Etapa 9.1 — Estrutura de módulos, aulas, progresso por aula e quiz

BEGIN;

-- ============================================================================
-- 1. TABELA DE MÓDULOS (public.modulos_treinamento)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.modulos_treinamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL
    REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modulos_treinamento_pai
  ON public.modulos_treinamento(treinamento_id, ordem);

ALTER TABLE public.modulos_treinamento ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.modulos_treinamento TO authenticated;
GRANT ALL ON public.modulos_treinamento TO service_role;


-- ============================================================================
-- 2. TABELA DE AULAS (public.aulas_treinamento)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.aulas_treinamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id uuid NOT NULL
    REFERENCES public.modulos_treinamento(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL
    REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN
    ('pdf','video','ppt','arquivo','link','texto')),
  url_conteudo text,
  duracao_minutos integer,
  ordem integer NOT NULL DEFAULT 0,
  obrigatoria boolean NOT NULL DEFAULT true,
  tempo_minimo_segundos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aulas_treinamento_modulo
  ON public.aulas_treinamento(modulo_id, ordem);
CREATE INDEX IF NOT EXISTS idx_aulas_treinamento_pai
  ON public.aulas_treinamento(treinamento_id, ordem);

ALTER TABLE public.aulas_treinamento ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.aulas_treinamento TO authenticated;
GRANT ALL ON public.aulas_treinamento TO service_role;


-- ============================================================================
-- 3. PROGRESSO POR AULA (public.progresso_aulas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.progresso_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aula_id uuid NOT NULL
    REFERENCES public.aulas_treinamento(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL
    REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  company_id uuid NOT NULL
    REFERENCES public.companies(id) ON DELETE CASCADE,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  percentual_assistido numeric(5,2) NOT NULL DEFAULT 0,
  termo_aceito boolean NOT NULL DEFAULT false,
  termo_aceito_em timestamptz,
  termo_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, aula_id)
);

CREATE INDEX IF NOT EXISTS idx_progresso_aulas_user_trein
  ON public.progresso_aulas(user_id, treinamento_id);

ALTER TABLE public.progresso_aulas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.progresso_aulas TO authenticated;
GRANT ALL ON public.progresso_aulas TO service_role;


-- ============================================================================
-- 4. CONFIGURAÇÃO DE QUIZ EM TREINAMENTOS + PERGUNTAS E TENTATIVAS
-- ============================================================================
-- 4.1 Colunas na tabela treinamentos
ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS nota_minima numeric(5,2) NOT NULL DEFAULT 70.00,
  ADD COLUMN IF NOT EXISTS tentativas_maximas integer NOT NULL DEFAULT 3;

-- 4.2 Perguntas do Quiz
CREATE TABLE IF NOT EXISTS public.quiz_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL
    REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  enunciado text NOT NULL,
  alternativas jsonb NOT NULL,
  resposta_correta text NOT NULL,
  explicacao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_quiz_alternativas CHECK
    (jsonb_array_length(alternativas) BETWEEN 2 AND 6)
);

CREATE INDEX IF NOT EXISTS idx_quiz_perguntas_treinamento
  ON public.quiz_perguntas(treinamento_id, ordem);

ALTER TABLE public.quiz_perguntas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.quiz_perguntas TO authenticated;
GRANT ALL ON public.quiz_perguntas TO service_role;

-- 4.3 Tentativas do Quiz
CREATE TABLE IF NOT EXISTS public.quiz_tentativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL
    REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nota numeric(5,2) NOT NULL,
  aprovado boolean NOT NULL,
  respostas jsonb NOT NULL,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_tentativas_user
  ON public.quiz_tentativas(user_id, treinamento_id);

ALTER TABLE public.quiz_tentativas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.quiz_tentativas TO authenticated;
GRANT ALL ON public.quiz_tentativas TO service_role;


-- ============================================================================
-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- 5.1 modulos_treinamento
DROP POLICY IF EXISTS "modulos_treinamento_select_policy" ON public.modulos_treinamento;
CREATE POLICY "modulos_treinamento_select_policy"
ON public.modulos_treinamento FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = modulos_treinamento.treinamento_id
  )
);

DROP POLICY IF EXISTS "modulos_treinamento_write_policy" ON public.modulos_treinamento;
CREATE POLICY "modulos_treinamento_write_policy"
ON public.modulos_treinamento FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = modulos_treinamento.treinamento_id
      AND (
        (t.company_id IS NULL AND public.admin_master_scope(NULL))
        OR (
          t.company_id = public.get_my_company_id()
          AND (
            public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
            OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = modulos_treinamento.treinamento_id
      AND (
        (t.company_id IS NULL AND public.admin_master_scope(NULL))
        OR (
          t.company_id = public.get_my_company_id()
          AND (
            public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
            OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
          )
        )
      )
  )
);

-- 5.2 aulas_treinamento
DROP POLICY IF EXISTS "aulas_treinamento_select_policy" ON public.aulas_treinamento;
CREATE POLICY "aulas_treinamento_select_policy"
ON public.aulas_treinamento FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = aulas_treinamento.treinamento_id
  )
);

DROP POLICY IF EXISTS "aulas_treinamento_write_policy" ON public.aulas_treinamento;
CREATE POLICY "aulas_treinamento_write_policy"
ON public.aulas_treinamento FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = aulas_treinamento.treinamento_id
      AND (
        (t.company_id IS NULL AND public.admin_master_scope(NULL))
        OR (
          t.company_id = public.get_my_company_id()
          AND (
            public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
            OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = aulas_treinamento.treinamento_id
      AND (
        (t.company_id IS NULL AND public.admin_master_scope(NULL))
        OR (
          t.company_id = public.get_my_company_id()
          AND (
            public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
            OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
          )
        )
      )
  )
);

-- 5.3 progresso_aulas
DROP POLICY IF EXISTS "progresso_aulas_select_policy" ON public.progresso_aulas;
CREATE POLICY "progresso_aulas_select_policy"
ON public.progresso_aulas FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    (
      public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
      OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
    )
    AND company_id = public.get_my_company_id()
  )
  OR public.admin_master_scope(company_id)
);

DROP POLICY IF EXISTS "progresso_aulas_insert_policy" ON public.progresso_aulas;
CREATE POLICY "progresso_aulas_insert_policy"
ON public.progresso_aulas FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.get_user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "progresso_aulas_update_policy" ON public.progresso_aulas;
CREATE POLICY "progresso_aulas_update_policy"
ON public.progresso_aulas FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND company_id = public.get_user_company_id(auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  AND company_id = public.get_user_company_id(auth.uid())
);

-- 5.4 quiz_perguntas (gestores/master gerenciam e leem; colaboradores leem via get_quiz_perguntas sem resposta)
DROP POLICY IF EXISTS "quiz_perguntas_manage_policy" ON public.quiz_perguntas;
CREATE POLICY "quiz_perguntas_manage_policy"
ON public.quiz_perguntas FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = quiz_perguntas.treinamento_id
      AND (
        (t.company_id IS NULL AND public.admin_master_scope(NULL))
        OR (
          t.company_id = public.get_my_company_id()
          AND (
            public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
            OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = quiz_perguntas.treinamento_id
      AND (
        (t.company_id IS NULL AND public.admin_master_scope(NULL))
        OR (
          t.company_id = public.get_my_company_id()
          AND (
            public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
            OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
          )
        )
      )
  )
);

-- 5.5 quiz_tentativas
DROP POLICY IF EXISTS "quiz_tentativas_select_policy" ON public.quiz_tentativas;
CREATE POLICY "quiz_tentativas_select_policy"
ON public.quiz_tentativas FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    (
      public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
      OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
    )
    AND company_id = public.get_my_company_id()
  )
  OR public.admin_master_scope(company_id)
);


-- ============================================================================
-- 6. RPCs DE QUIZ (LISTAGEM SEGURA + CORREÇÃO SERVER-SIDE)
-- ============================================================================

-- 6.1 get_quiz_perguntas: nunca retorna resposta_correta
CREATE OR REPLACE FUNCTION public.get_quiz_perguntas(_treinamento_id uuid)
RETURNS TABLE (
  id uuid,
  treinamento_id uuid,
  enunciado text,
  alternativas jsonb,
  ordem integer
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.treinamentos t
    WHERE t.id = _treinamento_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    qp.id,
    qp.treinamento_id,
    qp.enunciado,
    qp.alternativas,
    qp.ordem
  FROM public.quiz_perguntas qp
  WHERE qp.treinamento_id = _treinamento_id
  ORDER BY qp.ordem ASC, qp.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_perguntas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_perguntas(uuid) TO service_role;

-- 6.2 View pública compatível
CREATE OR REPLACE VIEW public.quiz_perguntas_publicas AS
SELECT
  id,
  treinamento_id,
  enunciado,
  alternativas,
  ordem,
  created_at
FROM public.quiz_perguntas;

GRANT SELECT ON public.quiz_perguntas_publicas TO authenticated;
GRANT SELECT ON public.quiz_perguntas_publicas TO service_role;

-- 6.3 RPC de correção server-side
CREATE OR REPLACE FUNCTION public.corrigir_quiz_tentativa(
  _treinamento_id uuid,
  _respostas jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _user_id uuid;
  _company_id uuid;
  _nota_minima numeric(5,2);
  _max_tentativas integer;
  _tentativas_feitas integer;
  _total_perguntas integer;
  _acertos integer := 0;
  _perg record;
  _resp_usuario text;
  _correta boolean;
  _nota numeric(5,2);
  _aprovado boolean;
  _tentativa_id uuid;
  _gabarito jsonb := '[]'::jsonb;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  _company_id := public.get_user_company_id(_user_id);
  IF _company_id IS NULL THEN
    _company_id := public.get_my_company_id();
  END IF;

  IF _company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem vínculo de empresa ativo.';
  END IF;

  -- 1. Obter regras do quiz no treinamento
  SELECT
    COALESCE(nota_minima, 70.00),
    COALESCE(tentativas_maximas, 3)
  INTO _nota_minima, _max_tentativas
  FROM public.treinamentos
  WHERE id = _treinamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treinamento não encontrado.';
  END IF;

  -- 2. Validar limite de tentativas
  SELECT count(*)
  INTO _tentativas_feitas
  FROM public.quiz_tentativas
  WHERE treinamento_id = _treinamento_id
    AND user_id = _user_id;

  IF _tentativas_feitas >= _max_tentativas THEN
    RAISE EXCEPTION 'Limite máximo de tentativas atingido (máximo: %).', _max_tentativas;
  END IF;

  -- 3. Obter total de perguntas
  SELECT count(*)
  INTO _total_perguntas
  FROM public.quiz_perguntas
  WHERE treinamento_id = _treinamento_id;

  IF _total_perguntas = 0 THEN
    RAISE EXCEPTION 'Treinamento não possui perguntas de quiz cadastradas.';
  END IF;

  -- 4. Avaliar cada pergunta no servidor
  FOR _perg IN
    SELECT id, enunciado, alternativas, resposta_correta, explicacao, ordem
    FROM public.quiz_perguntas
    WHERE treinamento_id = _treinamento_id
    ORDER BY ordem ASC, created_at ASC
  LOOP
    -- Suporta formato objeto: { "uuid": "resposta" } ou chave direta
    _resp_usuario := _respostas ->> _perg.id::text;
    
    _correta := (_resp_usuario IS NOT NULL AND trim(_resp_usuario) = trim(_perg.resposta_correta));
    IF _correta THEN
      _acertos := _acertos + 1;
    END IF;

    _gabarito := _gabarito || jsonb_build_object(
      'pergunta_id', _perg.id,
      'enunciado', _perg.enunciado,
      'resposta_usuario', _resp_usuario,
      'resposta_correta', _perg.resposta_correta,
      'correta', _correta,
      'explicacao', _perg.explicacao
    );
  END LOOP;

  _nota := round((100.0 * _acertos / _total_perguntas), 2);
  _aprovado := (_nota >= _nota_minima);

  -- 5. Gravar tentativa oficial
  INSERT INTO public.quiz_tentativas (
    user_id,
    treinamento_id,
    company_id,
    nota,
    aprovado,
    respostas,
    iniciada_em,
    finalizada_em
  ) VALUES (
    _user_id,
    _treinamento_id,
    _company_id,
    _nota,
    _aprovado,
    _respostas,
    now(),
    now()
  ) RETURNING id INTO _tentativa_id;

  -- 6. Retornar resultado com gabarito seguro pós-finalização
  RETURN jsonb_build_object(
    'tentativa_id', _tentativa_id,
    'nota', _nota,
    'nota_minima', _nota_minima,
    'aprovado', _aprovado,
    'acertos', _acertos,
    'total_perguntas', _total_perguntas,
    'tentativas_restantes', GREATEST(0, _max_tentativas - (_tentativas_feitas + 1)),
    'gabarito', _gabarito
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.corrigir_quiz_tentativa(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.corrigir_quiz_tentativa(uuid, jsonb) TO service_role;


-- ============================================================================
-- 7. REGRA DE OURO: FUNÇÃO DE PROGRESSO DO TREINAMENTO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_progresso_treinamento(
  _treinamento_id uuid,
  _user_id uuid
) RETURNS TABLE (
  total_aulas bigint,
  aulas_concluidas bigint,
  percentual numeric,
  quiz_obrigatorio boolean,
  quiz_aprovado boolean,
  pode_certificar boolean
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH ta AS (
    SELECT count(*) AS total FROM public.aulas_treinamento
    WHERE treinamento_id = _treinamento_id
      AND obrigatoria = true
  ), ac AS (
    SELECT count(*) AS feito FROM public.progresso_aulas pa
    JOIN public.aulas_treinamento a ON a.id = pa.aula_id
    WHERE pa.treinamento_id = _treinamento_id
      AND pa.user_id = _user_id
      AND pa.concluida = true
      AND a.obrigatoria = true
  ), cfg AS (
    SELECT COALESCE(quiz_obrigatorio,false) AS qo
    FROM public.treinamentos WHERE id = _treinamento_id
  ), qa AS (
    SELECT COALESCE(bool_or(aprovado),false) AS ok
    FROM public.quiz_tentativas
    WHERE treinamento_id = _treinamento_id AND user_id = _user_id
  )
  SELECT
    ta.total,
    ac.feito,
    CASE WHEN ta.total = 0 THEN 0
         ELSE round(100.0 * ac.feito / ta.total, 2) END,
    cfg.qo,
    qa.ok,
    ( ta.total > 0
      AND ac.feito = ta.total
      AND (cfg.qo = false OR qa.ok = true) )
  FROM ta, ac, cfg, qa;
$$;

GRANT EXECUTE ON FUNCTION public.get_progresso_treinamento(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_progresso_treinamento(uuid, uuid) TO service_role;


-- ============================================================================
-- 8. MIGRAÇÃO DO CURSO PILOTO (NR-1 GERAL)
-- ============================================================================
DO $$
DECLARE
  v_treinamento_id uuid;
  v_modulo_id uuid;
  v_tipo text;
  v_url text;
  v_duracao integer;
  v_descricao text;
BEGIN
  SELECT id, tipo::text, url_conteudo, duracao_estimada_minutos, descricao
  INTO v_treinamento_id, v_tipo, v_url, v_duracao, v_descricao
  FROM public.treinamentos
  WHERE titulo ILIKE '%NR-1 Geral%'
  LIMIT 1;

  IF v_treinamento_id IS NOT NULL THEN
    -- 8.1 Criar módulo 1 se ainda não existir
    SELECT id INTO v_modulo_id
    FROM public.modulos_treinamento
    WHERE treinamento_id = v_treinamento_id
      AND titulo = 'Introdução à NR-1'
    LIMIT 1;

    IF v_modulo_id IS NULL THEN
      INSERT INTO public.modulos_treinamento (
        treinamento_id,
        titulo,
        descricao,
        ordem
      ) VALUES (
        v_treinamento_id,
        'Introdução à NR-1',
        'Visão geral das disposições e requisitos da Norma Regulamentadora nº 1.',
        0
      ) RETURNING id INTO v_modulo_id;
    END IF;

    -- 8.2 Criar aula correspondente se ainda não existir
    IF NOT EXISTS (
      SELECT 1 FROM public.aulas_treinamento
      WHERE modulo_id = v_modulo_id
    ) THEN
      INSERT INTO public.aulas_treinamento (
        modulo_id,
        treinamento_id,
        titulo,
        descricao,
        tipo,
        url_conteudo,
        duracao_minutos,
        ordem,
        obrigatoria,
        tempo_minimo_segundos
      ) VALUES (
        v_modulo_id,
        v_treinamento_id,
        'Conceitos Fundamentais e Disposições Gerais',
        COALESCE(v_descricao, 'Conteúdo oficial sobre diretrizes e disposições da NR-1.'),
        CASE WHEN v_url IS NOT NULL THEN v_tipo ELSE 'texto' END,
        v_url,
        COALESCE(v_duracao, 60),
        0,
        true,
        0
      );
    END IF;
  END IF;
END $$;

COMMIT;
