-- =============== MODELO A: COPSOQ III (Curta) ===============
WITH ins AS (
  INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
  VALUES (NULL, 'COPSOQ III - Versão Curta', '3.0',
    'Questionário Psicossocial de Copenhague, terceira versão, formato curto com 39 questões. Escala Likert de 5 pontos: 1 Nunca, 2 Raramente, 3 Às vezes, 4 Frequentemente, 5 Sempre.',
    'Burr H. et al. The Third Version of the Copenhagen Psychosocial Questionnaire (COPSOQ III). Safety and Health at Work, 2019.',
    FALSE, TRUE)
  RETURNING id
), dims AS (
  INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, ordem)
  SELECT ins.id, d.nome, d.tipo, d.ordem FROM ins, (VALUES
    ('Demandas Quantitativas','negativa',1),
    ('Ritmo de Trabalho','negativa',2),
    ('Demandas Emocionais','negativa',3),
    ('Influência no Trabalho','positiva',4),
    ('Possibilidades para o Desenvolvimento','positiva',5),
    ('Significado do Trabalho','positiva',6),
    ('Previsibilidade','positiva',7),
    ('Reconhecimento','positiva',8),
    ('Clareza de Função','positiva',9),
    ('Conflito de Papéis','negativa',10),
    ('Qualidade da Liderança','positiva',11),
    ('Apoio Social do Supervisor','positiva',12),
    ('Apoio Social de Colegas','positiva',13),
    ('Senso de Comunidade no Trabalho','positiva',14),
    ('Insegurança no Emprego','negativa',15),
    ('Insegurança sobre o Trabalho','negativa',16),
    ('Satisfação no Trabalho','positiva',17),
    ('Conflito Trabalho-Família','negativa',18),
    ('Confiança Vertical','positiva',19),
    ('Justiça Organizacional','positiva',20),
    ('Autoavaliação de Saúde','positiva',21),
    ('Comportamentos Ofensivos','negativa',22)
  ) AS d(nome, tipo, ordem)
  RETURNING id, nome
)
INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao)
SELECT (SELECT id FROM ins), dims.id, q.ordem, q.texto, 'likert_5', q.inv
FROM (VALUES
 (1,'Demandas Quantitativas','Com que frequência você não tem tempo para concluir todas as suas tarefas de trabalho?',FALSE),
 (2,'Demandas Quantitativas','Você está atrasado com seu trabalho?',FALSE),
 (3,'Ritmo de Trabalho','Você tem que trabalhar muito rápido?',FALSE),
 (4,'Ritmo de Trabalho','Você trabalha em ritmo acelerado durante o dia?',FALSE),
 (5,'Demandas Emocionais','Você tem que lidar com problemas pessoais de outras pessoas como parte do seu trabalho?',FALSE),
 (6,'Demandas Emocionais','Seu trabalho é emocionalmente exigente?',FALSE),
 (7,'Influência no Trabalho','Você tem um elevado grau de influência nas decisões relativas ao seu trabalho?',FALSE),
 (8,'Possibilidades para o Desenvolvimento','Você tem a possibilidade de aprender coisas novas através do seu trabalho?',FALSE),
 (9,'Possibilidades para o Desenvolvimento','Você pode usar suas habilidades ou conhecimentos em seu trabalho?',FALSE),
 (10,'Significado do Trabalho','Seu trabalho é significativo?',FALSE),
 (11,'Previsibilidade','No seu local de trabalho, você é informado com bastante antecedência sobre decisões importantes, mudanças ou planos para o futuro?',FALSE),
 (12,'Previsibilidade','Você recebe todas as informações necessárias para fazer bem o seu trabalho?',FALSE),
 (13,'Reconhecimento','Seu trabalho é reconhecido e apreciado pela gerência?',FALSE),
 (14,'Clareza de Função','Seu trabalho tem objetivos claros?',FALSE),
 (15,'Conflito de Papéis','Faz coisas no seu trabalho com que uns concordam mas outros não?',FALSE),
 (16,'Conflito de Papéis','Às vezes você precisa fazer coisas que deveriam ter sido feitas de uma maneira diferente?',FALSE),
 (17,'Qualidade da Liderança','Em relação à sua chefia direta, até que ponto considera que é boa no planejamento do Trabalho?',FALSE),
 (18,'Qualidade da Liderança','Em relação à sua chefia direta, até que ponto considera que é boa em resolver conflitos?',FALSE),
 (19,'Apoio Social do Supervisor','Com que frequência você recebe ajuda e suporte do seu superior imediato, se necessário?',FALSE),
 (20,'Apoio Social de Colegas','Com que frequência você recebe ajuda e apoio de seus colegas, se necessário?',FALSE),
 (21,'Senso de Comunidade no Trabalho','Existe um bom ambiente entre você e seus colegas?',FALSE),
 (22,'Insegurança no Emprego','Você está preocupado em ficar desempregado?',FALSE),
 (23,'Insegurança no Emprego','Você está preocupado com a possibilidade de ser difícil encontrar outro emprego caso fique desempregado?',FALSE),
 (24,'Insegurança sobre o Trabalho','Você está preocupado em ser transferido para outro trabalho contra sua vontade?',FALSE),
 (25,'Satisfação no Trabalho','Em relação ao seu trabalho em geral. Quão satisfeito você está com seu trabalho como um todo, tudo levado em consideração?',FALSE),
 (26,'Conflito Trabalho-Família','Há momentos em que precisa de estar no trabalho e em casa ao mesmo tempo?',FALSE),
 (27,'Conflito Trabalho-Família','Você sente que seu trabalho drena tanta energia que isso tem um efeito negativo em sua vida privada?',FALSE),
 (28,'Conflito Trabalho-Família','Você sente que seu trabalho toma tanto do seu tempo que tem um efeito negativo na sua vida privada?',FALSE),
 (29,'Conflito Trabalho-Família','Devido ao meu trabalho tenho que alterar os meus planos familiares e pessoais?',FALSE),
 (30,'Confiança Vertical','A gerência confia que os funcionários farão bem o seu trabalho?',FALSE),
 (31,'Confiança Vertical','Os funcionários podem confiar nas informações que vêm da gerência?',FALSE),
 (32,'Justiça Organizacional','Os conflitos são resolvidos de forma justa?',FALSE),
 (33,'Justiça Organizacional','O trabalho é distribuído de forma justa?',FALSE),
 (34,'Significado do Trabalho','O seu trabalho tem algum significado para si?',FALSE),
 (35,'Autoavaliação de Saúde','Em geral, você diria que sua saúde é:',TRUE),
 (36,'Comportamentos Ofensivos','Tem sido alvo de insultos ou provocações verbais no local de trabalho nos últimos 12 meses?',FALSE),
 (37,'Comportamentos Ofensivos','Tem sido exposto a assédio de qualquer natureza no local de trabalho nos últimos 12 meses?',FALSE),
 (38,'Comportamentos Ofensivos','Tem sido exposto a ameaças de violência no local de trabalho nos últimos 12 meses?',FALSE),
 (39,'Comportamentos Ofensivos','Tem sido exposto a violência física no local de trabalho nos últimos 12 meses?',FALSE)
) AS q(ordem, dim, texto, inv)
JOIN dims ON dims.nome = q.dim;

