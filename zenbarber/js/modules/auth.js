async function route(){
  try{
    const h = location.hash.replace("#","");
    const isPublicBookingRoute = h.startsWith("book/");
    document.body.classList.toggle("public-booking-mode", isPublicBookingRoute);
    if(isPublicBookingRoute) return renderBooking(decodeURIComponent(h.split("/")[1]||""));
    if(!me) return renderLogin();
    me.role = normalizeRole(me.role);
    sessionStorage.setItem("zenbarber_user", JSON.stringify(me));
    if(isAdminRole()) return renderAdmin();
    if(requiresTermsAcceptance()) return renderTermsAcceptance();
    if(isBarberOnlyRole()) return renderBarberDashboard();
    await renderApp();
  }catch(e){
    console.error(e);
    root.innerHTML = `<div class="page"><div class="card"><h2>Não foi possível abrir o ZenBarber</h2><p class="muted">O carregamento encontrou um problema. Verifique sua conexão e tente novamente.</p><div class="linkBox">${esc(e?.message || String(e))}</div><br><button class="primary" onclick="location.reload()">Tentar novamente</button></div></div>`;
  }
}

function renderLogin(){
  root.innerHTML = `<div class="page"><div class="loginWrap cleanLogin">
    <div class="loginCard welcomeCard"><div class="brand bigBrand"><div class="logo officialLogo"><img src="/nextjumpx-symbol.png" alt="NextJumpX"></div><div><h1><span>ZenBarber</span> <span class="proGoldBadge">PRO</span></h1><p class="muted">Powered by NextJumpX</p></div></div><h2>Organize sua barbearia em um só lugar.</h2><p class="muted">Agenda, serviços, barbeiros, carteira, link público e WhatsApp integrados.</p><div class="featureList"><span>✅ Link para clientes</span><span>✅ Agenda por barbeiro</span><span>✅ Bloqueio por duração do serviço</span></div></div>
    <div class="loginCard"><h2>Entrar</h2><form id="loginForm" class="form" onsubmit="event.preventDefault(); doLogin();"><input id="login" placeholder="Login" autocomplete="username"><input id="pass" type="password" placeholder="Senha" autocomplete="current-password"><button id="loginBtn" class="primary" type="submit">Entrar</button><button type="button" onclick="showCreate()">Criar conta de barbearia</button></form><div class="loginPowered">Powered by NextJumpX</div></div>
  </div></div>`;
}

function setLoginLoading(active){
  const btn = document.getElementById("loginBtn");
  if(!btn) return;
  btn.disabled = !!active;
  btn.textContent = active ? "Entrando..." : "Entrar";
}

function loginValues(loginRaw){
  const normalized = String(loginRaw || "").trim().toLowerCase().replace(/\s+/g,"-");
  return [...new Set([String(loginRaw || "").trim(), normalized].filter(Boolean))];
}

async function findBarberLoginRows(columns, values){
  // Primeiro tenta match exato para logins normalizados.
  // Se o Supabase responder 200 com array vazio, tenta match case-insensitive.
  // Isso cobre contas antigas como "BielProg" quando o usuário digita "bielprog".
  const res = await db.from("barbers")
    .select(columns)
    .in("login", values)
    .limit(5);
  if(res.error) throw res.error;
  if(Array.isArray(res.data) && res.data.length) return res.data;

  const found = [];
  const seen = new Set();
  for(const value of values){
    const alt = await db.from("barbers")
      .select(columns)
      .ilike("login", String(value || "").trim())
      .limit(5);
    if(alt.error) throw alt.error;
    for(const row of (alt.data || [])){
      const key = row.id || row.login;
      if(!seen.has(key)){ seen.add(key); found.push(row); }
    }
  }
  return found;
}

