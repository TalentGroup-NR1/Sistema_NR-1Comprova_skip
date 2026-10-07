# Backlog de Produto - NR-1Comprova

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

