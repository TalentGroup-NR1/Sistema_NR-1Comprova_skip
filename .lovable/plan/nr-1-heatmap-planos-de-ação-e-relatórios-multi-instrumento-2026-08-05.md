# NR-1: Heatmap, Planos de Ação e Relatórios multi-instrumento

Hoje as três abas leem exclusivamente os dados antigos do PROART (tabelas `nr1_proart_*`, escalas fixas 1–4). O motor psicossocial novo trabalha com campanhas, instrumentos, dimensões e GHEs. A refatoração passa as três abas a operar sobre o motor dinâmico, com o PROART virando apenas mais um instrumento do catálogo.

## Como fica para o usuário

Todas as abas passam a começar por um seletor de **Campanha** (instrumento + período). O que é exibido se adapta ao instrumento escolhido.

### Heatmap
- Linhas: alternador **GHE / Departamento**; colunas: as dimensões do instrumento da campanha.
- Cada célula mostra o índice (0–100) e a média, colorida pela faixa de risco da dimensão.
- Limiar de anonimato mantido: grupos com menos de 3 respondentes aparecem como "Dados insuficientes".
- Legenda gerada a partir das faixas configuradas no instrumento (não mais textos fixos de PROART).

### Faixas de risco configuráveis
- No editor de instrumentos, cada dimensão ganha campos de corte: limite de risco médio e limite de risco alto, além do tipo (positiva/negativa) que já existe e define a direção.
- Ao criar/duplicar um instrumento os cortes vêm pré-preenchidos com o padrão (índice: alto abaixo de 40, médio 40–60, baixo acima de 60, invertido para dimensões negativas).

### Planos de Ação
- Kanban passa a ser por campanha. Cada card é ancorado em **campanha + grupo (GHE ou departamento) + dimensão**, no lugar de ativação + departamento + escala.
- "Sincronizar riscos" gera automaticamente cards para toda célula classificada como risco alto ou médio, usando as faixas do instrumento.
- Campos existentes (nível de intervenção, participação dos trabalhadores, responsável, prazo, status) permanecem.

### Relatórios
- Relatório técnico/gerencial passa a ser gerado por campanha: identificação da empresa, instrumento e referência científica, período, adesão, tabela de dimensões com médias/índices/classificação, quadro por GHE e por departamento, planos de ação vinculados e bloco do responsável técnico.
- A parte de análise documental e assinatura do responsável técnico continua igual.

### Aposentadoria do legado
- As telas antigas (`ProartGate`, wizard PROART, ativações, dashboard/heatmap/relatórios PROART) saem do módulo. O PROART segue disponível como instrumento de fábrica do motor novo.
- Nada é apagado do banco: as tabelas `nr1_proart_*` permanecem intactas, apenas deixam de ser exibidas.

## Detalhes técnicos

**Banco (uma migration)**
- `psico_dimensoes`: novas colunas `corte_medio numeric`, `corte_alto numeric` (nulos = usa padrão).
- `nr1_planos_acao`: novas colunas `avaliacao_id uuid`, `dimensao_id uuid`, `grupo_tipo text` ('ghe' | 'departamento'), `grupo_id uuid`, `grupo_nome text`; `ativacao_id`, `escala` e `departamento` passam a ser nulos para os cards novos (linhas antigas preservadas).
- Nova RPC `psico_get_heatmap(p_avaliacao_id, p_agrupamento)` — devolve, por grupo, respondentes e média/índice por dimensão, respeitando o mínimo de 3 respondentes; `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `REVOKE ... FROM PUBLIC, anon`, `GRANT ... TO authenticated`, checagem `psico_is_rh()` + company como nas demais RPCs psico.
- Nova RPC `psico_gerar_planos(p_avaliacao_id, p_agrupamento)` — cria planos para células em risco, ignorando duplicatas.
- Agrupamento por departamento: derivado do `colaborador_id` da atribuição (não das respostas), preservando o desacoplamento das respostas.

**Frontend**
- `src/lib/psicoRiscos.ts`: cálculo de índice, faixas padrão e classificação a partir de tipo + cortes da dimensão.
- Novos componentes em `src/components/mapa-riscos/psico/`: `HeatmapPsico.tsx`, `planos/PlanosAcaoPsicoTab.tsx` (reaproveitando `KanbanBoard`/`KanbanCard`/`ModalPlanoAcao` adaptados) e `RelatoriosPsicoTab.tsx`.
- `src/lib/relatorioPsicoPDF.ts`: gerador genérico baseado no atual `relatorioProartPDF.ts`.
- Hooks: `useHeatmapPsico`, ajustes em `usePlanosAcao` para a nova âncora, `useRelatorioPsico`.
- `InstrumentoEditorSheet.tsx`: campos de corte por dimensão.
- `MapaRiscosNR1.tsx`: abas do admin passam a ser Dashboard, Instrumentos, Campanhas, Heatmap, Planos de Ação, Relatórios (sai "Ativações"); aba do colaborador fica só "Avaliações psicossociais".
- Remoção dos componentes PROART-only e dos hooks `useProart`/`useRelatorioProart` que ficarem sem uso.
