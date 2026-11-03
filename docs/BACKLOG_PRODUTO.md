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

---

## Convenção de tags de release
- Criar UMA tag por release deployado (não por mudança semântica)
- Formato: `v<MAJOR>.<MINOR>.<PATCH>-<slug-da-feature>`
- Usar prefixo "pre-" APENAS quando houver alteração de código entre a tag anterior e o deploy. Se dois commits consecutivos são apenas documentação, não criar tag nova.
- Por que: `v1.1.0` e `v1.1.1` apontaram para `bc6b5d9` por engano, causando confusão em rollback.

---

## Confirmação de PGR sem validação de servidor — ALTA
**Sintoma:** useConfirmarImportacaoPgr grava em pgr_importacoes e
pgr_plano_acao diretamente via cliente PostgREST, sem passar pela Edge
Function pgr-confirmar.

**Riscos:**
- Sem validação de payload no servidor (browser envia o que quiser)
- Sem log de auditoria transacional (quem confirmou o quê e quando)
- Operação não atômica (grava importação e falha em plano_acao deixa
  estado inconsistente)
- RLS é a única barreira de isolamento multi-tenant

**Impacto NR-1:** impossibilita responder com confiança "quem confirmou
este mapa de riscos" em auditoria fiscal.

**Ação:** migrar a confirmação para Edge Function transacional usando
pgr-confirmar (já corrigida e pronta).

---

## Arquivos órfãos no Storage quando a exclusão do PGR falha — MÉDIA
**Sintoma:** pgr-excluir remove do Storage primeiro, mas se o Storage
retornar erro, apenas emite console.warn e prossegue com o DELETE do
registro em pgr_importacoes. O arquivo permanece no bucket
documentos_analise sem nenhuma referência no banco.

**Riscos:**
- Custo: PDFs órfãos acumulam e são cobrados indefinidamente
- LGPD: PGR contém avaliação de riscos psicossociais (dado sensível);
  arquivo sem titular identificável no sistema dificulta resposta a
  requisição de exclusão
- Governança: nenhuma trilha aponta para o arquivo

**Ação sugerida:**
1. Criar rotina de reconciliação periódica:
   listar objetos em documentos_analise, cruzar com arquivo_storage em
   pgr_importacoes, e logar/alertar sobre órfãos.
2. Registrar em tabela de auditoria toda exclusão que tenha falhado no
   Storage, com o path e timestamp, para limpeza posterior.
3. Avaliar retenção automática (lifecycle policy no bucket) para
   objetos sem referência por > 90 dias.

**Prioridade:** MÉDIA (era BAIXA antes da análise de LGPD).

---

## Vínculo risco→ação nunca existiu (ALTA)
**Sintoma:** a coluna risco_referenciado nunca existiu em
pgr_plano_acao. O campo existe apenas na interface TypeScript
AcaoExtraida, mas nada o popula (nem a IA, nem formulário). As 22 ações
existentes ficaram com risco_id = NULL no backfill.
**Impacto:** não há como saber qual ação mitiga qual risco sem
intervenção humana. Ao excluir um risco, nenhuma ação é afetada — mas
também não há rastreabilidade de mitigação, exigida pela NR-1.
**Ação (Ciclo 2):** adicionar seletor de risco no AcaoDialog e no
formulário de criação de ação. Não há vínculo herdado a migrar.

---

## Dois mecanismos de papel convivem (MÉDIA)
**Sintoma:** as policies usam public.get_my_role() = role OR
public.has_role(uid, role). Há duas fontes de verdade: profiles.active_role
e a tabela user_roles.
**Impacto:** foi a causa raiz do BOOT_ERROR em pgr-excluir/pgr-confirmar
(bug dbRoles). A dupla checagem nas policies é defesa, mas a ambiguidade
permanece.
**Ação:** unificar a resolução de papéis em uma única função e ajustar
policies. Não urgente, mas é dívida que já causou incidente.

---

## Confirmar status das importações após backfill (BAIXA)
**Sintoma:** o backfill filtra WHERE status='confirmado'. Se houver
importações em processando/aguardando_revisao com riscos, elas não
migraram.
**Ação:** validar e, se necessário, rodar o backfill novamente
(idempotente).

---

## Confirmação de exclusão de risco deve ser mais explícita — MÉDIA
**Sintoma:** durante o teste de bloqueio referencial, foi excluído um
risco real por engano. O AlertDialog atual ("Esta ação não pode ser
desfeita") não deixa claro qual risco será removido nem permite
revisão.
**Impacto:** exclusão acidental de risco do inventário NR-1. Só é
recuperável via JSONB de origem (não há soft delete em pgr_riscos).
**Ação:** no Ciclo 3, incluir o nome do risco no corpo do AlertDialog
e avaliar soft delete (coluna deleted_at) para permitir restauração.




