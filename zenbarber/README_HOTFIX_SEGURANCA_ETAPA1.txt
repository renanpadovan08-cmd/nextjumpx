ZenBarber - HOTFIX SEGURANCA ETAPA 1

Alteracoes aplicadas:
- Gestao PRO removida do menu do gerente/barbeiro.
- Pagina backup/CSV/auditoria bloqueada para quem nao for Admin/Admin Master.
- Funcoes de backup e exportacao agora validam perfil antes de executar.
- Painel Admin nao exibe mais senhas cadastradas.
- Consulta do painel Admin deixou de usar select(*) em barbers e usa colunas seguras sem password.
- Edicao de senha no Admin agora fica em branco: so altera senha se digitar uma nova.
- Admin Master tambem reconhece role admin_master/master/adm como admin.
- Cache PWA atualizado.

Observacao importante:
Este hotfix reduz risco imediato no frontend, mas a etapa 2 ainda deve migrar senha texto puro para password_hash/bcrypt ou Supabase Auth. Nao ativar RLS ainda sem preparar o login.
