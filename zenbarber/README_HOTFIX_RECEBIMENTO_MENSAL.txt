HOTFIX - RECEBIMENTO MENSAL EM CLIENTES FIXOS

Adicionado na tela Criar cliente fixo / assinatura:
- Forma de recebimento: Receber mensalmente
- Campo Dia da cobrança mensal, exibido apenas quando a opção mensal estiver selecionada

Funcionamento:
- O sistema mantém os bloqueios recorrentes da agenda com valor R$0,00
- Cria lançamentos financeiros mensais concluídos, dividindo o valor total pela quantidade de meses do período
- Exemplo: assinatura de 6 meses no valor de R$600,00 gera 6 recebimentos de R$100,00

Não altera login, ADM, autenticação, banco ou rotas principais.
