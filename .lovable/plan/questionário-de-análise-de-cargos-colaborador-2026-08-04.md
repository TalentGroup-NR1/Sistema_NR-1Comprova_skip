# Questionário de Análise de Cargos (colaborador)

O módulo Estrutura Organizacional passa a ter 4 abas: Configuração, Descrições de Cargo, Questionários (modelos) e Minhas Atividades.

## Aba 1 — Questionários (modelos)

CRUD de modelos reutilizáveis: criar, duplicar, editar, ativar/inativar.

Modelo padrão já carregado com as seções do formulário Word:

1. Instruções (texto de abertura exibido antes de responder, configurável)
2. Identificação (pré-preenchida: nome, cargo, nível, empresa, empresa cliente, departamento, gestão técnica)
3. Descrição sumária (texto + exemplos)
4. Atividades (bloco repetível: O que faz / Como faz / Para que é feito / Complexidade Alta-Média-Baixa / Frequência Diária-Semanal-Quinzenal-Mensal-Trimestral-Anual)
5. Formação acadêmica (nível + Cursando/Completo)
6. Cursos, certificações e habilitações (item + Desejável/Indispensável)
7. Experiência mínima (até 3 meses, 6-12 meses, 2-3 anos, 4-5 anos, 7-10 anos, acima de 10)
8. Atitudes / competências comportamentais
9. Responsabilidades (informações confidenciais Sim/Não + quais; erros e prejuízos Sim/Não + quais)

Tipos de pergunta: texto curto, texto longo, escolha única, múltipla escolha, sim/não, bloco repetível de atividades. Cada pergunta tem título, texto de ajuda/exemplo, obrigatoriedade e ordem (drag para reordenar).

## Aba 2 — Dentro do formulário de Descrição de Cargo

Nova seção "Questionário do colaborador":

- escolher o modelo base;
- ajustar perguntas apenas para aquela descrição (incluir, excluir, reordenar, editar texto) sem alterar o modelo global — snapshot em JSONB;
- botão "Habilitar para colaboradores" → seleção de quem responde (filtros: cargo, departamento, empresa cliente, busca por nome);
- lista de destinatários com status Pendente / Em andamento / Preenchido (com data);
- ações por destinatário: ver respostas, reenviar aviso, remover atribuição.

Painel lateral de consolidação:

- lista todos os colaboradores atribuídos e o conteúdo enviado, navegável por abas quando houver mais de uma resposta;
- botão "Usar como base" importa aquele conjunto de respostas para os campos da descrição:
  - Descrição sumária → `descricao_sumaria`
  - Bloco de atividades → `responsabilidades` (array JSON)
  - Formação acadêmica → `formacao_academica`
  - Cursos → `cursos_necessarios` / `cursos_desejaveis`
  - Experiência → `fator_experiencia`
  - Sigilo → `fator_responsabilidade_sigilo`
  - Erros → `fator_responsabilidade_erros`
  - Atitudes → `habilidades_comportamentais`
- nada é sobrescrito automaticamente; o admin edita e reescreve, e pode copiar trechos individuais de qualquer resposta;
- o botão "Baixar PDF" continua funcionando como hoje.

## Aba 3 — Minhas Atividades (admin/RH)

- Lista as descrições de cargo em andamento: cargo, departamento, colaboradores atribuídos, quantos já responderam.
- Ao selecionar uma descrição: seleção de colaboradores com filtros (cargo, departamento, empresa cliente) e busca por nome.
- Tabela de acompanhamento por colaborador: status, data de atribuição, data de resposta — atualizada em tempo real (Realtime).
- Ações: reenviar aviso, remover atribuição, abrir resposta enviada.

## Página "Minhas Atividades" (colaborador)

- Novo item no menu lateral, visível para todos os perfis, com badge de pendência; rota `/minhas-atividades`.
- Lista os questionários habilitados (pendentes e enviados).
- Ao abrir: primeiro a tela de instruções e exemplos, com botão "Iniciar preenchimento".
- Depois o questionário por seções, com identificação pré-preenchida, "Salvar e continuar depois" e envio final.
- Após o envio fica em modo leitura; reabertura apenas se o RH liberar novamente.

## Notificações

Ao atribuir: notificação para o colaborador ("Você tem um questionário de descrição de cargo para responder"), visível na tela inicial e na central de notificações, com badge no menu.

Ao concluir: notificação para quem criou a descrição e para os perfis admin/RH da empresa, com link direto; status vira "Preenchido" com data e a descrição exibe badge "Preenchido" e o contador de respostas.

