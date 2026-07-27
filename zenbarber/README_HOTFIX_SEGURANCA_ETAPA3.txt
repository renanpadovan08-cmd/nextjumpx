ZenBarber - HOTFIX SEGURANCA ETAPA 3

O que foi ajustado:
- Login Admin fixo no JavaScript foi desativado. O Admin agora deve existir no banco com role admin_master/admin.
- Login tenta validar primeiro por password_hash, sem trazer senha aberta.
- Coluna password antiga é usada apenas como fallback de migração, quando o usuário ainda não tem hash.
- Ao logar com senha antiga, o app grava password_hash e tenta limpar password.
- Adicionado suporte a must_change_password para forçar troca de senha.
- Painel Admin permite marcar perfil como Admin Master.

Antes de subir:
1. Rode SQL_HOTFIX_SEGURANCA_ETAPA3_PASSWORD_HASH_REAL.sql no Supabase.
2. Confirme que existe pelo menos um usuário com role admin_master ou admin.
3. Suba no Netlify.
4. Teste login Admin, Gerente e Barbeiro.

Depois de testar:
- Faça login uma vez nos usuários importantes para migrar a senha antiga para hash.
- Só depois rode a limpeza opcional indicada no SQL.