-- =============== MODELO B: HSE-IT ===============
WITH ins AS (
  INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
  VALUES (NULL, 'HSE Indicator Tool (HSE-IT)', '1.0',
    'Ferramenta de indicadores de gestão de estresse ocupacional com 35 questões. Escala Likert de 5 pontos: 1 Nunca, 2 Raramente, 3 Às vezes, 4 Frequentemente, 5 Sempre.',
    'Health and Safety Executive (HSE), Reino Unido - Management Standards Indicator Tool.',
    FALSE, TRUE)
  RETURNING id
), dims AS (
  INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, ordem)
  SELECT ins.id, d.nome, d.tipo, d.ordem FROM ins, (VALUES
    ('Demandas','negativa',1),
    ('Controle','positiva',2),
    ('Apoio da Chefia','positiva',3),
    ('Apoio dos Colegas','positiva',4),
    ('Relacionamentos','negativa',5),
    ('Papel','positiva',6),
    ('Mudanças','positiva',7)
  ) AS d(nome, tipo, ordem)
  RETURNING id, nome
)
INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao)
SELECT (SELECT id FROM ins), dims.id, q.ordem, q.texto, 'likert_5', q.inv
FROM (VALUES
 (1,'Papel','Sei claramente o que é esperado de mim no trabalho.',FALSE),
 (2,'Controle','Posso decidir quando fazer uma pausa.',FALSE),
 (3,'Demandas','Diferentes grupos de trabalho pedem-me coisas difíceis de conjugar.',TRUE),
 (4,'Papel','Sei como realizar o meu trabalho.',FALSE),
 (5,'Demandas','Sou pressionado a trabalhar longas horas.',TRUE),
 (6,'Controle','Tenho liberdade para decidir como fazer o meu trabalho.',FALSE),
 (7,'Apoio da Chefia','Posso recorrer ao meu superior imediato se o trabalho se tornar difícil.',FALSE),
 (8,'Demandas','Tenho que trabalhar muito rapidamente.',TRUE),
 (9,'Controle','Tenho oportunidade de exprimir as minhas opiniões sobre o meu trabalho.',FALSE),
 (10,'Demandas','Tenho que negligenciar algumas tarefas porque tenho demasiado trabalho.',TRUE),
 (11,'Demandas','Tenho uma carga de trabalho realista.',FALSE),
 (12,'Relacionamentos','Se as coisas correrem mal no trabalho, sou eu quem sofre as consequências.',TRUE),
 (13,'Apoio da Chefia','O meu superior imediato incentiva-me no meu trabalho.',FALSE),
 (14,'Demandas','Sou sujeito a pressões de tempo inaceitáveis.',TRUE),
 (15,'Controle','Tenho liberdade para decidir o meu ritmo de trabalho.',FALSE),
 (16,'Apoio dos Colegas','Recebo o apoio de que preciso dos meus colegas.',FALSE),
 (17,'Demandas','Tenho que lidar com exigências contraditórias no trabalho.',TRUE),
 (18,'Papel','Compreendo como o meu trabalho contribui para os objetivos da empresa.',FALSE),
 (19,'Apoio da Chefia','Recebo feedback positivo sobre o meu trabalho do meu superior imediato.',FALSE),
 (20,'Relacionamentos','No meu trabalho, sou confrontado com comportamentos agressivos ou ofensivos.',TRUE),
 (21,'Apoio dos Colegas','Os meus colegas de trabalho incentivam-me no meu trabalho.',FALSE),
 (22,'Controle','Tenho autoridade para tomar decisões sobre o meu trabalho.',FALSE),
 (23,'Apoio da Chefia','O meu superior imediato apoia-me nas decisões difíceis.',FALSE),
 (24,'Papel','Compreendo os objetivos do meu departamento.',FALSE),
 (25,'Relacionamentos','No meu trabalho, sou confrontado com situações de assédio ou intimidação.',TRUE),
 (26,'Demandas','Tenho tempo suficiente para realizar o meu trabalho.',FALSE),
 (27,'Apoio dos Colegas','Posso conversar com os meus colegas sobre assuntos relacionados com o trabalho.',FALSE),
 (28,'Papel','Tenho clareza sobre as minhas responsabilidades no trabalho.',FALSE),
 (29,'Mudanças','Se houver mudanças no trabalho, sou informado sobre como elas me afetarão.',FALSE),
 (30,'Apoio dos Colegas','Os meus colegas de trabalho ouvem-me quando tenho problemas.',FALSE),
 (31,'Mudanças','Se houver mudanças no trabalho, sou consultado sobre como elas serão feitas.',FALSE),
 (32,'Relacionamentos','Sou respeitado pelos meus colegas de trabalho.',FALSE),
 (33,'Apoio da Chefia','O meu superior imediato ajuda-me a organizar a minha carga de trabalho.',FALSE),
 (34,'Mudanças','Compreendo as mudanças que ocorrem no meu trabalho.',FALSE),
 (35,'Demandas','O meu trabalho é cansativo ou altamente stressante.',TRUE)
) AS q(ordem, dim, texto, inv)
JOIN dims ON dims.nome = q.dim;

