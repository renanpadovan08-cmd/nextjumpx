ZenBarber / NextJumpX - HOTFIX Autonomia do Barbeiro

Implementado:
- Painel do barbeiro com Minha Disponibilidade.
- Barbeiro pode definir dias abertos/fechados, entrada, saída e intervalo por dia da semana.
- Barbeiro pode criar agendamento interno e encaixe.
- Barbeiro pode cancelar atendimentos da própria agenda; registro fica como cancelado no histórico.
- Link público recalcula horários ao selecionar barbeiro, usando a agenda individual do barbeiro selecionado.
- Horários públicos continuam respeitando duração do serviço, conflitos, intervalo e dias fechados.
- Cache PWA atualizado.

Observação:
- Não ative RLS ainda sem migração completa de autenticação.
- O sistema continua usando SCHEDULE_JSON dentro de off_days para compatibilidade com a base atual.
