# Relatório Técnico de Execução: Limpeza dos Tenants Legados (TG MAIS e TG UNITI)

- **Sistema:** NR1Comprova (SaaS B2B Multi-tenant de Gestão de Riscos da NR-1)
- **Ambiente:** Banco de Produção Supabase (`alneozvrsuwszlkisbyo`)
- **Data e Hora de Execução:** 13/10/2026 — 10:35 BRT
- **Status:** CONCLUÍDO COM SUCESSO (100% Validado)

---

## 1. Rastreabilidade de Commits

| Commit | Tipo | Mensagem / Escopo |
|---|---|---|
| `11ca4df` | chore | `chore(dados): script de limpeza tenants legados tg-mais tg-uniti (1/2)` — Mapeamento de 70 tabelas, 87 etapas, geração de backup prévio e script SQL inicial. |
| `0530541` | fix | `fix(dados): correcao de coluna pgr_risco_detalhes e inclusao modulo psico no dryrun` — Correção de `risco_ghe_id` (migration 20260806174518), inclusão do módulo psico e validação de dry-run. |
| *(atual)* | chore | `chore(dados): execucao da limpeza tenants legados (2/2)` — Relatório final pós-execução real no SQL Editor, remoção de storage e validação completa da base. |

---

## 2. Resumo do Ciclo de Segurança e Governança

1. **Backup Físico e Lógico Prévio:**
   - Script de extração executado gerando `scratch/backup_limpeza_20261013.sql` (2.858.754 bytes, 8.133 registros dos tenants legados e 25 usuários).
   - Preservação da empresa piloto ativa **Horizonte Contabilidade** confirmada e excluída do backup de purge.
   - Ponto de restauração WAL-G do Supabase validado ativo (`walg_enabled: true`).

2. **Detecção e Correção de Divergência Estrutural no Dry-Run:**
   - Durante o ensaio do script de simulação com rollback (`docs/limpeza_tg_mais_tg_uniti_DRYRUN.sql`), o PostgreSQL acusou erro na linha 515 (`column ghe_risco_id does not exist`).
   - Investigação nas migrations do repositório revelou a migration `20260806174518_a3b992ae-fbe2-480a-b2ae-73a7999057af.sql`, evidenciando que o nome real da chave estrangeira em `pgr_risco_detalhes` é `risco_ghe_id`.
   - Foi realizada auditoria sistêmica em todas as 275 cláusulas `WHERE` do script contra `information_schema.columns`, resultando em 0 divergências.
   - As tabelas de instâncias psicossociais (`psico_respostas`, `psico_atribuicoes`, `psico_avaliacao_ghes`, `psico_avaliacoes`) foram formalmente incorporadas nas etapas 64 a 67.
   - O dry-run foi reexecutado via transação com rollback garantido, provando que os 141 colaboradores legados e os dados da Horizonte permaneceram íntegros após reversão.

