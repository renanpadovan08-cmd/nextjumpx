HOTFIX - Agendamento público: salvar e horários disponíveis

Alterações aplicadas:
1. Link público agora mostra somente horários realmente disponíveis.
   - Horários passados, ocupados por outro agendamento, fora de intervalo/almoço ou folga não entram na lista.

2. Correção no botão "Confirmar agendamento".
   - Antes, se o horário tivesse conflito, o sistema parava sem explicar, parecendo que não salvava.
   - Agora mostra aviso claro: "Esse horário acabou de ficar ocupado. Escolha outro horário disponível."

3. Melhor tratamento de erro ao salvar no Supabase.
   - Se houver erro do banco, a mensagem aparece como "Erro ao salvar: ...".

Arquivo alterado:
- js/modules/agendamentoPublico.js
