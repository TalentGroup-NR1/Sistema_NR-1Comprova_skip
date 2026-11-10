
-- Trigger 1: colaboradores (jornada/work_schedule)
CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_colab()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NEW.jornada_diaria_minutos IS DISTINCT FROM OLD.jornada_diaria_minutos
     OR NEW.work_schedule_id IS DISTINCT FROM OLD.work_schedule_id THEN
    FOR r IN
      SELECT data FROM public.ponto_resumo_diario
       WHERE colaborador_id = NEW.id
    LOOP
      PERFORM public.recalcular_resumo_diario(NEW.id, r.data);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_resumo_colab ON public.colaboradores;
CREATE TRIGGER trg_recalc_resumo_colab
AFTER UPDATE ON public.colaboradores
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_resumo_colab();

-- Trigger 2: work_schedules (carga/tolerancia)
CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_ws()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NEW.carga_diaria_minutos IS DISTINCT FROM OLD.carga_diaria_minutos
     OR NEW.tolerancia_minutos IS DISTINCT FROM OLD.tolerancia_minutos
     OR NEW.dias_semana IS DISTINCT FROM OLD.dias_semana
     OR NEW.trabalha_feriados IS DISTINCT FROM OLD.trabalha_feriados THEN
    FOR r IN
      SELECT prd.colaborador_id, prd.data
        FROM public.ponto_resumo_diario prd
        JOIN public.colaboradores c ON c.id = prd.colaborador_id
       WHERE c.work_schedule_id = NEW.id
    LOOP
      PERFORM public.recalcular_resumo_diario(r.colaborador_id, r.data);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_resumo_ws ON public.work_schedules;
CREATE TRIGGER trg_recalc_resumo_ws
AFTER UPDATE ON public.work_schedules
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_resumo_ws();

-- Trigger 3: ponto_configuracoes (jornada/tolerancia/bonus)
CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_cfg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF NEW.jornada_diaria_minutos IS DISTINCT FROM OLD.jornada_diaria_minutos
     OR NEW.tolerancia_minutos IS DISTINCT FROM OLD.tolerancia_minutos
     OR NEW.bonus_fora_escala_ativo IS DISTINCT FROM OLD.bonus_fora_escala_ativo
     OR NEW.bonus_sabado_pct IS DISTINCT FROM OLD.bonus_sabado_pct
     OR NEW.bonus_domingo_pct IS DISTINCT FROM OLD.bonus_domingo_pct
     OR NEW.bonus_feriado_pct IS DISTINCT FROM OLD.bonus_feriado_pct THEN
    FOR r IN
      SELECT prd.colaborador_id, prd.data
        FROM public.ponto_resumo_diario prd
        JOIN public.colaboradores c ON c.id = prd.colaborador_id
       WHERE c.company_id = NEW.company_id
    LOOP
      PERFORM public.recalcular_resumo_diario(r.colaborador_id, r.data);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_resumo_cfg ON public.ponto_configuracoes;
CREATE TRIGGER trg_recalc_resumo_cfg
AFTER UPDATE ON public.ponto_configuracoes
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_resumo_cfg();
