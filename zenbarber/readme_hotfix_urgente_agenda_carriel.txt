HOTFIX URGENTE - Agenda / Clientes Fixos / Funcionamento

Correções aplicadas:
1. A aba Funcionamento voltou para o menu lateral, abaixo de Perfil / Configurações.
2. Agendamento interno agora força o shop_id correto mesmo quando o usuário logado não tem shop_id, usando o shop_id do barbeiro selecionado.
3. Clientes Fixos/Assinaturas agora salvam serviços e agendamentos com shop_id.
4. Fechamentos de agenda também passam a salvar com shop_id.
5. Incluído SQL de reparo para registros antigos criados sem shop_id:
   SQL_HOTFIX_URGENTE_AGENDA_CLIENTES_FIXOS_SHOP_ID.sql

IMPORTANTE:
Rode o SQL no Supabase para os clientes fixos antigos reaparecerem se eles tiverem ficado com shop_id vazio.
Depois suba o ZIP na Netlify e faça um hard refresh no navegador do cliente.
