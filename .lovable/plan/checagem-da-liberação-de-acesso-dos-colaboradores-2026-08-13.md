# Checagem da liberação de acesso dos colaboradores

## O que já está funcionando

- Os e-mails de convite estão saindo. Os três últimos envios (`acesso-liberado`) constam como **enviados** com sucesso hoje, 13/08, incluindo o da colaboradora da imagem (ananda.parracho@gmail.com).
- O fluxo de liberação cria o usuário, vincula o colaborador, define o papel `colaborador` e gera um link de definição de senha de uso único.
- O código que monta o link já aponta para `https://talentgestaoativa.com/atualizar-senha`.

## O que está quebrado

A colaboradora clicou no botão do e-mail e caiu na tela **"Access denied"** do `lovable.dev`, ou seja: o link não terminou no domínio de produção.

O link do e-mail não é a URL final — ele passa primeiro pelo endpoint de verificação da autenticação, que só respeita o destino solicitado se esse endereço estiver na lista de URLs de redirecionamento permitidas. Quando não está, ele cai no **site padrão** configurado no projeto — que hoje ainda é um endereço `.lovable.app` antigo (`tgmais-people-flow.lovable.app`), e não `talentgestaoativa.com`. Esse é o cenário mais provável, mas precisa ser confirmado antes da correção.

## Plano

1. **Confirmar a causa**: gerar um link de recuperação de teste e inspecionar para onde ele efetivamente redireciona (destino permitido x site padrão).
2. **Corrigir a configuração de autenticação**:
   - Site padrão passa a ser `https://talentgestaoativa.com`.
   - Lista de redirecionamentos permitidos passa a incluir `https://talentgestaoativa.com/*`, `https://www.talentgestaoativa.com/*` e a URL de preview (para testes internos).
3. **Validar a página `/atualizar-senha`**: confirmar que ela trata corretamente o token de recuperação (inclusive o formato mais novo, com `token_hash`/`code` na URL) e mostra mensagens claras para link expirado ou já utilizado.
4. **Reenviar os convites afetados**: os três colaboradores já liberados hoje receberam links que apontam para o endereço errado. Após a correção, usar o botão de reenvio para gerar novos links válidos.
5. **Testar ponta a ponta**: liberar o acesso de um colaborador de teste, abrir o link do e-mail em janela anônima, definir a senha e entrar na plataforma.

## Detalhes técnicos

- Ajustar `site_url` e a allow-list de redirect via configuração de auth do projeto (e refletir em `supabase/config.toml`).
- `finalize-colaborador-user` e `reenviar-acesso-colaborador` já usam `APP_ORIGIN` com fallback correto; nenhuma mudança de código esperada nelas.
- Revisar `src/pages/AtualizarSenha.tsx` quanto ao consumo do token (`hash` legado vs `?code=`/`token_hash=` via `verifyOtp`/`exchangeCodeForSession`) e aos estados de erro.