## Banco de dados

Nova migration com GRANT + RLS por `company_id`:

- `questionario_modelos` (id, company_id, nome, descricao, instrucoes, ativo, created_at, updated_at)
- `questionario_secoes` (id, modelo_id, titulo, descricao, tipo, ordem)
- `questionario_perguntas` (id, secao_id, tipo, titulo, texto_ajuda, obrigatorio, ordem)
- `questionario_opcoes` (id, pergunta_id, valor, ordem)
- `descricao_questionario` (id, descricao_cargo_id, modelo_base_id, customizacao jsonb, ativo, created_at)
- `questionario_atribuicoes` (id, descricao_questionario_id, colaborador_id, status enum pendente/em_andamento/preenchido, data_atribuicao, data_resposta)
- `questionario_respostas` (id, atribuicao_id, pergunta_id, valor jsonb, created_at)

RLS:

- modelos, seções, perguntas, opções e `descricao_questionario`: leitura/escrita para admin/RH da empresa; colaborador sem acesso direto.
- `questionario_atribuicoes`: admin/RH vê tudo da empresa; colaborador vê apenas as próprias (via `get_my_colaborador_id()`).
- `questionario_respostas`: admin/RH vê tudo da empresa; colaborador apenas as respostas das próprias atribuições.

Triggers: notificação ao inserir atribuição; notificação ao mudar status para `preenchido`; `updated_at` automático. Realtime habilitado em `questionario_atribuicoes`.

## Segurança

- RPCs `SECURITY DEFINER` com `SET search_path = public, pg_temp`.
- `REVOKE EXECUTE FROM PUBLIC, anon` e `GRANT EXECUTE TO authenticated`.
- Helpers já existentes no banco e reutilizados como estão: `get_my_colaborador_id()`, `get_my_company_id()`, `require_admin_role()` e `is_admin_master(_user_id uuid)` (usado com parâmetro). Nenhum precisa ser recriado.
- Colaborador nunca lê modelos/seções/perguntas diretamente — só responde via atribuição, que devolve o snapshot pela RPC `get_questionario_para_colaborador`.
- Não é possível atribuir questionário sem descrição de cargo vinculada.


## Frontend

- `QuestionariosTab.tsx` + editor de seções/perguntas com reordenação.
- Seção "Questionário do colaborador" e painel de respostas em `DescricaoCargoForm.tsx`.
- `MinhasAtividadesAdminTab.tsx` (aba do módulo).
- `src/pages/MinhasAtividades.tsx` (rota `/minhas-atividades`) e entrada no `Sidebar.tsx` com badge.
- Hooks: `useQuestionarioModelos.ts`, `useDescricaoQuestionario.ts`, `useQuestionarioAtribuicoes.ts`, `useMinhasAtividades.ts`.

## Fora de escopo

- Nenhuma alteração estrutural em cargos, departamentos, níveis ou geração de PDF — apenas acréscimos.
- Não criar Mapa de Risco NR1 nem questionários COPSOQ II / PROART agora.

## Ordem de implementação

1. Migration: 7 tabelas + GRANT + RLS + triggers + Realtime
2. RPCs: `get_modelos_questionario`, `save_modelo`, `get_descricao_questionario`, `save_customizacao`, `atribuir_colaboradores`, `get_atribuicoes`, `save_resposta`, `get_respostas`, `get_questionario_para_colaborador`, `reabrir_questionario`
   - `get_questionario_para_colaborador(p_atribuicao_id)`: valida que a atribuição pertence ao colaborador autenticado (`colaborador_id = get_my_colaborador_id()`) e devolve o snapshot JSONB da customização já filtrado para o que o colaborador pode ver, mais os dados de identificação pré-preenchidos (nome, cargo, nível, empresa, empresa cliente, departamento, gestão técnica). Não expõe as tabelas de modelos, seções ou opções.
   - `reabrir_questionario(p_atribuicao_id)`: exclusiva de admin/RH (`require_admin_role()` / `is_admin_master`), volta o status de `preenchido` para `em_andamento`, libera a edição das respostas e notifica o colaborador sobre a reabertura.
3. Aba Questionários (CRUD de modelos + editor)
4. Seção no formulário de Descrição de Cargo + painel de respostas
5. Aba Minhas Atividades (admin)
6. Página Minhas Atividades (colaborador)
7. Notificações
8. Sidebar com badge
