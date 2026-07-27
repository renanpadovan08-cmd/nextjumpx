// Inicialização central do ZenBarber
window.addEventListener("hashchange", route);

async function startZenBarber(){
  if(window.__zenBarberStarted) return;
  window.__zenBarberStarted = true;
  const loaderToken = typeof showZenLoader === 'function'
    ? showZenLoader('Carregando', {delay:0})
    : null;
  let safetyTimer = null;
  try{
    const safetyLimit = new Promise((_, reject) => {
      safetyTimer = setTimeout(() => reject(new Error('O carregamento demorou mais que o esperado.')), 30000);
    });
    await Promise.race([route(), safetyLimit]);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.__zenBarberReady = true;
    clearTimeout(window.__zenStartupWatchdog);
  }catch(error){
    console.error('ZenBarber: falha na inicialização', error);
    if(typeof forceHideZenLoader === 'function') forceHideZenLoader();
    if(typeof renderZenStartupError === 'function') renderZenStartupError(error?.message || 'Verifique sua conexão e tente novamente.');
  }finally{
    clearTimeout(safetyTimer);
    if(typeof hideZenLoader === 'function') hideZenLoader(loaderToken, {minVisible:280});
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', startZenBarber, {once:true});
}else{
  startZenBarber();
}

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
