
-- =========================================================
-- 1) Tabela de contadores de rate limit
-- =========================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id        uuid        NOT NULL,
  bucket         text        NOT NULL,
  window_start   timestamptz NOT NULL DEFAULT now(),
  request_count  integer     NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket)
);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem policies para anon/authenticated: acesso somente via SECURITY DEFINER.

-- =========================================================
-- 2) Tabela de auditoria de bloqueios
-- =========================================================
CREATE TABLE IF NOT EXISTS public.security_rate_limit_logs (
  id            uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid,
  bucket        text         NOT NULL,
  max_req       integer      NOT NULL,
  window_secs   integer      NOT NULL,
  request_count integer      NOT NULL,
  occurred_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_rl_logs_user_time
  ON public.security_rate_limit_logs (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_rl_logs_bucket_time
  ON public.security_rate_limit_logs (bucket, occurred_at DESC);

GRANT ALL ON public.security_rate_limit_logs TO service_role;
GRANT SELECT ON public.security_rate_limit_logs TO authenticated;
ALTER TABLE public.security_rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin_master pode ler a auditoria; ninguém escreve direto (escrita via SECURITY DEFINER).
DROP POLICY IF EXISTS "admin_master reads rate limit audit" ON public.security_rate_limit_logs;
CREATE POLICY "admin_master reads rate limit audit"
  ON public.security_rate_limit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_master(auth.uid()));

-- =========================================================
-- 3) Função check_rate_limit
-- =========================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id        uuid,
  p_bucket         text,
  p_max_req        integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row         public.rate_limits%ROWTYPE;
  v_new_count   integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'rate_limit_no_user' USING ERRCODE = '28000';
  END IF;

  -- UPSERT atômico
  INSERT INTO public.rate_limits (user_id, bucket, window_start, request_count, updated_at)
  VALUES (p_user_id, p_bucket, now(), 1, now())
  ON CONFLICT (user_id, bucket) DO UPDATE
    SET
      window_start = CASE
        WHEN now() - public.rate_limits.window_start > make_interval(secs => p_window_seconds)
          THEN now()
        ELSE public.rate_limits.window_start
      END,
      request_count = CASE
        WHEN now() - public.rate_limits.window_start > make_interval(secs => p_window_seconds)
          THEN 1
        ELSE public.rate_limits.window_count_safe(public.rate_limits.request_count) + 1
      END,
      updated_at = now()
  RETURNING * INTO v_row;

  v_new_count := v_row.request_count;

  IF v_new_count > p_max_req THEN
    -- Auditoria: registra o bloqueio (best-effort, sem falhar a transação se der erro)
    BEGIN
      INSERT INTO public.security_rate_limit_logs
        (user_id, bucket, max_req, window_secs, request_count)
      VALUES
        (p_user_id, p_bucket, p_max_req, p_window_seconds, v_new_count);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'rate_limit audit insert failed: %', SQLERRM;
    END;

    RAISE NOTICE 'rate_limit_exceeded: user=% bucket=% count=% max=% window=%s',
      p_user_id, p_bucket, v_new_count, p_max_req, p_window_seconds;

    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = 'P0001',
            HINT    = 'bucket=' || p_bucket || ';max=' || p_max_req || ';window=' || p_window_seconds;
  END IF;

  RETURN true;
END;
$$;

-- A função inline acima usa um helper inexistente; recriamos sem ele.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id        uuid,
  p_bucket         text,
  p_max_req        integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row       public.rate_limits%ROWTYPE;
  v_new_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'rate_limit_no_user' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.rate_limits AS rl (user_id, bucket, window_start, request_count, updated_at)
  VALUES (p_user_id, p_bucket, now(), 1, now())
  ON CONFLICT (user_id, bucket) DO UPDATE
    SET
      window_start = CASE
        WHEN now() - rl.window_start > make_interval(secs => p_window_seconds)
          THEN now()
        ELSE rl.window_start
      END,
      request_count = CASE
        WHEN now() - rl.window_start > make_interval(secs => p_window_seconds)
          THEN 1
        ELSE rl.request_count + 1
      END,
      updated_at = now()
  RETURNING * INTO v_row;

  v_new_count := v_row.request_count;

  IF v_new_count > p_max_req THEN
    BEGIN
      INSERT INTO public.security_rate_limit_logs
        (user_id, bucket, max_req, window_secs, request_count)
      VALUES
        (p_user_id, p_bucket, p_max_req, p_window_seconds, v_new_count);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'rate_limit audit insert failed: %', SQLERRM;
    END;

    RAISE NOTICE 'rate_limit_exceeded: user=% bucket=% count=% max=% window=%s',
      p_user_id, p_bucket, v_new_count, p_max_req, p_window_seconds;

    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = 'P0001',
            HINT    = 'bucket=' || p_bucket || ';max=' || p_max_req || ';window=' || p_window_seconds;
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO authenticated;

-- =========================================================
-- 4) RPC get_colaboradores_seguro
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_colaboradores_seguro(
  p_company_id uuid DEFAULT NULL,
  p_gestor_id  uuid DEFAULT NULL
)
RETURNS SETOF public.colaboradores
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_is_master   boolean;
  v_my_company  uuid;
  v_role        public.app_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Rate limit: 30 req/min por usuário neste bucket
  PERFORM public.check_rate_limit(v_uid, 'colaboradores_list', 30, 60);

  v_is_master  := public.is_admin_master(v_uid);
  v_my_company := public.get_my_company_id();
  v_role       := public.get_my_role();

  -- Validação de escopo (não confiar no parâmetro do frontend)
  IF NOT v_is_master THEN
    IF p_company_id IS NOT NULL AND p_company_id <> v_my_company THEN
      RAISE EXCEPTION 'forbidden_company_scope' USING ERRCODE = '42501';
    END IF;
    -- Força para a empresa do usuário
    p_company_id := v_my_company;
  END IF;

  -- Gestor de departamento: ignora p_gestor_id do client e amarra ao próprio id
  IF v_role = 'gestor_departamento' THEN
    SELECT c.id INTO p_gestor_id
    FROM public.colaboradores c
    WHERE c.company_id = v_my_company
      AND c.email_pessoal = (
        SELECT p.email FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1
      )
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.colaboradores c
  WHERE (p_company_id IS NULL OR c.company_id = p_company_id)
    AND (p_gestor_id  IS NULL OR c.gestor_id  = p_gestor_id)
  ORDER BY c.full_name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_colaboradores_seguro(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_colaboradores_seguro(uuid, uuid) TO authenticated;