window.doLogin = async () => {
  const loginInput = document.getElementById("login");
  const passInput = document.getElementById("pass");
  const loginRaw = (loginInput?.value || "").trim();
  const login = loginRaw.toLowerCase().replace(/\s+/g,"-");
  const password = (passInput?.value || "").trim();
  if(!loginRaw || !password) return toast("Preencha login e senha");
  if(ADMIN_LOGIN && ADMIN_PASS && loginRaw === ADMIN_LOGIN && password === ADMIN_PASS) return saveUser({role:"admin",name:"Administrador"});

  setLoginLoading(true);
  const zenLoginLoaderToken = typeof showZenLoader === 'function' ? showZenLoader('Entrando', {delay:120}) : null;
  try{
    // Fluxo normal: uma única consulta para contas já migradas para password_hash.
    // O fallback legado roda só quando o usuário existe mas ainda não tem hash.
    const values = loginValues(loginRaw);
    const hashColumns = `${BARBER_SAFE_COLUMNS},password_hash`;
    const candidates = await findBarberLoginRows(hashColumns, values);
    if(!candidates.length){
      console.warn("ZenBarber login: Supabase retornou 200 sem usuário. Confira login normalizado, RLS e se a conta existe.", {login, values});
      return toast("Login ou senha inválidos. Se a conta existe, confira a liberação/RLS no Supabase.");
    }

    let user = null;
    for(const candidate of candidates){
      if(candidate.password_hash && await verifyBarberPassword(candidate, password)){ user = candidate; break; }
    }

    if(!user && candidates.some(c=>!c.password_hash)){
      const legacyCandidates = await findBarberLoginRows(`${BARBER_SAFE_COLUMNS},password,password_hash`, values);
      for(const candidate of legacyCandidates){
        if(await verifyBarberPassword(candidate, password)){ user = candidate; break; }
      }
    }

    if(!user) return toast("Login ou senha inválidos");
    await migrateLegacyPasswordIfNeeded(user, password);
    user = stripSensitiveBarber(user);

    const status = String(user.access_status || "ativo").toLowerCase();
    if(status === "pendente") return toast("Conta em análise. Aguarde liberação do suporte.");
    if(status === "bloqueado") return toast("Acesso bloqueado. Fale com o suporte.");

    // Se o Admin marcou troca obrigatória, força uma nova senha antes de abrir o painel.
    if(user.must_change_password){
      me = {...user, role: normalizeRole(user.role || "gerente"), access_status: user.access_status || "ativo"};
      sessionStorage.setItem("zenbarber_user", JSON.stringify(me));
      return renderForcePasswordChange();
    }

    // Observação: expires_at não trava mais o login automaticamente aqui.
    // Assim gerente/barbeiro não ficam presos por data antiga cadastrada sem querer.
    saveUser({...user, role: normalizeRole(user.role || "gerente"), access_status: user.access_status || "ativo"});
  }catch(e){
    console.error("ZenBarber login: falha ao consultar Supabase", e);
    toast(e?.message || "Erro ao fazer login. Confira Supabase e conexão.");
  }finally{
    setLoginLoading(false);
    if(typeof hideZenLoader === 'function') hideZenLoader(zenLoginLoaderToken, {minVisible:320});
  }
};window.showCreate = () => {
  root.innerHTML = `<div class="page"><div class="loginWrap"><div class="loginCard"><h1>Criar barbearia</h1><p class="muted">Crie o perfil principal. O acesso ficará pendente até aprovação do ADM.</p></div><div class="loginCard"><div class="form"><input id="n" placeholder="Seu nome"><input id="l" placeholder="Login único. Ex: barbearia-renan"><input id="p" type="password" placeholder="Senha"><input id="ph" placeholder="WhatsApp"><input id="shop" placeholder="Nome da barbearia">${fileField("photoFile","Foto/logo da barbearia (opcional)")}${fileField("bgFile","Foto de fundo da página do cliente (opcional)")}<button class="primary" onclick="createBarber()">Solicitar cadastro</button><button onclick="route()">Voltar</button></div></div></div></div>`;
};
window.createBarber = async () => {
  const rawPassword = p.value.trim();
  const row = {shop_id:(crypto?.randomUUID ? crypto.randomUUID() : undefined),name:n.value.trim(),login:l.value.trim().toLowerCase().replace(/\s+/g,"-"),phone:ph.value.trim(),shop_name:shop.value.trim()||n.value.trim(),photo_url:await imageInputData("photoFile"),background_url:await imageInputData("bgFile"),role:"gerente",access_status:"pendente",activation_note:"Cadastro novo pela tela inicial | aguardando escolha de plano"};
  if(!row.name || !row.login || !rawPassword) return toast("Preencha nome, login e senha");
  await setBarberPasswordFields(row, row.login, rawPassword);
  let {data,error} = await db.from("barbers").insert(row).select().single();
  if(error && String(error.message||"").toLowerCase().includes("password_hash")){
    const legacyRow = {...row, password:rawPassword}; delete legacyRow.password_hash;
    ({data,error} = await db.from("barbers").insert(legacyRow).select().single());
  }
  if(error) return toast(error.message);
  toast("Cadastro recebido. Escolha um plano para falar com o suporte.");
  renderPlanLockedPage(data || row);
};

function planMessage(b,plan){
  return `Olá! Quero ativar o ZenBarber.\n\nPlano escolhido: ${plan}\nNome: ${b.name||''}\nBarbearia: ${b.shop_name||''}\nLogin: ${b.login||''}\nWhatsApp: ${b.phone||''}\n\nCadastro já enviado pelo site e está aguardando liberação.`;
}
function planWaLinks(b,plan){
  const msg = planMessage(b,plan);
  const n1 = wa(ACTIVATION_WHATSAPP,msg);
  const n2 = ACTIVATION_WHATSAPP_2 && ACTIVATION_WHATSAPP_2 !== ACTIVATION_WHATSAPP ? wa(ACTIVATION_WHATSAPP_2,msg) : "";
  return {n1,n2};
}
window.choosePlan = async (id,plan) => {
  const b = window.__pendingSignup || {};
  if(id){ await db.from("barbers").update({activation_note:`Plano escolhido: ${plan} | aguardando contato/liberação`}).eq("id",id); }
  const links = planWaLinks(b,plan);
  window.open(links.n1,"_blank");
  if(links.n2) setTimeout(()=>window.open(links.n2,"_blank"),400);
};
function renderPlanLockedPage(b){
  window.__pendingSignup = b || {};
  const plans = [
    ["Mensal","R$ 54,90","por mês"],
    ["Semestral","R$ 49,90","por mês no plano semestral"],
    ["Anual","R$ 44,90","por mês no plano anual"]
  ];
  root.innerHTML = `<div class="page"><div class="lockedPlans"><div class="card planHeader"><h1>Cadastro recebido ✅</h1><p class="muted">Sua conta ficou pendente de aprovação. Escolha uma das opções abaixo para falar com nosso suporte e liberar seu acesso.</p><strong>${esc(b.shop_name||b.name||'Nova barbearia')}</strong></div><div class="planGrid">${plans.map(p=>`<button class="planBox" onclick="choosePlan('${b.id||''}','${p[0]} - ${p[1]}')"><h2>${p[0]}</h2><strong>${p[1]}</strong><small>${p[2]}</small><span>Falar no WhatsApp</span></button>`).join('')}</div><p class="muted center">Esta tela fica travada até a liberação do ADM. Depois do pagamento/contato, você ou o Vitor autorizam no Painel ADM.</p></div></div>`;
}

