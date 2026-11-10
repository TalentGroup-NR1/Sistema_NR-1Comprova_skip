# Procedimento Operacional: Reimportação Segura de Férias Passadas (CSV)

Este documento descreve o procedimento padronizado para reimportar o histórico de férias passadas de uma empresa no módulo de **Gestão de Férias** (`/ferias`), garantindo a preservação da integridade dos saldos, prevenção de duplicidades e auditoria completa.

---

## 1. Pré-Requisitos e Garantias de Integridade

Antes de qualquer reimportação, as seguintes salvaguardas já devem estar ativas no sistema:

1. **Constraint UNIQUE no Banco de Dados (`ferias_gozo_natural_key`)**:
   - Chave natural composta: `(colaborador_id, periodo_aquisitivo_id, data_inicio_gozo, data_fim_gozo)`.
   - Impede no nível de banco qualquer criação de lançamento duplicado com as mesmas datas no mesmo período.
2. **Upsert Idempotente no Importador**:
   - O frontend verifica a existência do registro pela chave natural. Se já existir, executa `UPDATE` dos dias de descanso, abono pecuniário, pagamento e observações; caso contrário, executa `INSERT`.
3. **Backup dos Lançamentos Existentes**:
   - O script `scripts/limpar_import_ferias.ts` gera automaticamente um backup em CSV com codificação UTF-8 BOM em `scratch/backups/`.
   - Backup atual salvo: `scratch/backups/backup_ferias_gozo_946faadf-ec94-4e16-8516-1467bd9fc61c_2026-10-30T18-59-17-985Z.csv` (contém os 80 lançamentos importados anteriormente).

---

## 2. Checklist Antes de Importar

Antes de iniciar o procedimento no painel, valide rigorosamente os 5 itens:

- [ ] **Backup do lote anterior existe em `scratch/backups/`**: Confirmado arquivo CSV de backup com timestamp contendo os 80 registros anteriores.
- [ ] **Dry-run mostra 0 INSERTs**: O resumo visual no topo da prévia deve destacar em verde: `"X linhas serão ATUALIZADAS · 0 linhas serão CRIADAS"`.
- [ ] **Nenhum alerta vermelho de colisão**: Não há avisos bloqueantes de linhas conflitantes em períodos já importados.
- [ ] **Contagem atual de lançamentos confere (99)**: Exatamente 80 importados anteriores + 19 lançamentos manuais na TG MAIS.
- [ ] **Planilha não teve datas alteradas desde a primeira importação**: As datas de início e fim de gozo correspondem exatamente às chaves registradas (apenas as colunas de abono/descanso foram corrigidas).

---

## 3. Passo a Passo da Reimportação com Dry-Run

### Passo 1 — Diagnóstico da Planilha
Antes de abrir a tela de importação, valide o arquivo CSV gerado pelo RH/cliente executando o script de diagnóstico:
```bash
npx tsx scripts/diagnosticar_csv_ferias.ts "caminho/para/planilha_cliente.csv"
```
**O que verificar no relatório:**
- **Separador**: detectado automaticamente (`;`, `,` ou `\t`).
- **Coluna de abono**: deve casar com match exato ou aproximação (ex: `Abono Pecuniário (dias)` -> `abono_pecuniario_dias`).
- **Coluna de descanso**: deve casar com `dias_descanso` ou variação válida.
- **Validade**: `Status de Validade: VÁLIDO PARA IMPORTAÇÃO`.

### Passo 2 — Carregamento no Painel e Análise Prévia (Dry-Run)
1. Acesse o sistema como Administrador da Empresa ou Administrador Operacional.
2. Navegue até o módulo **Gestão de Férias** (`/ferias`) -> aba **Colaboradores**.
3. Clique em **"Importar férias passadas (CSV)"**.
4. Selecione o arquivo CSV da cliente.
5. O sistema executará automaticamente a **Simulação Prévia (Dry-Run)** contra o banco:
   - **Linhas que casam com lançamento existente**: exibidas com badge verde `UPDATE`.
   - **Novas linhas**: exibidas com badge âmbar `INSERT`.
   - **Alerta de Bloqueio de Segurança**: caso o arquivo contenha alguma linha `INSERT` para um colaborador que **já possui** férias marcadas como `'Importado (CSV)'` naquele mesmo período aquisitivo, um alerta vermelho é acionado e o botão de importação é **bloqueado**.