3. **Execução Real em Produção (Transação Atômica):**
   - O script definitivo [`docs/limpeza_tg_mais_tg_uniti.sql`](file:///c:/Users/josenildo.santos/talentgroup/TALENTGROUP%20-%20DHO/Sistema_NR-1Comprova/docs/limpeza_tg_mais_tg_uniti.sql) (*1.802 linhas*) foi executado pelo usuário no SQL Editor do Supabase com `BEGIN; ... COMMIT;`.
   - A transação executou todas as 87 etapas em cadeia bottom-up, removendo as dependências antes dos pais e desvinculando as 25 contas de `auth.users`, retornando `Success`.

4. **Expurgo de Arquivos no Supabase Storage:**
   - Execução do script Node [`scratch/delete_storage_files.cjs`](file:///c:/Users/josenildo.santos/talentgroup/TALENTGROUP%20-%20DHO/Sistema_NR-1Comprova/scratch/delete_storage_files.cjs) utilizando a chave de serviço administrativa local (`SUPABASE_SERVICE_ROLE_KEY` do `.env`, protegida de versionamento).
   - Todos os 16 arquivos PDF legados no bucket `documentos_analise` foram deletados.
   - Apenas a pasta da Horizonte Contabilidade (`8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4`) permaneceu no bucket.

---

## 3. Resultado Oficial da Bateria de Verificação Pós-Execução

Consulta executada no Supabase SQL Editor consolidando as métricas de integridade:

| Item de Auditoria | Descrição / Escopo | Count Encontrado | Count Esperado | Status |
|---|---|:---:|:---:|:---:|
| `a_companies_legadas` | TG MAIS e TG UNITI em `public.companies` | **0** | 0 | ✅ SUCESSO |
| `b_colaboradores_legados` | Colaboradores das empresas legadas | **0** | 0 | ✅ SUCESSO |
| `c_contas_legadas_auth_users` | 25 contas desativadas em `auth.users` | **0** | 0 | ✅ SUCESSO |
| `d1_horizonte_company` | Empresa Piloto Ativa (Horizonte Contabilidade) | **1** | 1 | ✅ PRESERVADO |
| `d2_horizonte_colaboradores` | Colaboradores ativos da Horizonte | **6** | 6 | ✅ PRESERVADO |
| `d3_horizonte_campanhas` | Campanhas ativas da Horizonte | **53** | 53 | ✅ PRESERVADO |
| `e1_nr1_riscos_catalogo` | Catálogo normativo global de riscos NR-1 | **20** | 20 | ✅ PRESERVADO |
| `e2_nr1_proart_perguntas` | Perguntas do questionário PROART global | **47** | 47 | ✅ PRESERVADO |
| `e3_checklist_templates_globais` | Modelos globais de checklist (`company_id IS NULL`) | **2** | 2 | ✅ PRESERVADO |
| `e4_psico_instrumentos` | Instrumento psicossocial global | **1** | 1 | ✅ PRESERVADO |
| `e5_psico_dimensoes` | Dimensões psicossociais globais | **6** | 6 | ✅ PRESERVADO |
| `e6_psico_perguntas` | Perguntas psicossociais globais | **25** | 25 | ✅ PRESERVADO |
| `f_pulse_campaigns_total_base` | Total de campanhas na base (reduzido de 138) | **53** | 53 | ✅ SUCESSO |
| `g1_psico_atribuicoes_orfaos` | Registros órfãos em `psico_atribuicoes` | **0** | 0 | ✅ SUCESSO |
| `g2_psico_avaliacao_ghes_orfaos` | Registros órfãos em `psico_avaliacao_ghes` | **0** | 0 | ✅ SUCESSO |
| `g3_psico_respostas_orfaos` | Registros órfãos em `psico_respostas` | **0** | 0 | ✅ SUCESSO |
| `g4_psico_avaliacoes_orfaos` | Registros órfãos em `psico_avaliacoes` | **0** | 0 | ✅ SUCESSO |

---

## 4. Arquivos Removidos do Bucket `documentos_analise` (Storage)

| # | Caminho do Arquivo Deletado | Tenant de Origem | Status |
|---|---|---|:---:|
| 1 | `pgr-importacoes/fcdfc7aa-f768-4547-82eb-a8bf583ff756/1788349783393_TG MAIS_PGR_062026_052028 (1).pdf` | TG UNITI | ✅ Removido |
| 2 | `pgr-importacoes/fcdfc7aa-f768-4547-82eb-a8bf583ff756/1788356952409_TG MAIS_PGR_062026_052028 (1).pdf` | TG UNITI | ✅ Removido |
| 3 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788282053109_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 4 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788282671925_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 5 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788284028304_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 6 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788284340012_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 7 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788284832855_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 8 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788285150681_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 9 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788285736120_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 10 | `b496582a-fe27-4131-a6fc-bc540f470100/pgr-importacoes/1789495309338_TG UNITI_PGR ADENDO_062026_052028.pdf` | TG MAIS | ✅ Removido |
| 11 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788286043781_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 12 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788286254329_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 13 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788286503837_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 14 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788286527279_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 15 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788287401393_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |
| 16 | `pgr-importacoes/b496582a-fe27-4131-a6fc-bc540f470100/1788287690731_TG MAIS_PGR_062026_052028 (1).pdf` | TG MAIS | ✅ Removido |

---

## 5. Validação de Regressão da Aplicação

- **Suíte de Testes Unitários/Integração:** `npx vitest run`  
  - Resultado: **57 test files passed**, **328 tests passed** (baseline de 328 testes 100% preservada).
- **Compilação de Produção:** `npm run build`  
  - Resultado: **Exit 0**, bundle gerado com sucesso em `dist/`.

---

## 6. Pendências Operacionais do Usuário

> [!IMPORTANT]
> O banco de dados e os buckets de storage encontram-se rigorosamente purgados e prontos para teste.
> Para disponibilizar a interface atualizada no ambiente público:
> 1. Executar o **deploy manual** da pasta `dist/` gerada pelo `npm run build` na Vercel (ou trigger de deploy no dashboard Vercel).
> 2. Executar os **Testes de Fumaça** na interface web conforme checklist operacional.