window.renderForcePasswordChange = function(){
  root.innerHTML = `<div class="page"><div class="loginWrap"><div class="loginCard"><h1>Trocar senha</h1><p class="muted">Por segurança, cadastre uma nova senha antes de continuar.</p><div class="form"><input id="newPass1" type="password" placeholder="Nova senha"><input id="newPass2" type="password" placeholder="Confirmar nova senha"><button class="primary" onclick="finishPasswordChange()">Salvar nova senha</button><button onclick="logout()">Sair</button></div></div></div></div>`;
};
window.finishPasswordChange = async function(){
  const p1 = (document.getElementById('newPass1')?.value || '').trim();
  const p2 = (document.getElementById('newPass2')?.value || '').trim();
  if(p1.length < 6) return toast('Use uma senha com pelo menos 6 caracteres');
  if(p1 !== p2) return toast('As senhas não conferem');
  const row = {};
  await setBarberPasswordFields(row, me.login, p1);
  const {error} = await db.from('barbers').update(row).eq('id', me.id);
  if(error) return toast(error.message);
  refreshSessionUser({must_change_password:false});
  toast('Senha atualizada com segurança');
  route();
};

function appProfileHero(){
  const hasBg = safeImg(me?.background_url);
  const hasPhoto = safeImg(me?.photo_url);
  if(!hasBg && !hasPhoto) return "";
  return `<div class="barberBanner" ${bgStyle(me.background_url)}>${avatar(me.photo_url,me.name)}<div><strong>${esc(me.name||"")}</strong><small>${esc(sameShopName())}</small></div></div>`;
}
function navIcon(name){
  const icons = {
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    repeat:'<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    whatsapp:'<path d="M21 11.5a8.5 8.5 0 0 1-12.56 7.45L3 21l2.05-5.32A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.5 8.8c.25 3.2 2.55 5.55 5.7 6"/>',
    dashboard:'<rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/>',
    check:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    trophy:'<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M5 5H3v2a4 4 0 0 0 4 4"/><path d="M19 5h2v2a4 4 0 0 1-4 4"/>',
    chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-7"/>',
    target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/>',
    cash:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    scissors:'<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.6 8.6L19 19"/><path d="M8.6 15.4L19 5"/>',
    userCog:'<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h3"/><circle cx="17" cy="17" r="3"/><path d="M17 13v1M17 20v1M13 17h1M20 17h1"/>',
    headset:'<path d="M3 13a9 9 0 0 1 18 0"/><path d="M5 13v4a2 2 0 0 0 2 2h1v-8H7a2 2 0 0 0-2 2Z"/><path d="M19 13v4a2 2 0 0 1-2 2h-1v-8h1a2 2 0 0 1 2 2Z"/><path d="M12 21h3"/>'
  };
  return `<svg class="navIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]||icons.dashboard}</svg>`;
}
function zenNavCategoryForPage(currentPage){
  if(['appointments','wallet','recurring','link','whatsapp'].includes(currentPage)) return 'attendance';
  if(['dashboard','pending','reports','commissions','clients','business','cash','barbers','services','profile','hours','backup'].includes(currentPage)) return 'business';
  if(['support'].includes(currentPage)) return 'support';
  return 'attendance';
}
function zenNavSavedCategory(){
  try{ return localStorage.getItem('zenbarber_nav_category') || ''; }catch(e){ return ''; }
}
function zenNavToggle(category){
  const nav = document.querySelector('.nav.zenAccordionNav');
  if(!nav) return;
  const target = nav.querySelector(`.zenNavGroup[data-category="${category}"]`);
  if(!target) return;
  const willOpen = !target.classList.contains('open');
  nav.querySelectorAll('.zenNavGroup').forEach(group=>group.classList.remove('open'));
  if(willOpen){
    target.classList.add('open');
    try{ localStorage.setItem('zenbarber_nav_category', category); }catch(e){}
  }else{
    try{ localStorage.removeItem('zenbarber_nav_category'); }catch(e){}
  }
}
function zenNavGo(nextPage){
  page = nextPage;
  try{ localStorage.setItem('zenbarber_nav_category', zenNavCategoryForPage(nextPage)); }catch(e){}
  renderApp();
}
function zenNavGroupHtml(category,label,items,openCategory){
  const isOpen = category === openCategory;
  return `<section class="zenNavGroup ${isOpen?'open':''}" data-category="${category}">
    <button type="button" class="zenNavCategory" onclick="zenNavToggle('${category}')" aria-expanded="${isOpen?'true':'false'}">
      <span>${label}</span><span class="zenNavArrow" aria-hidden="true">⌄</span>
    </button>
    <div class="zenNavItems">${items}</div>
  </section>`;
}
function zenNavItem(target,label,extra=''){
  return `<button type="button" class="zenNavItem ${page===target?'active':''}" onclick="zenNavGo('${target}')"><span>${label}</span>${extra}</button>`;
}
function managerNavHtml(){
  const currentCategory = zenNavCategoryForPage(page);
  const savedCategory = zenNavSavedCategory();
  const openCategory = currentCategory || savedCategory || 'attendance';
  const attendanceItems = [
    zenNavItem('appointments','Agenda Premium'),
    zenNavItem('wallet','Clientes em carteira'),
    zenNavItem('recurring','Clientes fixos'),
    zenNavItem('link','Link do cliente'),
    zenNavItem('whatsapp','Central WhatsApp')
  ].join('');
  const businessItems = [
    zenNavItem('dashboard','Dashboard PRO'),
    zenNavItem('pending','Pendências / Baixa'),
    zenNavItem('reports','Ranking / Comissão'),
    zenNavItem('commissions','Comissões'),
    zenNavItem('clients','Retenção'),
    zenNavItem('business','Meu Negócio'),
    zenNavItem('cash','Controle de Caixa'),
    zenNavItem('barbers','Barbeiros'),
    zenNavItem('services','Serviços'),
    zenNavItem('profile','Perfil / Configurações'),
    zenNavItem('hours','Funcionamento'),
    isAdminRole() ? zenNavItem('backup','Gestão PRO') : ''
  ].join('');
  const supportItems = zenNavItem('support','Suporte / Chat',typeof supportUnreadBadgeHtml==='function'?supportUnreadBadgeHtml():'');
  return `${zenNavGroupHtml('attendance','ATENDIMENTO',attendanceItems,openCategory)}
    ${zenNavGroupHtml('business','NEGÓCIO',businessItems,openCategory)}
    ${zenNavGroupHtml('support','SUPORTE',supportItems,openCategory)}`;
}
function layout(title,sub,body){
  root.innerHTML = `<div class="page"><div class="shell"><aside class="sidebar"><div class="brand">${avatar(me.photo_url,me.name)}<div><h1><span>ZenBarber</span> <span class="proGoldBadge small">PRO</span></h1><p>${esc(me.name||"")}</p><small class="brandProSeal">Powered by NextJumpX</small></div></div><nav class="nav ${isAdminRole()?'':'zenAccordionNav'}">${isAdminRole()?`<button class="${page!=='support'?'active':''}" onclick="page='dashboard';renderAdmin()">${navIcon('dashboard')}<span>Painel ADM</span></button><button class="${page==='support'?'active':''}" onclick="page='support';renderAdmin()">${navIcon('headset')}<span>Suporte / Chat</span>${typeof supportUnreadBadgeHtml==='function'?supportUnreadBadgeHtml():''}</button>`:managerNavHtml()}</nav><div class="spacer"></div><div class="sidebarBrandFooter"><strong>ZenBarber Pro v2</strong><span>Powered by NextJumpX © 2026</span></div><button class="danger" onclick="logout()">Sair</button></aside><main class="content">${isAdminRole()?"":appProfileHero()}<div class="top"><div><h2>${title}</h2><p class="muted">${sub||""}</p></div><div class="topActions">${unitSelectorHtml()}<button onclick="openZenUpdates()">🔔 Novidades</button><button onclick="route()">Atualizar</button></div></div>${body}<footer class="globalBrandFooter">© 2026 NextJumpX. Todos os direitos reservados.</footer></main></div></div>`;
}

