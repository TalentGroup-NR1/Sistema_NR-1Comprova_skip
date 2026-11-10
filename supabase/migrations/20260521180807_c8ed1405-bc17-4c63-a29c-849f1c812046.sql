
-- 1) Escolhe o período aquisitivo apropriado para uma data de gozo
CREATE OR REPLACE FUNCTION public.pick_periodo_aquisitivo_for_gozo(
  p_colaborador_id uuid,
  p_data_inicio_gozo date
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo_id uuid;
BEGIN
  -- Regra principal: data do gozo cai dentro do período concessivo
  -- [data_fim_aquisitivo, data_limite_gozo]
  SELECT id INTO v_periodo_id
  FROM public.ferias_periodos_aquisitivos
  WHERE colaborador_id = p_colaborador_id
    AND p_data_inicio_gozo >= data_fim_aquisitivo
    AND p_data_inicio_gozo <= data_limite_gozo
  ORDER BY data_fim_aquisitivo DESC
  LIMIT 1;

  IF v_periodo_id IS NOT NULL THEN
    RETURN v_periodo_id;
  END IF;

  -- Fallback: férias antecipadas — data do gozo dentro do próprio
  -- período de aquisição (permite pegar férias antes do fim do aquisitivo).
  SELECT id INTO v_periodo_id
  FROM public.ferias_periodos_aquisitivos
  WHERE colaborador_id = p_colaborador_id
    AND p_data_inicio_gozo >= data_inicio_aquisitivo
    AND p_data_inicio_gozo < data_fim_aquisitivo
  ORDER BY data_inicio_aquisitivo DESC
  LIMIT 1;

  RETURN v_periodo_id; -- pode ser NULL
END;
$$;

-- 2) Trigger BEFORE INSERT/UPDATE que reescreve periodo_aquisitivo_id
CREATE OR REPLACE FUNCTION public.tg_ferias_gozo_auto_periodo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match uuid;
BEGIN
  v_match := public.pick_periodo_aquisitivo_for_gozo(NEW.colaborador_id, NEW.data_inicio_gozo);
  IF v_match IS NOT NULL THEN
    NEW.periodo_aquisitivo_id := v_match;
  END IF;
  -- Se não houver match, mantém o que veio (evita quebrar inserts antes do sync de períodos)
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ferias_gozo_auto_periodo ON public.ferias_gozo;
CREATE TRIGGER trg_ferias_gozo_auto_periodo
BEFORE INSERT OR UPDATE OF data_inicio_gozo, colaborador_id
ON public.ferias_gozo
FOR EACH ROW
EXECUTE FUNCTION public.tg_ferias_gozo_auto_periodo();

-- 3) RPC para corrigir vínculos antigos de um colaborador
DROP FUNCTION IF EXISTS public.recalcular_vinculacao_gozos(uuid);
CREATE OR REPLACE FUNCTION public.recalcular_vinculacao_gozos(p_colaborador_id uuid)
RETURNS TABLE(gozo_id uuid, periodo_antigo uuid, periodo_novo uuid, atualizado boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_company uuid;
  v_colab_company uuid;
BEGIN
  -- Autorização: admin_master, admin_empresa ou analista_rh da mesma empresa do colaborador
  SELECT company_id INTO v_colab_company FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_colab_company IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  IF NOT (
    public.is_admin_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin_empresa'::app_role)
       OR public.has_role(auth.uid(), 'analista_rh'::app_role))
      AND public.get_user_company_id(auth.uid()) = v_colab_company
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para recalcular vínculos deste colaborador';
  END IF;

  RETURN QUERY
  WITH alvo AS (
    SELECT g.id,
           g.periodo_aquisitivo_id AS antigo,
           public.pick_periodo_aquisitivo_for_gozo(g.colaborador_id, g.data_inicio_gozo) AS novo
    FROM public.ferias_gozo g
    WHERE g.colaborador_id = p_colaborador_id
  ),
  upd AS (
    UPDATE public.ferias_gozo g
    SET periodo_aquisitivo_id = a.novo
    FROM alvo a
    WHERE g.id = a.id
      AND a.novo IS NOT NULL
      AND a.novo <> a.antigo
    RETURNING g.id
  )
  SELECT a.id, a.antigo, a.novo,
         (a.novo IS NOT NULL AND a.novo <> a.antigo) AS atualizado
  FROM alvo a;
END;
$$;
