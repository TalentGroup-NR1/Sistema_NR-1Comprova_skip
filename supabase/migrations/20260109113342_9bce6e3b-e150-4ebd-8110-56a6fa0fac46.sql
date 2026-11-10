-- Fix get_avaliacao_by_token function - cast varchar to text
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
$function$;