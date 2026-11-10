# Landing page comercial NR-1Comprova

## Como a home vai funcionar

A rota `/` passa a ser inteligente: visitante **sem login** vê a landing page; quem já está logado continua caindo direto no dashboard, exatamente como hoje. Nenhuma rota interna muda.

## Estrutura da página (7 seções)

1. **Hero** — headline, subheadline, botão "Solicitar Demonstração" (rola até o formulário) e "Começar agora" (`/cadastro-empresa`), com um print real do dashboard do sistema como imagem.
2. **Funcionalidades** — grid com os 8 módulos (Colaboradores, PGR/NR-1, Feedback e Avaliações, Treinamentos, Comunicados, Diários de Bordo, Ponto e Férias, Cuidar+), cada um com ícone, título e descrição curta.
3. **Benefícios** — três colunas: multi-tenant com white-label, LGPD desde o design, self-service.
4. **Depoimentos** — três cards com texto e foto de placeholder, prontos para substituição.
5. **FAQ** — acordeão com as 6 perguntas definidas.
6. **Contato** — título, subtítulo e formulário (nome, empresa, e-mail, telefone, mensagem). Ao enviar, grava a solicitação e mostra "Recebemos sua solicitação! Nossa equipe entrará em contato em até 1 dia útil.", sem sair da página.
7. **Insights (blog)** — três cards de artigo placeholder com imagem, data, categoria e título, e botão "Ver todos os artigos" para `/blog` (página pública simples com aviso de "em breve").

**Rodapé**: marca Talent Group / NR-1Comprova, links para Termos de Uso e Política de Privacidade, suporte@nr1pronto.com.br, LinkedIn (`linkedin.com/company/talent-group`), Instagram como placeholder, e copyright com CNPJ marcado para preenchimento.

Identidade visual da Talent Group (navy, vinho e dourado), sóbria e consultiva, com layout responsável em celular e desktop.

## Onde as solicitações ficam

Cada envio do formulário vira um registro no banco com nome, empresa, e-mail, telefone, mensagem e data/hora. Só o Super Admin consegue ler essas solicitações; ninguém consegue listar, alterar ou apagar pelo site.

## Detalhes técnicos

- Migration: `public.contact_requests` (id, name, company, email, phone, message, created_at) + `GRANT INSERT` para `anon` e `authenticated`, `GRANT SELECT` para `authenticated`, `GRANT ALL` para `service_role`; RLS habilitado; policy `INSERT` liberada com `WITH CHECK (true)` (formulário público) e policy `SELECT` restrita a `public.is_super_admin()`. Sem `UPDATE`/`DELETE`.
- Validação com Zod no cliente antes do insert (limites de tamanho por campo, e-mail válido, telefone opcional) — a policy de insert é aberta por natureza do formulário público.
- Anti-spam: campo honeypot invisível no formulário (oculto visualmente, `tabIndex={-1}`, `autoComplete="off"`); se vier preenchido, o envio é descartado silenciosamente com a mesma mensagem de sucesso e nenhum registro é gravado.
- Nova rota `/` em `App.tsx` com um wrapper `HomeRoute`: usa `useAuth()`; enquanto `loading`, spinner; se `isAuthenticated`, renderiza o `Index` atual dentro do `ProtectedRoute`; caso contrário, renderiza `Landing`.
- Nova rota `/blog` pública; `'/blog'` adicionado a `src/lib/publicRoutes.ts` (a home `/` não precisa entrar na lista porque não passa mais pelo `ProtectedRoute` quando anônima).
- Arquivos novos: `src/pages/Landing.tsx`, `src/pages/Blog.tsx`, e componentes em `src/components/landing/` (`LandingHeader`, `HeroSection`, `FeaturesSection`, `BenefitsSection`, `TestimonialsSection`, `FaqSection` (Accordion do shadcn), `ContactSection`, `InsightsSection`, `LandingFooter`).
- Cores/estilos via tokens semânticos existentes em `index.css`; se necessário, adiciono tokens específicos da landing (ex.: `--landing-hero`) em vez de classes hardcoded.
- Imagem do hero: placeholder em `src/assets/hero-dashboard.png`, importado por ES6, para substituição manual depois. Sem captura automática de tela.
- SEO: atualizo `index.html` com title/description/og/twitter — "NR-1Comprova — Gestão de RH, SST e Conformidade NR-1" — usando `https://nr1pronto.com.br` em `og:url` e canonical. Qualquer link absoluto da landing usa o domínio `nr1pronto.com.br`.
- Não são alterados: login, módulos internos, Edge Functions, RLS existente e o branding dinâmico por empresa.
