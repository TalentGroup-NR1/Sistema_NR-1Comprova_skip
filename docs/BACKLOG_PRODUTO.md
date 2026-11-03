# Backlog de Produto - NR-1Comprova

## Módulo de Férias — Pós-Go-Live (03/11/2026)

### 1. DIVERGÊNCIA data_limite_gozo (ALTA)
- **Origem da Divergência:**
  - `feriasEngine.ts`: `calcularLimiteGozo(fimAquisitivo)` = fim + 12 meses − 60 dias (margem conservadora para evitar dobra).
  - RPC `ensure_periodos_aquisitivos_company`: fim + 12 meses (prazo estrito CLT art. 134).
- **Evidência Real:** Admin Temporário (Horizonte), período `07/10/2026` a `07/10/2027`, limite gravado `08/08/2028` (= fim + 12m − 60d). Limite legal pelo art. 134 seria `07/10/2028`.
- **Impacto:** A feature de férias vencidas depende deste campo no banco. Se houver divergência entre as duas regras gravadas, a contagem de férias vencidas e a vencer pode variar em até 60 dias.
- **Ação:** Decidir com jurídico entre limite estrito (CLT) ou margem conservadora de 60 dias, unificar as duas fontes na mesma fórmula e rodar migration de correção/alinhamento nos registros existentes em `ferias_periodos_aquisitivos`.

### 2. Teste de Férias VENCIDAS com Dado Real em Produção (MÉDIA)
- O caminho de "Férias Vencidas" foi validado em produção com 0 registros na Horizonte Contabilidade (cenário limpo e esperado).
- **Ação:** Criar um colaborador temporário de teste com período aquisitivo vencido, validar o badge vermelho `"Férias vencidas"` em tela, o incremento do card para `1` e a lista filtrada, e remover o registro de teste em seguida.

### 3. Filtro de Férias em URL (searchParams) (BAIXA)
- Atualmente o filtro `filtroFerias: 'todas' | 'vencidas' | 'a_vencer'` vive em `useState` local no `Ferias.tsx`. Recarregar a página (F5) ou compartilhar o link reseta o estado para `'todas'`.
- **Ação:** Migrar para sincronização com `useSearchParams` (`?tab=colaboradores&filtro=vencidas`), permitindo links diretos e persistência no refresh.

---

## Reativar módulo Ponto Eletrônico
**Motivo da ocultação:** O módulo de ponto eletrônico foi ocultado porque seu uso depende de um registro/licenciamento que ainda não existe no MVP.
**Objetivo:** Reabilitar a rota e os pontos de acesso assim que a documentação estiver regularizada.

**Arquivos alterados na ocultação (necessário reverter):**
1. `src/components/layout/Sidebar.tsx`
   - O item de menu `{ icon: Clock, label: "Ponto Eletrônico", href: "/ponto-eletronico" }` foi comentado no array `departamentoPessoalItems`.
2. `src/components/dashboard/DashboardColaborador.tsx`
   - O componente `<MeuPontoCard />` foi removido da renderização.
   - O componente `<ProximasFeriasCard />` subiu para a área onde o ponto eletrônico ficava, sendo necessário retornar para a validação `podeAcessarPonto?.podeAcessar`.
3. `src/App.tsx`
   - A rota `/ponto-eletronico` está apontando para `<Navigate to="/" replace />` em vez do componente `<ProtectedRoute><PontoEletronico /></ProtectedRoute>`.
4. `src/components/landing/FeaturesSection.tsx`
   - O objeto de funcionalidade "Ponto Eletrônico" foi removido do array de renderização.
5. `src/components/layout/MainLayout.tsx`
   - A renderização do `<PontoAssinaturaBlockerModal />` foi comentada.

---

## Multi-Perfil Fase 2 (Pós Go-Live)
Consulte o documento completo de fechamento e especificação da Fase 2 em: docs/MULTI_PERFIL_FASE1_FECHAMENTO.md.
- Refatoração N:N em user_companies (múltiplos papéis por empresa).
- Reescrever has_role() para verificar o active_role contextualmente selecionado.
- Revisão e granularização das 400+ policies de RLS do banco de dados.
