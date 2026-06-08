HOTFIX PWA - ZenBarber

O que foi adicionado:
- manifest.json com nome ZenBarber, modo standalone e ícones.
- icon-192.png, icon-512.png e icon-maskable-512.png.
- sw.js para registrar o Service Worker e permitir instalação como aplicativo.
- index.html atualizado com meta tags mobile/PWA, link do manifest e registro do Service Worker.

Como usar após subir no Netlify:
1. Suba este ZIP normalmente no Netlify.
2. Abra o link no Chrome do Android.
3. Toque no menu de três pontos.
4. Toque em "Adicionar à tela inicial" ou "Instalar app".
5. O ZenBarber abrirá como aplicativo, em tela cheia, com ícone próprio.

Observação:
Este PWA usa cache com estratégia network-first para HTML/JS/CSS, então as correções novas do Netlify tendem a aparecer sem travar o barbeiro em versão antiga. Se o celular ainda mostrar versão antiga, basta fechar e abrir o app novamente ou limpar cache do navegador.
