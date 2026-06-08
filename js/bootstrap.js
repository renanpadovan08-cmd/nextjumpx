// Inicialização central do ZenBarber
window.addEventListener("hashchange", route);
route();

// HOTFIX PWA DESKTOP/MOBILE: botão interno para instalar o ZenBarber
(function initZenBarberInstallPrompt(){
  var deferredPrompt = null;
  var isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  var isIOSStandalone = window.navigator.standalone === true;

  if (isStandalone || isIOSStandalone) return;

  function ensureInstallButton(){
    var btn = document.getElementById('zenPwaInstallBtn');
    if (btn) return btn;

    btn = document.createElement('button');
    btn.id = 'zenPwaInstallBtn';
    btn.type = 'button';
    btn.className = 'pwaInstallButton';
    btn.innerHTML = '📲 Instalar ZenBarber';
    btn.title = 'Instalar o ZenBarber como aplicativo neste dispositivo';
    document.body.appendChild(btn);

    btn.addEventListener('click', function(){
      if (!deferredPrompt) {
        alert('No computador, abra pelo Chrome ou Edge e use o ícone de instalação na barra de endereço, ou o menu do navegador > Instalar aplicativo.');
        return;
      }
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function(){
        deferredPrompt = null;
        btn.classList.remove('visible');
      });
    });

    return btn;
  }

  window.addEventListener('beforeinstallprompt', function(event){
    event.preventDefault();
    deferredPrompt = event;
    ensureInstallButton().classList.add('visible');
  });

  window.addEventListener('appinstalled', function(){
    var btn = document.getElementById('zenPwaInstallBtn');
    if (btn) btn.classList.remove('visible');
    deferredPrompt = null;
  });
})();
