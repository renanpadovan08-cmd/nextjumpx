ZENBARBER — HOTFIX CENTRAL DE NOVIDADES PRO

O que foi implementado:
- Central de Novidades usando Supabase.
- Tabela system_updates para cadastrar versões e novidades.
- Tabela user_update_views para registrar quais usuários visualizaram cada atualização.
- Popup aparece apenas para o usuário que ainda não viu a novidade.
- Aba Novidades mostra histórico vindo do banco.
- Fallback local: se as tabelas ainda não existirem, o sistema não quebra.

ANTES DE SUBIR NA NETLIFY:
1. Abra o Supabase do ZenBarber.
2. Vá em SQL Editor.
3. Execute o arquivo: SUPABASE_CENTRAL_NOVIDADES_PRO.sql
4. Depois suba este ZIP na Netlify.

Como cadastrar uma próxima novidade:
Execute um INSERT em public.system_updates mudando version, title, description e notes.
Quando uma nova versão ativa existir no banco, o cliente verá o popup ao entrar.

Observação importante:
O ZenBarber atual usa autenticação própria pela tabela barbers, não Supabase Auth.
Por isso as políticas RLS destas duas tabelas são abertas para leitura/registro de visualização.
Essas tabelas não guardam dados sensíveis; guardam apenas novidades e confirmação de leitura.
