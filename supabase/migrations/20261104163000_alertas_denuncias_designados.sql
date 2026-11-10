-- Migration: Alertas de nova denúncia para os designados (Etapa 6)
-- 1. Colunas de controle de envio de e-mails para idempotência
ALTER TABLE public.denuncias
ADD COLUMN IF NOT EXISTS alerta_email_enviado_em timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS alerta_prazo_enviado_em timestamptz DEFAULT NULL;

-- 2. RPC: contar_denuncias_nao_assumidas
-- Retorna os contadores necessários para o card e para a sidebar
-- Restrito exclusivamente a designados ativos da empresa correspondente (soberania)
-- Para admin_master não designado e usuários comuns, retorna todos os totais como 0.
CREATE OR REPLACE FUNCTION public.contar_denuncias_nao_assumidas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_nao_assumidas int := 0;
  v_vencidas int := 0;
  v_novas_24h int := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'total_nao_assumidas', 0,
      'total_vencidas', 0,
      'total_novas_24h', 0
    );
  END IF;

  -- Verifica se é designado ativo e obtém a empresa
  SELECT dr.company_id INTO v_company
  FROM public.denuncias_responsaveis dr
  WHERE dr.user_id = v_user AND dr.ativo = true
  LIMIT 1;

  IF v_company IS NULL THEN
    RETURN jsonb_build_object(
      'total_nao_assumidas', 0,
      'total_vencidas', 0,
      'total_novas_24h', 0
    );
  END IF;

  -- 1. Total não assumidas (aguardando responsável) e não concluídas
  SELECT count(*) INTO v_nao_assumidas
  FROM public.denuncias
  WHERE company_id = v_company
    AND assumido_por IS NULL
    AND status <> 'concluido';

  -- 2. Total vencidas (prazo de 1ª resposta ou prazo final expirado) e não concluídas
  SELECT count(*) INTO v_vencidas
  FROM public.denuncias
  WHERE company_id = v_company
    AND status <> 'concluido'
    AND (
      (prazo_primeira_resposta < now() AND primeira_resposta_em IS NULL)
      OR (prazo_conclusao < now())
    );

  -- 3. Total recebidas nas últimas 24h e aguardando responsável
  SELECT count(*) INTO v_novas_24h
  FROM public.denuncias
  WHERE company_id = v_company
    AND assumido_por IS NULL
    AND status <> 'concluido'
    AND criado_em >= now() - interval '24 hours';

  RETURN jsonb_build_object(
    'total_nao_assumidas', COALESCE(v_nao_assumidas, 0),
    'total_vencidas', COALESCE(v_vencidas, 0),
    'total_novas_24h', COALESCE(v_novas_24h, 0)
  );
END;
$$;

-- 3. RPC: listar_denuncias_para_alerta
-- Retorna lista MÍNIMA para o card de alerta na dashboard
-- ⚠️ NUNCA retorna titulo, categoria, origem ou mensagem (preservação do sigilo)
CREATE OR REPLACE FUNCTION public.listar_denuncias_para_alerta()
RETURNS TABLE (
  id uuid,
  protocolo text,
  criado_em timestamptz,
  prazo_primeira_resposta timestamptz,
  vencida boolean,
  dias_para_vencer int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  SELECT dr.company_id INTO v_company
  FROM public.denuncias_responsaveis dr
  WHERE dr.user_id = v_user AND dr.ativo = true
  LIMIT 1;

  IF v_company IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.protocolo,
    d.criado_em,
    d.prazo_primeira_resposta,
    (
      (d.prazo_primeira_resposta < now() AND d.primeira_resposta_em IS NULL)
      OR (d.prazo_conclusao < now())
    ) AS vencida,
    GREATEST(0, EXTRACT(DAY FROM (COALESCE(d.prazo_primeira_resposta, now()) - now()))::int) AS dias_para_vencer
  FROM public.denuncias d
  WHERE d.company_id = v_company
    AND d.status <> 'concluido'
    AND (
      d.assumido_por IS NULL
      OR (d.prazo_primeira_resposta < now() AND d.primeira_resposta_em IS NULL)
      OR (d.prazo_conclusao < now())
    )
  ORDER BY
    (
      (d.prazo_primeira_resposta < now() AND d.primeira_resposta_em IS NULL)
      OR (d.prazo_conclusao < now())
    ) DESC,
    d.criado_em ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.contar_denuncias_nao_assumidas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_denuncias_para_alerta() TO authenticated;
