ZENBARBER — HOTFIX CLIENTES FIXOS / RECORRÊNCIA

O que entrou:
- Nova aba "Clientes fixos" no painel da barbearia.
- Criação de horários recorrentes para clientes fixos:
  • Toda semana
  • 2x por semana
  • A cada 15 dias
  • 1x por mês
- Opção de gerar próximas 4, 8, 12 ou 24 vezes.
- O sistema verifica conflito com horários já ocupados e pula os horários indisponíveis.
- Os horários criados entram na agenda normal como "agendado".
- Pode cancelar apenas um horário fixo sem apagar os demais.

SUPABASE:
- Não precisa rodar SQL novo.
- Esta versão usa a tabela appointments já existente.

OBS:
- Para cancelar uma sequência inteira, cancele os horários futuros daquele cliente pela agenda/lista.