### Passo 3 — Confirmação da Importação
1. Verifique o resumo:
   > *"Simulação prévia (Dry-Run): 80 linha(s) casam com lançamento existente (serão UPDATE) · 0 novas linhas (0 risco de duplicata)."*
2. Clique no botão **"Importar X linhas"**.
3. Ao finalizar, o relatório e o toast confirmam os números exatos:
   > *"X atualizados · Y criados · 0 com erro"*

---

## 4. O Que NÃO Fazer

> [!CAUTION]
> **1. NUNCA executar limpeza total com `--all-gozos`**:
> Na TG MAIS existem 19 lançamentos manuais legítimos (13 com abono pecuniário lançado na tela e 6 agendamentos manuais). Executar deleção irrestrita apagará o histórico legítimo desses colaboradores.
>
> **2. NUNCA reimportar planilha com datas alteradas sem validação prévia**:
> Se a data de início ou fim de gozo for alterada na planilha da cliente para um colaborador que já tem importação no período, o sistema detectará colisão no dry-run e bloqueará para evitar duplicidade de períodos.
>
> **3. NUNCA alterar o schema ou desativar a constraint `ferias_gozo_natural_key`**:
> A constraint é a garantia final de que nenhum processo concorrente gerará duplicidade.

---

## 5. Como Reverter em Caso de Necessidade (Rollback)

Se for necessário restaurar os 80 lançamentos exatamente ao estado em que estavam antes da reimportação:

1. Localize o arquivo de backup gerado em `scratch/backups/backup_ferias_gozo_<company_id>_<timestamp>.csv`.
2. Para restaurar os dados originais via script Node/TypeScript:
   ```typescript
   import { createClient } from "@supabase/supabase-js";
   import fs from "fs";
   import { parseCSV } from "../src/lib/feriasCsvParser";

   const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
   const content = fs.readFileSync("scratch/backups/backup_ferias_gozo_...csv", "utf8");
   const { rows } = parseCSV(content);

   // Percorrer as linhas e restaurar os campos originais via update pelo ID
   for (const row of rows) {
     const [id, colabId, perId, compId, ini, fim, dias, pag, abono, status, obs] = row;
     await admin.from("ferias_gozo").update({
       dias_gozados: Number(dias),
       abono_pecuniario_dias: Number(abono),
       observacoes: obs,
     }).eq("id", id);
   }
   ```
3. Invalide o cache no navegador para atualizar os saldos.

---

## 6. Teste com Cliente Novo (Primeira Importação)

Para validar a importação de férias passadas em uma empresa recém-cadastrada, siga o checklist:

- [ ] **Empresa sem lançamentos anteriores em `ferias_gozo`**: Confirmar que o histórico da empresa está vazio (0 lançamentos prévios).
- [ ] **Baixar modelo CSV e conferir cabeçalhos**: Clicar em "Baixar modelo CSV" e confirmar abertura no Excel com acentos corretos via BOM UTF-8 (`cpf`, `nome`, `periodo_aquisitivo_inicio`, `periodo_aquisitivo_fim`, `data_inicio_gozo`, `data_fim_gozo`, `dias_descanso`, `dias_abono`, `data_pagamento`).
- [ ] **Preencher 2-3 colaboradores com descanso + abono**: Exemplo: 20 dias descanso + 10 dias abono (totalizando 30 dias com datas no passado).
- [ ] **Importar e verificar semáforo âmbar (criações esperadas)**: O Dry-run deve exibir o destaque âmbar: *"Prévia: 0 linhas serão ATUALIZADAS · N linhas serão CRIADAS"* e o botão "Importar N linhas" deve estar habilitado.
- [ ] **Confirmar e validar**: Executar a importação e verificar que os lançamentos foram criados, o abono pecuniário gravado (`abono_pecuniario_dias = 10`), o período aquisitivo fechado (`status = 'fechado'`) e o saldo de férias restante zerado (30 adquiridos - 30 usufruídos/vendidos = 0).
- [ ] **Reimportar o mesmo arquivo e confirmar 0 criações**: Fazer novo upload do mesmo CSV; o Dry-run deve mudar imediatamente para verde (*"N linhas serão ATUALIZADAS · 0 linhas serão CRIADAS"*) e a reimportação não gera nenhuma duplicata.