async function refreshCurrentUser(){
  if(!me || isAdminRole() || !me.id) return;
  const {data,error} = await db.from("barbers").select(BARBER_SAFE_COLUMNS).eq("id",me.id).maybeSingle();
  if(!error && data){
    me = {...data, role:normalizeRole(data.role || me.role), access_status:data.access_status || "ativo"};
    sessionStorage.setItem("zenbarber_user", JSON.stringify(me));
  }
}

async function fetchAppointmentsPaged({shopId='', barberIds=[]}={}){
  // HOTFIX URGENTE CARRIEL: Supabase retorna somente 1000 linhas por consulta por padrão.
  // Como a barbearia já tem milhares de agendamentos/clientes fixos, a agenda carregava
  // apenas o primeiro bloco e os próximos sábados sumiam visualmente mesmo existindo no banco.
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while(true){
    let q = db.from("appointments")
      .select("*, services(name, price, duration)")
      .order("date",{ascending:true})
      .order("time",{ascending:true})
      .range(from, from + pageSize - 1);
    if(shopId) q = q.eq("shop_id", shopId);
    else if(barberIds.length) q = q.in("barber_id", barberIds);
    const {data,error} = await q;
    if(error){ toast(error.message); break; }
    const rows = data || [];
    all = all.concat(rows);
    if(rows.length < pageSize) break;
    from += pageSize;
    if(from > 20000) break;
  }
  return all;
}

async function loadMine(){
  await refreshCurrentUser();
  const shop = sameShopName();
  const sid = sameShopId();
  const barberQuery = db.from("barbers").select(BARBER_SAFE_COLUMNS).neq("access_status","pendente").order("created_at",{ascending:true});
  const scopedBarberQuery = sid ? barberQuery.eq("shop_id", sid) : barberQuery.eq("shop_name", shop);
  const [barb,serv] = await Promise.all([
    scopedBarberQuery,
    db.from("services").select("*").order("created_at",{ascending:false})
  ]);
  if(barb.error) toast(barb.error.message); if(serv.error) toast(serv.error.message);
  cache.allShopBarbers = barb.data?.length ? barb.data : [me];
  cache.shopBarbers = filterBarbersByActiveUnit(cache.allShopBarbers);
  const allIds = cache.allShopBarbers.map(b=>b.id);
  const activeIds = cache.shopBarbers.map(b=>b.id);
  const appts = await fetchAppointmentsPaged({shopId:sid, barberIds:allIds});
  cache.services = (serv.data||[]).filter(s=>activeIds.includes(s.barber_id));
  cache.appointments = (appts||[]).filter(a=>activeIds.includes(a.barber_id)).sort((x,y)=>`${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`));
}


