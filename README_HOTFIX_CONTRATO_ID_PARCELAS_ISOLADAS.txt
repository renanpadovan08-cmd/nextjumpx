HOTFIX - Contratos de clientes fixos isolados por código

Correção aplicada:
- Cada nova assinatura agora recebe um código interno único ZB-XXXXXX.
- Parcelas, recebimentos e bloqueios da agenda ficam ligados a esse mesmo código.
- A frequência semanal/quinzenal/mensal cria somente horários de agenda com R$0,00.
- O número de parcelas agora vem somente da duração do contrato em meses.
  Exemplo: R$150 mensal por 3 meses = 3 parcelas de R$150, total R$450.
- A primeira parcela mensal é criada como em carteira, não como paga.
- Contratos antigos do mesmo cliente não se misturam mais com contratos novos.

Observação:
Contratos antigos já criados sem código podem continuar mostrando dados misturados se foram criados antes desta correção. Para testar a correção, crie uma nova assinatura após subir este ZIP.
