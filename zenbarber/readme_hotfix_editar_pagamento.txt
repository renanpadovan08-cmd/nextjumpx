HOTFIX — EDITAR PAGAMENTO APÓS CONCLUIR

O que foi adicionado:
- Atendimentos com status "Pago/concluido" agora exibem o botão "Editar pagamento".
- O botão permite corrigir o valor final recebido mesmo depois de ter dado baixa no pagamento.
- Serve para casos como:
  - valor digitado errado;
  - cliente voltou e comprou produto/serviço extra;
  - desconto ou acréscimo depois do pagamento.

Como funciona:
- O sistema pergunta o novo valor final correto.
- Ao confirmar, esse novo valor passa a valer para faturamento, relatórios e comissão.
- A lógica usa serviço técnico interno oculto, sem poluir o catálogo de Serviços nem o link público.

Arquivos alterados:
- js/modules/agenda.js