// ===== HOTFIX NEXTJUMPX: autonomia segura do barbeiro =====
function barberScheduleManagerHtml(){
  const schedule = parseWeeklySchedule(me || {});
  const rows = schedule.map((d,idx)=>`<div class="barberScheduleDay ${d.open?'open':'closed'}">
    <label class="dayToggle"><input id="bsd_open_${idx}" type="checkbox" ${d.open?'checked':''} onchange="toggleBarberDayRow(${idx})"><strong>${DAY_NAMES[idx]}</strong></label>
    <div class="barberScheduleTimes" id="bsd_times_${idx}">
      <label>Entrada<input id="bsd_start_${idx}" type="time" value="${esc(d.start||OPEN)}"></label>
      <label>Saída<input id="bsd_end_${idx}" type="time" value="${esc(d.end||CLOSE)}"></label>
      <label>Início intervalo<input id="bsd_break_start_${idx}" type="time" value="${esc(d.break_start||'')}"></label>
      <label>Fim intervalo<input id="bsd_break_end_${idx}" type="time" value="${esc(d.break_end||'')}"></label>
    </div>
  </div>`).join('');
  return `<section class="card barberScheduleManager"><div class="chartTitle"><div><h3>Minha disponibilidade</h3><p class="muted">Aqui o barbeiro controla os próprios dias de trabalho, horários disponíveis e intervalo. O link do cliente usa esta agenda assim que o cliente seleciona o barbeiro.</p></div><button class="primary" onclick="saveMyBarberSchedule()">Salvar disponibilidade</button></div><div class="barberScheduleGrid">${rows}</div><p class="muted">Dica: desmarque o dia para fechar sua agenda. Para bloquear um horário específico, use o botão de cancelamento/bloqueio na agenda ou peça ao gerente para lançar fechamento.</p></section>`;
}
window.toggleBarberDayRow = function(idx){
  const open = document.getElementById(`bsd_open_${idx}`)?.checked;
  const row = document.getElementById(`bsd_times_${idx}`)?.closest('.barberScheduleDay');
  if(row){ row.classList.toggle('open', !!open); row.classList.toggle('closed', !open); }
};
window.saveMyBarberSchedule = async function(){
  if(!me?.id) return toast('Sessão inválida. Entre novamente.');
  const schedule = DAY_NAMES.map((_,idx)=>{
    const open = !!document.getElementById(`bsd_open_${idx}`)?.checked;
    const start = document.getElementById(`bsd_start_${idx}`)?.value || OPEN;
    const end = document.getElementById(`bsd_end_${idx}`)?.value || CLOSE;
    const break_start = document.getElementById(`bsd_break_start_${idx}`)?.value || '';
    const break_end = document.getElementById(`bsd_break_end_${idx}`)?.value || '';
    return {open,start,end,break_start,break_end};
  });
  for(const d of schedule){
    if(d.open && minutes(d.start) >= minutes(d.end)) return toast('Entrada precisa ser menor que saída nos dias abertos.');
    if(d.break_start && d.break_end && minutes(d.break_start) >= minutes(d.break_end)) return toast('Início do intervalo precisa ser menor que o fim.');
  }
  const firstOpen = schedule.find(d=>d.open) || schedule[0];
  const off_days = 'SCHEDULE_JSON:' + JSON.stringify(schedule);
  const row = {off_days, work_start:firstOpen.start || OPEN, work_end:firstOpen.end || CLOSE};
  const {data,error} = await db.from('barbers').update(row).eq('id', me.id).select(BARBER_SAFE_COLUMNS).maybeSingle();
  if(error) return toast(error.message);
  me = {...me, ...(data||row)};
  sessionStorage.setItem('zenbarber_user', JSON.stringify(me));
  cache.shopBarbers = (cache.shopBarbers||[]).map(b=>b.id===me.id?{...b,...me}:b);
  toast('Sua disponibilidade foi salva. O link público já seguirá estes horários.');
  renderBarberDashboard();
};
window.cancelOwnBarberAppt = async function(id){
  const a = (cache.appointments||[]).find(x=>x.id===id);
  if(!a || a.barber_id !== me?.id) return toast('Você só pode cancelar atendimentos da sua própria agenda.');
  const reason = prompt('Motivo do cancelamento?\nEx: cliente cancelou, cliente faltou, reagendado, erro de cadastro') || 'Cancelado pelo barbeiro';
  if(!confirm(`Cancelar atendimento de ${a.client_name||'cliente'} às ${a.time||''}?`)) return;
  const note = `Cancelado pelo barbeiro ${me.name||''}: ${reason}`;
  const {error}=await db.from('appointments').update({status:'cancelado', client_phone:a.client_phone || '', client_name:a.client_name || ''}).eq('id',id).eq('barber_id',me.id);
  if(error) return toast(error.message);
  cache.appointments = cache.appointments.map(x=>x.id===id?{...x,status:'cancelado',cancel_note:note}:x);
  toast('Atendimento cancelado e mantido no histórico.');
  renderBarberDashboard();
};


