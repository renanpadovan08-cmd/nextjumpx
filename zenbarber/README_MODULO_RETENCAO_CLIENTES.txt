ZENBARBER / NEXTJUMPX — MÓDULO RETENÇÃO: CLIENTES PARA RECUPERAR

Objetivo
- Transformar histórico de atendimentos concluídos em lista comercial de clientes para recuperar.
- Foco de produto: mais faturamento, retorno de clientes, controle da equipe e menos operação manual.

Arquivos alterados
- js/modules/relatorios.js
- js/modules/dashboard.js
- js/modules/auth.js
- js/modules/admin.js
- js/modules/agendamentoPublico.js
- css/style.css

Arquivos criados
- SQL_MODULO_RETENCAO_CLIENTES.sql
- README_MODULO_RETENCAO_CLIENTES.txt

Banco de dados
- Nova tabela opcional/recomendada: client_retention_actions
- Índices recomendados em appointments para performance em bases grandes.

Regras implementadas
- Verde: 0 a 15 dias sem atendimento.
- Amarelo: 16 a 25 dias sem atendimento.
- Laranja: 26 a 35 dias sem atendimento.
- Vermelho: 36 dias ou mais sem atendimento.
- A lista considera apenas appointments com status concluido.
- Serviços técnicos/internos de carteira, assinatura, bloqueio e ajustes não entram na retenção.
- Valor médio gasto é calculado pelo histórico concluído do cliente.
- Barbeiro responsável é o barbeiro do último atendimento concluído.
- Clientes recuperados são clientes que retornaram no mês atual após intervalo de 26+ dias desde o atendimento anterior.
- Taxa de retorno considera clientes ativos + recuperados sobre a base de clientes atendidos.

Ações
- WhatsApp com mensagem automática solicitada.
- Agendar abre a agenda interna e registra intenção de agendamento.
- Histórico abre todos os atendimentos concluídos daquele cliente.
- As ações tentam registrar em client_retention_actions quando a migration foi executada.

Índice ZEN
- 40% retorno dos clientes.
- 20% ocupação da agenda do dia.
- 20% faturamento do mês atual.
- 20% comparecimento dos últimos 30 dias.
- Classificação: Excelente, Bom, Atenção ou Crítico.

Perfis
- Gerente: visualiza clientes da unidade/barbearia carregada.
- Barbeiro: respeita o carregamento da própria agenda/clientes vinculados a ele.
- Admin Master: painel ADM agora mostra visão geral consolidada de retenção.
- Cliente: sem acesso ao módulo.

Performance
- O cálculo é feito em memória sobre appointments já carregados pelo app.
- Para bases com milhares de clientes, execute SQL_MODULO_RETENCAO_CLIENTES.sql para criar índices por status, data, telefone e barbeiro.
- A tabela client_retention_actions registra ações sem depender de localStorage.
