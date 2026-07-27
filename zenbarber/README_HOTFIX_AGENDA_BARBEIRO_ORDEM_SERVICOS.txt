HOTFIX - Agenda do barbeiro + ordem dos serviços

Entregas:
1) Painel do barbeiro agora tem Agendamento interno / Encaixe.
   - O barbeiro consegue lançar cliente na própria agenda.
   - Botão Agendar valida conflito.
   - Botão Encaixe permite usar horário ocupado, igual gerente, marcando status encaixe.

2) Serviços agora podem ser organizados pelo gerente.
   - Arrastar para cima/baixo.
   - Botões ↑ e ↓ como alternativa para celular.
   - A ordenação prioriza a coluna display_order no Supabase.
   - Se a coluna ainda não existir, salva localmente e exibe aviso.

3) Serviços técnicos de clientes fixos/assinaturas ficam ocultos.
   - Bloqueio assinatura, parcela, recebimento, contrato ZB, pacote, carteira e ajustes financeiros não poluem a lista de Serviços nem o link público.

SQL opcional/recomendado:
- Rodar SQL_HOTFIX_ORDEM_SERVICOS.sql no Supabase para persistir a ordem dos serviços para todos os aparelhos e link público.