function barberSelfBlockPanelHtml(){
  if(!barberCanSelfBlock(me)){
    return `<section class="card barberSelfBlock locked"><h3>Bloqueio rápido de agenda</h3><p class="muted">Esta opção fica liberada pelo gerente. Quando ativa, você pode fechar sua agenda por algumas horas ou pelo dia inteiro e avisar os clientes afetados pelo WhatsApp.</p><span class="statusBadge blocked">Aguardando liberação do gerente</span></section>`;
  }
  const activeLocks=(cache.appointments||[]).filter(a=>String(a.barber_id)===String(me?.id) && a.date>=todayISO() && isClosureAppt(a)).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return `<section class="card barberSelfBlock"><div class="chartTitle"><div><h3>Bloqueio rápido de agenda</h3><p class="muted">Feche parte do dia ou o dia inteiro. O ZenBarber identifica clientes já agendados e monta a mensagem de WhatsApp.</p></div><button class="danger" onclick="openSelfBlockAgenda()">Bloquear minha agenda</button></div>${activeLocks.slice(0,5).map(a=>`<div class="item"><div><strong>${formatDateFullBR(a.date)} • ${esc(a.time||'')} até ${safeEndTimeForAppt(a)||'--'}</strong><small>${esc(a.client_name||'Agenda fechada')}</small></div><button class="primary" onclick="removeOwnSelfBlock('${a.id}')">Reabrir</button></div>`).join('') || '<div class="empty">Nenhum bloqueio futuro criado por você.</div>'}</section>`;
}
function selfBlockAffected(date,start,end){
  const dur=Math.max(1, minutes(end)-minutes(start));
  return (cache.appointments||[]).filter(a=>String(a.barber_id)===String(me?.id) && a.date===date && ['agendado','encaixe','em_andamento'].includes(a.status) && !isClosureAppt(a) && intervalOverlaps(start,dur,a.time,a.services?.duration || serviceById(a.service_id)?.duration || 30)).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
}
function selfBlockDefaultMessage(a, reason){
  const first=String(a.client_name||'cliente').trim().split(/\s+/)[0] || 'cliente';
  return `Olá ${first}, tudo bem?\n\nPrecisei bloquear minha agenda por motivo de ${reason || 'compromisso inesperado'}. Seu horário de hoje às ${a.time} na ${sameShopName()} será reagendado.\n\nPeço desculpas pelo transtorno. Me chame por aqui para encontrarmos o melhor novo horário.\n\n${me.name || 'Barbeiro'} - ${sameShopName()}`;
}
window.openSelfBlockAgenda = function(){
  if(!barberCanSelfBlock(me)) return toast('Seu gerente ainda não liberou esta função.');
  const today=todayISO();
  const ws=workStart(me,today)||OPEN, we=workEnd(me,today)||CLOSE;
  document.body.insertAdjacentHTML('beforeend',`<div class="modalBack" id="modal"><div class="modal"><h2>Bloquear minha agenda</h2><p class="muted">Escolha o período. Se houver clientes marcados neste intervalo, o sistema prepara mensagens de WhatsApp para eles.</p><div class="form"><label>Data<input id="sbd" type="date" min="${today}" value="${today}" onchange="previewSelfBlockClients()"></label><label>Tipo<select id="sbt" onchange="syncSelfBlockType()"><option value="all">Dia inteiro</option><option value="part">Parte do dia</option></select></label><div class="grid2"><label>Início<input id="sbs" type="time" value="${esc(ws)}" onchange="previewSelfBlockClients()"></label><label>Fim<input id="sbe" type="time" value="${esc(we)}" onchange="previewSelfBlockClients()"></label></div><label>Motivo<input id="sbr" placeholder="Ex: correio, emergência, compromisso" value="compromisso inesperado" oninput="previewSelfBlockClients()"></label><div id="selfBlockPreview" class="card softCard"></div><div class="row"><button class="danger" onclick="saveSelfBlockAgenda()">Confirmar bloqueio</button><button onclick="modal.remove()">Cancelar</button></div></div></div></div>`);
  syncSelfBlockType();
};
window.syncSelfBlockType = function(){
  const type=document.getElementById('sbt')?.value;
  const date=document.getElementById('sbd')?.value || todayISO();
  if(type==='all'){
    const b=me || {};
    document.getElementById('sbs').value=workStart(b,date)||OPEN;
    document.getElementById('sbe').value=workEnd(b,date)||CLOSE;
  }
  previewSelfBlockClients();
};
window.previewSelfBlockClients = function(){
  const date=document.getElementById('sbd')?.value || todayISO();
  const start=document.getElementById('sbs')?.value || workStart(me,date)||OPEN;
  const end=document.getElementById('sbe')?.value || workEnd(me,date)||CLOSE;
  const box=document.getElementById('selfBlockPreview');
  if(!box) return;
  if(minutes(end)<=minutes(start)){ box.innerHTML='<p class="muted">O fim precisa ser maior que o início.</p>'; return; }
  const affected=selfBlockAffected(date,start,end);
  const reason=document.getElementById('sbr')?.value || 'compromisso inesperado';
  box.innerHTML=`<h3>${affected.length} cliente(s) afetado(s)</h3>${affected.map(a=>`<div class="item"><div><strong>${esc(a.time||'')} • ${esc(a.client_name||'Cliente')}</strong><small>${esc(a.client_phone||'sem WhatsApp')} • ${esc(a.services?.name||'Serviço')}</small></div><a target="_blank" href="${wa(a.client_phone,selfBlockDefaultMessage(a,reason))}"><button class="whats" type="button">Prévia WhatsApp</button></a></div>`).join('') || '<div class="empty">Nenhum cliente marcado nesse período.</div>'}<small class="muted">Após confirmar, você poderá abrir as mensagens para os clientes afetados.</small>`;
};
window.saveSelfBlockAgenda = async function(){
  if(!barberCanSelfBlock(me)) return toast('Função não liberada pelo gerente.');
  const date=document.getElementById('sbd')?.value || todayISO();
  const start=document.getElementById('sbs')?.value || workStart(me,date)||OPEN;
  const end=document.getElementById('sbe')?.value || workEnd(me,date)||CLOSE;
  const reason=(document.getElementById('sbr')?.value || 'compromisso inesperado').trim();
  if(isPastDateTime(date,start)) return toast('Não é possível bloquear horário passado.');
  if(minutes(end)<=minutes(start)) return toast('O fim precisa ser maior que o início.');
  const affected=selfBlockAffected(date,start,end);
  if(affected.length && !confirm(`Existem ${affected.length} cliente(s) agendado(s) nesse período. Confirmar bloqueio e preparar mensagens?`)) return;
  try{
    const dur=minutes(end)-minutes(start);
    const serviceId=await ensureClosureService(me.id,dur);
    const row=shopScopedPayload({barber_id:me.id,service_id:serviceId,client_name:`Agenda fechada - Bloqueio do barbeiro - ${reason}`,client_phone:'',date,time:start,status:'bloqueio'});
    const {error}=await db.from('appointments').insert(row);
    if(error) return toast(error.message);
    modal?.remove();
    toast('Agenda bloqueada. Abrindo mensagens dos clientes afetados.');
    affected.forEach((a,idx)=>setTimeout(()=>window.open(wa(a.client_phone,selfBlockDefaultMessage(a,reason)),'_blank'), idx*350));
    await loadMine();
    renderBarberDashboard();
  }catch(err){ toast(err.message || 'Erro ao bloquear agenda.'); }
};
window.removeOwnSelfBlock = async function(id){
  const a=(cache.appointments||[]).find(x=>x.id===id);
  if(!a || String(a.barber_id)!==String(me?.id) || !isClosureAppt(a)) return toast('Bloqueio não encontrado.');
  if(!confirm('Reabrir este período da sua agenda?')) return;
  const {error}=await db.from('appointments').update({status:'cancelado'}).eq('id',id).eq('barber_id',me.id);
  if(error) return toast(error.message);
  toast('Agenda reaberta.');
  await loadMine();
  renderBarberDashboard();
};

