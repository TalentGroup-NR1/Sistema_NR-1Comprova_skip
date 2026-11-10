-- 1. Add column to track idempotency
ALTER TABLE public.pulse_acompanhamentos 
ADD COLUMN IF NOT EXISTS escalonado_em TIMESTAMPTZ;

-- 2. Create function to process escalations
CREATE OR REPLACE FUNCTION public.processa_escalonamento_cuidar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_caso RECORD;
  v_admin RECORD;
  v_payload JSONB;
BEGIN
  FOR v_caso IN
    SELECT 
      pa.id as caso_id,
      pa.company_id,
      g.full_name as gestor_nome,
      c.full_name as colaborador_nome,
      COALESCE(pr.resposta, ps.score::text) as resposta_texto,
      EXTRACT(EPOCH FROM (NOW() - COALESCE(pa.proximo_contato_em, pa.created_at + INTERVAL '7 days')))/86400 as dias_atraso
    FROM public.pulse_acompanhamentos pa
    JOIN public.colaboradores c ON c.id = pa.colaborador_id
    JOIN public.colaboradores g ON g.user_id = pa.responsavel_id
    LEFT JOIN public.pulse_responses pr ON pr.id = pa.pulse_response_id
    LEFT JOIN public.pulse_surveys ps ON ps.id = pa.resposta_id
    WHERE pa.escalonado_em IS NULL
      AND pa.status IN ('novo', 'em_andamento')
      AND (
        (pa.proximo_contato_em IS NOT NULL AND pa.proximo_contato_em < NOW() - INTERVAL '7 days')
        OR 
        (pa.proximo_contato_em IS NULL AND pa.status = 'novo' AND pa.created_at < NOW() - INTERVAL '14 days')
      )
  LOOP
    -- Mark as escalated immediately to prevent duplicate sends
    UPDATE public.pulse_acompanhamentos 
    SET escalonado_em = NOW() 
    WHERE id = v_caso.caso_id;

    -- Send to all Admin Masters of that company
    FOR v_admin IN
      SELECT u.email, c.full_name
      FROM public.user_roles ur
      JOIN auth.users u ON u.id = ur.user_id
      JOIN public.colaboradores c ON c.user_id = u.id
      WHERE ur.role = 'admin_master' 
        AND c.company_id = v_caso.company_id
    LOOP
      v_payload := jsonb_build_object(
        'to', v_admin.email,
        'from', 'noreply@nr1comprova.com.br',
        'subject', 'Escalonamento: Omissão do Gestor no Cuidar+',
        'html', format(
          '<p>Olá %s,</p><p>O gestor <b>%s</b> possui um caso de acompanhamento crítico atrasado há <b>%s dias</b>.</p><p><b>Colaborador:</b> %s</p><p><b>Resposta Crítica:</b> %s</p><p>Acesse o painel para verificar.</p>', 
          v_admin.full_name, v_caso.gestor_nome, TRUNC(v_caso.dias_atraso::numeric, 1), v_caso.colaborador_nome, v_caso.resposta_texto
        ),
        'text', format(
          'Olá %s, o gestor %s possui um caso atrasado há %s dias.',
          v_admin.full_name, v_caso.gestor_nome, TRUNC(v_caso.dias_atraso::numeric, 1)
        ),
        'message_id', 'escalation_' || v_caso.caso_id || '_' || EXTRACT(EPOCH FROM NOW()),
        'label', 'cuidar_escalonamento'
      );

      PERFORM public.enqueue_email('transactional_emails', v_payload);
    END LOOP;
  END LOOP;
END;
$$;

-- 3. Schedule the pg_cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Try to unschedule if it exists
    PERFORM cron.unschedule('processa-escalonamento-cuidar');
    -- Run daily at 01:00 AM
    PERFORM cron.schedule('processa-escalonamento-cuidar', '0 1 * * *', 'SELECT public.processa_escalonamento_cuidar()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
