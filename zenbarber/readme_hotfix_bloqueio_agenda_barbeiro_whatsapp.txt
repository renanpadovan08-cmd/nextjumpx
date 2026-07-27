HOTFIX — Bloqueio inteligente de agenda pelo barbeiro

O que foi adicionado:

1. Permissão controlada pelo gerente
- Na aba Barbeiros, o gerente agora vê o card "Permissões e bloqueio de agenda".
- Para cada barbeiro funcionário, o gerente pode ativar ou desativar a permissão "bloquear a própria agenda".
- A permissão é salva no cadastro do barbeiro sem criar tabela nova, usando marcador seguro em activation_note.

2. Bloqueio rápido no painel do barbeiro
- Quando a permissão está ativa, o barbeiro vê o card "Bloqueio rápido de agenda".
- Ele pode bloquear:
  - o dia inteiro;
  - parte do dia, escolhendo início e fim.
- O bloqueio cria um agendamento interno com status "bloqueio", usando o mesmo motor de conflitos já usado pelo ZenBarber.
- Com isso, o link público e a agenda interna param de oferecer aquele período.

3. Clientes afetados
- Antes de confirmar, o sistema mostra quantos clientes já estão agendados no período bloqueado.
- Mostra nome, horário, telefone e serviço dos clientes afetados.

4. Mensagem de WhatsApp
- Para cada cliente afetado, o sistema gera uma mensagem pronta de reagendamento.
- Após confirmar o bloqueio, o ZenBarber abre os links de WhatsApp dos clientes afetados.
- A mensagem inclui:
  - nome do cliente;
  - horário afetado;
  - motivo informado pelo barbeiro;
  - nome do barbeiro;
  - nome da barbearia.

5. Reabrir agenda
- O barbeiro consegue reabrir seus próprios bloqueios futuros pelo mesmo card.
- O gerente continua tendo o controle geral pela aba Barbeiros.

Arquivos alterados:
- js/modules/components.js
- js/modules/cadastros.js
- js/modules/auth.js

Observação importante:
Este hotfix usa o fluxo atual de WhatsApp via wa.me, igual ao restante do sistema. Ou seja, ele prepara e abre as mensagens. Para envio 100% automático sem abrir WhatsApp, será necessário integrar futuramente com WhatsApp Business API/Z-API/360dialog/Twilio ou provedor similar.
