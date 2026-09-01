/**
 * Texto padrão do Adendo Psicossocial do PGR (bloco modular).
 * Conteúdo editável no editor de seções — base sugerida ao criar o documento.
 */

export interface PgrTextoPsicossocialItem {
  numero: string;
  titulo: string;
  conteudo: string;
}

export const PGR_TEXTO_PSICOSSOCIAL: PgrTextoPsicossocialItem[] = [
  {
    numero: "17.1",
    titulo: "Definição de risco psicossocial",
    conteudo: `Fatores de risco psicossociais relacionados ao trabalho são aspectos da organização, da gestão e do contexto social do trabalho que têm potencial de causar dano psicológico, social ou físico ao trabalhador.

Compreendem, entre outros: sobrecarga e ritmo de trabalho, jornada e previsibilidade, autonomia e controle sobre a tarefa, clareza de papéis, qualidade das relações interpessoais e da liderança, reconhecimento e recompensa, segurança no emprego e exposição a assédio ou violência.

A avaliação desses fatores integra o gerenciamento de riscos ocupacionais previsto na NR-01, com o mesmo rigor aplicado aos demais riscos.`,
  },
  {
    numero: "17.2",
    titulo: "Base legal e normativa do adendo",
    conteudo: `- NR-01, item 1.5.3.2 — inclusão dos fatores de risco psicossociais no inventário de riscos.
- Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho — Ministério do Trabalho e Emprego (2024).
- Nota Técnica SEI nº 36/2022 — orientações sobre fatores psicossociais.
- ISO 45003 — Gestão da saúde e segurança psicológica no trabalho.
- Lei nº 14.831/2024 — Certificado Empresa Promotora da Saúde Mental.
- LGPD (Lei nº 13.709/2018) — tratamento dos dados coletados nas pesquisas.`,
  },
  {
    numero: "17.3",
    titulo: "Metodologia e pesquisa",
    conteudo: `A apuração dos fatores psicossociais foi realizada por meio de questionário estruturado aplicado pela **Plataforma Gestão Ativa**, com itens em escala Likert de 5 pontos (1 = discordo totalmente a 5 = concordo totalmente).

O instrumento é organizado em domínios agrupados em dois blocos:

- **Grupo I** — domínios de polaridade "maior é melhor" (recursos e fatores protetivos), como autonomia, apoio da liderança, clareza de papel e reconhecimento.
- **Grupo II** — domínios de polaridade "menor é melhor" (demandas e fatores de risco), como sobrecarga, pressão por prazos, conflitos e insegurança.

Para cada domínio calcula-se a **mediana** das respostas, evitando a distorção provocada por valores extremos. Os resultados são apresentados por setor/área e de forma consolidada para a organização.

A coleta é conduzida de modo a preservar a confidencialidade das respostas individuais; os resultados são divulgados de forma agregada.`,
  },
  {
    numero: "17.4",
    titulo: "Critérios de classificação",
    conteudo: `A mediana de cada domínio é convertida em nível de risco conforme a polaridade do domínio:

| Faixa (mediana ponderada) | Classificação |
| --- | --- |
| < 2,0 | Irrelevante |
| 2,0 a 2,5 | Baixo |
| 2,6 a 3,3 | Moderado |
| 3,4 a 4,1 | Alto |
| ≥ 4,2 | Crítico |

Nos domínios do **Grupo I** (maior é melhor), a escala é invertida antes da classificação, de modo que resultados baixos indiquem risco elevado.

A classificação geral do ambiente resulta da somatória ponderada dos domínios, considerando o peso atribuído a cada um. Domínios classificados como Moderado ou superior geram obrigatoriamente item no plano de ação.`,
  },
  {
    numero: "17.5",
    titulo: "Amostragem e procedimento",
    conteudo: `A pesquisa foi disponibilizada a todos os trabalhadores dos setores avaliados (censo). Quando o número de respondentes não alcança a totalidade, adota-se a Teoria Clássica dos Testes (TCT) com intervalo de confiança de 95% e margem de erro de 10% para verificar a representatividade da amostra por setor.

Setores com número de respondentes insuficiente para preservar o anonimato têm seus resultados agregados ao nível imediatamente superior da estrutura organizacional.

Procedimento aplicado:

1. Comunicação prévia aos trabalhadores sobre objetivo, uso dos dados e confidencialidade.
2. Aplicação do questionário pela Plataforma Gestão Ativa, com prazo definido e lembretes.
3. Apuração das medianas por domínio e por setor.
4. Classificação do nível de risco por domínio e consolidação geral.
5. Devolutiva às lideranças e definição do plano de ação com participação dos trabalhadores.
6. Reavaliação periódica para verificação da eficácia das medidas adotadas.`,
  },
];

export const PGR_TEXTO_PSICOSSOCIAL_POR_NUMERO: Record<
  string,
  PgrTextoPsicossocialItem
> = PGR_TEXTO_PSICOSSOCIAL.reduce((acc, item) => {
  acc[item.numero] = item;
  return acc;
}, {} as Record<string, PgrTextoPsicossocialItem>);

/** Domínios sugeridos ao iniciar o adendo psicossocial de um documento. */
export const PGR_DOMINIOS_PADRAO: Array<{
  nome_dominio: string;
  grupo: "I" | "II";
  peso: number;
  polaridade: "menor_melhor" | "maior_melhor";
  ordem: number;
}> = [
  { nome_dominio: "Autonomia e controle sobre o trabalho", grupo: "I", peso: 1, polaridade: "maior_melhor", ordem: 1 },
  { nome_dominio: "Apoio da liderança", grupo: "I", peso: 1, polaridade: "maior_melhor", ordem: 2 },
  { nome_dominio: "Apoio dos colegas", grupo: "I", peso: 1, polaridade: "maior_melhor", ordem: 3 },
  { nome_dominio: "Clareza de papel", grupo: "I", peso: 1, polaridade: "maior_melhor", ordem: 4 },
  { nome_dominio: "Reconhecimento e recompensa", grupo: "I", peso: 1, polaridade: "maior_melhor", ordem: 5 },
  { nome_dominio: "Comunicação e gestão de mudanças", grupo: "I", peso: 1, polaridade: "maior_melhor", ordem: 6 },
  { nome_dominio: "Demandas e sobrecarga de trabalho", grupo: "II", peso: 1, polaridade: "menor_melhor", ordem: 7 },
  { nome_dominio: "Ritmo e pressão por prazos", grupo: "II", peso: 1, polaridade: "menor_melhor", ordem: 8 },
  { nome_dominio: "Jornada e equilíbrio trabalho-vida", grupo: "II", peso: 1, polaridade: "menor_melhor", ordem: 9 },
  { nome_dominio: "Conflitos e relações interpessoais", grupo: "II", peso: 1, polaridade: "menor_melhor", ordem: 10 },
  { nome_dominio: "Assédio e violência no trabalho", grupo: "II", peso: 1.5, polaridade: "menor_melhor", ordem: 11 },
  { nome_dominio: "Insegurança no emprego", grupo: "II", peso: 1, polaridade: "menor_melhor", ordem: 12 },
];
