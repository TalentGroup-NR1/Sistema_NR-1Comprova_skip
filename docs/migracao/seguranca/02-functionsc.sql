-- SEÇÃO 2: FUNCTIONS (parte 3/4)
CREATE OR REPLACE FUNCTION public.pgr_assert_documento_acesso(p_documento_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid;
BEGIN
  PERFORM public.require_admin_role();
  SELECT company_id INTO v_company FROM public.pgr_documentos WHERE id = p_documento_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Documento PGR não encontrado';
  END IF;
  IF NOT public.is_admin_master(auth.uid()) AND v_company <> public.get_my_company_id() THEN
    RAISE EXCEPTION 'Acesso negado ao documento PGR';
  END IF;
  RETURN v_company;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgr_criar_documento(p_company_id uuid)
 RETURNS SETOF pgr_documentos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_doc uuid;
BEGIN
  PERFORM public.require_admin_role();
  IF NOT public.is_admin_master(auth.uid()) AND p_company_id <> public.get_my_company_id() THEN
    RAISE EXCEPTION 'Acesso negado à empresa informada' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.pgr_documentos (company_id) VALUES (p_company_id) RETURNING id INTO v_doc;

  INSERT INTO public.pgr_secoes (documento_id, numero, titulo, tipo, chave_automatica, ordem, conteudo) VALUES
  (v_doc, '1', 'Objetivo', 'texto', NULL, 1,
$t$Este Programa de Gerenciamento de Riscos (PGR) tem por objetivo estabelecer as diretrizes, os critérios e as ações para o gerenciamento dos riscos ocupacionais existentes nos ambientes e nas atividades da organização, em atendimento à Norma Regulamentadora nº 01 (NR-01) — Disposições Gerais e Gerenciamento de Riscos Ocupacionais.

O programa contempla a identificação dos perigos, a avaliação dos riscos ocupacionais (físicos, químicos, biológicos, ergonômicos, de acidentes e psicossociais), a definição das medidas de prevenção e o acompanhamento da sua implementação, com foco na preservação da saúde, da segurança e da integridade física e mental dos trabalhadores.$t$),
  (v_doc, '2', 'Base legal e normativa', 'texto', NULL, 2,
$t$- Consolidação das Leis do Trabalho (CLT), Capítulo V — Da Segurança e da Medicina do Trabalho.
- NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais (GRO/PGR).
- NR-05 — Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA).
- NR-06 — Equipamento de Proteção Individual (EPI).
- NR-07 — Programa de Controle Médico de Saúde Ocupacional (PCMSO).
- NR-09 — Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos.
- NR-17 — Ergonomia.
- Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho (MTE).
- Nota Técnica SEI nº 36/2022 — Fatores de risco psicossociais.
- ISO 45001 e ISO 45003 — Gestão de saúde e segurança ocupacional e saúde psicológica no trabalho.$t$),
  (v_doc, '3', 'Termos e definições', 'texto', NULL, 3,
$t$- **Perigo**: fonte com potencial de causar lesão ou agravo à saúde.
- **Risco ocupacional**: combinação entre a probabilidade de ocorrência de um evento perigoso e a severidade da lesão ou agravo dele decorrente.
- **GHE (Grupo Homogêneo de Exposição)**: grupo de trabalhadores que experimenta exposição semelhante, de modo que o resultado da avaliação de um deles seja representativo dos demais.
- **Medida de prevenção**: ação adotada para eliminar o perigo ou reduzir o risco.
- **Nível de risco**: resultado da combinação probabilidade × severidade, conforme matriz adotada neste programa.
- **Inventário de riscos**: consolidação das informações de identificação de perigos e avaliação de riscos.
- **Plano de ação**: conjunto de medidas de prevenção com prazos, responsáveis e forma de acompanhamento.$t$),
  (v_doc, '4', 'Responsabilidades', 'texto', NULL, 4,
$t$**Da organização**: garantir os recursos necessários à implementação do PGR, assegurar a participação dos trabalhadores, implementar as medidas de prevenção definidas e manter o programa atualizado.

**Do SESMT / responsável técnico**: elaborar, revisar e acompanhar tecnicamente o programa, orientar a implementação das medidas e registrar as evidências.

**Das lideranças**: assegurar o cumprimento das medidas de prevenção nas suas áreas, comunicar novos perigos e apoiar a participação da equipe.

**Dos trabalhadores**: cumprir as disposições do programa, utilizar corretamente os EPIs e dispositivos de proteção, comunicar situações de risco e participar dos treinamentos e das consultas realizadas.

**Da CIPA**: participar da identificação de perigos e da avaliação dos riscos, acompanhar o plano de ação e apoiar as ações de prevenção.$t$),
  (v_doc, '5', 'Campo de aplicação', 'texto', NULL, 5,
$t$Este programa aplica-se a todos os ambientes, unidades, setores, funções e atividades da organização, alcançando empregados próprios, aprendizes, estagiários e, no que couber, prestadores de serviço e terceiros que exerçam atividades nas dependências da empresa ou sob sua coordenação.$t$),
  (v_doc, '6', 'Identificação da empresa', 'texto', NULL, 6,
$t$Razão social, CNPJ, endereço, CNAE principal e grau de risco são apresentados na folha de identificação deste documento, conforme dados cadastrados na Plataforma Gestão Ativa.

Responsável técnico pela elaboração: identificado no encerramento deste documento, com número de registro no conselho de classe e ART anexa quando aplicável.$t$),
  (v_doc, '7', 'Caracterização da organização', 'automatico', 'caracterizacao', 7, ''),
  (v_doc, '8', 'Relação de cargos e descrições', 'automatico', 'relacao_cargos', 8, ''),
  (v_doc, '9', 'Metodologia de identificação de perigos', 'texto', NULL, 9,
$t$A identificação de perigos e a avaliação dos riscos ocupacionais foram conduzidas com base em:

1. Levantamento documental (organograma, descrições de cargo, relação de EPIs, laudos e programas anteriores).
2. Inspeções nos ambientes de trabalho, com registro fotográfico quando aplicável.
3. Entrevistas com trabalhadores e lideranças, assegurando a participação dos envolvidos.
4. Análise das tarefas prescritas e das tarefas reais por GHE.
5. Consulta ao histórico de acidentes, afastamentos e atendimentos de saúde ocupacional.
6. Aplicação de questionários estruturados pela Plataforma Gestão Ativa para os fatores de risco psicossociais.

Os perigos identificados foram agrupados por GHE e classificados nas categorias física, química, biológica, ergonômica, de acidentes e psicossocial.$t$),
  (v_doc, '10', 'Critérios de avaliação de riscos (matriz 5x5)', 'texto', NULL, 10,
$t$A avaliação dos riscos utiliza matriz 5×5, resultante do produto entre **Probabilidade** (1 a 5) e **Severidade** (1 a 5).

**Probabilidade**: 1 — Raro; 2 — Improvável; 3 — Possível; 4 — Provável; 5 — Quase certo.

**Severidade**: 1 — Insignificante; 2 — Leve; 3 — Moderada; 4 — Grave; 5 — Catastrófica.

O produto define o nível de risco (1 a 25), classificado em faixas: Irrelevante, Baixo, Moderado, Alto e Crítico.$t$),
  (v_doc, '11', 'Níveis de risco e priorização', 'texto', NULL, 11,
$t$- **Irrelevante (1–2)**: manter as condições atuais e monitorar.
- **Baixo (3–6)**: medidas de melhoria contínua, sem prazo crítico.
- **Moderado (8–12)**: implementar medidas de controle em prazo definido e reavaliar.
- **Alto (15–16)**: ação prioritária, com prazo curto e acompanhamento formal.
- **Crítico (20–25)**: ação imediata, com possibilidade de interrupção da atividade até a adoção de controles eficazes.

A priorização considera, além do nível de risco, o número de trabalhadores expostos, a gravidade potencial dos agravos e as exigências legais aplicáveis.$t$),
  (v_doc, '12', 'Medidas de prevenção e controle', 'texto', NULL, 12,
$t$As medidas de prevenção seguem a hierarquia estabelecida na NR-01:

1. Eliminação dos fatores de risco.
2. Redução dos fatores de risco na fonte.
3. Medidas de proteção coletiva.
4. Medidas administrativas ou de organização do trabalho.
5. Medidas de proteção individual (EPI).

Para cada medida definida são registrados o responsável, o prazo, a forma de acompanhamento e o critério de verificação da eficácia.$t$),
  (v_doc, '13', 'Monitoramento e reavaliação', 'texto', NULL, 13,
$t$O PGR é reavaliado, no mínimo, a cada dois anos, e antecipadamente sempre que:

- ocorrer alteração significativa de processos, instalações, máquinas ou métodos de trabalho;
- forem identificados novos perigos ou novas evidências de risco;
- ocorrer acidente grave ou fatal, ou doença relacionada ao trabalho;
- houver alteração legal ou normativa aplicável;
- as medidas de prevenção se mostrarem ineficazes no acompanhamento.

O acompanhamento das medidas é realizado de forma contínua pela Plataforma Gestão Ativa, com registro de status, prazos e evidências.$t$),
  (v_doc, '14', 'Emergências e situações especiais', 'texto', NULL, 14,
$t$A organização mantém procedimentos de resposta a emergências compatíveis com os riscos identificados, contemplando rotas de fuga, pontos de encontro, brigada de emergência, primeiros socorros, comunicação de acidentes e simulados periódicos.

Situações especiais — trabalho em altura, espaço confinado, eletricidade, movimentação de cargas e atividades em ambientes de terceiros — são tratadas em procedimentos específicos, complementares a este programa.$t$),
  (v_doc, '15', 'Registro, documentação e retenção', 'texto', NULL, 15,
$t$Os documentos que integram o PGR — inventário de riscos, plano de ação, laudos, relatórios de inspeção, listas de presença de treinamento e registros de entrega de EPI — são mantidos de forma organizada e acessíveis à fiscalização, aos trabalhadores e aos seus representantes.

O inventário de riscos ocupacionais é mantido por, no mínimo, 20 (vinte) anos, ou pelo período determinado em norma específica. Os registros são armazenados eletronicamente na Plataforma Gestão Ativa, com histórico de alterações e controle de versões.$t$),
  (v_doc, '16', 'Inventário de riscos por GHE', 'automatico', 'inventario_ghe', 16, ''),
  (v_doc, '17', 'Adendo psicossocial', 'automatico', 'adendo_psicossocial', 17, ''),
  (v_doc, '17.1', 'Definição de risco psicossocial', 'texto', NULL, 18,
$t$Fatores de risco psicossociais relacionados ao trabalho são aspectos da organização, da gestão e do contexto social do trabalho que têm potencial de causar dano psicológico, social ou físico ao trabalhador.

Compreendem, entre outros: sobrecarga e ritmo de trabalho, jornada e previsibilidade, autonomia e controle sobre a tarefa, clareza de papéis, qualidade das relações interpessoais e da liderança, reconhecimento e recompensa, segurança no emprego e exposição a assédio ou violência.

A avaliação desses fatores integra o gerenciamento de riscos ocupacionais previsto na NR-01, com o mesmo rigor aplicado aos demais riscos.$t$),
  (v_doc, '17.2', 'Base legal e normativa do adendo', 'texto', NULL, 19,
$t$- NR-01, item 1.5.3.2 — inclusão dos fatores de risco psicossociais no inventário de riscos.
- Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho — Ministério do Trabalho e Emprego (2024).
- Nota Técnica SEI nº 36/2022 — orientações sobre fatores psicossociais.
- ISO 45003 — Gestão da saúde e segurança psicológica no trabalho.
- Lei nº 14.831/2024 — Certificado Empresa Promotora da Saúde Mental.
- LGPD (Lei nº 13.709/2018) — tratamento dos dados coletados nas pesquisas.$t$),
  (v_doc, '17.3', 'Metodologia e pesquisa', 'texto', NULL, 20,
$t$A apuração dos fatores psicossociais foi realizada por meio de questionário estruturado aplicado pela **Plataforma Gestão Ativa**, com itens em escala Likert de 5 pontos (1 = discordo totalmente a 5 = concordo totalmente).

O instrumento é organizado em domínios agrupados em dois blocos:

- **Grupo I** — domínios de polaridade "maior é melhor" (recursos e fatores protetivos), como autonomia, apoio da liderança, clareza de papel e reconhecimento.
- **Grupo II** — domínios de polaridade "menor é melhor" (demandas e fatores de risco), como sobrecarga, pressão por prazos, conflitos e insegurança.

Para cada domínio calcula-se a **mediana** das respostas, evitando a distorção provocada por valores extremos. Os resultados são apresentados por setor/área e de forma consolidada para a organização.

A coleta é conduzida de modo a preservar a confidencialidade das respostas individuais; os resultados são divulgados de forma agregada.$t$),
  (v_doc, '17.4', 'Critérios de classificação', 'texto', NULL, 21,
$t$A mediana de cada domínio é convertida em nível de risco conforme a polaridade do domínio:

| Faixa (mediana ponderada) | Classificação |
| --- | --- |
| < 2,0 | Irrelevante |
| 2,0 a 2,5 | Baixo |
| 2,6 a 3,3 | Moderado |
| 3,4 a 4,1 | Alto |
| >= 4,2 | Crítico |

Nos domínios do **Grupo I** (maior é melhor), a escala é invertida antes da classificação, de modo que resultados baixos indiquem risco elevado.

A classificação geral do ambiente resulta da somatória ponderada dos domínios, considerando o peso atribuído a cada um. Domínios classificados como Moderado ou superior geram obrigatoriamente item no plano de ação.$t$),
  (v_doc, '17.5', 'Amostragem e procedimento', 'texto', NULL, 22,
$t$A pesquisa foi disponibilizada a todos os trabalhadores dos setores avaliados (censo). Quando o número de respondentes não alcança a totalidade, adota-se a Teoria Clássica dos Testes (TCT) com intervalo de confiança de 95% e margem de erro de 10% para verificar a representatividade da amostra por setor.

Setores com número de respondentes insuficiente para preservar o anonimato têm seus resultados agregados ao nível imediatamente superior da estrutura organizacional.

Procedimento aplicado:

1. Comunicação prévia aos trabalhadores sobre objetivo, uso dos dados e confidencialidade.
2. Aplicação do questionário pela Plataforma Gestão Ativa, com prazo definido e lembretes.
3. Apuração das medianas por domínio e por setor.
4. Classificação do nível de risco por domínio e consolidação geral.
5. Devolutiva às lideranças e definição do plano de ação com participação dos trabalhadores.
6. Reavaliação periódica para verificação da eficácia das medidas adotadas.$t$),
  (v_doc, '18', 'Plano de ação', 'automatico', 'plano_acao', 23, ''),
  (v_doc, '19', 'Encerramento e responsável técnico', 'texto', NULL, 24,
$t$Este Programa de Gerenciamento de Riscos foi elaborado com base nas informações levantadas nos ambientes de trabalho e nas consultas realizadas com trabalhadores e lideranças, sendo válido para o período de vigência indicado na capa.

Elaborado por: (nome do responsável técnico), (formação/especialidade), registro no conselho de classe nº (…), NIT (…). ART anexa quando aplicável.$t$);

  INSERT INTO public.pgr_psicossocial_dominios (documento_id, nome_dominio, grupo, peso, polaridade, ordem) VALUES
    (v_doc, 'Autonomia e controle sobre o trabalho', 'I', 1, 'maior_melhor', 1),
    (v_doc, 'Apoio da liderança', 'I', 1, 'maior_melhor', 2),
    (v_doc, 'Apoio dos colegas', 'I', 1, 'maior_melhor', 3),
    (v_doc, 'Clareza de papel', 'I', 1, 'maior_melhor', 4),
    (v_doc, 'Reconhecimento e recompensa', 'I', 1, 'maior_melhor', 5),
    (v_doc, 'Comunicação e gestão de mudanças', 'I', 1, 'maior_melhor', 6),
    (v_doc, 'Demandas e sobrecarga de trabalho', 'II', 1, 'menor_melhor', 7),
    (v_doc, 'Ritmo e pressão por prazos', 'II', 1, 'menor_melhor', 8),
    (v_doc, 'Jornada e equilíbrio trabalho-vida', 'II', 1, 'menor_melhor', 9),
    (v_doc, 'Conflitos e relações interpessoais', 'II', 1, 'menor_melhor', 10),
    (v_doc, 'Assédio e violência no trabalho', 'II', 1.5, 'menor_melhor', 11),
    (v_doc, 'Insegurança no emprego', 'II', 1, 'menor_melhor', 12);

  RETURN QUERY SELECT * FROM public.pgr_documentos d WHERE d.id = v_doc;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgr_get_dados_automaticos(p_documento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company uuid;
  v_result jsonb;
BEGIN
  v_company := public.pgr_assert_documento_acesso(p_documento_id);

  SELECT jsonb_build_object(
    'headcount_total', (SELECT count(*) FROM public.colaboradores c WHERE c.company_id = v_company AND c.status = 'ATIVO'),
    'setores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'nome', s.nome, 'ambiente_fisico', s.ambiente_fisico,
        'localizacao', s.localizacao, 'andar', s.andar
      ) ORDER BY s.nome)
      FROM public.setores s WHERE s.company_id = v_company AND s.ativo
    ), '[]'::jsonb),
    'cargos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cg.id, 'nome', cg.nome, 'cbo_codigo', cg.cbo_codigo, 'cbo_descricao', cg.cbo_descricao,
        'ghe_id', cg.ghe_id, 'tarefa_prescrita', cg.tarefa_prescrita, 'tarefa_real', cg.tarefa_real,
        'carga_horaria_semanal', cg.carga_horaria_semanal,
        'headcount', (SELECT count(*) FROM public.colaboradores c WHERE c.cargo_id = cg.id AND c.status = 'ATIVO')
      ) ORDER BY cg.nome)
      FROM public.cargos cg WHERE cg.company_id = v_company AND cg.ativo
    ), '[]'::jsonb),
    'descricoes_cargo', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', dc.id, 'titulo', dc.titulo, 'cargo_id', dc.cargo_id, 'ghe_id', dc.ghe_id,
        'cbo_codigo', dc.cbo_codigo, 'descricao_sumaria', dc.descricao_sumaria,
        'responsabilidades', dc.responsabilidades, 'formacao_academica', dc.formacao_academica,
        'fator_experiencia', dc.fator_experiencia, 'fator_complexidade', dc.fator_complexidade
      ) ORDER BY dc.titulo)
      FROM public.descricoes_cargo dc WHERE dc.company_id = v_company AND dc.ativo
    ), '[]'::jsonb),
    'ghes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id, 'codigo', g.codigo, 'nome', g.nome, 'descricao', g.descricao,
        'tipo_exposicao', g.tipo_exposicao,
        'setor', (SELECT s.nome FROM public.setores s WHERE s.id = g.setor_id),
        'cargos', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', cg.id, 'nome', cg.nome, 'cbo_codigo', cg.cbo_codigo) ORDER BY cg.nome)
                            FROM public.cargos cg WHERE cg.ghe_id = g.id AND cg.ativo), '[]'::jsonb),
        'riscos', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', r.id, 'nome_risco', r.nome_risco, 'categoria', r.categoria,
            'probabilidade', r.probabilidade, 'severidade', r.severidade, 'nivel_risco', r.nivel_risco,
            'fonte', r.fonte, 'descricao', r.descricao, 'controles_existentes', r.controles_existentes,
            'detalhes', jsonb_build_object(
              'fundamentacao_legal', COALESCE(pd.fundamentacao_legal, ''),
              'lesoes_agravos', COALESCE(pd.lesoes_agravos, ''),
              'fontes_circunstancias', COALESCE(pd.fontes_circunstancias, ''),
              'meio_propagacao', COALESCE(pd.meio_propagacao, ''),
              'acoes_necessarias', COALESCE(pd.acoes_necessarias, ''),
              'observacao', COALESCE(pd.observacao, '')
            )
          ) ORDER BY r.nivel_risco DESC NULLS LAST)
          FROM public.nr1_ghe_riscos r
          LEFT JOIN public.pgr_risco_detalhes pd ON pd.risco_ghe_id = r.id
          WHERE r.ghe_id = g.id AND r.ativo
        ), '[]'::jsonb)
      ) ORDER BY g.codigo)
      FROM public.ghes g WHERE g.company_id = v_company AND g.ativo
    ), '[]'::jsonb),
    'planos_acao', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pa.id,
        'numero', row_number() OVER (ORDER BY pa.prazo NULLS LAST, pa.created_at),
        'acao', pa.titulo,
        'descricao', pa.descricao,
        'obrigatoriedade', CASE WHEN pa.nivel_risco IN ('critico','alto') THEN 'Obrigatória' ELSE 'Recomendada' END,
        'responsavel', (SELECT col.full_name FROM public.colaboradores col WHERE col.id = pa.responsavel_id),
        'metodo', pa.nivel_intervencao,
        'data_prevista', pa.prazo,
        'local', COALESCE(pa.grupo_nome, pa.departamento),
        'status', pa.status,
        'prioridade_dias', CASE WHEN pa.prazo IS NULL THEN NULL ELSE (pa.prazo - CURRENT_DATE) END
      ))
      FROM public.nr1_planos_acao pa WHERE pa.company_id = v_company
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgr_get_dados_psicossociais(p_documento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company uuid;
  v_dominios jsonb;
  v_score numeric;
  v_classificacao text;
BEGIN
  v_company := public.pgr_assert_documento_acesso(p_documento_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id, 'nome_dominio', d.nome_dominio, 'grupo', d.grupo, 'peso', d.peso,
    'mediana', d.mediana, 'classificacao', d.classificacao, 'polaridade', d.polaridade, 'ordem', d.ordem
  ) ORDER BY d.grupo, d.ordem), '[]'::jsonb)
  INTO v_dominios
  FROM public.pgr_psicossocial_dominios d
  WHERE d.documento_id = p_documento_id;

  SELECT CASE WHEN sum(d.peso) > 0 THEN round(sum(d.peso * COALESCE(d.mediana, 0)) / sum(d.peso), 2) END
  INTO v_score
  FROM public.pgr_psicossocial_dominios d
  WHERE d.documento_id = p_documento_id AND d.mediana IS NOT NULL;

  v_classificacao := CASE
    WHEN v_score IS NULL THEN 'Sem dados'
    WHEN v_score < 2.0 THEN 'Irrelevante'
    WHEN v_score < 2.6 THEN 'Baixo'
    WHEN v_score < 3.4 THEN 'Moderado'
    WHEN v_score < 4.2 THEN 'Alto'
    ELSE 'Crítico'
  END;

  RETURN jsonb_build_object(
    'dominios', v_dominios,
    'score_ponderado', v_score,
    'classificacao_geral', v_classificacao,
    'resultados_por_setor', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object(
          'setor', COALESCE(r.departamento, 'Não informado'),
          'respondentes', count(*),
          'escala_1', round(avg(r.escala_1_media)::numeric, 2),
          'escala_2', round(avg(r.escala_2_media)::numeric, 2),
          'escala_3', round(avg(r.escala_3_media)::numeric, 2),
          'escala_4', round(avg(r.escala_4_media)::numeric, 2)
        ) AS x
        FROM public.nr1_proart_respostas r
        WHERE r.company_id = v_company
        GROUP BY COALESCE(r.departamento, 'Não informado')
        ORDER BY COALESCE(r.departamento, 'Não informado')
      ) sub
    ), '[]'::jsonb),
    'planos_acao', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pa.id,
        'numero', row_number() OVER (ORDER BY pa.prazo NULLS LAST, pa.created_at),
        'acao', pa.titulo,
        'descricao', pa.descricao,
        'obrigatoriedade', CASE WHEN pa.nivel_risco IN ('critico','alto') THEN 'Obrigatória' ELSE 'Recomendada' END,
        'responsavel', (SELECT col.full_name FROM public.colaboradores col WHERE col.id = pa.responsavel_id),
        'metodo', pa.nivel_intervencao,
        'data_prevista', pa.prazo,
        'local', COALESCE(pa.grupo_nome, pa.departamento),
        'status', pa.status,
        'prioridade_dias', CASE WHEN pa.prazo IS NULL THEN NULL ELSE (pa.prazo - CURRENT_DATE) END,
        'dimensao', pa.dimensao_nome
      ))
      FROM public.nr1_planos_acao pa
      WHERE pa.company_id = v_company AND (pa.origem IS NULL OR pa.origem <> 'ocupacional')
    ), '[]'::jsonb)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgr_get_documento(p_documento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_result jsonb;
BEGIN
  PERFORM public.pgr_assert_documento_acesso(p_documento_id);

  SELECT jsonb_build_object(
    'documento', to_jsonb(d),
    'empresa', jsonb_build_object('id', c.id, 'nome', c.name, 'cnpj', c.cnpj, 'logo_url', c.logo_url),
    'secoes', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.ordem) FROM public.pgr_secoes s WHERE s.documento_id = d.id), '[]'::jsonb),
    'alteracoes', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.data) FROM public.pgr_alteracoes a WHERE a.documento_id = d.id), '[]'::jsonb)
  )
  INTO v_result
  FROM public.pgr_documentos d
  JOIN public.companies c ON c.id = d.company_id
  WHERE d.id = p_documento_id;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgr_save_documento(p_documento_id uuid, p_titulo text, p_vigencia_inicio date, p_vigencia_fim date, p_cnae text, p_grau_risco text, p_endereco text, p_responsavel_tecnico jsonb, p_anexo_art_path text, p_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_current timestamptz;
BEGIN
  PERFORM public.pgr_assert_documento_acesso(p_documento_id);

  SELECT updated_at INTO v_current FROM public.pgr_documentos WHERE id = p_documento_id FOR UPDATE;
  IF p_updated_at IS NOT NULL AND v_current IS DISTINCT FROM p_updated_at THEN
    RAISE EXCEPTION 'Este documento foi alterado por outro usuário. Recarregue antes de salvar.';
  END IF;

  UPDATE public.pgr_documentos SET
    titulo = COALESCE(p_titulo, titulo),
    vigencia_inicio = p_vigencia_inicio,
    vigencia_fim = p_vigencia_fim,
    cnae = p_cnae,
    grau_risco = p_grau_risco,
    endereco = p_endereco,
    responsavel_tecnico = COALESCE(p_responsavel_tecnico, '{}'::jsonb),
    anexo_art_path = p_anexo_art_path
  WHERE id = p_documento_id;

  RETURN (SELECT to_jsonb(d) FROM public.pgr_documentos d WHERE d.id = p_documento_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgr_save_risco_detalhe(p_risco_ghe_id uuid, p_detalhes jsonb)
 RETURNS pgr_risco_detalhes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company uuid;
  v_row public.pgr_risco_detalhes;
BEGIN
  PERFORM public.require_admin_role();

  SELECT g.company_id INTO v_company
  FROM public.nr1_ghe_riscos r
  JOIN public.ghes g ON g.id = r.ghe_id
  WHERE r.id = p_risco_ghe_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Risco não encontrado';
  END IF;

  IF public.get_my_role() <> 'admin_master' AND v_company IS DISTINCT FROM public.get_my_company_id() THEN
    RAISE EXCEPTION 'Acesso negado a este risco';
  END IF;

  INSERT INTO public.pgr_risco_detalhes AS d (
    risco_ghe_id, fundamentacao_legal, lesoes_agravos, fontes_circunstancias,
    meio_propagacao, acoes_necessarias, observacao
  ) VALUES (
    p_risco_ghe_id,
    NULLIF(p_detalhes->>'fundamentacao_legal', ''),
    NULLIF(p_detalhes->>'lesoes_agravos', ''),
    NULLIF(p_detalhes->>'fontes_circunstancias', ''),
    NULLIF(p_detalhes->>'meio_propagacao', ''),
    NULLIF(p_detalhes->>'acoes_necessarias', ''),
    NULLIF(p_detalhes->>'observacao', '')
  )
  ON CONFLICT (risco_ghe_id) DO UPDATE SET
    fundamentacao_legal = EXCLUDED.fundamentacao_legal,
    lesoes_agravos = EXCLUDED.lesoes_agravos,
    fontes_circunstancias = EXCLUDED.fontes_circunstancias,
    meio_propagacao = EXCLUDED.meio_propagacao,
    acoes_necessarias = EXCLUDED.acoes_necessarias,
    observacao = EXCLUDED.observacao,
    updated_at = now()
  RETURNING d.* INTO v_row;

  RETURN v_row;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgr_save_secoes(p_documento_id uuid, p_secoes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_current timestamptz;
  v_incoming timestamptz;
BEGIN
  PERFORM public.pgr_assert_documento_acesso(p_documento_id);

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_secoes, '[]'::jsonb))
  LOOP
    v_id := NULLIF(v_item->>'id', '')::uuid;
    v_incoming := NULLIF(v_item->>'updated_at', '')::timestamptz;

    IF v_id IS NULL THEN
      INSERT INTO public.pgr_secoes (documento_id, numero, titulo, conteudo, tipo, chave_automatica, ordem, ativo)
      VALUES (
        p_documento_id,
        v_item->>'numero',
        COALESCE(v_item->>'titulo', 'Nova seção'),
        COALESCE(v_item->>'conteudo', ''),
        COALESCE(v_item->>'tipo', 'texto'),
        NULLIF(v_item->>'chave_automatica', ''),
        COALESCE((v_item->>'ordem')::int, 0),
        COALESCE((v_item->>'ativo')::boolean, true)
      );
    ELSE
      SELECT updated_at INTO v_current FROM public.pgr_secoes WHERE id = v_id AND documento_id = p_documento_id FOR UPDATE;
      IF v_current IS NULL THEN
        RAISE EXCEPTION 'Seção % não pertence a este documento', v_id;
      END IF;
      IF v_incoming IS NOT NULL AND v_current IS DISTINCT FROM v_incoming THEN
        RAISE EXCEPTION 'A seção "%" foi alterada por outro usuário. Recarregue antes de salvar.', COALESCE(v_item->>'titulo', v_id::text);
      END IF;

      UPDATE public.pgr_secoes SET
        numero = v_item->>'numero',
        titulo = COALESCE(v_item->>'titulo', titulo),
        conteudo = COALESCE(v_item->>'conteudo', conteudo),
        tipo = COALESCE(v_item->>'tipo', tipo),
        chave_automatica = NULLIF(v_item->>'chave_automatica', ''),
        ordem = COALESCE((v_item->>'ordem')::int, ordem),
        ativo = COALESCE((v_item->>'ativo')::boolean, ativo)
      WHERE id = v_id;
    END IF;
  END LOOP;

  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.ordem) FROM public.pgr_secoes s WHERE s.documento_id = p_documento_id), '[]'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pick_periodo_aquisitivo_for_gozo(p_colaborador_id uuid, p_data_inicio_gozo date)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pode_acessar_modulo_ponto()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin_master','admin_empresa','analista_rh','gestor_departamento')
    )
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.user_id = auth.uid()
        AND c.status = 'ATIVO'
        AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
    );
