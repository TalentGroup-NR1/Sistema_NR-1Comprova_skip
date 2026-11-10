CREATE OR REPLACE FUNCTION public.normalizar_tipo_ponto_registro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
BEGIN
  IF NEW.tipo::text = 'INTERVALO_SAIDA' THEN
    NEW.tipo := 'SAIDA'::public.ponto_registro_tipo;
  ELSIF NEW.tipo::text = 'INTERVALO_RETORNO' THEN
    NEW.tipo := 'ENTRADA'::public.ponto_registro_tipo;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.normalizar_tipo_ponto_registro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalizar_tipo_ponto_registro() TO authenticated, service_role;

DROP TRIGGER IF EXISTS a0_normalizar_tipo_ponto_registro ON public.ponto_registros;
CREATE TRIGGER a0_normalizar_tipo_ponto_registro
BEFORE INSERT OR UPDATE OF tipo ON public.ponto_registros
FOR EACH ROW
EXECUTE FUNCTION public.normalizar_tipo_ponto_registro();

CREATE OR REPLACE FUNCTION public.validar_sequencia_ponto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_dia date;
  v_ultimo text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.ajuste_manual IS TRUE THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('ponto:' || NEW.colaborador_id::text));

  v_dia := (NEW.data_hora AT TIME ZONE 'America/Sao_Paulo')::date;

  SELECT tipo::text INTO v_ultimo
  FROM public.ponto_registros
  WHERE colaborador_id = NEW.colaborador_id
    AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = v_dia
    AND data_hora < NEW.data_hora
    AND status_aprovacao <> 'rejeitado'
  ORDER BY data_hora DESC
  LIMIT 1;

  IF v_ultimo IS NULL THEN
    IF NEW.tipo::text <> 'ENTRADA' THEN
      RAISE EXCEPTION 'Sequência inválida: primeira batida do dia deve ser ENTRADA (recebido %)', NEW.tipo
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_ultimo = 'ENTRADA' AND NEW.tipo::text <> 'SAIDA' THEN
    RAISE EXCEPTION 'Sequência inválida: após ENTRADA deve vir SAIDA (recebido %)', NEW.tipo
      USING ERRCODE = 'check_violation';
  ELSIF v_ultimo = 'SAIDA' AND NEW.tipo::text <> 'ENTRADA' THEN
    RAISE EXCEPTION 'Sequência inválida: após SAIDA deve vir ENTRADA (recebido %)', NEW.tipo
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validar_sequencia_ponto() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_sequencia_ponto() TO authenticated, service_role;