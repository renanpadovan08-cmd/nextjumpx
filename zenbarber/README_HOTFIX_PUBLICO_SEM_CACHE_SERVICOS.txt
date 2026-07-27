HOTFIX - Link público sem cache de serviços antigos

Correção aplicada:
- No agendamento público, a lista de serviços agora é recarregada diretamente da tabela `services` pelo barber_id dos barbeiros da barbearia.
- Antes de carregar, o cache local `cache.services` é zerado para impedir reaproveitamento de dados antigos do aparelho/PWA.
- Continua filtrando itens internos como desconto, valor recebido, carteira, bloqueio e assinatura.
- Service Worker atualizado para nova versão e com busca sem cache para HTML/JS/CSS/JSON.
- Arquivos JS/CSS no index.html receberam versão na URL para forçar o navegador/PWA antigo a baixar a versão nova.

Objetivo:
Evitar que o celular de funcionário/cliente com PWA ou cache antigo mostre serviços/valores vindos de histórico, desconto ou baixa financeira no link público.

Após subir no Netlify:
- Abrir o link no celular do Nicolas.
- Fechar e abrir o Chrome/PWA uma vez.
- Se ainda aparecer antigo, limpar dados do site ou reinstalar o atalho PWA, pois o navegador pode segurar cache antigo por alguns minutos.
