ZenBarber - ETAPA 4B: Central WhatsApp PRO

Objetivo:
Transformar o ponto que o cliente mais gostou (mensagens por WhatsApp) em um diferencial comercial visível dentro do app.

Alterações realizadas:
1. Nova aba no menu lateral: Central WhatsApp.
2. Central com agenda de hoje e amanhã.
3. Envio individual por WhatsApp para confirmar, reagendar, avisar atraso e cobrar.
4. Botão de envio em massa das confirmações do dia/amanhã.
5. Painel de cobranças a partir de Clientes em carteira.
6. Painel de recuperação de clientes ausentes.
7. Modelos de mensagem editáveis por barbearia via localStorage.
8. Variáveis automáticas nas mensagens:
   - {primeiro_nome}
   - {cliente}
   - {barbearia}
   - {data}
   - {horario}
   - {servico}
   - {barbeiro}
   - {valor}
   - {link}
9. Atualização dos botões antigos para usar os modelos personalizados.

Arquivos alterados:
- js/modules/agenda.js
- js/modules/auth.js
- css/style.css
- index.html

Observações:
- Não foi necessário alterar o banco/Supabase.
- Os modelos personalizados ficam salvos no navegador da barbearia.
- Esta etapa é segura para teste em Netlify antes de ir para produção.
