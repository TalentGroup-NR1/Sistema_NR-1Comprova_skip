# Motor dinâmico de questionários psicossociais (NR-1)

Novo motor 100% editável de instrumentos psicossociais, com 4 modelos de fábrica (COPSOQ III curta, HSE-IT, PROART, COPSOQ II média — 178 perguntas), campanhas por GHE, respostas anônimas e painel de resultados.

## Conflitos de nome encontrados (verificado no banco)

Estes objetos **já existem** e são usados por outros módulos, então o novo motor usará nomes próprios com prefixo `psico_`:

| Nome pedido | Situação atual | Nome que será usado |
| --- | --- | --- |
| `avaliacoes` | tabela do módulo Avaliações de Desempenho | `psico_avaliacoes` |
| `perguntas` / `dimensoes` | nomes genéricos demais no schema público | `psico_perguntas` / `psico_dimensoes` |
| `instrumentos` | livre | `psico_instrumentos` |
| `avaliacao_ghes` / `avaliacao_atribuicoes` / `respostas_anonimas` | livres | `psico_avaliacao_ghes` / `psico_atribuicoes` / `psico_respostas` |
| RPC `get_questionario_para_colaborador(p_atribuicao_id uuid)` | já existe (questionário de cargo), mesma assinatura | `psico_get_questionario(p_atribuicao_id)` |
| RPC `reabrir_questionario(p_atribuicao_id uuid)` | já existe, mesma assinatura | `psico_reabrir_questionario(p_atribuicao_id)` |

Confirmado que `get_my_colaborador_id()`, `get_my_company_id()`, `require_admin_role()` e `is_admin_master(_user_id uuid)` existem e serão reutilizados. `ghes` e `notifications` existem com as colunas necessárias.

## Etapas

### 1. Migration — estrutura
7 tabelas conforme especificado (com os nomes acima), cada uma com GRANT para `authenticated` + `service_role`, RLS habilitada e políticas:
- instrumentos/dimensões/perguntas: leitura por autenticados (global `company_id IS NULL` ou da empresa); escrita só admin/RH, apenas quando `editavel = TRUE` **e quando o instrumento não estiver em uso** (nenhuma campanha `em_execucao` ou `finalizada` vinculada).
- avaliações: admin/RH da empresa; colaborador só as que foi atribuído.
- atribuições: admin/RH da empresa; colaborador só as próprias (e só pode atualizar enquanto não estiver `preenchido`). Inclui coluna `rascunho JSONB` para salvamento parcial no servidor.
- respostas: sem acesso direto ao colaborador — leitura só via RPC de resultados.

Triggers: `updated_at` em todas; notificação ao colaborador na atribuição; notificação ao admin/RH quando o status vira `preenchido`. Realtime em `psico_atribuicoes`.

### 2. Migration — seed
4 instrumentos de fábrica (`company_id = NULL`, `editavel = FALSE`, `ativo = TRUE`) com todas as dimensões e as 178 perguntas exatamente com os textos, dimensões, tipo (positiva/negativa) e flag de inversão informados.

### 3. Migration — RPCs
`psico_get_instrumentos`, `psico_get_instrumento_completo`, `psico_save_instrumento`, `psico_save_dimensao`, `psico_save_pergunta`, `psico_criar_avaliacao`, `psico_atribuir_colaboradores`, `psico_get_questionario`, `psico_save_respostas`, `psico_get_resultados_por_ghe`, `psico_get_resultados_gerais`, `psico_reabrir_questionario`.

Todas `SECURITY DEFINER SET search_path = public, pg_temp`, `REVOKE EXECUTE FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated`. Regras de cálculo: score invertido = `6 - valor`; média por dimensão; normalização centesimal `(media - 1) * 25`; GHE com menos de 3 respondentes é omitido dos resultados.

### 4. Frontend — nova aba "Avaliações Psicossociais"
Adicionada ao módulo **Mapa de Riscos NR-1** (junto das abas PROART atuais), visível para admin/RH.

- **Instrumentos**: lista global + da empresa, badge "Modelo padrão", ações Duplicar / Editar perguntas / Excluir (bloqueado quando `editavel = FALSE`), modal de criação do zero, editor de dimensões (nome, tipo positiva/negativa) e editor de perguntas com reordenação por arraste, edição de texto, checkbox "Inverter pontuação" e exclusão.
- **Instrumento em uso**: se houver campanha `em_execucao` ou `finalizada` usando o instrumento, a edição de dimensões e perguntas fica bloqueada (no banco e na UI) com a mensagem "Este instrumento está em uso em campanhas ativas. Duplicar para criar uma versão editável." O botão **Duplicar** permanece sempre disponível.
- **Campanhas**: criar (instrumento, GHEs, período, anonimato), atribuir colaboradores com filtros por GHE / departamento / empresa cliente / busca por nome, acompanhamento em tempo real do status por colaborador com reenviar e reabrir. Bloqueia atribuição sem GHE vinculado.
- **Resultados**: Recharts — radar por dimensão, barras por GHE e comparativo geral, com aviso quando um GHE não atinge o mínimo de 3 respondentes.

### 5. Frontend — colaborador
Nova seção em **Minhas Atividades** com as avaliações atribuídas, execução por seções (uma dimensão por bloco), **rascunho salvo no servidor** (grava em `psico_atribuicoes.rascunho` e coloca o status em `em_andamento`), envio final e modo somente leitura após envio. No envio final o rascunho é limpo (`NULL`) e as respostas vão para `psico_respostas` apenas com `ghe_id` — preservando o anonimato.

### 6. Hooks
`useInstrumentosPsico`, `useAvaliacoesPsico`, `useAtribuicoesPsico`, `useResultadosPsico` — React Query, invalidação por chave e canal Realtime desmontado no unmount.

## Notas técnicas

- Anonimato: `psico_respostas` grava apenas `ghe_id` + `pergunta_id` + valor; o vínculo com o colaborador fica só em `psico_atribuicoes` (status), sem ligação entre as duas.
- `ghe_id` referencia `public.ghes` com `ON DELETE RESTRICT` nas campanhas para não perder histórico.
- Multi-tenant: `company_id` em instrumentos customizados e avaliações; `admin_master` enxerga tudo via `is_admin_master(auth.uid())`.
- Visual: cards com cantos 12px, paleta Navy/Red/Gold, skeletons, empty states e fade-in, responsivo desktop/tablet.

## Ordem de entrega

1. Migration (tabelas + RLS + triggers + Realtime)
2. Seed dos 4 instrumentos
3. RPCs
4. Aba Instrumentos
5. Aba Campanhas
6. Painel de Resultados
7. Seção do colaborador em Minhas Atividades