-- =============== MODELO C: PROART ===============
WITH ins AS (
  INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
  VALUES (NULL, 'PROART - Protocolo de Avaliação dos Riscos Psicossociais no Trabalho', '1.0',
    'Protocolo brasileiro com 28 questões cobrindo Organização Prescrita, Estilos de Gestão, Sofrimento Patogênico e Danos Físicos, Psicológicos e Sociais. Escala Likert de 5 pontos.',
    'Facas, E. P. - Protocolo de Avaliação dos Riscos Psicossociais no Trabalho (PROART), Universidade de Brasília.',
    FALSE, TRUE)
  RETURNING id
), dims AS (
  INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, ordem)
  SELECT ins.id, d.nome, d.tipo, d.ordem FROM ins, (VALUES
    ('Organização Prescrita','positiva',1),
    ('Estilos de Gestão','positiva',2),
    ('Sofrimento Patogênico - IRIS','negativa',3),
    ('Danos Físicos','negativa',4),
    ('Danos Psicológicos','negativa',5),
    ('Danos Sociais','negativa',6)
  ) AS d(nome, tipo, ordem)
  RETURNING id, nome
)
INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao)
SELECT (SELECT id FROM ins), dims.id, q.ordem, q.texto, 'likert_5', q.inv
FROM (VALUES
 (1,'Organização Prescrita','O número de trabalhadores é suficiente para a execução das tarefas.',FALSE),
 (2,'Organização Prescrita','Os recursos de trabalho são em número suficiente para a realização das tarefas.',FALSE),
 (3,'Organização Prescrita','O tempo para realizar as tarefas é suficiente para garantir a segurança.',FALSE),
 (4,'Organização Prescrita','A distribuição e a divisão de tarefas no setor são justas.',FALSE),
 (5,'Organização Prescrita','As metas de produtividade estipuladas são realistas e atingíveis.',FALSE),
 (6,'Organização Prescrita','As normas e regras de trabalho são claras e fáceis de cumprir no dia a dia.',FALSE),
 (7,'Estilos de Gestão','A chefia direta cobra os resultados do trabalho de forma respeitosa.',FALSE),
 (8,'Estilos de Gestão','A chefia direta dá suporte técnico e acolhimento nas dificuldades de trabalho.',FALSE),
 (9,'Estilos de Gestão','A chefia direta incentiva a participação dos trabalhadores nas decisões.',FALSE),
 (10,'Estilos de Gestão','A chefia direta valoriza publicamente o esforço e a dedicação da equipe.',FALSE),
 (11,'Estilos de Gestão','A chefia direta resolve conflitos de equipe com justiça e transparência.',FALSE),
 (12,'Sofrimento Patogênico - IRIS','Sinto-me sobrecarregado emocionalmente devido às cobranças do trabalho.',FALSE),
 (13,'Sofrimento Patogênico - IRIS','Sinto desgaste mental extremo após o término da jornada de trabalho.',FALSE),
 (14,'Sofrimento Patogênico - IRIS','Sinto apatia, cansaço mental ou falta de entusiasmo no meu trabalho.',FALSE),
 (15,'Sofrimento Patogênico - IRIS','Sinto frustração com os resultados e condições das minhas tarefas cotidianas.',FALSE),
 (16,'Sofrimento Patogênico - IRIS','Sinto irritação frequente com as exigências e pressões organizacionais.',FALSE),
 (17,'Danos Físicos','Tenho sentido dores de cabeça constantes após o trabalho.',FALSE),
 (18,'Danos Físicos','Tenho sentido dores nas costas, ombros ou braços decorrentes do trabalho.',FALSE),
 (19,'Danos Físicos','Tenho sofrido de distúrbios digestivos ou azias recorrentes devido ao estresse.',FALSE),
 (20,'Danos Físicos','Tenho sofrido com alterações ou perturbações no sono (insônia, despertar noturno).',FALSE),
 (21,'Danos Físicos','Tenho sentido fadiga extrema ou dores nas pernas ao final do expediente.',FALSE),
 (22,'Danos Psicológicos','Sinto tristeza ou melancolia profunda devido às situações vivenciadas no trabalho.',FALSE),
 (23,'Danos Psicológicos','Sinto ansiedade, tensão ou nervosismo constante ao pensar na rotina laboral.',FALSE),
 (24,'Danos Psicológicos','Sinto-me desvalorizado ou sem perspectiva de crescimento profissional.',FALSE),
 (25,'Danos Psicológicos','Tenho dificuldade extrema de concentração e foco nas tarefas diárias.',FALSE),
 (26,'Danos Sociais','Sinto desejo de me isolar ou afastar dos meus colegas de trabalho.',FALSE),
 (27,'Danos Sociais','Tenho tido conflitos e desgastes familiares decorrentes do estresse do trabalho.',FALSE),
 (28,'Danos Sociais','Sinto dificuldade nas relações sociais e momentos de lazer fora do trabalho.',FALSE)
) AS q(ordem, dim, texto, inv)
JOIN dims ON dims.nome = q.dim;

