# Descrição de cargo configurável por empresa

Hoje o formulário de descrição de cargo tem 8 blocos fixos no código. A proposta é transformá-lo em uma estrutura que o próprio usuário monta, e fazer o questionário do colaborador nascer dessa mesma estrutura.

## Como vai funcionar

### 1. Nova aba "Modelos de descrição" (Estrutura Organizacional)
- O usuário cria quantos modelos quiser (ex.: Administrativo, Operacional, Liderança), por empresa.
- Botão "Criar com modelo padrão" já gera os blocos atuais (Descrição sumária, Grupo organizacional, Nível/maturidade, Responsabilidades, Competências, Fatores) prontos para editar.
- Em cada modelo o usuário pode:
  - adicionar, renomear, reordenar e excluir blocos (ex.: Responsabilidade por supervisão / por máquinas / por materiais);
  - dentro de cada bloco, adicionar campos com tipo: texto curto, texto longo, lista de opções, sim/não, lista repetível (itens) e bloco de atividades;
  - marcar campos como obrigatórios;
  - marcar um bloco ou campo como "não perguntar ao colaborador" (uso interno do RH).
- Um modelo pode ser definido como padrão da empresa e duplicado a partir de outro.

### 2. Formulário de descrição de cargo
- O bloco "1 · Identificação" continua fixo (cargo, título, CBO, departamento, GHE, maturidade, reporte, alocação), pois alimenta cadastro e relatórios.
- Abaixo dele, os blocos são renderizados dinamicamente conforme o modelo escolhido na própria tela ("Modelo de descrição": seleciona ou usa o padrão).
- Descrições já criadas continuam abrindo normalmente: se não tiverem modelo, usam o modelo padrão gerado a partir da estrutura atual, com os valores existentes preservados.

### 3. Questionário do colaborador
- Passa a ser gerado automaticamente a partir do modelo da descrição: cada bloco vira uma seção e cada campo vira uma pergunta, respeitando os itens marcados como ocultos.
- O admin ainda pode ajustar textos de ajuda e instruções, mas a lista de itens acompanha o modelo — garantindo que colaborador e descrição tenham exatamente os mesmos itens.
- A consolidação ("Usar como base") passa a copiar resposta → campo pelo identificador do campo, sem mapeamento manual.

### 4. PDF
- O gerador de PDF passa a percorrer os blocos do modelo, imprimindo qualquer bloco novo criado pelo usuário no mesmo padrão visual atual.

## Detalhes técnicos

- Nova tabela `descricao_modelos` (`company_id`, `nome`, `estrutura` jsonb, `padrao` bool, `ativo`), com GRANT + RLS por empresa (admin_master global), no mesmo padrão das demais tabelas do módulo.
- Nova coluna em `descricoes_cargo`: `modelo_id` (FK, ON DELETE SET NULL) e `valores` (jsonb) para os campos dos blocos configuráveis. As colunas atuais (`descricao_sumaria`, `responsabilidades`, `fator_*` etc.) permanecem e continuam sendo gravadas quando o campo do modelo estiver vinculado a elas (`campo_fixo`), preservando relatórios e integrações existentes.
- Tipos compartilhados em `src/lib/descricaoModelo.ts`: `DBloco { id, titulo, descricao, ordem, oculto_colaborador, campos: DCampo[] }` e `DCampo { id, label, tipo, opcoes, obrigatorio, campo_fixo?, oculto_colaborador }`. Função `modeloPadrao()` reproduzindo os blocos 2–7 atuais.
- Conversor `modeloParaSecoes()` reutilizando `QSecao/QPergunta` de `questionarioCargo.ts`, para que `QuestionarioRunner` e `DescricaoQuestionarioSection` continuem funcionando sem reescrita.
- Novos arquivos: `src/hooks/useDescricaoModelos.ts`, `src/components/estrutura-organizacional/DescricaoModeloEditor.tsx`, `ModelosDescricaoTab.tsx`, e `CamposDinamicos.tsx` (renderizador dos blocos no formulário).
- Editados: `DescricaoCargoForm.tsx` (identificação fixa + render dinâmico + seletor de modelo), `DescricaoQuestionarioSection.tsx` (gera seções a partir do modelo), `useDescricoesCargo.ts` (`modelo_id`/`valores`), `descricaoCargoPDF.ts` (impressão dinâmica), `EstruturaOrganizacional.tsx` (nova aba).
- Migração de dados: para cada empresa é criado um modelo "Padrão" com a estrutura atual, e as descrições existentes recebem `modelo_id` desse modelo — nenhum dado é perdido.
