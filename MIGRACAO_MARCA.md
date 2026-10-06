# Documento de Migração de Marca (Etapa 3 / Deploy)

Este documento centraliza as variáveis, domínios e configurações de infraestrutura que estão acoplados ao deploy e precisam ser substituídos em ambiente de produção para concluir a transição da marca para **NR-1Comprova**.

## A. Variáveis de Ambiente a Renomear no Painel
- **Onde:** Painel Vercel / Supabase (Settings -> Environment Variables)
- **Variáveis Afetadas:** Não foram identificadas chaves com o nome da marca estaticamente definidas em `.env.example`. Caso as variáveis `APP_ORIGIN`, `SENDER_DOMAIN` ou `FROM_DOMAIN` estejam provisionadas manualmente no painel, elas devem ser atualizadas.

## B. URLs, Domínios e E-mails no Código (Não alterados na Etapa 3)
Estes itens permanecem no código com a URL antiga para evitar quebra de produção. Devem ser substituídos em um commit sincronizado com o lançamento.

| Arquivo / Onde | Valor Atual | Valor Novo Proposto | Onde Executar |
|---|---|---|---|
| `index.html` (canonical, og:url, JSON-LD, og:image, twitter:image) | `https://nr1pronto.com.br` / `suporte@nr1pronto.com.br` | `https://nr-1comprova.com.br` [CONFIRMAR DOMÍNIO EXATO] / `suporte@nr-1comprova.com.br` | Código (git commit) |
| `src/lib/appUrl.ts` | `https://www.nr-1pronto.com.br` | `https://www.nr-1comprova.com.br` | Código |
| `src/lib/landing.ts` | `https://nr1pronto.com.br` e email | `https://nr-1comprova.com.br` | Código |
| `src/pages/BlogPost.tsx` | `https://nr1pronto.com.br` | `https://nr-1comprova.com.br` | Código |
| `src/components/auth/AuthForm.tsx` | `suporte@nr1pronto.com.br` | `suporte@nr-1comprova.com.br` | Código |
| `src/lib/relatorioEvidenciaPDF.ts` | `https://nr1pronto.com.br` (comentário de tipo) | `https://nr-1comprova.com.br` | Código |
| `src/lib/__tests__/pgrImportacao.test.ts` | `https://nr1pronto.com.br` e variações | `https://nr-1comprova.com.br` | Código |

## C. Infraestrutura Externa (Não alterada na Etapa 3)
Configurações de infra que validam o domínio e enviam e-mails.

| Arquivo / Onde | Valor Atual | Valor Novo Proposto | Onde Executar |
|---|---|---|---|
| `supabase/config.toml` | `site_url = "https://nr1pronto.com.br"`, `site_name = "Talent Group - NR1-Pronto"` | `site_url = "https://nr-1comprova.com.br"`, `site_name = "Talent Group - NR-1Comprova"` | Código / Deploy Supabase |
| `supabase/functions/_shared/cors.ts` | Múltiplas entradas `nr1pronto.com.br` | Adicionar/Trocar para `nr-1comprova.com.br` | Código / Edge Functions Deploy |
| Edge Functions (create-user, finalize-colaborador-user, reenviar-acesso-colaborador, register-company, send-pulse-reminder, send-transactional-email, update-user) | Fallbacks para `https://nr1pronto.com.br` e `notify.nr1pronto.com.br` | `https://nr-1comprova.com.br` e `notify.nr-1comprova.com.br` | Código / Edge Functions Deploy |
| Projeto Vercel | Domínio `nr1pronto.com.br` cadastrado | Adicionar `nr-1comprova.com.br` | Painel Vercel (Settings > Domains) |
| Projeto Supabase (Auth) | Site URL: `https://nr1pronto.com.br` | Site URL: `https://nr-1comprova.com.br` | Painel Supabase (Auth > URL Configuration) |

## D. Checklist Ordenado da Fase de Deploy

1. **DNS e Cloudflare:** Apontar os registros A/CNAME do novo domínio (`nr-1comprova.com.br`) para a Vercel.
2. **Painel Vercel:** Adicionar o novo domínio em Settings > Domains e aguardar a emissão do certificado TLS.
3. **Painel Supabase (Auth):** Alterar a **Site URL** e **Redirect URLs** adicionais para incluir o novo domínio.
4. **Código (Commit Final):** Realizar a substituição massiva das URLs (Parte B e C) no código-fonte.
5. **Edge Functions:** Reenviar as funções de borda atualizadas com as novas políticas de CORS e URLs (`supabase functions deploy`).
6. **Verificação de Assets:** Confirmar se os 5 novos logos (substituídos fisicamente na Etapa 2) estão sendo entregues no CDN corretamente no novo domínio.
7. **Verificação de CORS:** Testar login, requisições de API e emails transacionais para garantir a liberação do novo domínio.

- **Banco de Dados (Produ��o)**: O coment�rio interno da migration de �ndices de performance permanecer� no banco como `PARA O NR1-PRONTO` at� que ocorra uma nova migration (a��o puramente cosm�tica, sem impacto real).

