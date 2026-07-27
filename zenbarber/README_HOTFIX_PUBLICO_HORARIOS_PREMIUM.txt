HOTFIX - Agendamento público: horários e ícones premium

Correções aplicadas:

1. Removido o seletor nativo visível de horários no link público.
   - Ele abria uma lista branca/feia em alguns navegadores.
   - Agora os horários aparecem em botões escuros premium, seguindo o visual do app.

2. O select de horário continua existindo internamente, mas fica oculto.
   - Mantém compatibilidade com a lógica antiga de salvar agendamento.
   - Evita quebrar validações e conflitos.

3. Os símbolos/emoji dos serviços foram substituídos por iniciais limpas do nome do serviço.
   - Ex.: Alisamento = AL, Corte com Navalha = CN, Pontas e Escova = PE.
   - Visual mais profissional e sem ícones estranhos/quebrados.

4. Atualizado cache do PWA/service worker para forçar o navegador a buscar os arquivos novos.

Arquivos alterados:
- js/modules/agendamentoPublico.js
- css/style.css
- sw.js
