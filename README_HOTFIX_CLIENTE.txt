ZENBARBER — HOTFIX LINK DO CLIENTE

Correção aplicada:
- Corrigido botão "Confirmar agendamento" no link público do cliente.
- Removida passagem de dados sensíveis diretamente no onclick, que podia quebrar o botão dependendo do nome da barbearia/telefone.
- Botão agora tem proteção contra clique duplo e mostra "Agendando..." durante o envio.
- Após confirmar, o sistema recarrega os horários para evitar que o mesmo horário fique disponível.

Supabase:
- NÃO precisa rodar SQL novo.
- Esta correção é apenas no front-end/app.js.
