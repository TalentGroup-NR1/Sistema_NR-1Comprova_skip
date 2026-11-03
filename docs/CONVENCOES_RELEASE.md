# Convenções de Release — NR-1Comprova

## Convenção de tags de release
- Criar UMA tag por release deployado (não por mudança semântica)
- Formato: `v<MAJOR>.<MINOR>.<PATCH>-<slug-da-feature>`
- Usar prefixo "pre-" APENAS quando houver alteração de código entre a tag anterior e o deploy. Se dois commits consecutivos são apenas documentação, não criar tag nova.
- Por que: `v1.1.0` e `v1.1.1` apontaram para `bc6b5d9` por engano, causando confusão em rollback.
