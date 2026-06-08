ZenBarber — HOTFIX Solicitações internas de Unidades

Implementado:
- O gerente não cria unidade diretamente quando Multiunidade está bloqueada.
- Botão "Solicitar nova unidade" agora abre formulário interno no sistema.
- Campos: nome da unidade, cidade, estado, quantidade de barbeiros e observações.
- Envio cria solicitação com status inicial "Pendente".
- Painel Admin Master ganhou a área "Solicitações de Unidades".
- Ações do Admin Master: Aprovar, Rejeitar, Aguardando pagamento e Bloquear.
- Apenas aprovação do Admin Master libera Multiunidade.
- Ao aprovar, a unidade é gravada no perfil do gerente e aparece automaticamente na tela Unidades.

Importante:
- Para persistir as solicitações no Supabase e aparecerem em qualquer computador, rode o arquivo:
  SQL_HOTFIX_SOLICITACOES_UNIDADES.sql
- Se o SQL ainda não tiver sido rodado, o sistema usa fallback localStorage, mas esse fallback é local do navegador.
