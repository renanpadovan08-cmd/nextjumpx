HOTFIX - CENTRAL DE NOVIDADES / AVISO DE ATUALIZAÇÃO

O que foi adicionado:
- Popup automático de atualização para gerente/barbeiro após novo deploy.
- O aviso aparece uma vez por usuário/navegador para a versão atual.
- Botão "🔔 Novidades" no topo do sistema.
- Nova aba "🔔 Novidades" no menu do gerente.
- Página com resumo das novidades da versão.

Como usar nas próximas atualizações:
1. Abra js/core.js.
2. Altere ZEN_APP_VERSION para uma versão nova, por exemplo: v1.9.1.
3. Edite ZEN_RELEASE_DATE, ZEN_RELEASE_TITLE e ZEN_RELEASE_NOTES.
4. Suba o ZIP novo na Netlify.
5. Como a versão mudou, o cliente verá o popup na próxima entrada.

Observação:
- Essa versão usa localStorage, então não exige alteração no Supabase.
- Se o cliente trocar de navegador/computador, pode ver o aviso novamente.
- Futuramente dá para evoluir para controle 100% pelo Supabase.
