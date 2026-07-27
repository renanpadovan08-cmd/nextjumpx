ZenBarber - HOTFIX SEGURANCA ETAPA 2

O que foi alterado:
- Criada compatibilidade com password_hash.
- Login agora busca apenas o login informado e valida senha por hash.
- Senhas antigas em texto puro migram automaticamente no primeiro login válido.
- Novos cadastros e alterações de senha passam a salvar password_hash.
- A senha antiga deixa de ser enviada no perfil salvo em sessionStorage.
- Mantida compatibilidade caso o SQL ainda não tenha sido aplicado, para não quebrar o sistema.

Passo obrigatório no Supabase:
1. Abra SQL Editor.
2. Rode o arquivo SQL_HOTFIX_SEGURANCA_ETAPA2_PASSWORD_HASH.sql.
3. Suba este ZIP no Netlify.
4. Faça login uma vez com cada usuário importante para migrar a senha antiga para hash.
5. Depois dos testes, rode com cuidado:
   update public.barbers set password = null where password_hash is not null;

Observação:
Este hotfix melhora bastante a situação atual, mas a solução ideal definitiva continua sendo migrar para Supabase Auth ou backend/Edge Function com bcrypt/argon2 + RLS.
