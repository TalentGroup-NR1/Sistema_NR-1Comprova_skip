# Relatório de Auditoria e Fechamento: Remoção das Abas "Alinhamento", "Currículo" e "HumanGuide" do Módulo Colaboradores

**Data:** 08/10/2026  
**Sistema:** NR-1Comprova (Ambiente de Produção: `alneozvrsuwszlkisbyo`)  
**Go-Live:** 03/11/2026  
**Status da Frente:** CONCLUÍDA E APROVADA  

---

## 1. Decisões do Gestor Registradas

1. **Exibição Zero:** Nenhuma tela da aplicação (perfil do colaborador, visualização rápida, relatórios ou dashboards) deve exibir os dados de *Alinhamento*, *Currículo* ou *HumanGuide*. Os dados existentes no banco permanecem arquivados e invisíveis na UI.
2. **Interface TypeScript `Colaborador`:** Os campos `alinhamento_notas`, `curriculo_path`, `humanguide_notas` e `humanguide_path` permanecem tipados como `string | null` na interface TypeScript de leitura em `src/hooks/useColaboradores.ts` para assegurar retrocompatibilidade estrita com consultas vindas do Supabase.
3. **Preservação de Banco de Dados (SEM DROP COLUMN):** Nenhuma coluna da tabela `colaboradores` foi ou será removida via migração. Preserva-se o schema e integridade de registros históricos.
4. **Bucket de Storage Arquivado (`colaboradores-curriculos`):** O bucket de storage permanece intacto e arquivado para fins de conformidade legal e LGPD, sem alteração de permissões ou expurgo de arquivos.
5. **Módulo de Recrutamento Intacto:** As referências a `curriculo` e `doc_curriculo_path` no módulo de Análise de Perfil / Recrutamento (IA de análise de candidatos e vagas) não possuem correlação com o wizard de colaboradores e foram mantidas estritamente intocadas.

---

## 2. Checklist de Execução por Etapa

### Etapa 1/4: Remoção da Interface (UI Wizard)
- **Objetivo:** Remover a renderização das 3 abas da interface do wizard de colaborador, sem quebrar compilação nem alterar banco.
- **Arquivos Alterados:**
  - `src/components/colaboradores/ColaboradorForm.tsx`:
    - Removidos do array `tabs`: `{ id: 'alinhamento' }`, `{ id: 'curriculo' }`, `{ id: 'humanguide' }`.
    - Removidos os 3 nós `<TabsContent>` correspondentes a cada aba.
    - Removidos imports órfãos dos componentes e de seus schemas parciais.
- **Provas Técnicas:**
  - `npx vitest run`: 322 testes passaram (exit 0).
  - `npm run build`: Exit code 0 real.

### Etapa 2/4: Desvinculação de Payloads (Validators + Hook)
- **Objetivo:** Desvincular os campos do formulário para que o frontend não envie mais os 3 atributos nas mutações de criação/edição.
- **Arquivos Alterados:**
  - `src/lib/validators/colaborador.ts`:
    - Removidos os schemas `alinhamentoSchema`, `curriculoSchema`, `humanguideSchema`.
    - Removidos do schema principal `colaboradorSchema` os shapes das 3 abas.
    - Removidos os tipos exportados `AlinhamentoFormData`, `CurriculoFormData`, `HumanGuideFormData`.
  - `src/hooks/useColaboradores.ts`:
    - Removidos os campos `alinhamento_notas`, `curriculo_path`, `humanguide_notas`, `humanguide_path` das mutações `useCreateColaborador` e `useUpdateColaborador`.
  - `src/components/colaboradores/ColaboradorForm.tsx`:
    - Removidos os 4 campos de `emptyDefaults` e de `form.reset()`.
- **Provas Técnicas:**
  - `npx vitest run`: 322 testes passaram (exit 0).
  - `npm run build`: Exit code 0 real (bundle: `kXkMV4S-.js`).

### Etapa 3/4: Remoção Física dos Arquivos Órfãos de Tabs
- **Objetivo:** Excluir fisicamente os arquivos das abas órfãs e comprovar que nenhuma quebra de importação existe na árvore de módulos.
- **Arquivos Deletados:**
  - `src/components/colaboradores/tabs/AlinhamentoTab.tsx` (Removido)
  - `src/components/colaboradores/tabs/CurriculoTab.tsx` (Removido)
  - `src/components/colaboradores/tabs/HumanGuideTab.tsx` (Removido)
