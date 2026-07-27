HOTFIX - Lógica precisa de assinatura / clientes fixos

Alterações:
- Campo "Valor da assinatura" virou "Valor mensal da assinatura".
- Adicionado campo "Duração do contrato em meses".
- O sistema agora calcula contrato assim:
  valor mensal x quantidade de meses = valor total do contrato.
- Frequência não multiplica faturamento indevidamente:
  semanal = 4 horários por mês
  quinzenal = 2 horários por mês
  mensal = 1 horário por mês
- Os horários recorrentes agora são bloqueios de agenda com valor R$0,00.
- A receita entra apenas pelos recebimentos/parcelas:
  receber mensalmente = parcelas mensais do valor informado
  receber agora = contrato inteiro no faturamento
  receber no final = contrato inteiro em carteira no fim do período
- Adicionado botão "Corrigir lógica financeira antiga" para normalizar pacotes antigos que estavam inflando faturamento.

Exemplo:
Plano quinzenal R$80/mês por 3 meses:
- cria 6 horários de atendimento
- cria 3 parcelas de R$80
- total previsto = R$240
- não vira R$1400 por somar cada agendamento como receita nova.
