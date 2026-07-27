ZenBarber - HOTFIX SEGURANÇA ETAPA 4 - ADMIN FIXO REMOVIDO

O que foi corrigido:
- Removido o acesso admin fixo do JavaScript.
- Antes havia fallback admin / 159753 dentro do core.js.
- Agora o Admin Master precisa existir no Supabase, na tabela barbers, com role admin_master ou admin.
- O ZIP inclui SQL para criar/atualizar esse Admin Master no banco com password_hash e troca obrigatória de senha.

Como aplicar com segurança:
1. No Supabase, abra SQL Editor.
2. Rode: SQL_HOTFIX_SEGURANCA_ETAPA4_REMOVER_ADMIN_FIXO.sql
3. Suba este ZIP no Netlify.
4. Entre com login admin e senha 159753.
5. O sistema deve pedir troca obrigatória de senha.
6. Troque para uma senha forte.
7. Teste login de gerente e barbeiro.

Importante:
- A senha 159753 só fica como senha inicial de migração para não bloquear seu acesso.
- Depois da troca, o admin fixo deixa de existir no front-end.
- Não ative RLS ainda neste projeto sem uma etapa própria, porque o app usa login próprio pela tabela barbers.
