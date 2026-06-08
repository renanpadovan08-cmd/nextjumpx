ZenBarber — HOTFIX COMERCIAL: Multiunidade controlada pelo Admin Master

Objetivo
- Impedir que gerente/barbeiro crie unidades extras sem liberação comercial.
- Transformar Multiunidade em recurso premium liberado somente pelo login Admin Master.
- Permitir que o cliente solicite nova unidade pelo WhatsApp.

O que foi alterado
1. Tela Unidades para gerente/dono
- Se a conta não tiver liberação de Multiunidade, o cadastro de unidades fica bloqueado.
- Aparece um card informando que a conta atual permite 1 unidade.
- Botão "Solicitar nova unidade" abre WhatsApp para o suporte/NextJumpX.

2. Proteção nas funções
- addUnit(), saveUnitAssignments() e deleteUnit() agora validam se a Multiunidade está liberada.
- Mesmo se alguém tentar forçar pelo navegador, a função bloqueia e abre o pedido de liberação.

3. Painel Admin Master
- Cada barbearia mostra status de Multiunidade: "1 unidade" ou "Liberada".
- Botão rápido: "Liberar multiunidade" / "Bloquear multiunidade".
- Na edição da barbearia existe o campo "Multiunidade premium".

4. Como a liberação funciona
- A liberação é gravada em activation_note com a marca:
  MULTIUNIDADE_LIBERADA
- O app do gerente lê essa marca ao logar/atualizar.

Arquivos alterados
- js/core.js
- js/modules/admin.js

Fluxo comercial recomendado
1. Cliente solicita nova unidade pelo botão WhatsApp.
2. NextJumpX informa taxa adicional.
3. Após pagamento, Admin Master entra no Painel ADM.
4. Clica em "Liberar multiunidade" na barbearia correspondente.
5. Cliente atualiza/reloga e passa a cadastrar/vincular unidades.

Observação
- Esta versão protege a regra comercial no front-end e usa a coluna activation_note já existente.
- Em uma etapa futura, o ideal é criar uma tabela/coluna dedicada no Supabase para permissões premium.
