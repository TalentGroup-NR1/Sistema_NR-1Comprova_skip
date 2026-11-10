DROP FUNCTION IF EXISTS public.pgr_criar_documento(uuid);

CREATE OR REPLACE FUNCTION public.pgr_criar_documento(p_company_id uuid)
RETURNS SETOF public.pgr_documentos
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
$function$;

REVOKE EXECUTE ON FUNCTION public.pgr_criar_documento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pgr_criar_documento(uuid) TO authenticated;