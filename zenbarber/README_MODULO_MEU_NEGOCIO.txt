MÓDULO MEU NEGÓCIO — ZenBarber / NextJumpX

Objetivo:
Transformar o painel do gerente/barbeiro em uma visão de microempreendedor: faturamento, comissão, metas, VIPs, clientes em risco, ociosidade, ranking interno, índice Barbeiro PRO e previsão de ganhos.

Arquivos alterados:
- index.html
- js/modules/auth.js
- css/style.css

Arquivos criados:
- js/modules/meuNegocio.js
- SQL_MODULO_MEU_NEGOCIO.sql
- README_MODULO_MEU_NEGOCIO.txt

Tabelas criadas:
- barber_business_goals

Migrations:
- SQL_MODULO_MEU_NEGOCIO.sql
  - Cria tabela de metas mensais por barbeiro.
  - Cria índice por barber_id + month_key.
  - Cria índices otimizados em appointments e services.

Regras de negócio:
- Admin Master: acesso total via área administrativa existente.
- Gerente: visualiza todos os barbeiros da unidade ativa e pode filtrar por barbeiro.
- Barbeiro: visualiza somente os próprios dados e edita somente as próprias metas.
- Cliente: sem acesso ao módulo.
- Faturamento considera atendimentos concluídos.
- Comissão usa commission_rate do barbeiro.
- Ticket médio = faturamento concluído / quantidade de atendimentos concluídos.
- Clientes VIP são calculados por gasto, retorno e indicação quando houver campo/observação com indicação.
- Clientes em risco são clientes concluídos sem retorno há 15+ dias, com destaque para 30 e 45 dias.
- Ociosidade compara minutos disponíveis de trabalho x minutos ocupados da agenda.
- Oportunidade perdida usa ticket médio e duração média dos atendimentos da semana.
- Índice Barbeiro PRO:
  30% Faturamento
  25% Retorno de clientes
  20% Ocupação da agenda
  15% Comparecimento
  10% Ticket médio

Impactos de performance:
- O módulo reutiliza o carregamento central loadMine(), evitando consultas duplicadas pesadas.
- A única consulta nova é barber_business_goals do mês atual.
- Índices adicionados em appointments(barber_id,date,status), appointments(client_phone/client_name/date) e services(barber_id) reduzem custo para milhares de clientes.
- Cálculos são feitos sobre o escopo da unidade/barbeiro já filtrado em memória.

Compatibilidade:
- Não altera schemas existentes de appointments, services ou barbers.
- Não usa localStorage para metas ou dados críticos; metas são persistidas no Supabase.
- Mantém dark theme e padrão visual premium.
