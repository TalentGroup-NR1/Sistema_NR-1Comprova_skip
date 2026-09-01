# Matriz de Risco 5×5 no Mapa de Riscos NR-1

Nova aba "Matriz de Risco" no módulo NR-1, cobrindo riscos ocupacionais tradicionais (físico, químico, biológico, ergonômico, acidente) e psicossociais, com sugestão semi-automática a partir do que já está cadastrado (GHE, cargos, tarefas, ambiente do setor) e dos resultados das avaliações psicossociais.

## Como fica para o usuário

**Aba nova (só admin / RH; colaborador não vê).**

1. Escolhe um GHE no topo.
2. Vê a matriz 5×5 (Probabilidade × Severidade) com as células coloridas por faixa: Verde (aceitável), Amarelo (tolerável), Laranja (importante), Vermelho (crítico). Cada célula mostra o nível (P×S) e um badge com a quantidade de riscos; ao clicar, lista os riscos daquela posição.
3. Abaixo, a tabela de riscos do GHE: Nome, Categoria (com cor por tipo), Probabilidade, Severidade, Nível, Fonte, Origem e ações (Editar, Ver planos de ação, Excluir). Filtro por categoria.
4. Botões de ação:
   - **Sugerir Riscos** — o sistema lê os cargos do GHE (tarefa prescrita, tarefa real, descrição de atividades, CBO) e o ambiente físico do setor, cruza com palavras-chave do catálogo e abre um painel de sugestões. Cada sugestão traz o motivo ("Encontrado 'carregar caixas' na tarefa real do cargo Auxiliar de Logística"), probabilidade/severidade editáveis e botões Aceitar / Rejeitar. Nada é criado sem aceite.
   - **Sincronizar Psicossociais** — escolhe uma campanha psicossocial e cria riscos psicossociais para os GHEs em risco alto/médio, com plano de ação vinculado. Não sobrescreve o que já existe.
   - **Adicionar Risco Manualmente** — formulário com nome (autocomplete do catálogo ou texto livre), categoria, probabilidade e severidade descritivas (1=Muito Baixa … 5=Muito Alta / 1=Insignificante … 5=Catastrófica), nível calculado com cor ao vivo, descrição, controles existentes e origem.
5. Engrenagem: ajusta os cortes de cor da matriz por empresa, com preview.
6. Em cada risco, painel de planos de ação vinculados (`nr1_planos_acao`) e botão para criar um novo plano (descrição, responsável, prazo, status).

Catálogo de fábrica com 25 riscos já semeados (5 físicos, 4 químicos, 2 biológicos, 4 ergonômicos, 5 de acidentes, 5 psicossociais), não editáveis, disponíveis para todas as empresas; a empresa pode criar riscos próprios.

## Detalhes técnicos

**Migration 1 — estrutura**
- `nr1_riscos_catalogo` (`company_id` nulo = fábrica), `nr1_ghe_riscos` (com `nivel_risco` gerado `probabilidade * severidade`, FK `ghe_id` → `ghes` ON DELETE RESTRICT, `risco_id` ON DELETE SET NULL), `nr1_matriz_config` (`company_id` UNIQUE, cortes 4/9/14/25), `nr1_regras_sugestao`.
- GRANT na mesma migration: `SELECT/INSERT/UPDATE/DELETE` para `authenticated`, `ALL` para `service_role`, sem `anon`. Depois `ENABLE ROW LEVEL SECURITY` e policies:
  - catálogo: leitura para autenticados quando `company_id IS NULL OR company_id = get_my_company_id()`; escrita apenas admin/RH, verificada com `has_role(auth.uid(), 'admin_master'|'admin_empresa'|'analista_rh')` + company (`is_admin_master(auth.uid())` libera tudo). Observação: `require_admin_role()` retorna `void` e levanta exceção, então não pode ser usado dentro de policy — ele é usado nas RPCs; nas policies fica o equivalente com `has_role`. `psico_is_rh()` não é usado.
  - `nr1_ghe_riscos`, `nr1_matriz_config`, `nr1_regras_sugestao`: apenas admin/RH da empresa.
