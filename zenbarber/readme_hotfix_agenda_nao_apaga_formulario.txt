HOTFIX — AGENDA NÃO APAGA O FORMULÁRIO

Correções aplicadas:
1. O auto refresh de 60 segundos não recria mais a tela enquanto o barbeiro estiver preenchendo o agendamento.
2. Nome, telefone, barbeiro, serviço, data e horário são salvos como rascunho na sessão do navegador.
3. Se outro comando da agenda provocar renderização, os campos são restaurados automaticamente.
4. O rascunho só é apagado depois que o agendamento ou encaixe é salvo com sucesso.
5. A data do formulário pode ser alterada sem reconstruir imediatamente a página inteira.

Arquivos alterados:
- js/modules/agenda.js
- js/modules/auth.js

Teste recomendado:
- Abrir Agendamentos.
- Digitar nome e telefone.
- Escolher barbeiro, serviço, data e horário.
- Aguardar mais de 60 segundos.
- Confirmar que os dados permanecem preenchidos.