async function renderBarberDashboard(){
  await loadMine();
  if(typeof loadBusinessGoals==='function') await loadBusinessGoals();
  sessionStorage.setItem('zb_business_barber', me.id);
  const ownAppts = cache.appointments.filter(a=>a.barber_id===me.id);
  const currentMonth = new Date().toISOString().slice(0,7);
  const doneMonth = ownAppts.filter(a=>a.status==='concluido' && monthKey(a.date)===currentMonth);
  const bruto = doneMonth.reduce((t,a)=>t+Number(a.services?.price||0),0);
  const perc = Number(me.commission_rate||0);
  const comissao = bruto * perc / 100;
  const today = todayISO();
  const agendaHoje = ownAppts.filter(a=>['agendado','encaixe','em_andamento'].includes(a.status) && a.date===today).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  const nowMin = new Date().getHours()*60 + new Date().getMinutes();
  const nextClient = agendaHoje.find(a=>minutes(a.time||'00:00') >= nowMin) || agendaHoje[0];
  const ticketMedio = doneMonth.length ? bruto / doneMonth.length : 0;
  const link = publicDashboardLink();
  const ownServices = publicServicesForBarber(me.id);
  const firstService = ownServices[0]?.id || '';
  root.innerHTML = `<div class="page barberDashPage"><main class="barberDash">
    <div class="barberDashTop"><div class="brand">${barberAvatar(me)}<div><h1>ZenBarber Pro</h1><p>${esc(me.name||'Barbeiro')}</p><small class="brandProSeal">Powered by NextJumpX</small></div></div><button class="danger" onclick="logout()">Sair</button></div>
    <section class="card barberHero barberHeroPremium"><div><h2>Painel individual do barbeiro</h2><p class="muted">Seu faturamento, comissão prevista, agenda do dia e próximo cliente em uma tela rápida.</p></div>${nextClient?`<div class="nextClientPremium"><small>Próximo cliente</small><b>${esc(nextClient.time||'')}</b><strong>${esc(nextClient.client_name||'Cliente')}</strong><span>${esc(nextClient.services?.name||'Serviço')}</span></div>`:''}</section>
    <div class="statgrid barberKpiGrid"><div class="stat"><span>Faturamento do mês</span><b>${money(bruto)}</b></div><div class="stat"><span>Comissão prevista</span><b>${money(comissao)}</b></div><div class="stat"><span>Atendimentos concluídos</span><b>${doneMonth.length}</b></div><div class="stat"><span>Ticket médio</span><b>${money(ticketMedio)}</b></div><div class="stat"><span>Percentual</span><b>${perc}%</b></div><div class="stat"><span>Atendimentos hoje</span><b>${agendaHoje.length}</b></div></div>
    <section class="card barberTodayPremium"><h3>Minha agenda de hoje</h3>${agendaHoje.map(a=>`<div class="item barberTodayItem ${a.id===nextClient?.id?'next':''}"><div class="timeBubble">${esc(a.time||'')}</div><div><strong>${esc(a.client_name)}</strong><small>${a.status==='encaixe'?'⚡ Encaixe • ':''}${esc(a.services?.name||'Serviço')} • termina ${safeEndTimeForAppt(a)||'--'} • ${esc(a.client_phone||'')}</small></div><div class="barberApptActions"><a target="_blank" href="${wa(a.client_phone,`Olá ${a.client_name}, passando para confirmar seu horário hoje às ${a.time} na ${sameShopName()}.`)}"><button class="whats">WhatsApp</button></a><button class="danger" onclick="cancelOwnBarberAppt('${a.id}')">Cancelar</button></div></div>`).join('') || '<div class="empty">Nenhum agendamento para hoje.</div>'}</section>
    ${barberSelfBlockPanelHtml()}
    ${typeof meuNegocioPage==='function'?meuNegocioPage({embedded:true}):''}
    ${barberScheduleManagerHtml()}
    <section class="card barberInternalSchedule"><h3>Agendamento interno / encaixe</h3><p class="muted">O barbeiro pode lançar clientes direto na própria agenda. Use Agendar para horário normal ou Encaixe para encaixar em horário já ocupado.</p><div class="grid"><input id="bcn" placeholder="Nome do cliente"><input id="bcp" placeholder="Telefone"><select id="bsv" onchange="updateBarberInternalSlots()">${publicServiceOptions(me.id,firstService)}</select><input id="bdt" type="date" min="${todayISO()}" value="${today}" onchange="updateBarberInternalSlots()"><select id="btm">${slotOptionsManual(me.id,today,firstService)}</select><button class="primary" onclick="addBarberInternalAppt()">Agendar</button><button class="gold" onclick="addBarberInternalFitIn()">Encaixe</button></div>${ownServices.length?'':'<div class="empty">Nenhum serviço cadastrado para você. Peça ao gerente para cadastrar serviços.</div>'}</section>
    <section class="card"><h3>Meu link para compartilhar</h3><p class="muted">Envie este link para o cliente agendar com a barbearia.</p><div class="linkBox">${link}</div><br><div class="row"><button class="primary" onclick="navigator.clipboard.writeText('${link}');toast('Link copiado')">Copiar link</button><a target="_blank" href="${wa('',`Olá! Para agendar seu horário, acesse: ${link}`)}"><button class="whats">Enviar pelo WhatsApp</button></a></div></section>
    <footer class="globalBrandFooter">© 2026 NextJumpX. Todos os direitos reservados.</footer>
  </main></div>`;
  maybeShowZenUpdateModal();
}
window.updateBarberInternalSlots = () => {
  const d=document.getElementById('bdt'), s=document.getElementById('bsv'), t=document.getElementById('btm');
  if(!d || !s || !t) return;
  if(!d.value) d.value=todayISO();
  t.innerHTML = slotOptionsManual(me.id,d.value,s.value);
};
window.addBarberInternalAppt = async () => {
  const name=document.getElementById('bcn')?.value?.trim();
  const phone=document.getElementById('bcp')?.value?.trim();
  const serviceId=document.getElementById('bsv')?.value;
  const date=document.getElementById('bdt')?.value;
  const time=document.getElementById('btm')?.value;
  if(!name || !serviceId || !date || !time) return toast('Preencha cliente, serviço, data e horário.');
  if(await hasConflict(me.id,date,time,serviceId)) return toast('Esse horário sobrepõe outro agendamento. Para forçar, use Encaixe.');
  const {error}=await db.from('appointments').insert(shopScopedPayload({barber_id:me.id,service_id:serviceId,client_name:name,client_phone:phone,date,time,status:'agendado'}));
  if(error) return toast(error.message);
  toast('Agendamento criado na sua agenda.');
  renderBarberDashboard();
};
window.addBarberInternalFitIn = async () => {
  const name=document.getElementById('bcn')?.value?.trim();
  const phone=document.getElementById('bcp')?.value?.trim();
  const serviceId=document.getElementById('bsv')?.value;
  const date=document.getElementById('bdt')?.value;
  const time=document.getElementById('btm')?.value;
  if(!name || !serviceId || !date || !time) return toast('Preencha cliente, serviço, data e horário.');
  if(isPastDateTime(date,time)) return toast('Não permite encaixe no passado.');
  const {error}=await db.from('appointments').insert(shopScopedPayload({barber_id:me.id,service_id:serviceId,client_name:name,client_phone:phone,date,time,status:'encaixe'}));
  if(error) return toast(error.message);
  toast('Encaixe criado na sua agenda.');
  renderBarberDashboard();
};

