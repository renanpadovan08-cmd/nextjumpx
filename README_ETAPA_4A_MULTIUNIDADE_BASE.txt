ZenBarber - Etapa 4A: Multiunidade Base

Implementado:
- Nova aba "Unidades" no menu do gerente/dono.
- Cadastro local de unidades/filiais para teste comercial.
- Vínculo de barbeiros por unidade.
- Seletor de unidade no topo do sistema.
- Dashboard, agenda, serviços, financeiro e clientes passam a respeitar a unidade selecionada porque o cache principal é filtrado pelos barbeiros da unidade.
- Opção "Todas as unidades" mantém visão consolidada.

Observação técnica:
Esta etapa foi feita sem exigir migração no Supabase, para permitir subir rápido na Netlify de teste e validar com o cliente. Os dados de unidades ficam no localStorage por barbearia.

Próximas etapas recomendadas:
4B - Persistir unidades no Supabase.
4C - Link público por unidade.
4D - Relatório consolidado vs. separado por filial.
