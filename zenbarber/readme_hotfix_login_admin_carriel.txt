HOTFIX LOGIN ADMIN + PAINEL CARRIEL

Correções aplicadas:
1. Restaurado login administrativo legado para teste:
   login: admin
   senha: 159753

2. Corrigido erro ao abrir painel do Carriel/barbeiro:
   apptSortValue is not defined

Causa:
A função apptSortValue existia no app.js.bak antigo, mas não foi levada para js/core.js na versão modular.
Os módulos de relatórios/retenção ainda dependiam dela, causando erro após login em alguns perfis.

Arquivos alterados:
- js/core.js

Observação de segurança:
Este hotfix restaura o admin legado para funcionamento imediato no ambiente de teste.
Para produção/auditoria, o ideal é cadastrar o Admin Master no Supabase com password_hash e remover senha fixa do JavaScript.
