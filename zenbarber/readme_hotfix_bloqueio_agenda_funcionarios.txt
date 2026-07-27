HOTFIX — Bloqueio/desbloqueio de agenda dos barbeiros funcionários

O que foi adicionado:
- Na aba Barbeiros, o barbeiro gerente agora possui um card chamado "Bloquear agenda dos funcionários".
- Cada funcionário aparece com o status da agenda: liberada ou bloqueada.
- O gerente pode bloquear a agenda de um funcionário por uma quantidade de dias informada no momento da ação.
- O gerente também pode desbloquear a agenda quando quiser.

Como funciona tecnicamente:
- O bloqueio usa registros técnicos na tabela appointments com status "bloqueio".
- Isso reaproveita a lógica já existente do ZenBarber para impedir horários ocupados.
- Não usa localStorage para dado crítico.
- O link público e a agenda interna deixam de oferecer horários para o barbeiro bloqueado.
- Agendamentos já existentes continuam preservados e visíveis.
- Ao desbloquear, os bloqueios futuros criados pelo gerente são marcados como cancelados.

Arquivos alterados:
- js/modules/cadastros.js
- css/style.css
