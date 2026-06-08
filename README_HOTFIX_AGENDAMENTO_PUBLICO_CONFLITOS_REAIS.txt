HOTFIX - Agendamento público lendo conflitos reais

Correção aplicada:
- O link público agora consulta os agendamentos existentes do barbeiro e da data selecionada diretamente no Supabase.
- Horários ocupados deixam de aparecer para o cliente.
- A duração do serviço escolhido e a duração dos serviços já agendados entram no cálculo de conflito.
- O sistema bloqueia sobreposição parcial. Ex.: serviço de 60 min às 10:00 bloqueia 10:00 e 10:30.
- O seletor de horário fecha automaticamente após seleção.
- O botão "Confirmar agendamento" permanece visível e com largura total.
- A validação final antes de salvar continua consultando o banco, evitando que dois clientes ocupem o mesmo horário.

Arquivos alterados:
- js/modules/agendamentoPublico.js
- js/modules/components.js
- css/style.css

Causa raiz provável:
O link público dependia de uma carga inicial ampla/cacheada de appointments. Em alguns cenários, a lista pública não refletia corretamente os agendamentos existentes do barbeiro/data, fazendo o cálculo local tratar horários ocupados como livres. A correção força a consulta por barber_id + date toda vez que o cliente troca barbeiro/data/serviço.