- Trigger `updated_at` reaproveitando o padrão existente; `ALTER PUBLICATION supabase_realtime ADD TABLE public.nr1_ghe_riscos`.
- CHECKs de 1–5 em probabilidade/severidade (imutáveis, ok como CHECK).

**Migration 2 — seed**
- 25 riscos de fábrica (`company_id NULL`, `editavel=false`) e as regras de sugestão correspondentes para `tarefa_prescrita`, `tarefa_real`, `descricao_atividades`, `ambiente_fisico`, `cbo_descricao`, padrão P3×S3.
- Os 5 psicossociais entram sem palavras-chave (alimentados pelo heatmap).

**RPCs** (todas `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `REVOKE EXECUTE FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated`, iniciando com `PERFORM require_admin_role()` + checagem de company):
- `nr1_sugerir_riscos(p_ghe_id)` — cruza cargos do GHE + `setores.ambiente_fisico` com as regras via `ILIKE`, mais sugestões psicossociais quando houver campanha com índice em risco; retorna JSONB sem gravar. Cada sugestão traz `ja_adicionado: true/false` comparando com os riscos já ativos em `nr1_ghe_riscos` do GHE — na UI essas aparecem como "Já adicionado" com o botão Aceitar desabilitado.
- `nr1_get_matriz(p_company_id)`, `nr1_get_matriz_por_ghe(p_ghe_id)`, `nr1_save_risco_ghe(p_ghe_id, p_risco_data jsonb)`, `nr1_delete_risco_ghe(p_risco_id)` (soft delete via `ativo=false`).
- `nr1_save_risco_ghe` valida, antes de gravar, que o GHE pertence à empresa do usuário: `ghes.company_id` é coluna direta (verificado), então a checagem é `ghes.company_id = get_my_company_id()` — sem precisar percorrer setores/departamentos; `is_admin_master` ignora a restrição. Mismatch levanta exceção `PERMISSION_DENIED`.
- `nr1_sync_psicossociais(p_avaliacao_id)` — a RPC existente no banco é `psico_get_heatmap(p_avaliacao_id uuid, p_agrupamento text)` (verificado; `psico_get_resultados_por_ghe` não existe), então a sincronização usa `psico_get_heatmap(..., 'ghe')`. Mapeia índice → P/S (60–74 → 4×4, 75–89 → 4×5, 90–100 → 5×5), cria riscos `fonte='psicossocial'` sem duplicar e planos em `nr1_planos_acao` — a tabela já existe e já possui `grupo_tipo`, `grupo_id`, `dimensao_id`, `dimensao_nome` e `indice` (verificado), portanto nenhuma coluna nova é necessária; o vínculo com o risco é registrado em `origem`/`descricao`.
- `nr1_get_matriz_config(p_company_id)` / `nr1_save_matriz_config(p_company_id, p_config jsonb)` — cria a linha padrão no primeiro acesso.

**Frontend** — `src/components/mapa-riscos/matriz/`: `MatrizRiscoTab.tsx`, `MatrizGrid.tsx`, `RiscosPanel.tsx`, `SugestoesModal.tsx`, `RiscoFormDialog.tsx`, `MatrizConfigDialog.tsx`, `PlanosAcaoPanel.tsx`. Hooks `useMatrizRisco`, `useSugestaoRiscos`, `useRiscosGhe`, `useMatrizConfig` (React Query, mesmo padrão de `usePsicoHeatmap`). Helper `src/lib/matrizRisco.ts` com faixas, rótulos de P/S e cores por categoria. Nova aba em `MapaRiscosNR1.tsx` (admin passa de 6 para 7 abas). GHEs vêm de `useGhes(companyId)` com `useEffectiveCompanyId`.

**Ordem de execução:** migration de estrutura → seed → RPCs → aba + grade + tabela → sugestões → sincronização psicossocial → planos de ação → configuração de cortes.