$function$
;

CREATE OR REPLACE FUNCTION public.ponto_registros_block_collab_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
BEGIN
  -- Bypass for server-side / admin contexts
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  -- Admins and HR analysts can edit freely
  IF v_role IN ('admin_master','admin_empresa','analista_rh','gestor_departamento') THEN
    RETURN NEW;
  END IF;

  -- Collaborators may only change exclusion request columns
  IF NEW.status_aprovacao IS DISTINCT FROM OLD.status_aprovacao
     OR NEW.ajuste_manual  IS DISTINCT FROM OLD.ajuste_manual
     OR NEW.tipo           IS DISTINCT FROM OLD.tipo
     OR NEW.data_hora      IS DISTINCT FROM OLD.data_hora
     OR NEW.colaborador_id IS DISTINCT FROM OLD.colaborador_id
     OR NEW.company_id     IS DISTINCT FROM OLD.company_id
     OR NEW.aprovado_por   IS DISTINCT FROM OLD.aprovado_por
     OR NEW.aprovado_em    IS DISTINCT FROM OLD.aprovado_em
     OR NEW.motivo_ajuste  IS DISTINCT FROM OLD.motivo_ajuste
  THEN
    RAISE EXCEPTION 'Colaboradores nao podem alterar este campo do registro de ponto (somente solicitar exclusao).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_assert_editavel(p_instrumento_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_ed BOOLEAN; v_comp UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT editavel, company_id INTO v_ed, v_comp FROM public.psico_instrumentos WHERE id = p_instrumento_id;
  IF v_ed IS NULL THEN RAISE EXCEPTION 'Instrumento não encontrado'; END IF;
  IF NOT v_ed THEN RAISE EXCEPTION 'Este é um modelo padrão. Duplique para criar uma versão editável.'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_comp = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF public.psico_instrumento_em_uso(p_instrumento_id) THEN
    RAISE EXCEPTION 'Este instrumento está em uso em campanhas ativas. Duplique para criar uma versão editável.';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_atribuir_colaboradores(p_avaliacao_id uuid, p_colaborador_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company UUID; v_count INT := 0; v_colab UUID; v_ghe UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  FOREACH v_colab IN ARRAY p_colaborador_ids LOOP
    SELECT cg.ghe_id INTO v_ghe
    FROM public.colaboradores c
    LEFT JOIN public.cargos cg ON cg.id = c.cargo_id
    WHERE c.id = v_colab;
    IF v_ghe IS NULL THEN
      RAISE EXCEPTION 'Colaborador sem GHE vinculado não pode ser atribuído';
    END IF;
    INSERT INTO public.psico_atribuicoes (avaliacao_id, colaborador_id, ghe_id)
    VALUES (p_avaliacao_id, v_colab, v_ghe)
    ON CONFLICT (avaliacao_id, colaborador_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.psico_avaliacoes SET status = 'em_execucao'
  WHERE id = p_avaliacao_id AND status = 'rascunho';

  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_criar_avaliacao(p_titulo text, p_instrumento_id uuid, p_data_inicio date, p_data_fim date, p_ghe_ids uuid[], p_modo_anonimato boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id UUID; v_company UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_ghe_ids IS NULL OR array_length(p_ghe_ids,1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um GHE para a campanha';
  END IF;
  v_company := public.get_my_company_id();
  IF v_company IS NULL THEN RAISE EXCEPTION 'Selecione uma empresa antes de criar a campanha'; END IF;

  INSERT INTO public.psico_avaliacoes (company_id, titulo, instrumento_id, status, data_inicio, data_fim, modo_anonimato, criado_por)
  VALUES (v_company, p_titulo, p_instrumento_id, 'rascunho', p_data_inicio, p_data_fim, COALESCE(p_modo_anonimato,TRUE), auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.psico_avaliacao_ghes (avaliacao_id, ghe_id)
  SELECT v_id, unnest(p_ghe_ids);

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_delete_dimensao(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_inst UUID;
BEGIN
  SELECT instrumento_id INTO v_inst FROM public.psico_dimensoes WHERE id = p_id;
  IF v_inst IS NULL THEN RETURN; END IF;
  PERFORM public.psico_assert_editavel(v_inst);
  DELETE FROM public.psico_dimensoes WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_delete_pergunta(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_inst UUID;
BEGIN
  SELECT instrumento_id INTO v_inst FROM public.psico_perguntas WHERE id = p_id;
  IF v_inst IS NULL THEN RETURN; END IF;
  PERFORM public.psico_assert_editavel(v_inst);
  DELETE FROM public.psico_perguntas WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_duplicar_instrumento(p_instrumento_id uuid, p_novo_nome text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_new UUID; v_company UUID; r RECORD;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  v_company := public.get_my_company_id();

  INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
  SELECT v_company, COALESCE(p_novo_nome, i.nome || ' (cópia)'), i.versao, i.descricao, i.referencia_cientifica, TRUE, TRUE
  FROM public.psico_instrumentos i
  WHERE i.id = p_instrumento_id
    AND (i.company_id IS NULL OR i.company_id = v_company OR public.is_admin_master(auth.uid()))
  RETURNING id INTO v_new;

  IF v_new IS NULL THEN RAISE EXCEPTION 'Instrumento não encontrado'; END IF;

  FOR r IN SELECT * FROM public.psico_dimensoes WHERE instrumento_id = p_instrumento_id ORDER BY ordem LOOP
    WITH nd AS (
      INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, descricao, ordem)
      VALUES (v_new, r.nome, r.tipo_dimensao, r.descricao, r.ordem)
      RETURNING id
    )
    INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao, ativa)
    SELECT v_new, nd.id, p.ordem, p.texto_pergunta, p.tipo_escala, p.inverter_pontuacao, p.ativa
    FROM nd, public.psico_perguntas p WHERE p.dimensao_id = r.id;
  END LOOP;

  RETURN v_new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_gerar_planos(p_avaliacao_id uuid, p_agrupamento text DEFAULT 'ghe'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company UUID; v_hm JSONB; v_linha JSONB; v_cel JSONB;
  v_indice NUMERIC; v_tipo TEXT; v_cm NUMERIC; v_ca NUMERIC; v_nivel TEXT;
  v_criados INT := 0; v_existentes INT := 0; v_agr TEXT;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_hm := public.psico_get_heatmap(p_avaliacao_id, p_agrupamento);
  v_agr := v_hm->>'agrupamento';

  FOR v_linha IN SELECT * FROM jsonb_array_elements(v_hm->'linhas') LOOP
    FOR v_cel IN SELECT * FROM jsonb_array_elements(v_linha->'celulas') LOOP
      v_indice := (v_cel->>'indice')::numeric;
      v_tipo := v_cel->>'tipo_dimensao';
      v_cm := COALESCE((v_cel->>'corte_medio')::numeric, 40);
      v_ca := COALESCE((v_cel->>'corte_alto')::numeric, 60);

      IF v_indice IS NULL THEN CONTINUE; END IF;

      IF v_tipo = 'positiva' THEN
        v_nivel := CASE WHEN v_indice < v_cm THEN 'Vermelho'
                        WHEN v_indice < v_ca THEN 'Laranja' ELSE NULL END;
      ELSE
        v_nivel := CASE WHEN v_indice >= v_ca THEN 'Vermelho'
                        WHEN v_indice >= v_cm THEN 'Laranja' ELSE NULL END;
      END IF;

      IF v_nivel IS NULL THEN CONTINUE; END IF;

      IF EXISTS (
        SELECT 1 FROM public.nr1_planos_acao
        WHERE avaliacao_id = p_avaliacao_id
          AND grupo_tipo = v_agr
          AND grupo_nome = (v_linha->>'grupo_nome')
          AND dimensao_id = (v_cel->>'dimensao_id')::uuid
          AND status IN ('pendente','planejado')
      ) THEN
        v_existentes := v_existentes + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.nr1_planos_acao (
        company_id, origem, avaliacao_id, dimensao_id, dimensao_nome,
        grupo_tipo, grupo_id, grupo_nome, departamento, media, indice,
        nivel_risco, titulo, status, criado_por, participacao_trabalhadores
      ) VALUES (
        v_company, 'automatico', p_avaliacao_id,
        (v_cel->>'dimensao_id')::uuid, v_cel->>'dimensao',
        v_agr, NULLIF(v_linha->>'grupo_id','')::uuid, v_linha->>'grupo_nome',
        CASE WHEN v_agr = 'departamento' THEN v_linha->>'grupo_nome' ELSE NULL END,
        (v_cel->>'media')::numeric, v_indice,
        v_nivel,
        format('%s — %s', v_linha->>'grupo_nome', v_cel->>'dimensao'),
        'pendente', auth.uid(), false
      );
      v_criados := v_criados + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('criados', v_criados, 'ja_existentes', v_existentes);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_get_acompanhamento(p_avaliacao_id uuid)
 RETURNS TABLE(atribuicao_id uuid, colaborador_id uuid, colaborador_nome text, ghe_id uuid, ghe_nome text, status character varying, data_atribuicao timestamp with time zone, data_resposta timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT t.id, t.colaborador_id, c.full_name::text, t.ghe_id, g.nome::text,
         t.status, t.data_atribuicao, t.data_resposta
  FROM public.psico_atribuicoes t
  JOIN public.psico_avaliacoes a ON a.id = t.avaliacao_id
  JOIN public.colaboradores c ON c.id = t.colaborador_id
  LEFT JOIN public.ghes g ON g.id = t.ghe_id
  WHERE t.avaliacao_id = p_avaliacao_id
    AND public.psico_is_rh()
    AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
  ORDER BY c.full_name;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_get_avaliacoes()
 RETURNS TABLE(id uuid, titulo character varying, status character varying, data_inicio date, data_fim date, modo_anonimato boolean, instrumento_id uuid, instrumento_nome character varying, total_atribuidos bigint, total_respondidos bigint, ghe_ids uuid[], created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT a.id, a.titulo, a.status, a.data_inicio, a.data_fim, a.modo_anonimato,
         a.instrumento_id, i.nome,
         (SELECT count(*) FROM public.psico_atribuicoes t WHERE t.avaliacao_id = a.id),
         (SELECT count(*) FROM public.psico_atribuicoes t WHERE t.avaliacao_id = a.id AND t.status = 'preenchido'),
         ARRAY(SELECT ag.ghe_id FROM public.psico_avaliacao_ghes ag WHERE ag.avaliacao_id = a.id),
         a.created_at
  FROM public.psico_avaliacoes a
  JOIN public.psico_instrumentos i ON i.id = a.instrumento_id
  WHERE public.psico_is_rh()
    AND (public.is_admin_master(auth.uid()) OR a.company_id = public.get_my_company_id())
  ORDER BY a.created_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_get_heatmap(p_avaliacao_id uuid, p_agrupamento text DEFAULT 'ghe'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company UUID; v_res JSONB; v_agr TEXT;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  v_agr := CASE WHEN lower(COALESCE(p_agrupamento,'ghe')) = 'departamento' THEN 'departamento' ELSE 'ghe' END;

  WITH atrib AS (
    SELECT a.id, a.ghe_id, a.status, c.department
    FROM public.psico_atribuicoes a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    WHERE a.avaliacao_id = p_avaliacao_id
  ),
  -- Mapa GHE -> grupo. Para departamento, o GHE só é atribuído a um departamento
  -- quando todos os respondentes pertencem ao mesmo (preserva o anonimato).
  ghe_grupo AS (
    SELECT a.ghe_id,
           CASE WHEN v_agr = 'ghe' THEN g.id::text
                WHEN count(DISTINCT COALESCE(a.department,'—')) = 1
                  THEN COALESCE(max(a.department), 'Não informado')
                ELSE 'Múltiplos departamentos' END AS grupo_chave,
           CASE WHEN v_agr = 'ghe' THEN g.nome
                WHEN count(DISTINCT COALESCE(a.department,'—')) = 1
                  THEN COALESCE(max(a.department), 'Não informado')
                ELSE 'Múltiplos departamentos' END AS grupo_nome,
           CASE WHEN v_agr = 'ghe' THEN g.id ELSE NULL END AS grupo_id
    FROM atrib a
    JOIN public.ghes g ON g.id = a.ghe_id
    GROUP BY a.ghe_id, g.id, g.nome
  ),
  respondentes AS (
    SELECT gg.grupo_chave, gg.grupo_nome, gg.grupo_id,
           count(*) FILTER (WHERE a.status = 'preenchido') AS total
    FROM atrib a JOIN ghe_grupo gg ON gg.ghe_id = a.ghe_id
    GROUP BY gg.grupo_chave, gg.grupo_nome, gg.grupo_id
  ),
  grupos_validos AS (SELECT grupo_chave FROM respondentes WHERE total >= 3),
  scores AS (
    SELECT gg.grupo_chave, d.id AS dimensao_id, d.nome AS dimensao, d.tipo_dimensao,
           d.corte_medio, d.corte_alto, d.ordem,
           CASE WHEN p.inverter_pontuacao THEN 6 - r.valor_resposta ELSE r.valor_resposta END AS score
    FROM public.psico_respostas r
    JOIN public.psico_perguntas p ON p.id = r.pergunta_id
    JOIN public.psico_dimensoes d ON d.id = p.dimensao_id
    JOIN ghe_grupo gg ON gg.ghe_id = r.ghe_id
    WHERE r.avaliacao_id = p_avaliacao_id
  )
  SELECT jsonb_build_object(
    'agrupamento', v_agr,
    'min_respondentes', 3,
    'total_atribuidos', (SELECT count(*) FROM atrib),
    'total_respondidos', (SELECT count(*) FROM atrib WHERE status = 'preenchido'),
    'grupos_omitidos', (SELECT count(*) FROM respondentes WHERE total < 3),
    'dimensoes', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT DISTINCT d.id AS dimensao_id, d.nome AS dimensao, d.tipo_dimensao,
               d.corte_medio, d.corte_alto, d.ordem
        FROM public.psico_dimensoes d
        JOIN public.psico_avaliacoes av ON av.instrumento_id = d.instrumento_id
        WHERE av.id = p_avaliacao_id
        ORDER BY d.ordem, d.nome
      ) x), '[]'::jsonb),
    'linhas', COALESCE((
      SELECT jsonb_agg(y ORDER BY y.grupo_nome) FROM (
        SELECT rp.grupo_chave, rp.grupo_nome, rp.grupo_id, rp.total AS respondentes,
               COALESCE((
                 SELECT jsonb_agg(z ORDER BY z.ordem, z.dimensao) FROM (
                   SELECT s.dimensao_id, s.dimensao, s.tipo_dimensao, s.corte_medio, s.corte_alto, s.ordem,
                          round(avg(s.score)::numeric, 2) AS media,
                          round(((avg(s.score) - 1) * 25)::numeric, 1) AS indice
                   FROM scores s
                   WHERE s.grupo_chave = rp.grupo_chave
                   GROUP BY s.dimensao_id, s.dimensao, s.tipo_dimensao, s.corte_medio, s.corte_alto, s.ordem
                 ) z), '[]'::jsonb) AS celulas
        FROM respondentes rp
        WHERE rp.grupo_chave IN (SELECT grupo_chave FROM grupos_validos)
      ) y), '[]'::jsonb)
  ) INTO v_res;

  RETURN v_res;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_get_instrumento_completo(p_instrumento_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'id', i.id, 'company_id', i.company_id, 'nome', i.nome, 'versao', i.versao,
    'descricao', i.descricao, 'referencia_cientifica', i.referencia_cientifica,
    'editavel', i.editavel, 'ativo', i.ativo,
    'em_uso', public.psico_instrumento_em_uso(i.id),
    'dimensoes', COALESCE((
      SELECT jsonb_agg(d ORDER BY d.ordem, d.nome) FROM (
        SELECT dd.id, dd.nome, dd.tipo_dimensao, dd.descricao, dd.ordem,
               dd.corte_medio, dd.corte_alto,
               COALESCE((
                 SELECT jsonb_agg(p ORDER BY p.ordem) FROM (
                   SELECT pp.id, pp.ordem, pp.texto_pergunta, pp.tipo_escala, pp.inverter_pontuacao, pp.ativa
                   FROM public.psico_perguntas pp WHERE pp.dimensao_id = dd.id
                 ) p), '[]'::jsonb) AS perguntas
        FROM public.psico_dimensoes dd WHERE dd.instrumento_id = i.id
      ) d), '[]'::jsonb)
  )
  FROM public.psico_instrumentos i
  WHERE i.id = p_instrumento_id
    AND (i.company_id IS NULL OR i.company_id = public.get_my_company_id() OR public.is_admin_master(auth.uid()));
$function$
;

CREATE OR REPLACE FUNCTION public.psico_get_instrumentos()
 RETURNS TABLE(id uuid, company_id uuid, nome character varying, versao character varying, descricao text, referencia_cientifica text, editavel boolean, ativo boolean, total_dimensoes bigint, total_perguntas bigint, em_uso boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT i.id, i.company_id, i.nome, i.versao, i.descricao, i.referencia_cientifica,
         i.editavel, i.ativo,
         (SELECT count(*) FROM public.psico_dimensoes d WHERE d.instrumento_id = i.id),
         (SELECT count(*) FROM public.psico_perguntas p WHERE p.instrumento_id = i.id AND p.ativa),
         public.psico_instrumento_em_uso(i.id),
         i.created_at
  FROM public.psico_instrumentos i
  WHERE i.company_id IS NULL
     OR i.company_id = public.get_my_company_id()
     OR public.is_admin_master(auth.uid())
  ORDER BY i.company_id NULLS FIRST, i.nome;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_get_questionario(p_atribuicao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_at RECORD; v_res JSONB;
BEGIN
  SELECT t.*, a.instrumento_id, a.titulo, a.data_fim, a.modo_anonimato
  INTO v_at
  FROM public.psico_atribuicoes t
  JOIN public.psico_avaliacoes a ON a.id = t.avaliacao_id
  WHERE t.id = p_atribuicao_id;

  IF v_at IS NULL THEN RAISE EXCEPTION 'Atribuição não encontrada'; END IF;
  IF v_at.colaborador_id <> public.get_my_colaborador_id() AND NOT public.psico_is_rh() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_res := jsonb_build_object(
    'atribuicao_id', v_at.id,
    'avaliacao_id', v_at.avaliacao_id,
    'titulo', v_at.titulo,
    'data_fim', v_at.data_fim,
    'status', v_at.status,
    'rascunho', COALESCE(v_at.rascunho, '{}'::jsonb),
    'instrumento', public.psico_get_instrumento_completo(v_at.instrumento_id)
  );
  RETURN v_res;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_get_resultados_gerais(p_avaliacao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company UUID; v_res JSONB;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_company FROM public.psico_avaliacoes WHERE id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  WITH scores AS (
    SELECT r.ghe_id, d.id AS dimensao_id, d.nome AS dimensao, d.tipo_dimensao,
           CASE WHEN p.inverter_pontuacao THEN 6 - r.valor_resposta ELSE r.valor_resposta END AS score
    FROM public.psico_respostas r
    JOIN public.psico_perguntas p ON p.id = r.pergunta_id
    JOIN public.psico_dimensoes d ON d.id = p.dimensao_id
    WHERE r.avaliacao_id = p_avaliacao_id
  ),
  respondentes AS (
    SELECT ghe_id, count(*) FILTER (WHERE status = 'preenchido') AS total
    FROM public.psico_atribuicoes WHERE avaliacao_id = p_avaliacao_id GROUP BY ghe_id
  ),
  ghes_validos AS (SELECT ghe_id FROM respondentes WHERE total >= 3)
  SELECT jsonb_build_object(
    'total_atribuidos', (SELECT count(*) FROM public.psico_atribuicoes WHERE avaliacao_id = p_avaliacao_id),
    'total_respondidos', (SELECT count(*) FROM public.psico_atribuicoes WHERE avaliacao_id = p_avaliacao_id AND status = 'preenchido'),
    'ghes_omitidos', (SELECT count(*) FROM respondentes WHERE total < 3),
    'dimensoes', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT s.dimensao, s.tipo_dimensao,
               round(avg(s.score)::numeric, 2) AS media,
               round(((avg(s.score) - 1) * 25)::numeric, 1) AS indice
        FROM scores s WHERE s.ghe_id IN (SELECT ghe_id FROM ghes_validos)
        GROUP BY s.dimensao, s.tipo_dimensao ORDER BY s.dimensao
      ) x), '[]'::jsonb),
    'por_ghe', COALESCE((
      SELECT jsonb_agg(y) FROM (
        SELECT g.id AS ghe_id, g.nome AS ghe_nome,
               (SELECT total FROM respondentes rp WHERE rp.ghe_id = g.id) AS respondentes,
               round(avg(s.score)::numeric, 2) AS media_geral,
               COALESCE((
                 SELECT jsonb_agg(z) FROM (
                   SELECT s2.dimensao, s2.tipo_dimensao, round(avg(s2.score)::numeric,2) AS media,
                          round(((avg(s2.score) - 1) * 25)::numeric,1) AS indice
                   FROM scores s2 WHERE s2.ghe_id = g.id GROUP BY s2.dimensao, s2.tipo_dimensao ORDER BY s2.dimensao
                 ) z), '[]'::jsonb) AS dimensoes
        FROM scores s
        JOIN public.ghes g ON g.id = s.ghe_id
        WHERE s.ghe_id IN (SELECT ghe_id FROM ghes_validos)
        GROUP BY g.id, g.nome ORDER BY g.nome
      ) y), '[]'::jsonb)
  ) INTO v_res;

  RETURN v_res;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_instrumento_em_uso(_instrumento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.psico_avaliacoes a
    WHERE a.instrumento_id = _instrumento_id
      AND a.status IN ('em_execucao','finalizada')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.psico_is_rh()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.get_my_role() IN ('admin_master','admin_empresa','analista_rh');
$function$
;

CREATE OR REPLACE FUNCTION public.psico_minhas_avaliacoes()
 RETURNS TABLE(atribuicao_id uuid, avaliacao_id uuid, titulo character varying, status character varying, data_inicio date, data_fim date, instrumento_nome character varying, total_perguntas bigint, data_atribuicao timestamp with time zone, data_resposta timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT t.id, a.id, a.titulo, t.status, a.data_inicio, a.data_fim, i.nome,
         (SELECT count(*) FROM public.psico_perguntas p WHERE p.instrumento_id = i.id AND p.ativa),
         t.data_atribuicao, t.data_resposta
  FROM public.psico_atribuicoes t
  JOIN public.psico_avaliacoes a ON a.id = t.avaliacao_id
  JOIN public.psico_instrumentos i ON i.id = a.instrumento_id
  WHERE t.colaborador_id = public.get_my_colaborador_id()
    AND a.status <> 'rascunho'
  ORDER BY (t.status = 'preenchido'), a.data_fim;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_notify_atribuicao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id UUID;
  v_company UUID;
  v_titulo TEXT;
BEGIN
  SELECT c.user_id INTO v_user_id FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;
  SELECT a.company_id, a.titulo INTO v_company, v_titulo FROM public.psico_avaliacoes a WHERE a.id = NEW.avaliacao_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (v_company, v_user_id, 'avaliacao_psicossocial',
            'Nova avaliação psicossocial',
            'Você foi convidado a responder: ' || COALESCE(v_titulo, 'Avaliação psicossocial'),
            '/minhas-atividades', 'psico_atribuicao', NEW.id, 'normal');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_notify_preenchido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company UUID;
  v_titulo TEXT;
BEGIN
  IF NEW.status = 'preenchido' AND COALESCE(OLD.status,'') <> 'preenchido' THEN
    SELECT a.company_id, a.titulo INTO v_company, v_titulo
    FROM public.psico_avaliacoes a WHERE a.id = NEW.avaliacao_id;

    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    SELECT v_company, p.id, 'avaliacao_psicossocial',
           'Questionário psicossocial concluído',
           'Um colaborador concluiu o preenchimento de: ' || COALESCE(v_titulo, 'Avaliação psicossocial'),
           '/mapa-riscos-nr1', 'psico_avaliacao', NEW.avaliacao_id, 'normal'
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.company_id = v_company
      AND ur.role IN ('admin_empresa','analista_rh');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_reabrir_questionario(p_atribuicao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.psico_atribuicoes
  SET status = 'em_andamento', data_resposta = NULL
  WHERE id = p_atribuicao_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_reordenar_perguntas(p_instrumento_id uuid, p_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  UPDATE public.psico_perguntas p
  SET ordem = x.pos
  FROM (SELECT unnest(p_ids) AS id, generate_subscripts(p_ids, 1) AS pos) x
  WHERE p.id = x.id AND p.instrumento_id = p_instrumento_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_save_dimensao(p_id uuid, p_instrumento_id uuid, p_nome text, p_tipo text, p_descricao text, p_ordem integer, p_corte_medio numeric DEFAULT NULL::numeric, p_corte_alto numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id UUID;
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  IF p_id IS NULL THEN
    INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, descricao, ordem, corte_medio, corte_alto)
    VALUES (p_instrumento_id, p_nome, COALESCE(p_tipo,'negativa'), p_descricao,
            COALESCE(p_ordem, (SELECT COALESCE(max(ordem),0)+1 FROM public.psico_dimensoes WHERE instrumento_id = p_instrumento_id)),
            COALESCE(p_corte_medio, 40), COALESCE(p_corte_alto, 60))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_dimensoes
    SET nome = p_nome, tipo_dimensao = COALESCE(p_tipo, tipo_dimensao), descricao = p_descricao,
        ordem = COALESCE(p_ordem, ordem),
        corte_medio = COALESCE(p_corte_medio, corte_medio),
        corte_alto = COALESCE(p_corte_alto, corte_alto)
    WHERE id = p_id AND instrumento_id = p_instrumento_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_save_dimensao(p_id uuid, p_instrumento_id uuid, p_nome text, p_tipo text, p_descricao text, p_ordem integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id UUID;
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  IF p_id IS NULL THEN
    INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, descricao, ordem)
    VALUES (p_instrumento_id, p_nome, COALESCE(p_tipo,'negativa'), p_descricao,
            COALESCE(p_ordem, (SELECT COALESCE(max(ordem),0)+1 FROM public.psico_dimensoes WHERE instrumento_id = p_instrumento_id)))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_dimensoes
    SET nome = p_nome, tipo_dimensao = COALESCE(p_tipo, tipo_dimensao), descricao = p_descricao, ordem = COALESCE(p_ordem, ordem)
    WHERE id = p_id AND instrumento_id = p_instrumento_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_save_instrumento(p_id uuid, p_nome text, p_versao text, p_descricao text, p_referencia text, p_ativo boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id UUID; v_company UUID;
BEGIN
  IF NOT public.psico_is_rh() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  v_company := public.get_my_company_id();

  IF p_id IS NULL THEN
    INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
    VALUES (v_company, p_nome, COALESCE(p_versao,'1.0'), p_descricao, p_referencia, TRUE, COALESCE(p_ativo,TRUE))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_instrumentos
    SET nome = p_nome, versao = COALESCE(p_versao, versao), descricao = p_descricao,
        referencia_cientifica = p_referencia, ativo = COALESCE(p_ativo, ativo)
    WHERE id = p_id AND editavel = TRUE
      AND (public.is_admin_master(auth.uid()) OR company_id = v_company)
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Instrumento não editável ou sem permissão'; END IF;
  END IF;
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_save_pergunta(p_id uuid, p_instrumento_id uuid, p_dimensao_id uuid, p_texto text, p_tipo_escala text, p_inverter boolean, p_ordem integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id UUID;
BEGIN
  PERFORM public.psico_assert_editavel(p_instrumento_id);
  IF p_id IS NULL THEN
    INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao)
    VALUES (p_instrumento_id, p_dimensao_id,
            COALESCE(p_ordem, (SELECT COALESCE(max(ordem),0)+1 FROM public.psico_perguntas WHERE dimensao_id = p_dimensao_id)),
            p_texto, COALESCE(p_tipo_escala,'likert_5'), COALESCE(p_inverter,FALSE))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.psico_perguntas
    SET dimensao_id = COALESCE(p_dimensao_id, dimensao_id), texto_pergunta = p_texto,
        tipo_escala = COALESCE(p_tipo_escala, tipo_escala),
        inverter_pontuacao = COALESCE(p_inverter, inverter_pontuacao),
        ordem = COALESCE(p_ordem, ordem)
    WHERE id = p_id AND instrumento_id = p_instrumento_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_save_rascunho(p_atribuicao_id uuid, p_rascunho jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.psico_atribuicoes
  SET rascunho = p_rascunho,
      status = CASE WHEN status = 'pendente' THEN 'em_andamento' ELSE status END
  WHERE id = p_atribuicao_id
    AND colaborador_id = public.get_my_colaborador_id()
    AND status <> 'preenchido';
  IF NOT FOUND THEN RAISE EXCEPTION 'Não foi possível salvar o rascunho'; END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.psico_save_respostas(p_atribuicao_id uuid, p_respostas jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_at RECORD;
BEGIN
  SELECT * INTO v_at FROM public.psico_atribuicoes WHERE id = p_atribuicao_id;
  IF v_at IS NULL THEN RAISE EXCEPTION 'Atribuição não encontrada'; END IF;
  IF v_at.colaborador_id <> public.get_my_colaborador_id() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_at.status = 'preenchido' THEN RAISE EXCEPTION 'Questionário já enviado'; END IF;

  INSERT INTO public.psico_respostas (avaliacao_id, ghe_id, pergunta_id, valor_resposta)
  SELECT v_at.avaliacao_id, v_at.ghe_id, (kv.key)::uuid, (kv.value)::int
  FROM jsonb_each_text(p_respostas) kv
  WHERE kv.value ~ '^[0-9]+$';

  UPDATE public.psico_atribuicoes
  SET status = 'preenchido', data_resposta = now(), rascunho = NULL
  WHERE id = p_atribuicao_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reabrir_espelho_mensal(p_espelho_id uuid, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row public.espelhos_ponto_mensais;
  v_uid uuid := auth.uid();
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'MOTIVO_OBRIGATORIO';
  END IF;

  SELECT * INTO v_row FROM public.espelhos_ponto_mensais WHERE id = p_espelho_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF NOT (
    public.has_role(v_uid,'admin_master')
    OR (
      (public.has_role(v_uid,'admin_empresa') OR public.has_role(v_uid,'analista_rh'))
      AND public.get_my_company_id() = v_row.company_id
    )
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  UPDATE public.espelhos_ponto_mensais
     SET status = 'reaberto',
         reaberto_por = v_uid,
         reaberto_em = now(),
         motivo_reabertura = p_motivo,
         assinatura_hash = NULL,
         assinatura_por = NULL,
         assinatura_em = NULL,
         assinatura_ip = NULL,
         pdf_url = NULL,
         updated_at = now()
   WHERE id = p_espelho_id;

  RETURN jsonb_build_object('id', p_espelho_id, 'status', 'reaberto');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reabrir_periodo_ponto(p_fechamento_id uuid, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_fechamento RECORD;
  v_uid UUID := auth.uid();
  v_nova_versao INT;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO

  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;

  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'Apenas admin_master ou admin_empresa podem reabrir';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;

  SELECT * INTO v_fechamento FROM public.banco_horas_fechamentos WHERE id = p_fechamento_id;
  IF v_fechamento IS NULL THEN
    RAISE EXCEPTION 'Fechamento não encontrado';
  END IF;
  IF v_role <> 'admin_master' AND v_fechamento.company_id <> v_my_company THEN
    RAISE EXCEPTION 'Fora do escopo';
  END IF;
  IF v_fechamento.status NOT IN ('fechado','assinado') THEN
    RAISE EXCEPTION 'Fechamento não está em estado fechado/assinado (atual: %)', v_fechamento.status;
  END IF;

  v_nova_versao := COALESCE(v_fechamento.versao, 1) + 1;

  UPDATE public.banco_horas_fechamentos
  SET status = 'reaberto',
      reaberto_por = v_uid,
      reaberto_em = now(),
      motivo_reabertura = p_motivo,
      versao = v_nova_versao,
      assinatura_por = NULL,
      assinatura_em = NULL,
      assinatura_hash = NULL,
      csv_url = NULL,
      pdf_url = NULL,
      updated_at = now()
  WHERE id = p_fechamento_id;

  INSERT INTO public.banco_horas_fechamentos_auditoria (fechamento_id, acao, user_id, payload)
  VALUES (
    p_fechamento_id, 'reabriu', v_uid,
    jsonb_build_object('motivo', p_motivo, 'versao_anterior', v_fechamento.versao, 'versao_nova', v_nova_versao)
  );

  RETURN jsonb_build_object('id', p_fechamento_id, 'status', 'reaberto', 'versao', v_nova_versao);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reabrir_periodo_ponto_massa(p_company_id uuid, p_periodo_inicio date, p_periodo_fim date, p_motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_total INT := 0;
  v_reabertos INT := 0;
  v_rec RECORD;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO

  IF NOT public.pode_acessar_modulo_ponto() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: vínculo não permite acesso ao ponto' USING ERRCODE = '42501';
  END IF;

  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'Apenas admin_master ou admin_empresa podem reabrir';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;

  FOR v_rec IN
    SELECT id FROM public.banco_horas_fechamentos
    WHERE company_id = p_company_id
      AND periodo_inicio = p_periodo_inicio
      AND periodo_fim = p_periodo_fim
      AND status IN ('fechado','assinado')
  LOOP
    v_total := v_total + 1;
    BEGIN
      PERFORM public.reabrir_periodo_ponto(v_rec.id, p_motivo);
      v_reabertos := v_reabertos + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('total', v_total, 'reabertos', v_reabertos);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reabrir_questionario(p_atribuicao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.require_admin_role();
  UPDATE public.questionario_atribuicoes
  SET status = 'em_andamento', data_resposta = NULL
  WHERE id = p_atribuicao_id AND status = 'preenchido';
END; $function$
;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reaplicar_abonos_dia(p_colab uuid, p_data date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_jornada int;
  v_prev int;
  v_trab int;
  v_has_dia boolean;
  v_total_horas int;
BEGIN
  SELECT company_id INTO v_company_id FROM colaboradores WHERE id = p_colab;
  IF v_company_id IS NULL THEN RETURN; END IF;

  -- Existe abono 'dia' ativo cobrindo esta data?
  SELECT EXISTS(
    SELECT 1 FROM ponto_abonos a
    JOIN ponto_tipos_abono t ON t.id = a.tipo_abono_id
    WHERE a.colaborador_id = p_colab
      AND a.status = 'ativo'
      AND a.modalidade = 'dia'
      AND t.abona_horas = true
      AND p_data BETWEEN a.data_inicio AND a.data_fim
  ) INTO v_has_dia;

  IF v_has_dia THEN
    SELECT COALESCE(jornada_diaria_minutos, 480) INTO v_jornada
      FROM ponto_configuracoes WHERE company_id = v_company_id
      ORDER BY updated_at DESC NULLS LAST LIMIT 1;
    v_jornada := COALESCE(v_jornada, 480);

    INSERT INTO ponto_resumo_diario (colaborador_id, company_id, data,
      horas_previstas_minutos, horas_trabalhadas_minutos, saldo_minutos, status, observacoes)
    VALUES (p_colab, v_company_id, p_data, v_jornada, v_jornada, 0, 'ABONADO', 'Abonado')
    ON CONFLICT (colaborador_id, data) DO UPDATE SET
      horas_previstas_minutos = EXCLUDED.horas_previstas_minutos,
      horas_trabalhadas_minutos = EXCLUDED.horas_previstas_minutos,
      saldo_minutos = 0,
      status = 'ABONADO',
      observacoes = 'Abonado',
      updated_at = now();
    RETURN;
  END IF;

  -- Sem abono 'dia': remove marcação ABONADO obsoleta e recalcula do zero
  DELETE FROM ponto_resumo_diario
    WHERE colaborador_id = p_colab AND data = p_data
      AND status = 'ABONADO';

  PERFORM public.recalcular_resumo_diario(p_colab, p_data);

  -- Soma abonos 'horas' ativos ao trabalhado
  SELECT COALESCE(SUM(a.minutos_abonados), 0) INTO v_total_horas
    FROM ponto_abonos a
    JOIN ponto_tipos_abono t ON t.id = a.tipo_abono_id
    WHERE a.colaborador_id = p_colab
      AND a.status = 'ativo'
      AND a.modalidade = 'horas'
      AND t.abona_horas = true
      AND a.data_inicio = p_data;

  IF v_total_horas > 0 THEN
    SELECT horas_previstas_minutos, horas_trabalhadas_minutos INTO v_prev, v_trab
      FROM ponto_resumo_diario WHERE colaborador_id = p_colab AND data = p_data;
    IF FOUND THEN
      UPDATE ponto_resumo_diario SET
        horas_trabalhadas_minutos = COALESCE(v_trab,0) + v_total_horas,
        saldo_minutos = (COALESCE(v_trab,0) + v_total_horas) - COALESCE(v_prev, 480),
        updated_at = now()
      WHERE colaborador_id = p_colab AND data = p_data;
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalcular_insights_cuidar(p_company_id uuid, p_escopo text, p_ano integer, p_semana integer DEFAULT NULL::integer, p_mes integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_humor NUMERIC(5,2);
  v_humor_ant NUMERIC(5,2);
  v_tend NUMERIC(5,2);
  v_total INT;
  v_alertas JSONB := '[]'::jsonb;
  v_id UUID;
  v_individual JSONB;
  v_total_colab INT;
  v_participacao NUMERIC;
BEGIN
  IF p_escopo NOT IN ('semana','mes') THEN
    RAISE EXCEPTION 'escopo inválido';
  END IF;

  IF p_escopo = 'semana' THEN
    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2), COUNT(*)
      INTO v_humor, v_total
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.ano = p_ano AND pc.semana_iso = p_semana
      AND pc.origem = 'auto_semanal'
      AND pr.score_numeric IS NOT NULL;

    -- semana anterior
    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2) INTO v_humor_ant
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.origem = 'auto_semanal'
      AND ((pc.ano = p_ano AND pc.semana_iso = p_semana - 1)
        OR (p_semana = 1 AND pc.ano = p_ano - 1 AND pc.semana_iso = 52))
      AND pr.score_numeric IS NOT NULL;
  ELSE
    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2), COUNT(*)
      INTO v_humor, v_total
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.ano = p_ano AND pc.mes = p_mes
      AND pc.origem = 'auto_mensal'
      AND pr.score_numeric IS NOT NULL;

    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2) INTO v_humor_ant
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.origem = 'auto_mensal'
      AND ((pc.ano = p_ano AND pc.mes = p_mes - 1)
        OR (p_mes = 1 AND pc.ano = p_ano - 1 AND pc.mes = 12))
      AND pr.score_numeric IS NOT NULL;
  END IF;

  v_tend := COALESCE(v_humor, 0) - COALESCE(v_humor_ant, 0);

  -- Alertas individuais: último score < 30
  IF p_escopo = 'semana' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'tipo','individual',
      'employee_id', x.employee_id,
      'score', x.media_score
    )), '[]'::jsonb)
    INTO v_individual
    FROM (
      SELECT pr.employee_id, ROUND(AVG(pr.score_numeric)::NUMERIC,2) AS media_score
      FROM pulse_responses pr
      JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
      WHERE pc.company_id = p_company_id
        AND pc.ano = p_ano AND pc.semana_iso = p_semana
        AND pc.origem = 'auto_semanal'
        AND pr.score_numeric IS NOT NULL
      GROUP BY pr.employee_id
      HAVING AVG(pr.score_numeric) < 30
    ) x;
    v_alertas := v_alertas || v_individual;

    -- participação
    SELECT COUNT(*) INTO v_total_colab FROM colaboradores
      WHERE company_id = p_company_id AND status = 'ATIVO';
    IF v_total_colab > 0 THEN
      v_participacao := (
        SELECT COUNT(DISTINCT pr.employee_id)::NUMERIC / v_total_colab
        FROM pulse_responses pr
        JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
        WHERE pc.company_id = p_company_id
          AND pc.ano = p_ano AND pc.semana_iso = p_semana
          AND pc.origem = 'auto_semanal'
      );
      IF v_participacao < 0.3 THEN
        v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
          'tipo','participacao_baixa',
          'taxa', ROUND(v_participacao*100, 1)
        ));
      END IF;
    END IF;
  END IF;

  -- Queda de grupo
  IF v_humor IS NOT NULL AND v_humor_ant IS NOT NULL AND (v_humor_ant - v_humor) > 15 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'tipo','queda_grupo',
      'delta', v_tend
    ));
  END IF;

  INSERT INTO cuidar_insights(company_id, escopo, ano, semana_iso, mes,
    humor_medio, tendencia, total_respostas, alertas_json, calculado_em)
  VALUES (p_company_id, p_escopo, p_ano, p_semana, p_mes,
    v_humor, v_tend, COALESCE(v_total,0), v_alertas, now())
  ON CONFLICT (company_id, escopo, ano, semana_iso, mes)
  DO UPDATE SET
    humor_medio = EXCLUDED.humor_medio,
    tendencia = EXCLUDED.tendencia,
    total_respostas = EXCLUDED.total_respostas,
    alertas_json = EXCLUDED.alertas_json,
    calculado_em = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalcular_resumo_diario(p_colaborador_id uuid, p_data date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_admission date;
  v_work_schedule_id uuid;
  v_jornada int;
  v_jornada_ws int;
  v_jornada_ws_dia int;
  v_jornada_cfg int;
  v_hp jsonb;
  v_dow_key text;
  v_tolerancia int := 0;
  v_tol_schedule int;
  v_tol_config int;
  v_trab int := 0;
  v_intervalo int := 0;
  v_extras int := 0;
  v_saldo int := 0;
  v_noturno int := 0;
  v_status ponto_resumo_status;
  v_count int;
  v_skip boolean;
  v_override TEXT;
  r record;
  v_open timestamptz;
  v_break_open timestamptz;
  v_last_exit timestamptz;
  v_dh timestamptz;
  v_previsto boolean;
  v_bonus_ativo boolean := false;
  v_bonus_sab numeric := 0;
  v_bonus_dom numeric := 0;
  v_bonus_fer numeric := 0;
  v_is_feriado boolean := false;
  v_dow int;
  v_pct numeric := 0;
  v_bonus_min int := 0;
BEGIN
  v_override := current_setting('app.allow_fechado_override', true);
  IF v_override IS DISTINCT FROM 'true' AND public.is_periodo_fechado(p_colaborador_id, p_data) THEN
    RETURN;
  END IF;

  SELECT company_id, admission_date, work_schedule_id
    INTO v_company_id, v_admission, v_work_schedule_id
    FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_company_id IS NULL THEN RETURN; END IF;

  IF v_admission IS NOT NULL AND p_data < v_admission THEN
    DELETE FROM public.ponto_resumo_diario
     WHERE colaborador_id = p_colaborador_id AND data = p_data
       AND status NOT IN ('ABONADO','AJUSTE');
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ponto_resumo_diario
    WHERE colaborador_id = p_colaborador_id AND data = p_data
      AND status IN ('ABONADO','AJUSTE')
  ) INTO v_skip;
  IF v_skip THEN RETURN; END IF;

  SELECT jornada_diaria_minutos,
         COALESCE(tolerancia_minutos, 0),
         COALESCE(bonus_fora_escala_ativo, false),
         COALESCE(bonus_sabado_pct, 0),
         COALESCE(bonus_domingo_pct, 0),
         COALESCE(bonus_feriado_pct, 0)
    INTO v_jornada_cfg, v_tol_config, v_bonus_ativo, v_bonus_sab, v_bonus_dom, v_bonus_fer
  FROM public.ponto_configuracoes
  WHERE company_id = v_company_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  -- Jornada do horário vinculado (work_schedule): prioridade para carga do dia
  IF v_work_schedule_id IS NOT NULL THEN
    SELECT carga_diaria_minutos, tolerancia_minutos, horarios_por_dia
      INTO v_jornada_ws, v_tol_schedule, v_hp
      FROM public.work_schedules WHERE id = v_work_schedule_id;

    IF v_hp IS NOT NULL AND jsonb_typeof(v_hp) = 'object' THEN
      v_dow_key := EXTRACT(DOW FROM p_data)::int::text;
      IF v_hp ? v_dow_key THEN
        BEGIN
          v_jornada_ws_dia := NULLIF((v_hp -> v_dow_key ->> 'carga'), '')::int;
        EXCEPTION WHEN OTHERS THEN
          v_jornada_ws_dia := NULL;
        END;
      END IF;
    END IF;
  END IF;

  -- Prioridade: carga do dia (horarios_por_dia) > carga do horário > config global > 480
  -- OBS: colaboradores.jornada_diaria_minutos NÃO é mais consultado.
  v_jornada := COALESCE(v_jornada_ws_dia, v_jornada_ws, v_jornada_cfg, 480);
  v_tolerancia := COALESCE(v_tol_schedule, v_tol_config, 0);

  v_open := NULL; v_break_open := NULL; v_last_exit := NULL;

  FOR r IN
    SELECT tipo, date_trunc('minute', data_hora) AS data_hora
    FROM public.ponto_registros
    WHERE colaborador_id = p_colaborador_id
      AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data
      AND status_aprovacao = 'aprovado'
      AND COALESCE(exclusao_pendente, false) = false
    ORDER BY data_hora ASC
  LOOP
    v_dh := r.data_hora;
    IF r.tipo IN ('ENTRADA','INTERVALO_RETORNO') THEN
      v_open := v_dh;
      IF r.tipo = 'INTERVALO_RETORNO' AND v_break_open IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (v_dh - v_break_open)) / 60.0)::int;
        v_break_open := NULL;
      ELSIF r.tipo = 'ENTRADA' AND v_last_exit IS NOT NULL THEN
        v_intervalo := v_intervalo + (EXTRACT(EPOCH FROM (v_dh - v_last_exit)) / 60.0)::int;
        v_last_exit := NULL;
      END IF;
    ELSIF r.tipo IN ('SAIDA','INTERVALO_SAIDA') THEN
      IF v_open IS NOT NULL THEN
        v_trab    := v_trab + (EXTRACT(EPOCH FROM (v_dh - v_open)) / 60.0)::int;
        v_noturno := v_noturno + public.calc_minutos_noturnos_br(v_open, v_dh);
        v_open := NULL;
      END IF;
      IF r.tipo = 'INTERVALO_SAIDA' THEN
        v_break_open := v_dh; v_last_exit := NULL;
      ELSE
        v_last_exit := v_dh;
      END IF;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_count FROM public.ponto_registros
   WHERE colaborador_id = p_colaborador_id
     AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = p_data;

  IF v_count = 0 THEN
    DELETE FROM public.ponto_resumo_diario
     WHERE colaborador_id = p_colaborador_id AND data = p_data
       AND status NOT IN ('ABONADO','AJUSTE');
    RETURN;
  END IF;

  v_previsto := public.is_dia_previsto(p_colaborador_id, p_data);

  IF v_bonus_ativo AND NOT v_previsto AND v_trab > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.feriados WHERE company_id = v_company_id AND data = p_data
    ) INTO v_is_feriado;
    v_dow := EXTRACT(DOW FROM p_data)::int;
    IF v_is_feriado THEN v_pct := v_bonus_fer;
    ELSIF v_dow = 6 THEN v_pct := v_bonus_sab;
    ELSIF v_dow = 0 THEN v_pct := v_bonus_dom;
    ELSE v_pct := 0; END IF;
    v_bonus_min := ROUND(v_trab * v_pct / 100.0)::int;
  ELSE
    v_bonus_min := 0;
  END IF;

  IF v_previsto THEN
    v_saldo  := v_trab - v_jornada;
    v_extras := GREATEST(0, v_trab - v_jornada);
    IF v_tolerancia > 0 AND abs(v_saldo) <= v_tolerancia THEN
      v_saldo := 0;
      v_extras := 0;
    END IF;
  ELSE
    v_saldo  := v_trab + v_bonus_min;
    v_extras := v_trab + v_bonus_min;
  END IF;

  v_status := CASE WHEN v_open IS NOT NULL OR v_break_open IS NOT NULL
                     THEN 'INCONSISTENTE'::ponto_resumo_status
                   ELSE 'REGULAR'::ponto_resumo_status END;

  INSERT INTO public.ponto_resumo_diario (
    colaborador_id, company_id, data,
    horas_previstas_minutos, horas_trabalhadas_minutos, horas_intervalo_minutos,
    horas_noturnas_minutos, horas_extras_minutos, saldo_minutos, status
  ) VALUES (
    p_colaborador_id, v_company_id, p_data,
    CASE WHEN v_previsto THEN v_jornada ELSE 0 END,
    v_trab, v_intervalo, v_noturno, v_extras, v_saldo, v_status
  )
  ON CONFLICT (colaborador_id, data) DO UPDATE SET
    horas_previstas_minutos   = EXCLUDED.horas_previstas_minutos,
    horas_trabalhadas_minutos = EXCLUDED.horas_trabalhadas_minutos,
    horas_intervalo_minutos   = EXCLUDED.horas_intervalo_minutos,
    horas_noturnas_minutos    = EXCLUDED.horas_noturnas_minutos,
    horas_extras_minutos      = EXCLUDED.horas_extras_minutos,
    saldo_minutos             = EXCLUDED.saldo_minutos,
    status                    = EXCLUDED.status,
    updated_at                = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalcular_vinculacao_gozos(p_colaborador_id uuid)
 RETURNS TABLE(gozo_id uuid, periodo_antigo uuid, periodo_novo uuid, atualizado boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.recusar_ferias_gozo(p_gozo_id uuid, p_motivo text)
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
  
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSIF v_role = 'gestor_departamento' THEN
    SELECT id INTO v_my_colab FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    IF v_gozo.gestor_id IS DISTINCT FROM v_my_colab THEN
      RAISE EXCEPTION 'Sem permissão para recusar';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissão para recusar';
  END IF;
  
  IF v_gozo.status NOT IN ('planejado','aprovado') THEN
    RAISE EXCEPTION 'Status atual não permite recusa';
  END IF;
  
  UPDATE ferias_gozo
  SET status = 'cancelado',
      observacoes = COALESCE(observacoes,'') || E'\n[Recusado em ' || to_char(now(),'DD/MM/YYYY') || ']: ' || COALESCE(p_motivo,'Sem motivo informado'),
      updated_at = now()
  WHERE id = p_gozo_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_acao_alerta(p_alerta_id uuid, p_acao text, p_novo_status text DEFAULT 'em_acao'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid;
  v_role_ok boolean;
BEGIN
  IF p_novo_status NOT IN ('aberto','em_acao','resolvido','descartado') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  SELECT company_id INTO v_company FROM public.cuidar_alertas WHERE id = p_alerta_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Alerta não encontrado';
  END IF;

  v_role_ok := public.has_role(auth.uid(), 'admin_master')
            OR ((public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
                AND v_company = public.get_my_company_id());
  IF NOT v_role_ok THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.cuidar_alertas
     SET acao_registrada = p_acao,
         status = p_novo_status,
         acao_por = auth.uid(),
         acao_em = now()
   WHERE id = p_alerta_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_leitura_campanha(p_campanha_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.campanhas_comunicados WHERE id = p_campanha_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  INSERT INTO public.campanha_leituras (company_id, campanha_id, user_id, lido_em)
  VALUES (v_company_id, p_campanha_id, p_user_id, now())
  ON CONFLICT (campanha_id, user_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_leitura_comunicado(p_comunicado_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.comunicados WHERE id = p_comunicado_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Comunicado não encontrado';
  END IF;

  INSERT INTO public.comunicado_leituras (company_id, comunicado_id, user_id, read_at)
  VALUES (v_company_id, p_comunicado_id, p_user_id, now())
  ON CONFLICT (company_id, comunicado_id, user_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_promocao(p_colaborador_id uuid, p_company_id uuid, p_data_promocao date, p_cargo_novo text, p_salario_novo numeric, p_nivel_novo text DEFAULT NULL::text, p_departamento_novo text DEFAULT NULL::text, p_motivo text DEFAULT NULL::text, p_aprovado_por text DEFAULT ''::text, p_observacoes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colaborador RECORD;
  v_new_promocao RECORD;
  v_role app_role;
BEGIN
  -- Permission check
  v_role := get_my_role();
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem registrar promoções';
  END IF;

  -- Fetch current colaborador data
  SELECT job_title, base_salary, job_level, department
  INTO v_colaborador
  FROM colaboradores
  WHERE id = p_colaborador_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  -- Insert promotion record
  INSERT INTO promocoes_colaborador (
    colaborador_id, company_id, data_promocao,
    cargo_anterior, salario_anterior, nivel_anterior, departamento_anterior,
    cargo_novo, salario_novo, nivel_novo, departamento_novo,
    motivo, aprovado_por, observacoes
  ) VALUES (
    p_colaborador_id, p_company_id, p_data_promocao,
    v_colaborador.job_title, v_colaborador.base_salary, 
    v_colaborador.job_level, v_colaborador.department,
    p_cargo_novo, p_salario_novo,
    COALESCE(p_nivel_novo, v_colaborador.job_level::TEXT),
    COALESCE(p_departamento_novo, v_colaborador.department),
    p_motivo, p_aprovado_por, p_observacoes
  )
  RETURNING * INTO v_new_promocao;

  -- Update colaborador current data
  UPDATE colaboradores SET
    job_title = p_cargo_novo,
    base_salary = p_salario_novo,
    department = COALESCE(p_departamento_novo, department),
    job_level = CASE 
      WHEN p_nivel_novo IS NOT NULL AND p_nivel_novo != '' 
      THEN p_nivel_novo::job_level 
      ELSE job_level 
    END,
    updated_at = now()
  WHERE id = p_colaborador_id;

  RETURN row_to_json(v_new_promocao);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_promocao_retroativa(p_colaborador_id uuid, p_company_id uuid, p_data_promocao date, p_cargo_anterior text, p_salario_anterior numeric, p_cargo_novo text, p_salario_novo numeric, p_nivel_anterior text DEFAULT NULL::text, p_departamento_anterior text DEFAULT NULL::text, p_nivel_novo text DEFAULT NULL::text, p_departamento_novo text DEFAULT NULL::text, p_motivo text DEFAULT NULL::text, p_aprovado_por text DEFAULT ''::text, p_observacoes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_promocao RECORD;
  v_role app_role;
  v_exists boolean;
BEGIN
  v_role := get_my_role();
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem registrar promoções';
  END IF;

  SELECT EXISTS(SELECT 1 FROM colaboradores WHERE id = p_colaborador_id AND company_id = p_company_id)
  INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Colaborador não encontrado nesta empresa';
  END IF;

  IF p_data_promocao > CURRENT_DATE THEN
    RAISE EXCEPTION 'A data da promoção não pode ser futura';
  END IF;

  INSERT INTO promocoes_colaborador (
    colaborador_id, company_id, data_promocao,
    cargo_anterior, salario_anterior, nivel_anterior, departamento_anterior,
    cargo_novo, salario_novo, nivel_novo, departamento_novo,
    motivo, aprovado_por, observacoes, created_by_user_id
  ) VALUES (
    p_colaborador_id, p_company_id, p_data_promocao,
    p_cargo_anterior, p_salario_anterior, p_nivel_anterior, p_departamento_anterior,
    p_cargo_novo, p_salario_novo, p_nivel_novo, p_departamento_novo,
    p_motivo, COALESCE(NULLIF(p_aprovado_por, ''), 'Importação histórica'), p_observacoes, auth.uid()
  )
  RETURNING * INTO v_new_promocao;

  RETURN row_to_json(v_new_promocao);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_tratativa_fechamento(p_company_id uuid, p_colaborador_id uuid, p_periodo_inicio date, p_periodo_fim date, p_acao tratativa_saldo_acao, p_observacao text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_uid uuid := auth.uid();
  v_saldo int := 0;
  v_id uuid;
  v_admission date;
BEGIN
  PERFORM public.require_admin_role();

  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;

  SELECT admission_date INTO v_admission
  FROM public.colaboradores WHERE id = p_colaborador_id;

  SELECT COALESCE(SUM(saldo_minutos),0)::int INTO v_saldo
  FROM public.ponto_resumo_diario
  WHERE colaborador_id = p_colaborador_id
    AND data BETWEEN p_periodo_inicio AND p_periodo_fim
    AND (v_admission IS NULL OR data >= v_admission);

  IF v_saldo > 0 AND p_acao NOT IN ('pagar','transferir') THEN
    RAISE EXCEPTION 'Saldo positivo só pode ser pago ou transferido';
  END IF;
  IF v_saldo < 0 AND p_acao NOT IN ('descontar','transferir','perdoar') THEN
    RAISE EXCEPTION 'Saldo negativo só pode ser descontado, transferido ou perdoado';
  END IF;
  IF v_saldo = 0 THEN
    RAISE EXCEPTION 'Colaborador sem saldo no período não requer tratativa';
  END IF;

  INSERT INTO public.ponto_fechamento_tratativas (
    company_id, colaborador_id, periodo_inicio, periodo_fim,
    saldo_minutos, acao, observacao, decidido_por
  ) VALUES (
    p_company_id, p_colaborador_id, p_periodo_inicio, p_periodo_fim,
    v_saldo, p_acao, NULLIF(p_observacao,''), v_uid
  )
  ON CONFLICT (company_id, colaborador_id, periodo_inicio, periodo_fim)
  DO UPDATE SET
    saldo_minutos = EXCLUDED.saldo_minutos,
    acao = EXCLUDED.acao,
    observacao = EXCLUDED.observacao,
    decidido_por = EXCLUDED.decidido_por,
    decidido_em = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;
