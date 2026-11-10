# E-mail de boas-vindas com link de definição de senha

## Objetivo

Ao habilitar o acesso do colaborador ("Finalizar Cadastro"), o sistema envia automaticamente um e-mail de boas-vindas com um **link seguro para o próprio colaborador definir a senha**. O admin não define mais a senha e nenhuma senha trafega por e-mail.

## Pré-requisito: domínio de envio

O projeto ainda não tem domínio de e-mail configurado. Para enviar e-mails em nome da Talent Group (ex.: `naoresponda@notify.talentgestaoativa.com`) é preciso concluir a configuração do domínio — sem isso nenhum e-mail do app pode sair. Como você já usa `talentgestaoativa.com`, dá para usar um subdomínio dele.

Esse é o primeiro passo, feito pelo assistente de configuração de e-mail; depois a implementação segue automaticamente.

## O que será construído

### 1. Habilitação sem senha
- O usuário é criado no Auth com uma senha aleatória interna descartável (nunca exibida, nunca enviada) e marcado como "deve definir senha".
- O sistema gera um **link de recuperação/definição de senha** oficial do Auth, com token único e expiração padrão de 24h (configurável).
- O diálogo "Finalizar Cadastro" deixa de pedir senha e confirmação; passa a mostrar o resumo do colaborador e o botão "Liberar acesso e enviar e-mail".

### 2. Template "Acesso liberado"
Com a identidade visual do sistema (navy/vermelho/dourado, logo da empresa quando houver):
- Saudação com o nome do colaborador
- Nome da empresa
- "Seu acesso ao sistema foi liberado"
- Botão **"Definir minha senha"** com o link
- Aviso "Este link expira em 24 horas"
- Sem senha, sem e-mail de acesso, sem dados sensíveis no corpo

### 3. Fluxo do colaborador
- Clica no botão → cai na tela de definição de senha (a página `/atualizar-senha` já existente, ajustada para o contexto de primeiro acesso: título "Definir minha senha", validação de força e confirmação).
- Ao salvar a nova senha, o acesso passa a funcionar normalmente e ele segue para o sistema/login.
- Token de uso único: some após ser consumido.
- Link expirado → "Link expirado. Solicite um novo e-mail ao RH."
- Senha já definida e link reutilizado → "Sua senha já foi definida. Faça login."

### 4. Interface do admin
- Sucesso: "Acesso criado. E-mail de definição de senha enviado para \<e-mail\>".
- Falha no envio: "Acesso criado, mas o e-mail falhou. Clique em Reenviar."
- Botão **"Reenviar e-mail de definição de senha"** na listagem/ficha do colaborador — gera novo link e invalida o anterior.

### 5. Auditoria e segurança
- Nova tabela de auditoria registrando: colaborador, e-mail destino, quem disparou, quando, e se o envio teve sucesso. **O token nunca é gravado nem logado.**
- Token único, não reutilizável, expiração de 24h.
- Acesso à auditoria restrito a admin_master / admin_empresa (RLS por `company_id`).
- **Rate limiting no reenvio**: reutiliza o mesmo padrão já usado em `/colaboradores` (RPC `check_rate_limit` no banco), limitando a **5 reenvios por hora por colaborador**. Ao exceder: "Limite de reenvios atingido. Tente novamente em 1 hora."

## Detalhes técnicos

- Configuração do domínio + `setup_email_infra` + `scaffold_transactional_email`.
- Template React Email `acesso-liberado.tsx` registrado no registry.
- Usuário criado com senha aleatória interna de 64 caracteres, nunca exibida nem enviada — sem flag adicional de "deve definir senha"; o acesso só é possível após o colaborador usar o link.
- `finalize-colaborador-user`: remove exigência de `password` no payload, cria/vincula o usuário, chama `auth.admin.generateLink({ type: 'recovery' })` com `redirectTo` para `/atualizar-senha`, e enfileira o envio via `send-transactional-email` com `idempotencyKey` derivado de `colaborador_id + timestamp`. Falha de e-mail retorna `email_sent: false` sem derrubar a habilitação.
- Nova função `reenviar-acesso-colaborador` (JWT + validação de papel e empresa) chamando `check_rate_limit(uid, 'reenvio_acesso:<colaborador_id>', 5, 60)` antes de gerar novo link.
- Ajustes em `FinalizeColaboradorDialog.tsx`, `useColaboradoresPendentes.ts`, `PendingColaboradoresTable.tsx` e `AtualizarSenha.tsx`.
