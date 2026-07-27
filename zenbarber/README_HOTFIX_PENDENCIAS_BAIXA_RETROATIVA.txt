HOTFIX - Pendências / Baixa retroativa

Adicionado módulo para dar baixa em agendamentos passados que ficaram como "agendado".

O que mudou:
- Nova tela no menu: Pendências / Baixa.
- Lista automaticamente agendamentos com data passada e status "agendado".
- Botões disponíveis:
  - Dar baixa / Recebido: marca como concluído e entra no faturamento na data original do atendimento.
  - Valor a receber: permite informar valor final recebido, com desconto ou acréscimo.
  - Enviar para carteira: move para Clientes em carteira com lembrete de cobrança.
  - Cliente faltou: cancela/falta sem somar no faturamento.
- Dashboard agora alerta quando existem agendamentos passados sem baixa.

Não altera o banco de dados. Usa os status já existentes: concluido, em_carteira e cancelado.