-- =============== MODELO D: COPSOQ II (Média) ===============
WITH ins AS (
  INSERT INTO public.psico_instrumentos (company_id, nome, versao, descricao, referencia_cientifica, editavel, ativo)
  VALUES (NULL, 'COPSOQ II - Versão Média', '2.0',
    'Questionário Psicossocial de Copenhague, segunda versão, formato médio com 25 dimensões e 76 questões. Escala Likert de 5 pontos: 1 Nunca/quase nunca, 2 Raramente, 3 Às vezes, 4 Frequentemente, 5 Sempre.',
    'Pejtersen J.H. et al. The second version of the Copenhagen Psychosocial Questionnaire (COPSOQ II). Scandinavian Journal of Public Health, 2010.',
    FALSE, TRUE)
  RETURNING id
), dims AS (
  INSERT INTO public.psico_dimensoes (instrumento_id, nome, tipo_dimensao, ordem)
  SELECT ins.id, d.nome, d.tipo, d.ordem FROM ins, (VALUES
    ('Exigências Quantitativas','negativa',1),
    ('Ritmo de Trabalho','negativa',2),
    ('Exigências Cognitivas','negativa',3),
    ('Exigências Emocionais','negativa',4),
    ('Exigências para Dissimular Emoções','negativa',5),
    ('Influência no Trabalho','positiva',6),
    ('Possibilidades de Desenvolvimento','positiva',7),
    ('Variabilidade no Trabalho','positiva',8),
    ('Significado do Trabalho','positiva',9),
    ('Compromisso com o Local','positiva',10),
    ('Previsibilidade','positiva',11),
    ('Clareza de Funções','positiva',12),
    ('Conflito de Papéis','negativa',13),
    ('Qualidade da Liderança','positiva',14),
    ('Apoio Social do Superior','positiva',15),
    ('Apoio Social de Colegas','positiva',16),
    ('Senso de Comunidade','positiva',17),
    ('Insegurança Laboral','negativa',18),
    ('Confiança Vertical','positiva',19),
    ('Justiça e Respeito','positiva',20),
    ('Saúde Geral','positiva',21),
    ('Problemas no Sono','negativa',22),
    ('Burnout','negativa',23),
    ('Estresse','negativa',24),
    ('Sintomas Depressivos','negativa',25),
    ('Comportamentos Ofensivos','negativa',26)
  ) AS d(nome, tipo, ordem)
  RETURNING id, nome
)
INSERT INTO public.psico_perguntas (instrumento_id, dimensao_id, ordem, texto_pergunta, tipo_escala, inverter_pontuacao)
SELECT (SELECT id FROM ins), dims.id, q.ordem, q.texto, 'likert_5', q.inv
FROM (VALUES
 (1,'Exigências Quantitativas','A sua carga de trabalho acumula-se por ser mal distribuída?',FALSE),
 (2,'Exigências Quantitativas','Com que frequência tem tempo para completar todas as tarefas do seu trabalho?',TRUE),
 (3,'Exigências Quantitativas','Precisa fazer horas-extra no seu trabalho?',FALSE),
 (4,'Ritmo de Trabalho','Precisa trabalhar muito rapidamente?',FALSE),
 (5,'Ritmo de Trabalho','Você precisa manter um ritmo de trabalho acelerado durante o dia?',FALSE),
 (6,'Exigências Cognitivas','O seu trabalho exige a sua atenção constante e foco em detalhes?',FALSE),
 (7,'Exigências Cognitivas','O seu trabalho requer que seja bom a propor novas ideias e soluções?',FALSE),
 (8,'Exigências Cognitivas','O seu trabalho exige que tome decisões difíceis rotineiramente?',FALSE),
 (9,'Exigências Cognitivas','O seu trabalho exige que tome decisões rápidas e de alto impacto?',FALSE),
 (10,'Exigências Emocionais','O seu trabalho exige que lide com sentimentos de raiva ou frustração de outros?',FALSE),
 (11,'Exigências Emocionais','O seu trabalho é emocionalmente exigente no dia a dia?',FALSE),
 (12,'Exigências Emocionais','Tem de lidar com situações emocionalmente difíceis em sua rotina?',FALSE),
 (13,'Exigências para Dissimular Emoções','O seu trabalho exige que oculte os seus sentimentos reais perante clientes ou chefia?',FALSE),
 (14,'Exigências para Dissimular Emoções','É obrigado a tratar a todos com extrema simpatia, mesmo que não sinta vontade?',FALSE),
 (15,'Influência no Trabalho','Tem um elevado grau de influência e autonomia nas decisões do seu trabalho?',FALSE),
 (16,'Influência no Trabalho','Participa na escolha das pessoas com quem trabalha ou divide tarefas?',FALSE),
 (17,'Influência no Trabalho','Pode influenciar diretamente a quantidade de trabalho que lhe compete?',FALSE),
 (18,'Influência no Trabalho','Tem alguma influência sobre o tipo de tarefas que faz no cotidiano?',FALSE),
 (19,'Possibilidades de Desenvolvimento','O seu trabalho permite-lhe adquirir e acumular novos conhecimentos?',FALSE),
 (20,'Possibilidades de Desenvolvimento','Tem a possibilidade de aprender coisas novas e desafiadoras no seu trabalho?',FALSE),
 (21,'Possibilidades de Desenvolvimento','Pode usar e aplicar todas as suas capacidades e habilidades no trabalho?',FALSE),
 (22,'Possibilidades de Desenvolvimento','Sente que o seu trabalho atual desenvolve e expande as suas capacidades?',FALSE),
 (23,'Variabilidade no Trabalho','O seu trabalho é variado e com baixa repetição de rotinas?',FALSE),
 (24,'Variabilidade no Trabalho','As suas tarefas diárias exigem a realização de diferentes processos?',FALSE),
 (25,'Significado do Trabalho','O seu trabalho tem algum significado importante para si pessoalmente?',FALSE),
 (26,'Significado do Trabalho','Sente que o seu trabalho e esforço diário são socialmente importantes?',FALSE),
 (27,'Significado do Trabalho','Sente-se motivado, inspirado e envolvido com o seu trabalho?',FALSE),
 (28,'Compromisso com o Local','Gosta de falar de forma positiva com os outros sobre o seu local de trabalho?',FALSE),
 (29,'Compromisso com o Local','Sente que os problemas do seu local de trabalho são seus problemas também?',FALSE),
 (30,'Compromisso com o Local','Sente um forte orgulho em pertencer a esta organização?',FALSE),
 (31,'Compromisso com o Local','Gostaria de continuar a trabalhar nesta organização por muito tempo?',FALSE),
 (32,'Previsibilidade','É informado com antecedência sobre decisões importantes, mudanças ou planos futuros?',FALSE),
 (33,'Previsibilidade','Recebe todas as informações necessárias para fazer bem o seu trabalho?',FALSE),
 (34,'Clareza de Funções','O seu trabalho atual possui objetivos claros e metas bem definidas?',FALSE),
 (35,'Clareza de Funções','Sabe exatamente quais são as suas responsabilidades diárias?',FALSE),
 (36,'Clareza de Funções','Sabe exatamente o que a gerência espera do seu desempenho profissional?',FALSE),
 (37,'Conflito de Papéis','Faz coisas no seu trabalho com que uns concordam mas outros não concordam?',FALSE),
 (38,'Conflito de Papéis','Às vezes precisa de fazer coisas que deveriam ter sido feitas de maneira diferente?',FALSE),
 (39,'Conflito de Papéis','Sente que lhe são exigidas coisas contraditórias e incompatíveis no dia a dia?',FALSE),
 (40,'Qualidade da Liderança','A sua chefia direta é boa no planejamento e organização do trabalho?',FALSE),
 (41,'Qualidade da Liderança','A sua chefia direta é boa e transparente na resolução de conflitos internos?',FALSE),
 (42,'Qualidade da Liderança','A sua chefia direta é boa em incentivar e promover o trabalho em equipe?',FALSE),
 (43,'Qualidade da Liderança','A sua chefia direta é boa e ágil em comunicar decisões importantes à equipe?',FALSE),
 (44,'Apoio Social do Superior','Com que frequência recebe ajuda, acolhimento e suporte do seu superior direto?',FALSE),
 (45,'Apoio Social do Superior','O seu superior direto está disposto a ouvir as suas dúvidas e problemas laborais?',FALSE),
 (46,'Apoio Social do Superior','O seu superior direto costuma dar feedback positivo e construtivo sobre o trabalho?',FALSE),
 (47,'Apoio Social de Colegas','Com que frequência recebe ajuda e apoio prático de seus colegas de trabalho?',FALSE),
 (48,'Apoio Social de Colegas','Os seus colegas de trabalho estão dispostos a acolher e ouvir seus problemas laborais?',FALSE),
 (49,'Apoio Social de Colegas','Existe um bom ambiente de colaboração mútua entre si e seus colegas?',FALSE),
 (50,'Senso de Comunidade','Existe um bom ambiente de trabalho entre si e os seus colegas?',FALSE),
 (51,'Senso de Comunidade','Sente orgulho em pertencer e trabalhar com o seu grupo de colegas?',FALSE),
 (52,'Senso de Comunidade','Sente-se integrado e acolhido no seu grupo de trabalho atual?',FALSE),
 (53,'Insegurança Laboral','Sente-se preocupado em perder o seu emprego e ficar desempregado?',FALSE),
 (54,'Insegurança Laboral','Preocupa-se em ter dificuldades de recolocação se perder o emprego atual?',FALSE),
 (55,'Insegurança Laboral','Preocupa-se em ser transferido de setor contra a sua vontade?',FALSE),
 (56,'Insegurança Laboral','Preocupa-se com a possibilidade de redução salarial ou cortes de benefícios?',FALSE),
 (57,'Confiança Vertical','A gerência confia que os funcionários realizarão o trabalho com excelência?',FALSE),
 (58,'Confiança Vertical','Os funcionários podem confiar nas informações institucionais vindas da gerência?',FALSE),
 (59,'Confiança Vertical','A gerência é aberta, íntegra e transparente sobre suas decisões estratégicas?',FALSE),
 (60,'Confiança Vertical','Os trabalhadores expressam suas opiniões e insatisfações livremente à chefia?',FALSE),
 (61,'Justiça e Respeito','Os conflitos laborais do seu setor são resolvidos de forma justa e idônea?',FALSE),
 (62,'Justiça e Respeito','O volume e a carga de trabalho são igualmente distribuídos pelos trabalhadores?',FALSE),
 (63,'Justiça e Respeito','Todas as sugestões dos funcionários são tratadas com devido respeito pela chefia?',FALSE),
 (64,'Justiça e Respeito','O reconhecimento e promoções profissionais são distribuídos de forma justa?',FALSE),
 (65,'Saúde Geral','Em geral, de forma ampla, como você classificaria a sua própria saúde atual?',FALSE),
 (66,'Problemas no Sono','Tem sofrido de dificuldades sérias para adormecer ao deitar-se?',FALSE),
 (67,'Problemas no Sono','Costuma acordar várias vezes durante a noite sem conseguir retomar o sono?',FALSE),
 (68,'Problemas no Sono','Sente cansaço e fadiga matinal por sono não reparador?',FALSE),
 (69,'Burnout','Sente-se fisicamente exausto e sem energia devido ao trabalho?',FALSE),
 (70,'Burnout','Sente-se emocionalmente exausto e sem reservas psicológicas devido à rotina?',FALSE),
 (71,'Estresse','Tem se sentido excessivamente irritado ou impaciente recentemente?',FALSE),
 (72,'Estresse','Tem sentido sintomas de ansiedade, tensão ou sobressalto frequentes?',FALSE),
 (73,'Sintomas Depressivos','Tem se sentido triste, desanimado ou melancólico nas últimas semanas?',FALSE),
 (74,'Sintomas Depressivos','Tem sentido perda de interesse ou apatia por atividades cotidianas?',FALSE),
 (75,'Comportamentos Ofensivos','Tem sido alvo de insultos, provocações ou humilhações verbais no trabalho?',FALSE),
 (76,'Comportamentos Ofensivos','Tem sido exposto a ameaças, calúnias ou situações de assédio moral no trabalho?',FALSE)
) AS q(ordem, dim, texto, inv)
JOIN dims ON dims.nome = q.dim;