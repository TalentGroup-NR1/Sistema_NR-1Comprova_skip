
-- ============================================================
-- PROART - Perguntas (fixas, científicas)
-- ============================================================
CREATE TABLE public.nr1_proart_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala int NOT NULL CHECK (escala BETWEEN 1 AND 4),
  numero int NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escala, numero)
);

GRANT SELECT ON public.nr1_proart_perguntas TO authenticated;
GRANT ALL ON public.nr1_proart_perguntas TO service_role;

ALTER TABLE public.nr1_proart_perguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read PROART questions"
  ON public.nr1_proart_perguntas FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- PROART - Respostas
-- ============================================================
CREATE TABLE public.nr1_proart_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  escala_1_media numeric(4,2),
  escala_2_media numeric(4,2),
  escala_3_media numeric(4,2),
  escala_4_media numeric(4,2),
  dificuldades text,
  lidar_com_dificuldades text,
  idade int,
  sexo text,
  cargo text,
  departamento text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nr1_proart_resp_company ON public.nr1_proart_respostas(company_id);
CREATE INDEX idx_nr1_proart_resp_colab ON public.nr1_proart_respostas(colaborador_id);
CREATE INDEX idx_nr1_proart_resp_dept ON public.nr1_proart_respostas(company_id, departamento);

GRANT SELECT, INSERT ON public.nr1_proart_respostas TO authenticated;
GRANT ALL ON public.nr1_proart_respostas TO service_role;

ALTER TABLE public.nr1_proart_respostas ENABLE ROW LEVEL SECURITY;

-- Trigger: preenche company_id a partir do colaborador
CREATE OR REPLACE FUNCTION public.set_proart_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.colaboradores WHERE id = NEW.colaborador_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_proart_company_id
  BEFORE INSERT ON public.nr1_proart_respostas
  FOR EACH ROW EXECUTE FUNCTION public.set_proart_company_id();

-- Policies
-- Colaborador insere suas próprias respostas
CREATE POLICY "Colaborador insere suas respostas PROART"
  ON public.nr1_proart_respostas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaborador_id AND c.user_id = auth.uid()
    )
  );

-- Colaborador lê suas próprias respostas
CREATE POLICY "Colaborador lê suas respostas PROART"
  ON public.nr1_proart_respostas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaborador_id AND c.user_id = auth.uid()
    )
  );

-- Admin master: tudo
CREATE POLICY "Admin master lê todas respostas PROART"
  ON public.nr1_proart_respostas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

-- Admin empresa / Analista RH: da própria empresa
CREATE POLICY "Admin empresa / RH leem respostas PROART da empresa"
  ON public.nr1_proart_respostas FOR SELECT
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
    AND company_id = public.get_my_company_id()
  );

-- Gestor de departamento: subordinados diretos
CREATE POLICY "Gestor lê respostas PROART dos subordinados"
  ON public.nr1_proart_respostas FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor_departamento')
    AND EXISTS (
      SELECT 1
      FROM public.colaboradores c
      JOIN public.colaboradores g ON g.id = c.gestor_id
      WHERE c.id = colaborador_id AND g.user_id = auth.uid()
    )
  );

-- ============================================================
-- SEED: 91 perguntas PROART
-- ============================================================

-- ESCALA 1: Organização Prescrita do Trabalho (19)
INSERT INTO public.nr1_proart_perguntas (escala, numero, texto) VALUES
(1, 1, 'O número de trabalhadores é suficiente para a execução das tarefas.'),
(1, 2, 'Os recursos de trabalho são em número suficiente para a realização das tarefas.'),
(1, 3, 'O espaço físico disponível para a realização do trabalho é adequado.'),
(1, 4, 'Os equipamentos são adequados para a realização das tarefas.'),
(1, 5, 'O ritmo de trabalho é adequado.'),
(1, 6, 'Os prazos para a realização das tarefas são flexíveis.'),
(1, 7, 'Possuo condições adequadas para alcançar os resultados esperados do meu trabalho.'),
(1, 8, 'Há clareza na definição das tarefas.'),
(1, 9, 'Há justiça na distribuição das tarefas.'),
(1, 10, 'Os funcionários participam das decisões sobre o trabalho.'),
(1, 11, 'A comunicação entre chefe e subordinado é adequada.'),
(1, 12, 'Tenho autonomia para realizar as tarefas como julgo melhor.'),
(1, 13, 'Há qualidade na comunicação entre os funcionários.'),
(1, 14, 'As informações de que preciso para executar minhas tarefas são claras.'),
(1, 15, 'A avaliação do meu trabalho inclui aspectos além da minha produção.'),
(1, 16, 'Há flexibilidade nas normas para a execução das tarefas.'),
(1, 17, 'As orientações que me são passadas para realizar as tarefas são coerentes entre si.'),
(1, 18, 'As tarefas que executo em meu trabalho são variadas.'),
(1, 19, 'Tenho liberdade para opinar sobre o meu trabalho.');