async function renderApp(){
  const zenLoaderToken = typeof showZenLoader === 'function' ? showZenLoader('Carregando', {delay:220}) : null;
  try {
  if(page === 'backup' && !isAdminRole()){ page = 'dashboard'; toast('Gestão PRO é exclusiva do Admin.'); }
  await loadMine();
  if(typeof loadBusinessGoals==='function') await loadBusinessGoals();
  if(page==='updates' && typeof loadZenUpdates==='function') await loadZenUpdates(true);
  const title = {dashboard:"Dashboard",business:"Meu Negócio",services:"Serviços",units:"Unidades",barbers:"Barbeiros",commissions:"Comissões",hours:"Funcionamento",appointments:"Agendamentos",whatsapp:"Central WhatsApp",updates:"Novidades",cash:"Controle de Caixa",recurring:"Clientes fixos",wallet:"Clientes em carteira",pending:"Pendências / Baixa",link:"Link do cliente",profile:"Perfil / Configurações",support:"Suporte / Chat",reports:"Ranking / Comissão",clients:"Retenção",backup:"Gestão PRO"}[page] || "Dashboard";
  const pageRenderers = {
    dashboard:()=>dash(),
    business:()=>typeof meuNegocioPage==='function' ? meuNegocioPage() : '<div class="card">Módulo indisponível</div>',
    services:()=>services(),
    units:()=>unitsPage(),
    barbers:()=>barbersPage(),
    commissions:()=>commissionsPage(),
    hours:()=>hoursPage(),
    appointments:()=>appointments(),
    whatsapp:()=>whatsappPage(),
    updates:()=>updatesPage(),
    cash:()=>cashPage(),
    recurring:()=>recurringPage(),
    wallet:()=>wallet(),
    pending:()=>pendingSettlementPage(),
    link:()=>linkPage(),
    profile:()=>profilePage(),
    support:()=>supportPage(),
    reports:()=>reportsPage(),
    clients:()=>clientsPage(),
    backup:()=>backupPage()
  };
  const renderCurrentPage = pageRenderers[page] || pageRenderers.dashboard;
  const body = await renderCurrentPage();
  layout(title, sameShopName() || me.login, body);
  if(page==='dashboard') setTimeout(drawChart,50);
  if(page==='clients') setTimeout(()=>{ if(typeof renderReactivationList==='function') renderReactivationList(); },50);
  if(page==='support' && typeof supportInit==='function') setTimeout(supportInit,80);
  if(page==='appointments') setTimeout(()=>{ const el=document.getElementById('dt'); if(el){el.min=todayISO(); el.value=el.value||todayISO(); updateManualSlots(); if(typeof restoreAgendaDraft==='function') restoreAgendaDraft();}},50);
  maybeShowZenUpdateModal();
  } finally {
    if(typeof hideZenLoader === 'function') hideZenLoader(zenLoaderToken, {minVisible:260});
  }
}
