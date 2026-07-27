ZenBarber HOTFIX - Base para RLS / Multiunidade segura

1) No Supabase, rode primeiro o arquivo SQL_HOTFIX_SHOP_ID_BASE_RLS.sql.
2) Depois suba este ZIP no projeto.
3) Teste login do gerente, barbeiro, agenda, serviços e link público.

O que muda:
- Cria shop_id nas tabelas barbers, services e appointments.
- Preenche shop_id nos dados existentes sem apagar nada.
- O frontend passa a preferir shop_id para separar barbearias.
- RLS ainda NÃO deve ser ativado nesta etapa; este hotfix prepara a base para isso.