-- ESCALA 2: Estilos de Gestão (21)
INSERT INTO public.nr1_proart_perguntas (escala, numero, texto) VALUES
(2, 1, 'Em meu trabalho, incentiva-se a idolatria dos chefes.'),
(2, 2, 'Os gestores desta organização se consideram insubstituíveis.'),
(2, 3, 'Aqui os gestores preferem trabalhar individualmente.'),
(2, 4, 'Nesta organização os gestores se consideram o centro do mundo.'),
(2, 5, 'Os gestores desta organização fazem qualquer coisa para chamar a atenção.'),
(2, 6, 'É creditada grande importância para as regras nesta organização.'),
(2, 7, 'A hierarquia é valorizada nesta organização.'),
(2, 8, 'Os laços afetivos são fracos entre as pessoas desta organização.'),
(2, 9, 'Há forte controle do trabalho.'),
(2, 10, 'O ambiente de trabalho se desorganiza com mudanças.'),
(2, 11, 'As pessoas são comprometidas com a organização mesmo quando não há retorno adequado.'),
(2, 12, 'O mérito das conquistas na empresa é de todos.'),
(2, 13, 'O trabalho coletivo é valorizado pelos gestores.'),
(2, 14, 'Para esta organização, o resultado do trabalho é visto como uma realização do grupo.'),
(2, 15, 'As decisões nesta organização são tomadas em grupo.'),
(2, 16, 'Somos incentivados pelos gestores a buscar novos desafios.'),
(2, 17, 'Os gestores favorecem o trabalho interativo de profissionais de diferentes áreas.'),
(2, 18, 'A competência dos trabalhadores é valorizada pela gestão.'),
(2, 19, 'Existem oportunidades semelhantes de ascensão para todas as pessoas.'),
(2, 20, 'Os gestores se preocupam com o bem estar dos trabalhadores.'),
(2, 21, 'A inovação é valorizada nesta organização.');

-- ESCALA 3: Sofrimento Patogênico no Trabalho (28)
INSERT INTO public.nr1_proart_perguntas (escala, numero, texto) VALUES
(3, 1, 'Sinto-me inútil em meu trabalho.'),
(3, 2, 'Considero minhas tarefas insignificantes.'),
(3, 3, 'Sinto-me improdutivo no meu trabalho.'),
(3, 4, 'A identificação com minhas tarefas é inexistente.'),
(3, 5, 'Sinto-me desmotivado para realizar minhas tarefas.'),
(3, 6, 'Meu trabalho é irrelevante para o desenvolvimento da sociedade.'),
(3, 7, 'Meu trabalho é sem sentido.'),
(3, 8, 'Minhas tarefas são banais.'),
(3, 9, 'Permaneço neste emprego por falta de oportunidade no mercado trabalho.'),
(3, 10, 'Meu trabalho é cansativo.'),
(3, 11, 'Meu trabalho é desgastante.'),
(3, 12, 'Meu trabalho me frustra.'),
(3, 13, 'Meu trabalho me sobrecarrega.'),
(3, 14, 'Meu trabalho me desanima.'),
(3, 15, 'Submeter meu trabalho a decisões políticas é fonte de revolta.'),
(3, 16, 'Meu trabalho me faz sofrer.'),
(3, 17, 'Meu trabalho me causa insatisfação.'),
(3, 18, 'Meu trabalho é desvalorizado pela organização.'),
(3, 19, 'A submissão do meu chefe à ordens superiores me causa revolta.'),
(3, 20, 'Meus colegas desvalorizam meu trabalho.'),
(3, 21, 'Falta-me liberdade para dizer o que penso sobre meu trabalho.'),
(3, 22, 'Meus colegas são indiferentes comigo.'),
(3, 23, 'Sou excluído do planejamento de minhas próprias tarefas.'),
(3, 24, 'Minha chefia trata meu trabalho com indiferença.'),
(3, 25, 'É difícil a convivência com meus colegas.'),
(3, 26, 'O trabalho que realizo é desqualificado pela chefia.'),
(3, 27, 'Falta-me liberdade para dialogar com minha chefia.'),
(3, 28, 'Há desconfiança na relação entre chefia e subordinado.');

-- ESCALA 4: Danos Relacionados ao Trabalho (23)
INSERT INTO public.nr1_proart_perguntas (escala, numero, texto) VALUES
(4, 1, 'Amargura.'),
(4, 2, 'Sensação de vazio.'),
(4, 3, 'Mau-Humor.'),
(4, 4, 'Vontade de Desistir de Tudo.'),
(4, 5, 'Tristeza.'),
(4, 6, 'Perda da autoconfiança.'),
(4, 7, 'Solidão.'),
(4, 8, 'Insensibilidade em relação aos colegas.'),
(4, 9, 'Dificuldades nas relações fora do trabalho.'),
(4, 10, 'Vontade de ficar sozinho.'),
(4, 11, 'Conflitos nas relações familiares.'),
(4, 12, 'Agressividade com os outros.'),
(4, 13, 'Dificuldade com os amigos.'),
(4, 14, 'Impaciência com as pessoas em geral.'),
(4, 15, 'Dores no corpo.'),
(4, 16, 'Dores no braço.'),
(4, 17, 'Dor de cabeça.'),
(4, 18, 'Distúrbios digestivos.'),
(4, 19, 'Dores nas costas.'),
(4, 20, 'Alterações no sono.'),
(4, 21, 'Dores nas pernas.'),
(4, 22, 'Distúrbios Circulatórios.'),
(4, 23, 'Alterações no apetite.');
