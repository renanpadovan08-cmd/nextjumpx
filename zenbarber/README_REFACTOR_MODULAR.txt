ZenBarber - Refactor Modular Base

Esta versão mantém o mesmo visual e as mesmas funções da versão anterior, mas separa o antigo app.js em módulos menores para reduzir risco de bugs e facilitar manutenção.

Estrutura principal:
- index.html: carrega os arquivos na ordem correta.
- css/style.css: estilos do sistema.
- js/core.js: configurações, sessão, helpers globais, horários e permissões.
- js/modules/auth.js: login, criação de conta, layout base e carregamento do usuário.
- js/modules/dashboard.js: dashboard financeiro, gráfico e métricas.
- js/modules/components.js: componentes reutilizáveis, avatar, imagens, serviços públicos e horários disponíveis.
- js/modules/cadastros.js: serviços, barbeiros, comissões, perfil e funcionamento.
- js/modules/agenda.js: agenda, timeline, agendamentos, status, carteira e recebimento com desconto.
- js/modules/clientesFixos.js: clientes fixos, assinaturas, parcelas, edição e recorrência.
- js/modules/relatorios.js: carteira, link público, suporte, relatórios, histórico e backup.
- js/modules/admin.js: painel admin, faturamento mensal das barbearias e cobrança.
- js/modules/agendamentoPublico.js: página pública de agendamento dos clientes.
- js/bootstrap.js: inicialização do app.

Observação:
O app.js antigo foi mantido apenas como aviso de compatibilidade, mas não é mais usado pelo index.html.
