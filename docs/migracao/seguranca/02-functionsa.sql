-- SEÇÃO 2: FUNCTIONS (parte 1/4)
CREATE OR REPLACE FUNCTION public._relatorios_ponto_scope()
 RETURNS TABLE(is_admin boolean, my_colab_id uuid, my_company_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;
  is_admin := has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_empresa') OR has_role(auth.uid(),'analista_rh');
  IF is_admin THEN
    my_colab_id := NULL;
    my_company_id := get_my_company_id();
    RETURN NEXT;
    RETURN;
  END IF;
  IF has_role(auth.uid(),'gestor_departamento') THEN
    SELECT id, company_id INTO my_colab_id, my_company_id FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    is_admin := false;
    RETURN NEXT;
    RETURN;
  END IF;
  RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_master_scope(_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_admin_master(auth.uid())
     AND (
       _company_id IS NULL
       OR EXISTS (
         SELECT 1 FROM public.companies c
         WHERE c.id = _company_id AND c.is_internal = true
       )
     );
$function$
;

CREATE OR REPLACE FUNCTION public.agregar_badges_semana(p_company_id uuid, p_ano integer, p_semana integer)
 RETURNS TABLE(badge_tipo text, badge_label text, total bigint, departamento text, total_por_depto bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT b.badge_tipo, b.badge_label, COALESCE(c.department, 'Sem departamento') AS departamento
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = p_ano
      AND b.semana_iso = p_semana
  )
  SELECT
    badge_tipo,
    badge_label,
    COUNT(*) OVER (PARTITION BY badge_tipo) AS total,
    departamento,
    COUNT(*) OVER (PARTITION BY badge_tipo, departamento) AS total_por_depto
  FROM base
  GROUP BY badge_tipo, badge_label, departamento;
$function$
;

CREATE OR REPLACE FUNCTION public.agregar_recomendacoes_rh(p_company_id uuid, p_ano integer, p_semana integer)
 RETURNS TABLE(departamento text, tipo text, recomendacao text, metric numeric, total_respondentes bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_semana_anterior int;
  v_ano_anterior int;
BEGIN
  -- Semana anterior simples (mesmo ano)
  v_ano_anterior := p_ano;
  v_semana_anterior := p_semana - 1;
  IF v_semana_anterior <= 0 THEN
    v_ano_anterior := p_ano - 1;
    v_semana_anterior := 52;
  END IF;

  RETURN QUERY
  WITH atual AS (
    SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
           AVG(b.score) AS media,
           COUNT(DISTINCT b.user_id) AS respondentes
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = p_ano AND b.semana_iso = p_semana
      AND b.badge_tipo IN ('semana_leve','semana_equilibrada','semana_desafiadora','atencao_bem_estar')
    GROUP BY COALESCE(c.department, 'Sem departamento')
  ),
  anterior AS (
    SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
           AVG(b.score) AS media
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = v_ano_anterior AND b.semana_iso = v_semana_anterior
      AND b.badge_tipo IN ('semana_leve','semana_equilibrada','semana_desafiadora','atencao_bem_estar')
    GROUP BY COALESCE(c.department, 'Sem departamento')
  ),
  alertas AS (
    SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
           COUNT(*) FILTER (WHERE b.badge_tipo IN ('sinal_cansaco','atencao_bem_estar')) AS alta_carga
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = p_ano AND b.semana_iso = p_semana
    GROUP BY COALESCE(c.department, 'Sem departamento')
  )
  SELECT a.departamento,
         'humor_baixo'::text AS tipo,
         'Considere um check-in rápido com o time.'::text AS recomendacao,
         ROUND(a.media::numeric, 2) AS metric,
         a.respondentes
  FROM atual a
  WHERE a.media < 50
  UNION ALL
  SELECT a.departamento,
         'queda_coletiva'::text,
         'Revisar prioridades da semana pode ajudar o time a recuperar energia.'::text,
         ROUND((p.media - a.media)::numeric, 2),
         a.respondentes
  FROM atual a
  JOIN anterior p ON p.departamento = a.departamento
  WHERE (p.media - a.media) > 10
  UNION ALL
  SELECT al.departamento,
         'alta_carga'::text,
         'Avaliar redistribuição de tarefas e prazos.'::text,
         al.alta_carga::numeric,
         (SELECT respondentes FROM atual a2 WHERE a2.departamento = al.departamento)
  FROM alertas al
  WHERE al.alta_carga >= 3;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.aplicar_abono_resumo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dia date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_dia := OLD.data_inicio;
    WHILE v_dia <= OLD.data_fim LOOP
      PERFORM public.reaplicar_abonos_dia(OLD.colaborador_id, v_dia);
      v_dia := v_dia + INTERVAL '1 day';
    END LOOP;
    RETURN OLD;
  END IF;

  -- Em UPDATE, se datas/colaborador mudaram, reprocessa datas antigas também
  IF TG_OP = 'UPDATE' THEN
    v_dia := OLD.data_inicio;
    WHILE v_dia <= OLD.data_fim LOOP
      PERFORM public.reaplicar_abonos_dia(OLD.colaborador_id, v_dia);
      v_dia := v_dia + INTERVAL '1 day';
    END LOOP;
  END IF;

  v_dia := NEW.data_inicio;
  WHILE v_dia <= NEW.data_fim LOOP
    PERFORM public.reaplicar_abonos_dia(NEW.colaborador_id, v_dia);
    v_dia := v_dia + INTERVAL '1 day';
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.aprovar_ferias_gozo(p_gozo_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_my_colab uuid;
  v_gozo RECORD;
BEGIN
  v_role := get_my_role();
  v_my_company := get_my_company_id();
  
  SELECT g.*, c.company_id as col_company_id, c.gestor_id
  INTO v_gozo
  FROM ferias_gozo g
  JOIN colaboradores c ON c.id = g.colaborador_id
  WHERE g.id = p_gozo_id;
  
  IF v_gozo IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  
  -- Authorization
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSIF v_role = 'gestor_departamento' THEN
    SELECT id INTO v_my_colab FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    IF v_gozo.gestor_id IS DISTINCT FROM v_my_colab THEN
      RAISE EXCEPTION 'Sem permissão para aprovar';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissão para aprovar';
  END IF;
  
  IF v_gozo.status <> 'planejado' THEN
    RAISE EXCEPTION 'Apenas solicitações planejadas podem ser aprovadas';
  END IF;
  
  UPDATE ferias_gozo
  SET status = 'aprovado',
      aprovado_por = auth.uid(),
      aprovado_em = now(),
      updated_at = now()
  WHERE id = p_gozo_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assinar_espelho_mensal(p_espelho_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row public.espelhos_ponto_mensais;
  v_uid uuid := auth.uid();
  v_colab_user uuid;
  v_hash text;
  v_payload text;
BEGIN
  SELECT * INTO v_row FROM public.espelhos_ponto_mensais WHERE id = p_espelho_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT user_id INTO v_colab_user FROM public.colaboradores WHERE id = v_row.colaborador_id;
  IF v_colab_user IS NULL OR v_colab_user <> v_uid THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF v_row.status NOT IN ('fechado','reaberto') THEN
    RAISE EXCEPTION 'STATUS_INVALIDO: %', v_row.status;
  END IF;

  v_payload := concat_ws('|',
    v_row.id::text, v_row.colaborador_id::text,
    v_row.periodo_inicio::text, v_row.periodo_fim::text,
    v_row.horas_trabalhadas_minutos, v_row.horas_extras_minutos,
    v_row.horas_abonadas_minutos, v_row.saldo_minutos,
    v_row.versao::text, now()::text
  );
  v_hash := encode(pg_catalog.sha256(convert_to(v_payload, 'UTF8')), 'hex');

  UPDATE public.espelhos_ponto_mensais
     SET status = 'assinado',
         assinatura_hash = v_hash,
         assinatura_por = v_uid,
         assinatura_em = now(),
         updated_at = now()
   WHERE id = p_espelho_id;

  RETURN jsonb_build_object(
    'id', p_espelho_id,
    'status', 'assinado',
    'hash', v_hash,
    'assinado_em', now(),
    'versao', v_row.versao
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assinar_periodo_ponto(p_fechamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_fech RECORD;
  v_owner_user uuid;
  v_full_name text;
  v_contract text;
  v_hash text;
  v_now timestamptz := now();
  v_nova_versao int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_fech FROM public.banco_horas_fechamentos
   WHERE id = p_fechamento_id FOR UPDATE;
  IF v_fech IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: fechamento inexistente' USING ERRCODE = 'P0002';
  END IF;

  SELECT user_id, full_name, contract_type::text
    INTO v_owner_user, v_full_name, v_contract
    FROM public.colaboradores WHERE id = v_fech.colaborador_id;

  IF v_owner_user IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: somente o próprio colaborador pode assinar' USING ERRCODE = '42501';
  END IF;
  IF v_contract NOT IN ('CLT','Estágio','Aprendiz','Temporário') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo % não permite assinatura', v_contract USING ERRCODE = '42501';
  END IF;
  IF v_fech.status NOT IN ('fechado','reaberto') THEN
    RAISE EXCEPTION 'INVALID_STATE: status atual = %', v_fech.status USING ERRCODE = 'P0001';
  END IF;
  IF v_fech.snapshot_jsonb IS NULL THEN
    RAISE EXCEPTION 'NO_SNAPSHOT: snapshot indisponível' USING ERRCODE = 'P0001';
  END IF;

  v_hash := encode(
    extensions.digest(v_fech.snapshot_jsonb::text || v_uid::text || v_now::text, 'sha256'),
    'hex'
  );
  v_nova_versao := COALESCE(v_fech.versao, 1) + 1;

  UPDATE public.banco_horas_fechamentos
     SET status='assinado', assinatura_por=v_uid, assinatura_em=v_now,
         assinatura_hash=v_hash, versao=v_nova_versao,
         pdf_url=NULL, csv_url=NULL, updated_at=now()
   WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (p_fechamento_id, 'assinou', v_uid,
    jsonb_build_object('hash', v_hash, 'assinado_em', v_now,
      'versao_anterior', v_fech.versao, 'versao_nova', v_nova_versao,
      'colaborador', v_full_name));

  RETURN jsonb_build_object('id', p_fechamento_id, 'status', 'assinado',
    'hash', v_hash, 'assinado_em', v_now, 'versao', v_nova_versao);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.atualizar_branding_empresa(_brand_name text DEFAULT NULL::text, _brand_primary_color text DEFAULT NULL::text, _brand_logo_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _company uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh')
          OR public.has_role(auth.uid(), 'admin_master')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  _company := public.get_my_company_id();
  IF _company IS NULL THEN
    RAISE EXCEPTION 'Empresa não identificada';
  END IF;

  IF _brand_primary_color IS NOT NULL AND _brand_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor inválida';
  END IF;

  UPDATE public.companies
  SET brand_name = COALESCE(NULLIF(btrim(_brand_name), ''), brand_name),
      brand_primary_color = COALESCE(_brand_primary_color, brand_primary_color),
      brand_logo_url = COALESCE(NULLIF(btrim(_brand_logo_url), ''), brand_logo_url),
      logo_url = COALESCE(NULLIF(btrim(_brand_logo_url), ''), logo_url),
      updated_at = now()
  WHERE id = _company;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.atualizar_status_denuncia(p_id uuid, p_novo_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
  v_target_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_novo_status NOT IN ('novo','em_analise','concluido') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user
  LIMIT 1;

  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.user_id = v_user
  LIMIT 1;

  SELECT d.company_id INTO v_target_company
  FROM public.denuncias d
  WHERE d.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'denuncia_not_found';
  END IF;

  IF v_role <> 'admin_master' AND v_target_company IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.denuncias
  SET status = p_novo_status
  WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.atualizar_streak_cuidar(p_user_id uuid, p_company_id uuid, p_data_campanha date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_semana_atual int;
  v_ano_atual int;
  v_ultima_semana int;
  v_ultimo_ano int;
  v_streak int := 0;
  v_best int := 0;
  v_consecutiva boolean := false;
  v_ultima_semana_ano_anterior int;
BEGIN
  v_semana_atual := EXTRACT(week FROM p_data_campanha)::int;
  v_ano_atual := EXTRACT(isoyear FROM p_data_campanha)::int;

  SELECT streak_semanal, best_streak, ultima_semana_respondida, ultimo_ano_respondido
    INTO v_streak, v_best, v_ultima_semana, v_ultimo_ano
  FROM public.cuidar_progressao
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.cuidar_progressao(user_id, company_id, streak_semanal, best_streak, ultima_semana_respondida, ultimo_ano_respondido)
    VALUES (p_user_id, p_company_id, 1, 1, v_semana_atual, v_ano_atual);
    RETURN;
  END IF;

  -- Já respondeu nesta mesma semana ISO: noop
  IF v_ultima_semana = v_semana_atual AND v_ultimo_ano = v_ano_atual THEN
    RETURN;
  END IF;

  -- Mesma ano-iso, semana imediatamente anterior
  IF v_ultimo_ano = v_ano_atual AND v_ultima_semana = v_semana_atual - 1 THEN
    v_consecutiva := true;
  END IF;

  -- Virada de ano-iso: semana 1 do ano atual após última semana do ano anterior
  IF NOT v_consecutiva AND v_semana_atual = 1 AND v_ultimo_ano = v_ano_atual - 1 THEN
    v_ultima_semana_ano_anterior := EXTRACT(week FROM make_date(v_ano_atual - 1, 12, 28))::int;
    IF v_ultima_semana = v_ultima_semana_ano_anterior THEN
      v_consecutiva := true;
    END IF;
  END IF;

  IF v_consecutiva THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  IF v_streak > v_best THEN
    v_best := v_streak;
  END IF;

  UPDATE public.cuidar_progressao
     SET streak_semanal = v_streak,
         best_streak = v_best,
         ultima_semana_respondida = v_semana_atual,
         ultimo_ano_respondido = v_ano_atual,
         company_id = COALESCE(p_company_id, company_id)
   WHERE user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.block_ponto_em_abono()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ponto_abonos
    WHERE colaborador_id = NEW.colaborador_id
      AND status = 'ativo'
      AND modalidade = 'dia'
      AND NEW.data_hora::date BETWEEN data_inicio AND data_fim
  ) THEN
    RAISE EXCEPTION 'Não é possível registrar ponto em dia abonado.';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.block_ponto_em_ferias()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ferias_gozo
    WHERE colaborador_id = NEW.colaborador_id
      AND status IN ('aprovado','gozado','planejado')
      AND (NEW.data_hora AT TIME ZONE 'America/Sao_Paulo')::date
          BETWEEN data_inicio_gozo AND data_fim_gozo
  ) THEN
    RAISE EXCEPTION 'Colaborador está de férias nesta data — registro de ponto bloqueado';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.block_ponto_periodo_fechado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colab UUID;
  v_data DATE;
  v_data2 DATE;
  v_override TEXT;
BEGIN
  v_override := current_setting('app.allow_fechado_override', true);
  IF v_override = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'ponto_registros' THEN
    v_colab := COALESCE(NEW.colaborador_id, OLD.colaborador_id);
    v_data := (COALESCE(NEW.data_hora, OLD.data_hora) AT TIME ZONE 'America/Sao_Paulo')::date;
    IF public.is_periodo_fechado(v_colab, v_data) THEN
      RAISE EXCEPTION 'PERIODO_FECHADO: registro em % não permitido (período fechado)', v_data
        USING ERRCODE = 'P0001';
    END IF;

  ELSIF TG_TABLE_NAME = 'ponto_abonos' THEN
    v_colab := COALESCE(NEW.colaborador_id, OLD.colaborador_id);
    v_data := COALESCE(NEW.data_inicio, OLD.data_inicio);
    v_data2 := COALESCE(NEW.data_fim, OLD.data_fim);
    IF EXISTS (
      SELECT 1 FROM generate_series(v_data, v_data2, '1 day'::interval) g(d)
      WHERE public.is_periodo_fechado(v_colab, g.d::date)
    ) THEN
      RAISE EXCEPTION 'PERIODO_FECHADO: abono em período fechado'
        USING ERRCODE = 'P0001';
    END IF;

  ELSIF TG_TABLE_NAME = 'ponto_compensacoes' THEN
    v_data := COALESCE(NEW.data_inicio, OLD.data_inicio);
    v_data2 := COALESCE(NEW.data_fim, OLD.data_fim);
    -- ponto_compensacoes não tem colaborador_id; bloqueio só consultivo via UI
    -- (escopo de empresa). Aqui não bloqueamos por colaborador.
    RETURN COALESCE(NEW, OLD);

  ELSIF TG_TABLE_NAME = 'ponto_resumo_diario' THEN
    v_colab := COALESCE(NEW.colaborador_id, OLD.colaborador_id);
    v_data := COALESCE(NEW.data, OLD.data);
    IF public.is_periodo_fechado(v_colab, v_data) THEN
      RAISE EXCEPTION 'PERIODO_FECHADO: resumo de % está fechado', v_data
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.buscar_campanhas_pendentes(p_user_id uuid)
 RETURNS TABLE(id uuid, company_id uuid, titulo text, descricao text, imagem_url text, data_inicio date, data_fim date, materiais jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT p.user_id, p.company_id
    FROM public.profiles p
    WHERE p.user_id = p_user_id
    LIMIT 1
  )
  SELECT
    ca.id,
    ca.company_id,
    ca.titulo,
    ca.descricao,
    ca.imagem_url,
    ca.data_inicio,
    ca.data_fim,
    ca.materiais
  FROM public.campanhas_comunicados ca
  JOIN me ON ca.company_id = me.company_id
  WHERE ca.exige_leitura = true
    AND CURRENT_DATE BETWEEN ca.data_inicio AND ca.data_fim
    AND NOT EXISTS (
      SELECT 1 FROM public.campanha_leituras cl
      WHERE cl.campanha_id = ca.id
        AND cl.user_id = p_user_id
    )
  ORDER BY ca.data_inicio ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.buscar_comunicados_pendentes(p_user_id uuid)
 RETURNS TABLE(id uuid, company_id uuid, titulo text, conteudo text, autor_nome character varying, data_publicacao timestamp with time zone, image_url text, is_pinned boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT p.user_id, p.company_id,
           c.department AS colab_dept,
           c.job_title  AS colab_cargo
    FROM public.profiles p
    LEFT JOIN public.colaboradores c
      ON c.user_id = p.user_id AND c.status = 'ATIVO'
    WHERE p.user_id = p_user_id
    LIMIT 1
  )
  SELECT
    co.id,
    co.company_id,
    co.titulo,
    co.conteudo,
    co.autor_nome,
    co.data_publicacao,
    co.image_url,
    co.is_pinned
  FROM public.comunicados co
  JOIN me ON co.company_id = me.company_id
  WHERE co.status = 'publicado'
    AND co.exige_leitura = true
    AND co.data_publicacao <= now()
    AND (
      co.publico_alvo_tipo = 'todos'
      OR (co.publico_alvo_tipo = 'departamento' AND co.publico_alvo_valor = me.colab_dept)
      OR (co.publico_alvo_tipo = 'cargo' AND co.publico_alvo_valor = me.colab_cargo)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.comunicado_leituras cl
      WHERE cl.comunicado_id = co.id
        AND cl.user_id = p_user_id
    )
  ORDER BY co.is_pinned DESC, co.data_publicacao ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.calc_horas_mensais_colab(p_colab uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_dias int; v_carga int; v_semanais numeric; v_mensais numeric;
BEGIN
  SELECT array_length(ws.dias_semana,1), ws.carga_diaria_minutos
    INTO v_dias, v_carga
  FROM public.colaboradores c
  JOIN public.work_schedules ws ON ws.id = c.work_schedule_id
  WHERE c.id = p_colab;
  IF v_dias IS NULL OR v_carga IS NULL OR v_carga = 0 THEN
    RETURN 220;
  END IF;
  v_semanais := (v_carga::numeric / 60) * v_dias;
  v_mensais := round(v_semanais * 4.333 / 10) * 10;
  IF v_mensais < 80 THEN v_mensais := 220; END IF;
  RETURN v_mensais;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calc_minutos_noturnos_br(p_inicio timestamp with time zone, p_fim timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_local_a timestamp;
  v_local_b timestamp;
  v_total int := 0;
  v_day date;
  v_day_start timestamp;
  v_seg_a timestamp;
  v_seg_b timestamp;
BEGIN
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim <= p_inicio THEN
    RETURN 0;
  END IF;

  v_local_a := (p_inicio AT TIME ZONE 'America/Sao_Paulo');
  v_local_b := (p_fim    AT TIME ZONE 'America/Sao_Paulo');
  v_day := v_local_a::date;

  WHILE v_day <= v_local_b::date LOOP
    v_day_start := v_day::timestamp;

    -- janela [00:00, 05:00)
    v_seg_a := GREATEST(v_local_a, v_day_start);
    v_seg_b := LEAST(v_local_b, v_day_start + interval '5 hours');
    IF v_seg_b > v_seg_a THEN
      v_total := v_total + (EXTRACT(EPOCH FROM (v_seg_b - v_seg_a))::int / 60);
    END IF;

    -- janela [22:00, 24:00)
    v_seg_a := GREATEST(v_local_a, v_day_start + interval '22 hours');
    v_seg_b := LEAST(v_local_b, v_day_start + interval '24 hours');
    IF v_seg_b > v_seg_a THEN
      v_total := v_total + (EXTRACT(EPOCH FROM (v_seg_b - v_seg_a))::int / 60);
    END IF;

    v_day := v_day + 1;
  END LOOP;

  RETURN v_total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calc_trabalhadores_ghe(p_ghe_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid; v_n integer;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT count(*) INTO v_n FROM public.colaboradores cc
  JOIN public.cargos c ON c.id = cc.cargo_id WHERE c.ghe_id = p_ghe_id;
  RETURN COALESCE(v_n, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calcular_status_campanha(p_data_inicio date, p_data_fim date)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN CURRENT_DATE < p_data_inicio THEN 'agendado'
    WHEN CURRENT_DATE > p_data_fim THEN 'encerrado'
    ELSE 'ativo'
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_bucket text, p_max_req integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.colaborador_has_avaliacao_in_ciclo(_ciclo_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.avaliacoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.ciclo_id = _ciclo_id
      AND c.user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.count_replication_targets(p_source_company_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER 
  FROM companies 
  WHERE id != p_source_company_id AND status = 'active';
$function$
;

CREATE OR REPLACE FUNCTION public.create_feedback_cycles_for_colaborador()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar ciclo 30 dias (sem template pré-atribuído)
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '30_DIAS', 
    NEW.admission_date + INTERVAL '30 days',
    'NAO_INICIADO',
    auth.uid()
  );

  -- Criar ciclo 80 dias
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '80_DIAS', 
    NEW.admission_date + INTERVAL '80 days',
    'NAO_INICIADO',
    auth.uid()
  );

  -- Criar ciclo 120 dias
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '120_DIAS', 
    NEW.admission_date + INTERVAL '120 days',
    'NAO_INICIADO',
    auth.uid()
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.criar_denuncia(p_titulo text, p_mensagem text, p_anonimo boolean, p_tipo text DEFAULT 'denuncia'::text, p_categoria text DEFAULT NULL::text, p_origem text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_id uuid;
  v_anonimo boolean := p_anonimo;
  v_tipo text := COALESCE(p_tipo, 'denuncia');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_tipo NOT IN ('denuncia','sugestao','duvida') THEN
    RAISE EXCEPTION 'tipo_invalido';
  END IF;

  IF v_tipo = 'denuncia' THEN
    v_anonimo := true;
    IF p_categoria IS NULL OR p_origem IS NULL THEN
      RAISE EXCEPTION 'categoria_origem_obrigatorios';
    END IF;
    IF p_categoria NOT IN ('assedio_sexual','ameaca_violencia','violencia_fisica','bullying_assedio_moral') THEN
      RAISE EXCEPTION 'categoria_invalida';
    END IF;
    IF p_origem NOT IN ('lideranca_cliente','lideranca_interna','colegas_pares','subordinados','clientes_terceiros') THEN
      RAISE EXCEPTION 'origem_invalida';
    END IF;
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO public.denuncias (company_id, titulo, mensagem, anonimo, user_id, tipo, categoria_comportamento, origem_ofensa)
  VALUES (
    v_company,
    p_titulo,
    p_mensagem,
    v_anonimo,
    CASE WHEN v_anonimo THEN NULL ELSE v_user END,
    v_tipo,
    CASE WHEN v_tipo = 'denuncia' THEN p_categoria ELSE NULL END,
    CASE WHEN v_tipo = 'denuncia' THEN p_origem ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_collaborator_data(p_collaborator_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_colab public.colaboradores%ROWTYPE;
BEGIN
  SELECT * INTO v_colab FROM public.colaboradores WHERE id = p_collaborator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF NOT public.lgpd_can_manage(v_colab.company_id, true) THEN
    RAISE EXCEPTION 'Apenas o administrador da empresa pode excluir dados LGPD';
  END IF;

  INSERT INTO public.lgpd_audit_logs (action, collaborator_id, collaborator_name, requested_by, company_id, details)
  VALUES ('delete', p_collaborator_id, v_colab.full_name, auth.uid(), v_colab.company_id,
          jsonb_build_object('descricao', format('Exclusão de dados LGPD - Colaborador: %s', v_colab.full_name),
                             'cpf', v_colab.cpf, 'matricula', v_colab.matricula));

  -- netos
  DELETE FROM public.avaliacao_respostas_competencias WHERE avaliacao_id IN (SELECT id FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.avaliacao_respostas_objetivos WHERE avaliacao_id IN (SELECT id FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.avaliacao_links WHERE avaliacao_id IN (SELECT id FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.pdi_checkins WHERE autor_id = p_collaborator_id
     OR pdi_item_id IN (SELECT pi2.id FROM public.pdi_itens pi2 JOIN public.pdis p ON p.id = pi2.pdi_id WHERE p.colaborador_id = p_collaborator_id);
  DELETE FROM public.pdi_itens WHERE pdi_id IN (SELECT id FROM public.pdis WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.feedback_responses WHERE feedback_cycle_id IN (SELECT id FROM public.feedback_cycles WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.questionario_respostas WHERE atribuicao_id IN (SELECT id FROM public.questionario_atribuicoes WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.certificates_audit_logs WHERE certificate_id IN (SELECT id FROM public.certificates WHERE colaborador_id = p_collaborator_id);
  DELETE FROM public.banco_horas_fechamentos_auditoria WHERE fechamento_id IN (SELECT id FROM public.banco_horas_fechamentos WHERE colaborador_id = p_collaborator_id);

  -- filhos diretos
  DELETE FROM public.avaliacoes WHERE colaborador_id = p_collaborator_id;
  UPDATE public.avaliacoes SET gestor_id = NULL WHERE gestor_id = p_collaborator_id;
  DELETE FROM public.pdis WHERE colaborador_id = p_collaborator_id;
  UPDATE public.pdis SET gestor_id = NULL WHERE gestor_id = p_collaborator_id;
  DELETE FROM public.feedback_cycles WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.feedbacks_colaboradores WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.questionario_atribuicoes WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.certificates WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.banco_horas_fechamentos WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.acesso_colaborador_audit WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.analises_perfil WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.colaborador_beneficios WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.dependentes WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.desligamentos_colaborador WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.envios_cuidar_plus WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.espelhos_ponto_mensais WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.evolution_reports WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ferias_gozo WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ferias_periodos_aquisitivos WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ficha_profissional WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.nr1_proart_respostas WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_abonos WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_fechamento_tratativas WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_registros WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.ponto_resumo_diario WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.promocoes_colaborador WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.psico_atribuicoes WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.pulse_responses WHERE employee_id = p_collaborator_id;
  DELETE FROM public.pulse_surveys WHERE employee_id = p_collaborator_id;
  DELETE FROM public.respostas_cuidar_plus WHERE colaborador_id_identificado = p_collaborator_id;
  DELETE FROM public.transferencias_colaborador WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_aula_progresso WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_logs_acesso WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_progresso WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.treinamento_quiz_tentativas WHERE colaborador_id = p_collaborator_id;
  DELETE FROM public.collaborator_consents WHERE collaborator_id = p_collaborator_id;

  -- vínculos por usuário
  IF v_colab.user_id IS NOT NULL THEN
    DELETE FROM public.comunicado_leituras WHERE user_id = v_colab.user_id;
    DELETE FROM public.campanha_leituras WHERE user_id = v_colab.user_id;
    DELETE FROM public.comunicados_visualizacoes WHERE user_id = v_colab.user_id;
    DELETE FROM public.notifications WHERE user_id = v_colab.user_id;
    DELETE FROM public.user_preferences WHERE user_id = v_colab.user_id;
    DELETE FROM public.tasks WHERE user_id = v_colab.user_id;
  END IF;

  -- referências reflexivas
  UPDATE public.colaboradores SET gestor_id = NULL WHERE gestor_id = p_collaborator_id;
  UPDATE public.colaboradores SET substituicao_colaborador_id = NULL WHERE substituicao_colaborador_id = p_collaborator_id;
  UPDATE public.departamentos SET responsavel_id = NULL WHERE responsavel_id = p_collaborator_id;

  DELETE FROM public.colaboradores WHERE id = p_collaborator_id;

  IF v_colab.user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_colab.user_id;
    DELETE FROM public.profiles WHERE user_id = v_colab.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'colaborador', v_colab.full_name);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.editar_batida_ponto(p_batida_id uuid, p_novo_horario timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_colab uuid;
  v_data_old date;
  v_data_new date;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    has_role(v_caller, 'admin_master'::app_role)
    OR has_role(v_caller, 'admin_empresa'::app_role)
    OR has_role(v_caller, 'analista_rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT colaborador_id, (data_hora AT TIME ZONE 'America/Sao_Paulo')::date
    INTO v_colab, v_data_old
  FROM public.ponto_registros
  WHERE id = p_batida_id;

  IF v_colab IS NULL THEN
    RAISE EXCEPTION 'Batida não encontrada';
  END IF;

  UPDATE public.ponto_registros
     SET data_hora = p_novo_horario,
         ajuste_manual = true,
         ajustado_por = v_caller,
         ajuste_motivo = COALESCE(ajuste_motivo, 'Editado pelo admin'),
         status_aprovacao = 'aprovado',
         aprovado_por = v_caller,
         aprovado_em = now(),
         exclusao_pendente = false
   WHERE id = p_batida_id;

  v_data_new := (p_novo_horario AT TIME ZONE 'America/Sao_Paulo')::date;

  IF v_data_old IS DISTINCT FROM v_data_new THEN
    PERFORM public.recalcular_resumo_diario(v_colab, v_data_old);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.email_queue_dispatch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
     AND NOT EXISTS (SELECT 1 FROM pgmq.q_transactional_emails) THEN
    BEGIN
      -- Serialize disarm against email_queue_wake on a shared advisory lock, then
      -- re-read under it: an enqueue racing the unschedule either committed (we
      -- see its row and leave the cron) or waits and re-arms after we commit.
      PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000001);
      IF EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
         OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails) THEN
        RETURN;
      END IF;
      PERFORM cron.unschedule('process-email-queue');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'email_queue_dispatch: cron unschedule failed: %', SQLERRM;
    END;
    RETURN;
  END IF;

  IF (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now() THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://eocoderzvnycieaesjsv.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.email_queue_wake()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Runs inside the enqueue transaction; the outer handler guarantees nothing
  -- below can roll back the customer's email. Shared advisory lock serializes
  -- arming against email_queue_dispatch's disarm.
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000001);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    BEGIN
      PERFORM cron.schedule('process-email-queue', '5 seconds', $cron$ SELECT public.email_queue_dispatch(); $cron$);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'email_queue_wake: cron schedule failed: %', SQLERRM;
    END;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://eocoderzvnycieaesjsv.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Lovable-Context', 'cron',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'email_queue_wake failed (enqueue preserved): %', SQLERRM;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_meus_periodos_aquisitivos()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colab RECORD;
  v_inicio DATE;
  v_fim DATE;
  v_limite DATE;
  v_today DATE := CURRENT_DATE;
  v_status TEXT;
BEGIN
  SELECT id, company_id, admission_date
    INTO v_colab
  FROM public.colaboradores
  WHERE id = public.get_my_colaborador_id()
  LIMIT 1;

  IF v_colab.id IS NULL OR v_colab.admission_date IS NULL THEN
    RETURN;
  END IF;

  v_inicio := v_colab.admission_date;

  LOOP
    v_fim := (v_inicio + INTERVAL '12 months' - INTERVAL '1 day')::date;
    EXIT WHEN v_fim > v_today;

    v_limite := (v_fim + INTERVAL '12 months')::date;
    IF v_limite < v_today THEN
      v_status := 'vencido';
    ELSE
      v_status := 'aberto';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.ferias_periodos_aquisitivos
      WHERE colaborador_id = v_colab.id
        AND data_inicio_aquisitivo = v_inicio
    ) THEN
      INSERT INTO public.ferias_periodos_aquisitivos (
        colaborador_id, company_id, data_inicio_aquisitivo,
        data_fim_aquisitivo, data_limite_gozo, dias_adquiridos, status
      ) VALUES (
        v_colab.id, v_colab.company_id, v_inicio,
        v_fim, v_limite, 30, v_status
      );
    END IF;

    v_inicio := (v_inicio + INTERVAL '12 months')::date;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_periodos_aquisitivos_company(p_company_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_colab RECORD;
  v_inicio DATE;
  v_fim DATE;
  v_limite DATE;
  v_today DATE := CURRENT_DATE;
  v_status TEXT;
  v_is_admin_master BOOLEAN := public.is_admin_master(auth.uid());
  v_user_company UUID := public.get_user_company_id(auth.uid());
  v_target_company UUID;
BEGIN
  IF v_is_admin_master THEN
    v_target_company := p_company_id;
  ELSIF public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh') THEN
    v_target_company := v_user_company;
    IF p_company_id IS NOT NULL AND p_company_id <> v_user_company THEN
      RAISE EXCEPTION 'Sem permissão para outra empresa';
    END IF;
  ELSE
    RETURN;
  END IF;

  FOR v_colab IN
    SELECT id, company_id, admission_date
    FROM public.colaboradores
    WHERE status = 'ATIVO'
      AND admission_date IS NOT NULL
      AND contract_type IN ('CLT', 'Aprendiz', 'Estágio')
      AND (v_target_company IS NULL OR company_id = v_target_company)
  LOOP
    v_inicio := v_colab.admission_date;

    LOOP
      v_fim := (v_inicio + INTERVAL '12 months')::date;
      v_limite := (v_fim + INTERVAL '12 months')::date;

      IF v_fim <= v_today THEN
        IF v_limite < v_today THEN
          v_status := 'vencido';
        ELSE
          v_status := 'aberto';
        END IF;
      ELSE
        v_status := 'aberto';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.ferias_periodos_aquisitivos
        WHERE colaborador_id = v_colab.id
          AND data_inicio_aquisitivo = v_inicio
      ) THEN
        INSERT INTO public.ferias_periodos_aquisitivos (
          colaborador_id, company_id, data_inicio_aquisitivo,
          data_fim_aquisitivo, data_limite_gozo, dias_adquiridos, status
        ) VALUES (
          v_colab.id, v_colab.company_id, v_inicio,
          v_fim, v_limite, 30, v_status
        );
      END IF;

      EXIT WHEN v_fim > v_today;
      v_inicio := v_fim;
    END LOOP;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.estrut_can_read(_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_admin_master(auth.uid()) OR _company_id = public.get_my_company_id();
$function$
;

CREATE OR REPLACE FUNCTION public.excluir_batida_ponto(p_batida_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    has_role(v_caller, 'admin_master'::app_role)
    OR has_role(v_caller, 'admin_empresa'::app_role)
    OR has_role(v_caller, 'analista_rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Trigger trg_ponto_recalc_resumo recalcula o dia automaticamente
  DELETE FROM public.ponto_registros WHERE id = p_batida_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.export_collaborator_data(p_collaborator_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_colab public.colaboradores%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_colab FROM public.colaboradores WHERE id = p_collaborator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF NOT public.lgpd_can_manage(v_colab.company_id, false) THEN
    RAISE EXCEPTION 'Sem permissão para exportar dados deste colaborador';
  END IF;

  v_result := jsonb_build_object(
    'gerado_em', now(),
    'cadastro', to_jsonb(v_colab),
    'dependentes', (SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM public.dependentes d WHERE d.colaborador_id = p_collaborator_id),
    'consentimentos', (SELECT coalesce(jsonb_agg(to_jsonb(cc)), '[]'::jsonb) FROM public.collaborator_consents cc WHERE cc.collaborator_id = p_collaborator_id),
    'feedbacks', (SELECT coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) FROM public.feedbacks_colaboradores f WHERE f.colaborador_id = p_collaborator_id),
    'diarios_de_bordo', (SELECT coalesce(jsonb_agg(to_jsonb(fc)), '[]'::jsonb) FROM public.feedback_cycles fc WHERE fc.colaborador_id = p_collaborator_id),
    'avaliacoes', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM public.avaliacoes a WHERE a.colaborador_id = p_collaborator_id),
    'pdis', (SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) FROM public.pdis p WHERE p.colaborador_id = p_collaborator_id),
    'treinamentos', (SELECT coalesce(jsonb_agg(to_jsonb(tp)), '[]'::jsonb) FROM public.treinamento_progresso tp WHERE tp.colaborador_id = p_collaborator_id),
    'certificados', (SELECT coalesce(jsonb_agg(to_jsonb(ce)), '[]'::jsonb) FROM public.certificates ce WHERE ce.colaborador_id = p_collaborator_id),
    'beneficios', (SELECT coalesce(jsonb_agg(to_jsonb(cb)), '[]'::jsonb) FROM public.colaborador_beneficios cb WHERE cb.colaborador_id = p_collaborator_id),
    'comunicados_lidos', (SELECT coalesce(jsonb_agg(to_jsonb(cl)), '[]'::jsonb) FROM public.comunicado_leituras cl WHERE cl.user_id = v_colab.user_id),
    'campanhas_lidas', (SELECT coalesce(jsonb_agg(to_jsonb(cal)), '[]'::jsonb) FROM public.campanha_leituras cal WHERE cal.user_id = v_colab.user_id),
    'ferias_periodos', (SELECT coalesce(jsonb_agg(to_jsonb(fp)), '[]'::jsonb) FROM public.ferias_periodos_aquisitivos fp WHERE fp.colaborador_id = p_collaborator_id),
    'ferias_gozo', (SELECT coalesce(jsonb_agg(to_jsonb(fg)), '[]'::jsonb) FROM public.ferias_gozo fg WHERE fg.colaborador_id = p_collaborator_id),
    'ponto_registros', (SELECT coalesce(jsonb_agg(to_jsonb(pr)), '[]'::jsonb) FROM public.ponto_registros pr WHERE pr.colaborador_id = p_collaborator_id),
    'ponto_resumo_diario', (SELECT coalesce(jsonb_agg(to_jsonb(prd)), '[]'::jsonb) FROM public.ponto_resumo_diario prd WHERE prd.colaborador_id = p_collaborator_id),
    'ponto_abonos', (SELECT coalesce(jsonb_agg(to_jsonb(pa)), '[]'::jsonb) FROM public.ponto_abonos pa WHERE pa.colaborador_id = p_collaborator_id),
    'promocoes', (SELECT coalesce(jsonb_agg(to_jsonb(pm)), '[]'::jsonb) FROM public.promocoes_colaborador pm WHERE pm.colaborador_id = p_collaborator_id),
    'transferencias', (SELECT coalesce(jsonb_agg(to_jsonb(tr)), '[]'::jsonb) FROM public.transferencias_colaborador tr WHERE tr.colaborador_id = p_collaborator_id),
    'desligamentos', (SELECT coalesce(jsonb_agg(to_jsonb(dc)), '[]'::jsonb) FROM public.desligamentos_colaborador dc WHERE dc.colaborador_id = p_collaborator_id),
    'ficha_profissional', (SELECT coalesce(jsonb_agg(to_jsonb(fpr)), '[]'::jsonb) FROM public.ficha_profissional fpr WHERE fpr.colaborador_id = p_collaborator_id),
    'analises_perfil', (SELECT coalesce(jsonb_agg(to_jsonb(ap)), '[]'::jsonb) FROM public.analises_perfil ap WHERE ap.colaborador_id = p_collaborator_id),
    'questionarios_cargo', (SELECT coalesce(jsonb_agg(to_jsonb(qa)), '[]'::jsonb) FROM public.questionario_atribuicoes qa WHERE qa.colaborador_id = p_collaborator_id),
    'psico_atribuicoes', (SELECT coalesce(jsonb_agg(to_jsonb(pat)), '[]'::jsonb) FROM public.psico_atribuicoes pat WHERE pat.colaborador_id = p_collaborator_id),
    'pulse_respostas', (SELECT coalesce(jsonb_agg(to_jsonb(pres)), '[]'::jsonb) FROM public.pulse_responses pres WHERE pres.employee_id = p_collaborator_id),
    'cuidar_plus_respostas', (SELECT coalesce(jsonb_agg(to_jsonb(rc)), '[]'::jsonb) FROM public.respostas_cuidar_plus rc WHERE rc.colaborador_id_identificado = p_collaborator_id),
    'notificacoes', (SELECT coalesce(jsonb_agg(to_jsonb(nt)), '[]'::jsonb) FROM public.notifications nt WHERE nt.user_id = v_colab.user_id)
  );

  INSERT INTO public.lgpd_audit_logs (action, collaborator_id, collaborator_name, requested_by, company_id, details)
  VALUES ('export', p_collaborator_id, v_colab.full_name, auth.uid(), v_colab.company_id,
          jsonb_build_object('descricao', format('Exportação de dados LGPD - Colaborador: %s', v_colab.full_name)));

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fechar_espelho_mensal(p_company_id uuid, p_ano integer, p_mes integer, p_colaboradores_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inicio date;
  v_fim date;
  v_colab record;
  v_snapshot jsonb;
  v_totals record;
  v_sucesso int := 0;
  v_total int := 0;
  v_erros jsonb := '[]'::jsonb;
  v_uid uuid := auth.uid();
BEGIN
  IF NOT (
    public.has_role(v_uid,'admin_master')
    OR (
      (public.has_role(v_uid,'admin_empresa') OR public.has_role(v_uid,'analista_rh'))
      AND public.get_my_company_id() = p_company_id
    )
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  v_inicio := make_date(p_ano, p_mes, 1);
  v_fim := (v_inicio + interval '1 month - 1 day')::date;

  FOR v_colab IN
    SELECT id, full_name FROM public.colaboradores
    WHERE company_id = p_company_id
      AND status = 'ATIVO'
      AND contract_type IN ('CLT','Estágio','Aprendiz','Temporário')
      AND (p_colaboradores_ids IS NULL OR id = ANY(p_colaboradores_ids))
  LOOP
    v_total := v_total + 1;
    BEGIN
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.data), '[]'::jsonb)
        INTO v_snapshot
      FROM public.ponto_resumo_diario r
      WHERE r.colaborador_id = v_colab.id
        AND r.data BETWEEN v_inicio AND v_fim;

      SELECT
        COALESCE(SUM(horas_trabalhadas_minutos),0) AS trab,
        COALESCE(SUM(horas_extras_minutos),0) AS extras,
        COALESCE(SUM(horas_noturnas_minutos),0) AS noturnas,
        COALESCE(SUM(saldo_minutos),0) AS saldo,
        COUNT(*) FILTER (WHERE horas_trabalhadas_minutos = 0 AND horas_previstas_minutos > 0 AND status::text <> 'ABONADO') AS faltas,
        COUNT(*) FILTER (WHERE status::text = 'ABONADO') AS abonados
        INTO v_totals
      FROM public.ponto_resumo_diario
      WHERE colaborador_id = v_colab.id
        AND data BETWEEN v_inicio AND v_fim;

      INSERT INTO public.espelhos_ponto_mensais (
        company_id, colaborador_id, ano, mes, periodo_inicio, periodo_fim,
        status, horas_trabalhadas_minutos, horas_extras_minutos, horas_noturnas_minutos,
        horas_abonadas_minutos, saldo_minutos, dias_falta, dias_abonados,
        snapshot_jsonb, versao, fechado_por, fechado_em
      ) VALUES (
        p_company_id, v_colab.id, p_ano, p_mes, v_inicio, v_fim,
        'fechado', v_totals.trab, v_totals.extras, v_totals.noturnas,
        0, v_totals.saldo, v_totals.faltas, v_totals.abonados,
        v_snapshot, 1, v_uid, now()
      )
      ON CONFLICT (company_id, colaborador_id, ano, mes) DO UPDATE SET
        status = 'fechado',
        horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
        horas_extras_minutos = EXCLUDED.horas_extras_minutos,
        horas_noturnas_minutos = EXCLUDED.horas_noturnas_minutos,
        horas_abonadas_minutos = EXCLUDED.horas_abonadas_minutos,
        saldo_minutos = EXCLUDED.saldo_minutos,
        dias_falta = EXCLUDED.dias_falta,
        dias_abonados = EXCLUDED.dias_abonados,
        snapshot_jsonb = EXCLUDED.snapshot_jsonb,
        versao = espelhos_ponto_mensais.versao + 1,
        fechado_por = v_uid,
        fechado_em = now(),
        reaberto_por = NULL,
        reaberto_em = NULL,
        motivo_reabertura = NULL,
        assinatura_hash = NULL,
        assinatura_por = NULL,
        assinatura_em = NULL,
        assinatura_ip = NULL,
        pdf_url = NULL,
        updated_at = now();

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('colaborador_id', v_colab.id, 'nome', v_colab.full_name, 'erro', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'sucesso', v_sucesso, 'erros', v_erros,
                            'periodo_inicio', v_inicio, 'periodo_fim', v_fim);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fechar_periodo_ponto(p_company_id uuid, p_periodo_inicio date, p_periodo_fim date, p_colaboradores_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_colab RECORD;
  v_snapshot JSONB;
  v_h_trab INT;
  v_h_extra INT;
  v_h_not INT;
  v_h_aban INT;
  v_dias_falta INT;
  v_dias_aban INT;
  v_saldo INT;
  v_hash TEXT;
  v_fechamento_id UUID;
  v_total INT := 0;
  v_sucesso INT := 0;
  v_erros JSONB := '[]'::JSONB;
  v_uid UUID := auth.uid();
  v_tratativa RECORD;
  v_pendentes JSONB := '[]'::JSONB;
  v_data_ajuste DATE;
BEGIN
  PERFORM public.require_admin_role();

  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;
  IF p_periodo_inicio > p_periodo_fim THEN
    RAISE EXCEPTION 'Período inválido';
  END IF;

  FOR v_colab IN
    SELECT s.colaborador_id, s.full_name, s.saldo_minutos
    FROM public.get_saldos_para_fechamento(p_company_id, p_periodo_inicio, p_periodo_fim) s
    WHERE s.saldo_minutos <> 0
      AND s.tratativa_id IS NULL
      AND (p_colaboradores_ids IS NULL OR s.colaborador_id = ANY(p_colaboradores_ids))
  LOOP
    v_pendentes := v_pendentes || jsonb_build_object(
      'colaborador_id', v_colab.colaborador_id,
      'full_name', v_colab.full_name,
      'saldo_minutos', v_colab.saldo_minutos
    );
  END LOOP;

  IF jsonb_array_length(v_pendentes) > 0 THEN
    RAISE EXCEPTION 'TRATATIVAS_PENDENTES: % colaborador(es) com saldo sem tratativa', jsonb_array_length(v_pendentes)
      USING DETAIL = v_pendentes::text;
  END IF;

  v_data_ajuste := p_periodo_fim + 1;

  FOR v_colab IN
    SELECT c.id, c.full_name, c.admission_date
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND c.status = 'ATIVO'
      AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
      AND (p_colaboradores_ids IS NULL OR c.id = ANY(p_colaboradores_ids))
  LOOP
    v_total := v_total + 1;
    BEGIN
      SELECT
        COALESCE(jsonb_agg(
          jsonb_build_object(
            'data', r.data,
            'horas_previstas_minutos', r.horas_previstas_minutos,
            'horas_trabalhadas_minutos', r.horas_trabalhadas_minutos,
            'horas_intervalo_minutos', r.horas_intervalo_minutos,
            'horas_noturnas_minutos', r.horas_noturnas_minutos,
            'horas_extras_minutos', r.horas_extras_minutos,
            'saldo_minutos', r.saldo_minutos,
            'status', r.status
          ) ORDER BY r.data
        ), '[]'::JSONB),
        COALESCE(SUM(r.horas_trabalhadas_minutos), 0),
        COALESCE(SUM(r.horas_extras_minutos), 0),
        COALESCE(SUM(r.horas_noturnas_minutos), 0),
        COALESCE(SUM(CASE WHEN r.status = 'ABONADO' THEN r.horas_previstas_minutos ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.status = 'FALTA' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN r.status = 'ABONADO' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(r.saldo_minutos), 0)
      INTO v_snapshot, v_h_trab, v_h_extra, v_h_not, v_h_aban, v_dias_falta, v_dias_aban, v_saldo
      FROM public.ponto_resumo_diario r
      WHERE r.colaborador_id = v_colab.id
        AND r.data BETWEEN p_periodo_inicio AND p_periodo_fim
        AND (v_colab.admission_date IS NULL OR r.data >= v_colab.admission_date);

      SELECT acao, observacao INTO v_tratativa
      FROM public.ponto_fechamento_tratativas
      WHERE company_id = p_company_id
        AND colaborador_id = v_colab.id
        AND periodo_inicio = p_periodo_inicio
        AND periodo_fim = p_periodo_fim;

      v_hash := encode(extensions.digest(
        v_snapshot::text || v_colab.id::text || p_periodo_inicio::text || p_periodo_fim::text
          || COALESCE(v_tratativa.acao::text,'sem_saldo'),
        'sha256'), 'hex');

      INSERT INTO public.banco_horas_fechamentos (
        company_id, colaborador_id, periodo_inicio, periodo_fim,
        snapshot_jsonb, horas_trabalhadas_minutos, horas_extras_minutos,
        horas_noturnas_minutos, horas_abonadas_minutos, dias_falta, dias_abonados,
        saldo_minutos, hash_assinatura, status, fechado_por, fechado_em, versao,
        tratativa_acao, tratativa_observacao
      ) VALUES (
        p_company_id, v_colab.id, p_periodo_inicio, p_periodo_fim,
        v_snapshot, v_h_trab, v_h_extra, v_h_not, v_h_aban, v_dias_falta, v_dias_aban,
        v_saldo, v_hash, 'fechado', v_uid, now(), 1,
        v_tratativa.acao, v_tratativa.observacao
      )
      ON CONFLICT (company_id, colaborador_id, periodo_inicio, periodo_fim)
      DO UPDATE SET
        snapshot_jsonb = EXCLUDED.snapshot_jsonb,
        horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
        horas_extras_minutos = EXCLUDED.horas_extras_minutos,
        horas_noturnas_minutos = EXCLUDED.horas_noturnas_minutos,
        horas_abonadas_minutos = EXCLUDED.horas_abonadas_minutos,
        dias_falta = EXCLUDED.dias_falta,
        dias_abonados = EXCLUDED.dias_abonados,
        saldo_minutos = EXCLUDED.saldo_minutos,
        hash_assinatura = EXCLUDED.hash_assinatura,
        status = 'fechado',
        fechado_por = v_uid,
        fechado_em = now(),
        versao = COALESCE(public.banco_horas_fechamentos.versao, 1) + 1,
        csv_url = NULL,
        pdf_url = NULL,
        tratativa_acao = EXCLUDED.tratativa_acao,
        tratativa_observacao = EXCLUDED.tratativa_observacao,
        updated_at = now()
      RETURNING id INTO v_fechamento_id;

      IF v_tratativa.acao = 'transferir' AND v_saldo <> 0 THEN
        INSERT INTO public.ponto_resumo_diario (
          colaborador_id, company_id, data,
          horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
          horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
        ) VALUES (
          v_colab.id, p_company_id, v_data_ajuste,
          0, 0, 0, 0, 0, v_saldo, 'AJUSTE'::ponto_resumo_status
        )
        ON CONFLICT (colaborador_id, data) DO UPDATE SET
          saldo_minutos = EXCLUDED.saldo_minutos,
          status = 'AJUSTE'::ponto_resumo_status,
          updated_at = now();

        UPDATE public.ponto_fechamento_tratativas
        SET ajuste_resumo_data = v_data_ajuste
        WHERE company_id = p_company_id
          AND colaborador_id = v_colab.id
          AND periodo_inicio = p_periodo_inicio
          AND periodo_fim = p_periodo_fim;
      END IF;

      INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
      VALUES (v_fechamento_id, 'fechou', v_uid,
        jsonb_build_object('hash', v_hash, 'tratativa', v_tratativa.acao));

      v_sucesso := v_sucesso + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('colaborador', v_colab.full_name, 'erro', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'sucesso', v_sucesso, 'erros', v_erros);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gerar_alertas_coletivos_cuidar(p_company_id uuid, p_ano integer, p_semana integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_silencio_user RECORD;
  v_ano_anterior INT;
  v_semana_anterior INT;
BEGIN
  v_ano_anterior := p_ano;
  v_semana_anterior := p_semana - 1;
  IF v_semana_anterior < 1 THEN
    v_ano_anterior := p_ano - 1;
    v_semana_anterior := 52;
  END IF;

  FOR r IN
    WITH atual AS (
      SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
             AVG(b.score) AS media,
             COUNT(DISTINCT b.user_id) AS respondentes,
             SUM(CASE WHEN b.badge_tipo IN ('semana_desafiadora','atencao_bem_estar') THEN 1 ELSE 0 END) AS alta_carga
      FROM public.cuidar_badges b
      LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
      WHERE b.company_id = p_company_id
        AND b.ano = p_ano AND b.semana_iso = p_semana
      GROUP BY COALESCE(c.department, 'Sem departamento')
    ),
    anterior AS (
      SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
             AVG(b.score) AS media
      FROM public.cuidar_badges b
      LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
      WHERE b.company_id = p_company_id
        AND b.ano = v_ano_anterior AND b.semana_iso = v_semana_anterior
        AND b.badge_tipo IN ('semana_leve','semana_equilibrada','semana_desafiadora','atencao_bem_estar')
      GROUP BY COALESCE(c.department, 'Sem departamento')
    )
    SELECT a.departamento,
           a.media AS media_atual,
           a.respondentes,
           a.alta_carga,
           p.media AS media_anterior
    FROM atual a
    LEFT JOIN anterior p ON p.departamento = a.departamento
  LOOP
    IF r.media_atual < 50 AND r.respondentes >= 3 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'moderado', 'coletivo',
        'humor_baixo_time', 'Queda de humor no time — revisar carga e prioridades.')
      ON CONFLICT DO NOTHING;
    END IF;

    IF r.media_anterior IS NOT NULL AND (r.media_anterior - r.media_atual) > 15 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'alto', 'coletivo',
        'queda_coletiva', 'Alerta coletivo — risco de sobrecarga na equipe.')
      ON CONFLICT DO NOTHING;
    END IF;

    IF r.alta_carga >= 3 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'alto', 'coletivo',
        'alta_carga_time', 'Sinal de burnout — intervir em redistribuição imediata.')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  FOR v_silencio_user IN
    SELECT c.user_id, COALESCE(c.department, 'Sem departamento') AS departamento
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND c.status = 'ATIVO'
      AND c.user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.pulse_responses pr
        JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
        WHERE pr.employee_id = c.id
          AND pc.origem = 'auto_semanal'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.pulse_responses pr
        JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
        WHERE pr.employee_id = c.id
          AND pc.origem = 'auto_semanal'
          AND pc.data_inicio >= (CURRENT_DATE - INTERVAL '14 days')
      )
  LOOP
    INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
    VALUES (v_silencio_user.user_id, p_company_id, v_silencio_user.departamento, p_ano, p_semana,
      'moderado', 'individual', 'silencio', 'Ausência de respostas — possível desengajamento.')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gerar_alertas_individuais_cuidar(p_user_id uuid, p_company_id uuid, p_campanha_id uuid, p_score_atual numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ano int;
  v_semana int;
  v_depto text;
  v_score_anterior numeric;
  v_delta numeric;
  v_count_baixos int;
BEGIN
  IF p_score_atual IS NULL THEN RETURN; END IF;

  SELECT ano, semana_iso INTO v_ano, v_semana
  FROM public.pulse_campaigns WHERE id = p_campanha_id;

  SELECT COALESCE(department, 'Sem departamento') INTO v_depto
  FROM public.colaboradores WHERE user_id = p_user_id LIMIT 1;

  -- score_critico: score < 30 → alto
  IF p_score_atual < 30 THEN
    INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
    VALUES (p_user_id, p_company_id, v_depto, v_ano, v_semana, 'alto', 'individual',
      'score_critico', 'Baixo bem-estar detectado — recomendado check-in individual.')
    ON CONFLICT DO NOTHING;
  END IF;

  -- queda_individual: delta < -20 vs última campanha auto
  SELECT ROUND(AVG(pr.score_numeric)::numeric, 2) INTO v_score_anterior
  FROM public.pulse_responses pr
  JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE c.user_id = p_user_id
    AND pc.origem IN ('auto_semanal','auto_mensal')
    AND pc.id <> p_campanha_id
    AND pr.score_numeric IS NOT NULL
    AND pr.created_at = (
      SELECT MAX(pr2.created_at)
      FROM public.pulse_responses pr2
      JOIN public.pulse_campaigns pc2 ON pc2.id = pr2.campaign_id
      JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
      WHERE c2.user_id = p_user_id
        AND pc2.origem IN ('auto_semanal','auto_mensal')
        AND pc2.id <> p_campanha_id
        AND pr2.score_numeric IS NOT NULL
    );

  IF v_score_anterior IS NOT NULL THEN
    v_delta := p_score_atual - v_score_anterior;
    IF v_delta < -20 THEN
      INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_user_id, p_company_id, v_depto, v_ano, v_semana, 'moderado', 'individual',
        'queda_individual', 'Variação significativa no humor — avaliar condições da semana.')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- padrao_recorrente: últimas 3 campanhas auto do user com score < 50
  SELECT COUNT(*) INTO v_count_baixos
  FROM (
    SELECT AVG(pr.score_numeric) AS media
    FROM public.pulse_responses pr
    JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
    JOIN public.colaboradores c ON c.id = pr.employee_id
    WHERE c.user_id = p_user_id
      AND pc.origem IN ('auto_semanal','auto_mensal')
      AND pr.score_numeric IS NOT NULL
    GROUP BY pr.campaign_id, pc.data_inicio
    ORDER BY pc.data_inicio DESC
    LIMIT 3
  ) ult
  WHERE ult.media < 50;

  IF v_count_baixos >= 3 THEN
    INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
    VALUES (p_user_id, p_company_id, v_depto, v_ano, v_semana, 'alto', 'individual',
      'padrao_recorrente', 'Padrão crítico recorrente — ação preventiva necessária.')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gerar_badges_cuidar(p_user_id uuid, p_company_id uuid, p_campanha_id uuid, p_score_atual numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ano int;
  v_semana int;
  v_score_anterior numeric;
  v_delta numeric;
  v_streak int := 0;
BEGIN
  IF p_score_atual IS NULL THEN
    RETURN;
  END IF;

  SELECT ano, semana_iso INTO v_ano, v_semana
  FROM public.pulse_campaigns WHERE id = p_campanha_id;

  -- Score da última campanha automática anterior do mesmo user (média de scores numéricos)
  SELECT ROUND(AVG(pr.score_numeric)::numeric, 2)
    INTO v_score_anterior
  FROM public.pulse_responses pr
  JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE c.user_id = p_user_id
    AND pc.origem IN ('auto_semanal','auto_mensal')
    AND pc.id <> p_campanha_id
    AND pr.score_numeric IS NOT NULL
    AND pr.created_at = (
      SELECT MAX(pr2.created_at)
      FROM public.pulse_responses pr2
      JOIN public.pulse_campaigns pc2 ON pc2.id = pr2.campaign_id
      JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
      WHERE c2.user_id = p_user_id
        AND pc2.origem IN ('auto_semanal','auto_mensal')
        AND pc2.id <> p_campanha_id
        AND pr2.score_numeric IS NOT NULL
    );

  SELECT COALESCE(streak_semanal, 0) INTO v_streak
  FROM public.cuidar_progressao WHERE user_id = p_user_id;

  -- Faixa de score
  IF p_score_atual >= 80 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'semana_leve', 'Semana Leve',
            'Você teve uma semana tranquila e equilibrada.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 60 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'semana_equilibrada', 'Semana Equilibrada',
            'Semana estável, com altos e baixos normais.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 40 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'semana_desafiadora', 'Semana Desafiadora',
            'Semana mais pesada — atenção ao autocuidado.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'atencao_bem_estar', 'Atenção ao Bem-Estar',
            'Sinal de alerta. Que tal pedir apoio?', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Evolução
  IF v_score_anterior IS NOT NULL THEN
    v_delta := p_score_atual - v_score_anterior;
    IF v_delta > 15 THEN
      INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'resiliencia', 'Resiliência',
              'Sua semana melhorou consideravelmente!', p_score_atual, v_ano, v_semana)
      ON CONFLICT DO NOTHING;
    ELSIF v_delta < -15 THEN
      INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'sinal_cansaco', 'Sinal de Cansaço',
              'Queda significativa em relação à semana anterior.', p_score_atual, v_ano, v_semana)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Consistência
  IF v_streak >= 4 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'constancia', 'Constância',
            '4 semanas respondendo. Que disciplina!', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_streak >= 12 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'ciclo_bem_estar', 'Ciclo de Bem-Estar',
            '12 semanas seguidas. Ciclo completo.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gerar_campanhas_cuidar_ano(p_company_id uuid, p_ano integer)
 RETURNS TABLE(criadas_semanal integer, criadas_mensal integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_sexta DATE;
  v_data_inicio DATE;
  v_data_fim DATE;
  v_semana INT;
  v_mes INT;
  v_ultima_sexta_do_mes BOOLEAN;
  v_perguntas_pulso JSONB;
  v_perguntas_completo JSONB;
  v_campaign_id UUID;
  v_pergunta JSONB;
  v_count_sem INT := 0;
  v_count_men INT := 0;
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: somente admin master ou admin empresa pode gerar campanhas';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: empresa fora do escopo';
  END IF;

  SELECT perguntas_json INTO v_perguntas_pulso
    FROM public.cuidar_templates_fixos WHERE template_key = 'pulso_rapido';
  SELECT perguntas_json INTO v_perguntas_completo
    FROM public.cuidar_templates_fixos WHERE template_key = 'completo';

  -- Primeira sexta-feira do ano como âncora de encerramento da semana
  v_sexta := make_date(p_ano, 1, 1);
  WHILE EXTRACT(ISODOW FROM v_sexta) <> 5 LOOP
    v_sexta := v_sexta + INTERVAL '1 day';
  END LOOP;

  WHILE EXTRACT(YEAR FROM v_sexta) = p_ano LOOP
    v_semana := EXTRACT(WEEK FROM v_sexta)::INT;
    v_mes := EXTRACT(MONTH FROM v_sexta)::INT;
    v_data_inicio := v_sexta - INTERVAL '4 days'; -- segunda
    v_data_fim := v_sexta;                        -- sexta
    v_ultima_sexta_do_mes := EXTRACT(MONTH FROM (v_sexta + INTERVAL '7 days')) <> v_mes;

    IF v_ultima_sexta_do_mes THEN
      -- Última semana do mês: somente Cuidar+ Mensal Completo
      BEGIN
        INSERT INTO public.pulse_campaigns(
          company_id, titulo, descricao, ativo, data_inicio, data_fim,
          tipo, origem, template_key, semana_iso, mes, ano
        ) VALUES (
          p_company_id,
          'Cuidar+ Mensal ' || to_char(v_sexta, 'MM/YYYY'),
          'Pesquisa mensal completa do Cuidar+',
          false,
          v_data_inicio, v_data_fim,
          'completo', 'auto_mensal', 'completo', v_semana, v_mes, p_ano
        ) RETURNING id INTO v_campaign_id;

        FOR v_pergunta IN SELECT * FROM jsonb_array_elements(v_perguntas_completo) LOOP
          INSERT INTO public.pulse_questions(campaign_id, pergunta, tipo, ordem, obrigatoria)
          VALUES (
            v_campaign_id,
            v_pergunta->>'pergunta',
            COALESCE((v_pergunta->>'tipo')::pulse_question_type, 'escala_0_5'::pulse_question_type),
            COALESCE((v_pergunta->>'ordem')::INT, 1),
            COALESCE((v_pergunta->>'obrigatoria')::BOOLEAN, true)
          );
        END LOOP;

        v_count_men := v_count_men + 1;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    ELSE
      -- Demais semanas: Pulso semanal
      BEGIN
        INSERT INTO public.pulse_campaigns(
          company_id, titulo, descricao, ativo, data_inicio, data_fim,
          tipo, origem, template_key, semana_iso, mes, ano
        ) VALUES (
          p_company_id,
          'Pulso da Semana ' || v_semana,
          'Pergunta semanal automática do Cuidar+',
          false,
          v_data_inicio, v_data_fim,
          'pulso', 'auto_semanal', 'pulso_rapido', v_semana, v_mes, p_ano
        ) RETURNING id INTO v_campaign_id;

        FOR v_pergunta IN SELECT * FROM jsonb_array_elements(v_perguntas_pulso) LOOP
          INSERT INTO public.pulse_questions(campaign_id, pergunta, tipo, ordem, obrigatoria)
          VALUES (
            v_campaign_id,
            v_pergunta->>'pergunta',
            COALESCE((v_pergunta->>'tipo')::pulse_question_type, 'escala_0_5'::pulse_question_type),
            COALESCE((v_pergunta->>'ordem')::INT, 1),
            COALESCE((v_pergunta->>'obrigatoria')::BOOLEAN, true)
          );
        END LOOP;

        v_count_sem := v_count_sem + 1;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;

    v_sexta := v_sexta + INTERVAL '7 days';
  END LOOP;

  RETURN QUERY SELECT v_count_sem, v_count_men;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gerar_planos_acao_proart(p_ativacao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.gerar_recomendacoes_cuidar(p_user_id uuid, p_company_id uuid, p_campanha_id uuid, p_score_atual numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ano int;
  v_semana int;
  v_score_anterior numeric;
  v_delta numeric;
  v_streak int := 0;
  v_depto text;
BEGIN
  IF p_score_atual IS NULL THEN RETURN; END IF;

  SELECT ano, semana_iso INTO v_ano, v_semana
  FROM public.pulse_campaigns WHERE id = p_campanha_id;

  SELECT COALESCE(department, 'Sem departamento') INTO v_depto
  FROM public.colaboradores WHERE user_id = p_user_id LIMIT 1;

  -- Score da última campanha automática anterior
  SELECT ROUND(AVG(pr.score_numeric)::numeric, 2)
    INTO v_score_anterior
  FROM public.pulse_responses pr
  JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE c.user_id = p_user_id
    AND pc.origem IN ('auto_semanal','auto_mensal')
    AND pc.id <> p_campanha_id
    AND pr.score_numeric IS NOT NULL
    AND pr.created_at = (
      SELECT MAX(pr2.created_at)
      FROM public.pulse_responses pr2
      JOIN public.pulse_campaigns pc2 ON pc2.id = pr2.campaign_id
      JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
      WHERE c2.user_id = p_user_id
        AND pc2.origem IN ('auto_semanal','auto_mensal')
        AND pc2.id <> p_campanha_id
        AND pr2.score_numeric IS NOT NULL
    );

  SELECT COALESCE(streak_semanal, 0) INTO v_streak
  FROM public.cuidar_progressao WHERE user_id = p_user_id;

  -- Recomendações por faixa de score (badge)
  IF p_score_atual >= 80 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Mantenha o que deu certo. Repita um hábito que funcionou esta semana.',
      'leve', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 60 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Continue ajustando pequenos pontos. Pergunte-se: o que posso simplificar?',
      'equilibrada', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 40 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Identifique um fator que drenou energia e reduza sua exposição a ele.',
      'desafiadora', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Considere ajustar a carga e conversar com seu líder se o padrão continuar.',
      'alerta', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Recomendações por tendência
  IF v_score_anterior IS NOT NULL THEN
    v_delta := p_score_atual - v_score_anterior;
    IF v_delta > 15 THEN
      INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
        'Anote o que funcionou essa semana — isso ajudará a manter o ritmo.',
        'tendencia_positiva', p_score_atual, v_ano, v_semana, v_depto)
      ON CONFLICT DO NOTHING;
    ELSIF v_delta < -15 THEN
      INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
        'Pausa programada: tire 15 minutos amanhã para recuperar foco.',
        'cansaco', p_score_atual, v_ano, v_semana, v_depto)
      ON CONFLICT DO NOTHING;
      INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
        'Perceba o gatilho da queda. O que mais impactou sua energia?',
        'tendencia_negativa', p_score_atual, v_ano, v_semana, v_depto)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Recomendações por streak
  IF v_streak >= 4 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Sua constância está ajudando a entender seu bem-estar.',
      'constancia', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_streak >= 12 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Fechando um ciclo de consciência. Excelente consistência.',
      'ciclo', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_pulse_campaign(p_company_id uuid)
 RETURNS TABLE(campaign_id uuid, titulo character varying, descricao text, data_inicio date, data_fim date, has_responded boolean, questions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colaborador_id UUID;
BEGIN
  -- Buscar colaborador do usuário atual
  SELECT id INTO v_colaborador_id
  FROM public.colaboradores
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.titulo,
    c.descricao,
    c.data_inicio,
    c.data_fim,
    EXISTS (
      SELECT 1 FROM public.pulse_responses pr
      WHERE pr.campaign_id = c.id AND pr.employee_id = v_colaborador_id
    ) as has_responded,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'pergunta', q.pergunta,
          'tipo', q.tipo,
          'ordem', q.ordem,
          'obrigatoria', q.obrigatoria
        ) ORDER BY q.ordem
      )
      FROM public.pulse_questions q
      WHERE q.campaign_id = c.id
    ) as questions
  FROM public.pulse_campaigns c
  WHERE c.company_id = p_company_id
    AND c.ativo = true
    AND CURRENT_DATE BETWEEN c.data_inicio AND c.data_fim
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_notifications(p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, type text, title text, message text, data jsonb, is_read boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT n.id, n.type, n.title, n.message, n.data, n.is_read, n.created_at
    FROM public.admin_notifications n
    ORDER BY n.is_read ASC, n.created_at DESC
    LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_alertas_nr1_v1(p_company_id uuid, p_data_inicio date, p_data_fim date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_scope record; v_result jsonb;
BEGIN
  SELECT * INTO v_scope FROM public._relatorios_ponto_scope();
  WITH colabs AS (
    SELECT c.id, c.full_name, c.department, c.gestor_id FROM colaboradores c
    WHERE c.status='ATIVO'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (NOT v_scope.is_admin OR get_my_role()='admin_master' OR c.company_id = get_my_company_id())
  ),
  faltas_mes AS (
    SELECT r.colaborador_id, date_trunc('month', r.data)::date AS mes, COUNT(*) AS qtd
    FROM ponto_resumo_diario r
    WHERE r.data BETWEEN p_data_inicio AND p_data_fim
      AND r.colaborador_id IN (SELECT id FROM colabs)
      AND r.horas_previstas_minutos > 0 AND r.horas_trabalhadas_minutos = 0
      AND NOT EXISTS (SELECT 1 FROM ponto_abonos a WHERE a.colaborador_id=r.colaborador_id AND a.status='ativo' AND r.data BETWEEN a.data_inicio AND a.data_fim)
    GROUP BY 1,2 HAVING COUNT(*) > 3
  ),
  atestados AS (
    SELECT a.colaborador_id, COUNT(*) AS qtd
    FROM ponto_abonos a JOIN ponto_tipos_abono t ON t.id=a.tipo_abono_id
    WHERE t.categoria='atestado_medico' AND a.status='ativo'
      AND a.data_inicio BETWEEN p_data_inicio AND p_data_fim
      AND a.colaborador_id IN (SELECT id FROM colabs)
    GROUP BY 1 HAVING COUNT(*) > 5
  )
  SELECT jsonb_build_object(
    'faltas_recorrentes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'colaborador_id', c.id, 'nome', c.full_name, 'departamento', c.department,
      'mes', to_char(f.mes,'YYYY-MM'), 'qtd_faltas', f.qtd
    )) FROM faltas_mes f JOIN colabs c ON c.id=f.colaborador_id),'[]'::jsonb),
    'atestados_frequentes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'colaborador_id', c.id, 'nome', c.full_name, 'departamento', c.department, 'qtd_atestados', a.qtd
    )) FROM atestados a JOIN colabs c ON c.id=a.colaborador_id),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_aniversariantes_globais_mes()
 RETURNS TABLE(id uuid, nome text, dia integer, tipo text, anos_empresa integer, cliente_alocado text, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH hoje AS (
    SELECT EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int AS mes,
           EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int AS ano
  )
  SELECT c.id,
         c.full_name::text AS nome,
         EXTRACT(DAY FROM c.birth_date)::int AS dia,
         'nascimento'::text AS tipo,
         NULL::int AS anos_empresa,
         COALESCE(NULLIF(TRIM(c.empresa_cliente), ''), co.name)::text AS cliente_alocado,
         c.avatar_url
  FROM public.colaboradores c
  LEFT JOIN public.companies co ON co.id = c.company_id
  CROSS JOIN hoje
  WHERE c.status = 'ATIVO'
    AND c.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.birth_date)::int = hoje.mes
  UNION ALL
  SELECT c.id,
         c.full_name::text AS nome,
         EXTRACT(DAY FROM c.admission_date)::int AS dia,
         'empresa'::text AS tipo,
         (hoje.ano - EXTRACT(YEAR FROM c.admission_date)::int) AS anos_empresa,
         COALESCE(NULLIF(TRIM(c.empresa_cliente), ''), co.name)::text AS cliente_alocado,
         c.avatar_url
  FROM public.colaboradores c
  LEFT JOIN public.companies co ON co.id = c.company_id
  CROSS JOIN hoje
  WHERE c.status = 'ATIVO'
    AND c.admission_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.admission_date)::int = hoje.mes
    AND (hoje.ano - EXTRACT(YEAR FROM c.admission_date)::int) >= 1
  ORDER BY dia;
$function$
;

CREATE OR REPLACE FUNCTION public.get_avaliacao_by_token(p_token text)
 RETURNS TABLE(avaliacao_id uuid, ciclo_id uuid, ciclo_nome text, colaborador_id uuid, colaborador_nome text, gestor_nome text, link_tipo avaliacao_link_tipo, status avaliacao_status, already_completed boolean, expired boolean, competencias json, objetivos json, metricas json, respostas_competencias json, respostas_objetivos json)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link avaliacao_links%ROWTYPE;
  v_avaliacao avaliacoes%ROWTYPE;
  v_ciclo ciclos_avaliacao%ROWTYPE;
  v_colaborador colaboradores%ROWTYPE;
  v_gestor colaboradores%ROWTYPE;
  v_status public.avaliacao_status;
  v_respondente public.respondente_avaliacao_tipo;
BEGIN
  -- Get link by token
  SELECT * INTO v_link FROM avaliacao_links WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get avaliacao
  SELECT * INTO v_avaliacao FROM avaliacoes WHERE id = v_link.avaliacao_id;
  
  -- Get ciclo
  SELECT * INTO v_ciclo FROM ciclos_avaliacao WHERE id = v_avaliacao.ciclo_id;
  
  -- Get colaborador
  SELECT * INTO v_colaborador FROM colaboradores WHERE id = v_avaliacao.colaborador_id;
  
  -- Get gestor
  SELECT * INTO v_gestor FROM colaboradores WHERE id = v_avaliacao.gestor_id;
  
  -- Determine status based on link type
  IF v_link.tipo = 'autoavaliacao' THEN
    v_status := v_avaliacao.status_autoavaliacao;
    v_respondente := 'colaborador';
  ELSE
    v_status := v_avaliacao.status_avaliacao_gestor;
    v_respondente := 'gestor';
  END IF;
  
  RETURN QUERY
  SELECT
    v_avaliacao.id,
    v_ciclo.id,
    v_ciclo.nome_ciclo::text,
    v_colaborador.id,
    v_colaborador.full_name::text,
    v_gestor.full_name::text,
    v_link.tipo,
    v_status,
    v_status = 'concluida',
    v_link.expires_at IS NOT NULL AND v_link.expires_at < now(),
    (
      SELECT json_agg(json_build_object(
        'id', c.id,
        'nome_competencia', c.nome_competencia,
        'conceito_competencia', c.conceito_competencia,
        'texto_pergunta', CASE WHEN v_link.tipo = 'autoavaliacao' THEN c.texto_pergunta_autoavaliacao ELSE c.texto_pergunta_gestor END,
        'metrica_id', c.metrica_id,
        'ordem', c.ordem
      ) ORDER BY c.ordem)
      FROM competencias_ciclo c WHERE c.ciclo_id = v_ciclo.id
    ),
    (
      SELECT json_agg(json_build_object(
        'id', o.id,
        'nome_objetivo', o.nome_objetivo,
        'descricao_objetivo', o.descricao_objetivo,
        'texto_pergunta', CASE WHEN v_link.tipo = 'autoavaliacao' THEN o.texto_pergunta_autoavaliacao ELSE o.texto_pergunta_gestor END,
        'metrica_id', o.metrica_id,
        'ordem', o.ordem
      ) ORDER BY o.ordem)
      FROM objetivos_ciclo o WHERE o.ciclo_id = v_ciclo.id
    ),
    (
      SELECT json_agg(json_build_object(
        'id', m.id,
        'nome_metrica', m.nome_metrica,
        'tipo_metrica', m.tipo_metrica,
        'valores_escala', m.valores_escala
      ))
      FROM metricas_avaliacao m WHERE m.ciclo_id = v_ciclo.id
    ),
    (
      SELECT json_agg(json_build_object(
        'competencia_id', rc.competencia_id,
        'nota_valor', rc.nota_valor,
        'comentario', rc.comentario
      ))
      FROM avaliacao_respostas_competencias rc 
      WHERE rc.avaliacao_id = v_avaliacao.id AND rc.respondente_tipo = v_respondente
    ),
    (
      SELECT json_agg(json_build_object(
        'objetivo_id', ro.objetivo_id,
        'nota_valor', ro.nota_valor,
        'comentario', ro.comentario
      ))
      FROM avaliacao_respostas_objetivos ro 
      WHERE ro.avaliacao_id = v_avaliacao.id AND ro.respondente_tipo = v_respondente
    );
END;
$function$
;
