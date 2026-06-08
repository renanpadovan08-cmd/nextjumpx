HOTFIX — Agendamento público com cards didáticos de serviços

Objetivo:
Deixar a escolha do serviço mais visual e menos confusa para o cliente, usando cards grandes parecidos com a referência enviada.

Alterações:
- No link público, o select de serviços foi substituído visualmente por cards.
- O select continua oculto no HTML para manter compatibilidade com a lógica existente.
- Serviço selecionado fica destacado em verde com check.
- Serviços não selecionados ficam escuros/preto e branco.
- Cada serviço mostra:
  - ícone didático automático conforme o nome do serviço;
  - nome do serviço;
  - descrição curta;
  - preço e duração.
- Ao trocar de barbeiro, a lista de cards atualiza automaticamente.
- O resumo de escolha continua mostrando barbeiro, data, horário e serviço.

Arquivos alterados:
- js/modules/agendamentoPublico.js
- css/style.css
- index.html

Observação:
Os ícones são gerados automaticamente por palavras-chave do nome do serviço.
Exemplos: corte, barba, sobrancelha, navalhado, luzes, platinado, camuflagem e alisamento.
