
CREATE OR REPLACE FUNCTION public.notify_avaliacao_criada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_ciclo_nome TEXT;
BEGIN
  SELECT c.user_id, c.company_id INTO v_user_id, v_company_id
  FROM colaboradores c WHERE c.id = NEW.colaborador_id;

  SELECT nome_ciclo INTO v_ciclo_nome
  FROM ciclos_avaliacao WHERE id = NEW.ciclo_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (
      v_company_id,
      v_user_id,
      'avaliacao',
      'Nova Avaliação de Desempenho',
      'O ciclo "' || COALESCE(v_ciclo_nome, 'Avaliação') || '" está disponível para você responder.',
      '/avaliacoes',
      'avaliacao',
      NEW.id,
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_avaliacao_criada
AFTER INSERT ON avaliacoes
FOR EACH ROW
EXECUTE FUNCTION public.notify_avaliacao_criada();