- **Provas Técnicas:**
  - Grep por `AlinhamentoTab|CurriculoTab|HumanGuideTab`: **0 ocorrências**.
  - Grep por `alinhamento_notas`, `curriculo_path`, `humanguide_notas`, `humanguide_path`: restrito exclusivamente à interface `Colaborador` (`useColaboradores.ts`) e aos types gerados do Supabase (`types.ts`).
  - `npx vitest run`: 322 testes passaram (exit 0).
  - `npm run build`: Exit code 0 real (bundle: `B2XHDDNj.js`).

### Etapa 4/4: Auditoria Final, Documentação e Encerramento
- **Objetivo:** Auditoria consolidada, verificação de não-regressão e registro de pendências de deploy.
- **Documento Gerado:** `docs/auditorias/remocao_abas_colaborador.md`.

---

## 3. Evidências Consolidadas de Auditoria

### 3.1. Greps Finais no Código-Fonte (`src/`)
- **Nomes de Componentes de Tab:**
  - Query: `AlinhamentoTab|CurriculoTab|HumanGuideTab`
  - Saída: `0 ocorrências` (nenhum import órfão ou referência morta).
- **Campos de Banco:**
  - `alinhamento_notas`: `src/hooks/useColaboradores.ts` (apenas leitura na interface `Colaborador`) e `types.ts`.
  - `curriculo_path`: `src/hooks/useColaboradores.ts` (apenas leitura na interface `Colaborador`) e `types.ts`.
  - `humanguide_notas`: `src/hooks/useColaboradores.ts` (apenas leitura na interface `Colaborador`) e `types.ts`.
  - `humanguide_path`: `src/hooks/useColaboradores.ts` (apenas leitura na interface `Colaborador`) e `types.ts`.

### 3.2. Suíte de Testes Automatizados
- **Comando:** `npx vitest run`
- **Resultado:** 54 arquivos de teste passaram, **322 testes passaram (100%)**.
- **Exit Code:** 0.

### 3.3. Build de Produção
- **Comando:** `npm run build`
- **Resultado:** Compilação concluída com sucesso via Vite + Rollup sem erros de TypeScript.
- **Bundle Principal:** `dist/assets/B2XHDDNj.js` (4.906 kB).
- **Exit Code:** 0.

### 3.4. Integridade do Git Status
Arquivos modificados na frente de remoção de abas:
- `M src/components/colaboradores/ColaboradorForm.tsx`
- `M src/hooks/useColaboradores.ts`
- `M src/lib/validators/colaborador.ts`
- `D src/components/colaboradores/tabs/AlinhamentoTab.tsx`
- `D src/components/colaboradores/tabs/CurriculoTab.tsx`
- `D src/components/colaboradores/tabs/HumanGuideTab.tsx`

Arquivos preservados dos ciclos anteriores do Cuidar+ (sem alterações indevidas nesta frente):
- `M src/components/cuidar-mais/fiscalizacao/FiscalizacaoList.tsx` (Tratamento fail-closed de erro no painel)
- `M src/components/cuidar-mais/pulso/PulsoColaboradorDetail.tsx` (Tratamento de erro e exibição de histórico do colaborador)
- `M src/pages/CuidarMais.tsx` (Gate de visibilidade da aba Acompanhamentos para gestor)
- `M src/pages/__tests__/CuidarMaisGate.test.tsx` (Cobertura de testes para gates do Cuidar+)
- `?? src/components/cuidar-mais/pulso/__tests__/PulsoColaboradorDetail.test.tsx` (Teste unitário criado no Ciclo 1)
- `M .gitignore` (Inclusão de `supabase/.temp/`)

---

## 4. O que resta para subir a Release em Produção (Fora do escopo desta frente)

1. **Deploy Frontend:**
   - Executar `npm run build` e publicar os arquivos do diretório `dist/` no provedor de hospedagem de produção (Vercel / AWS / Hostinger).
2. **Rebranding de Domínio (se aplicável ao cutover de 03/11):**
   - Atualizar Site URL e Redirect URLs no painel de Autenticação do Supabase.
   - Configurar domínios permitidos no CORS das Edge Functions / API.
   - Atualizar variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` se houver alteração de instância.
3. **Auditoria de Migrations e Deploy Consolidado:**
   - Garantir que as migrations dos ciclos 1 a 5 do Cuidar+ já estão devidamente refletidas no schema de produção (`schema_migrations`).
