HOTFIX — Horários do barbeiro por dia na aba Barbeiros

Alterações realizadas:
- Removidos os campos técnicos/sem explicação da edição completa do barbeiro.
- O campo SCHEDULE_JSON não aparece mais para o cliente.
- Adicionada seção "Horários de atendimento" dentro de Editar completo.
- Cada barbeiro agora pode ter dias abertos/fechados, início, fim e pausa de almoço por dia da semana.
- A agenda interna e o link público continuam usando parseWeeklySchedule/workStart/workEnd/isBreakConflict, então os horários salvos já bloqueiam automaticamente:
  - dias fechados;
  - horários fora do expediente;
  - pausa de almoço;
  - horários ocupados.
- Mantida a função de permissão/bloqueio de agenda própria do barbeiro.
- Gerente continua podendo liberar/desativar o bloqueio próprio e bloquear/desbloquear agenda do funcionário.

Teste recomendado:
1. Abrir Barbeiros > Editar completo.
2. Definir segunda 09:00–19:30 com pausa 12:00–13:00.
3. Abrir o link público do barbeiro.
4. Confirmar que aparecem horários antes de 12:00 e depois de 13:00, mas não durante o almoço.
5. Desmarcar domingo e confirmar que domingo fica sem horários.
