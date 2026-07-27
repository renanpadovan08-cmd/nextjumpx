HOTFIX PWA DESKTOP - ZenBarber

O que foi adicionado/ajustado:

1. Manifest reforçado para instalação também em computadores:
   - display_override
   - display standalone
   - orientação flexível (any)
   - atalhos para abrir o sistema e a agenda
   - categorias e idioma

2. Botão interno de instalação:
   - Quando Chrome/Edge permitir instalação, aparece o botão "Instalar ZenBarber" no canto inferior direito.
   - Funciona em celular e computador.
   - Se o sistema já estiver instalado, o botão não aparece.
   - Se o navegador não disparar o evento de instalação, o usuário ainda pode instalar pelo menu do Chrome/Edge.

3. Compatibilidade mantida:
   - Não altera a lógica de agenda.
   - Não altera WhatsApp.
   - Não altera Supabase.
   - Mantém PWA mobile já existente.

Como testar no computador:

1. Subir esta versão no Netlify.
2. Abrir o link no Google Chrome ou Microsoft Edge.
3. Aguardar alguns segundos.
4. Procurar o botão "Instalar ZenBarber" no canto inferior direito.
5. Alternativa: clicar no ícone de instalação na barra de endereço do navegador.

Observação:
Alguns navegadores só mostram a instalação depois de limpar cache ou visitar o site novamente.
