ZENBARBER — HOTFIX FUNCIONAMENTO DIA A DIA

O que entrou:
- Nova aba: Funcionamento
- Gerente/dono define cada dia da semana como aberto ou fechado
- Horário de abertura e fechamento por dia
- Bloqueio/intervalo por dia, como almoço ou pausa
- Link público do cliente respeita os horários configurados
- Agenda interna também respeita os horários configurados

Supabase:
- Não precisa rodar SQL novo.
- A configuração foi salva usando a estrutura atual do sistema.

Observação:
- Para horários após meia-noite, use formato de texto tipo 24:00.
- Se marcar um dia como fechado, ele não aparece como disponível para agendamento.
