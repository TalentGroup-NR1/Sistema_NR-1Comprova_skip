-- Trigger para notificar administradores da empresa sobre novas denúncias, sugestões e dúvidas
-- Preserva estritamente o sigilo: nunca grava corpo (NEW.mensagem), dados pessoais ou identificador do autor.

CREATE OR REPLACE FUNCTION public.trg_notificar_nova_denuncia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_title text;
  v_action_url text;
  v_type text := COALESCE(NEW.tipo, 'denuncia');
BEGIN
  IF v_type = 'denuncia' THEN
    v_title := 'Nova denúncia recebida';
    v_action_url := '/comportamentos-ofensivos';
  ELSIF v_type = 'sugestao' THEN
    v_title := 'Nova sugestão recebida';
    v_action_url := '/denuncias';
  ELSIF v_type = 'duvida' THEN
    v_title := 'Nova dúvida recebida';
    v_action_url := '/denuncias';
  ELSE
    v_title := 'Nova mensagem recebida';
    v_action_url := '/denuncias';
  END IF;

  INSERT INTO public.notifications (
    company_id,
    user_id,
    type,
    title,
    message,
    action_url,
    entity_type,
    entity_id,
    priority,
    is_read
  )
  SELECT
    NEW.company_id,
    ur.user_id,
    v_type,
    v_title,
    NEW.titulo,
    v_action_url,
    v_type,
    NEW.id,
    CASE WHEN v_type = 'denuncia' THEN 'high' ELSE 'normal' END,
    false
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE p.company_id = NEW.company_id
    AND ur.role IN ('admin_empresa', 'analista_rh', 'admin_master');

  RETURN NEW;
END;
$$;

-- Endurecimento de segurança: função invocada exclusivamente via trigger interna
REVOKE EXECUTE ON FUNCTION public.trg_notificar_nova_denuncia() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_denuncias_notificar ON public.denuncias;
CREATE TRIGGER trg_denuncias_notificar
AFTER INSERT ON public.denuncias
FOR EACH ROW
EXECUTE FUNCTION public.trg_notificar_nova_denuncia();
