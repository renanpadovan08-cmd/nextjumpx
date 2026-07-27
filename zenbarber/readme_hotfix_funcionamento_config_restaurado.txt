HOTFIX - Funcionamento da Barbearia restaurado em Configurações

Investigação:
- A funcionalidade não foi removida do projeto.
- A página ainda existe em js/modules/cadastros.js na função hoursPage().
- A rota interna ainda existe no renderApp(): page='hours'.
- A agenda e o link público continuam usando os dados de funcionamento por parseWeeklySchedule(), workStart(), workEnd() e slotOptions().
- Os dados ficam salvos na tabela barbers, nos campos off_days, work_start e work_end.
- O formato avançado é salvo em off_days como SCHEDULE_JSON:[...].

Problema encontrado:
- A rota page='hours' existia, mas não havia acesso visual direto na sidebar nem dentro da tela Perfil / Configurações.
- Por isso a função parecia ter desaparecido depois da reorganização visual dos menus.

Correção aplicada:
- Adicionado novamente em Perfil / Configurações um card chamado "Funcionamento da Barbearia".
- O card informa que permite configurar:
  - Dias de atendimento
  - Horário de abertura
  - Horário de fechamento
  - Intervalos
  - Horários especiais
- O botão "Abrir Funcionamento" abre a rota existente page='hours' sem alterar a lógica da agenda.

Arquivos alterados:
- js/modules/cadastros.js
- index.html apenas para atualizar o cache-busting do módulo cadastros.js

Nenhuma outra funcionalidade foi alterada.
