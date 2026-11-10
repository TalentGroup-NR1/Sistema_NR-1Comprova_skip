# Domínios do NR-1Comprova

## Domínio oficial (produção)
- https://www.nr-1comprova.com.br (200 OK, canonical)
- https://nr-1comprova.com.br (308 redirect → www)

Toda comunicação de cliente, e-mails e links oficiais devem usar:
https://www.nr-1comprova.com.br

## Domínio legado (a aposentar)
- https://www.nr-1pronto.com.br (200 OK, serve o mesmo bundle)
- https://nr-1pronto.com.br (308 redirect → www)

Status: ativo, mas será desativado após migração completa.
Plano de aposentadoria:
1. (fazer) Redirecionar 301 para o domínio oficial
2. (fazer) Comunicar clientes por e-mail
3. (manter 90 dias) Aguardar zero tráfego
4. (desativar) Remover da Vercel

## Regra de testes
Todo teste de produção usa o domínio oficial, nunca o legado.
Anteriormente, o relatório de deploy validou o domínio legado por
engano — o que não confirma nada sobre produção.
