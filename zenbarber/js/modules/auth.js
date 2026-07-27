async function route(){
  try{
    const h = location.hash.replace("#","");
    if(h.startsWith("book/")) return renderBooking(decodeURIComponent(h.split("/")[1]||""));
    if(!me) return renderLogin();
    me.role = normalizeRole(me.role);
    sessionStorage.setItem("zenbarber_user", JSON.stringify(me));
    if(isAdminRole()) return renderAdmin();
    if(isBarberOnlyRole()) return renderBarberDashboard();
    await renderApp();
  }catch(e){
    console.error(e);
    root.innerHTML = `<div class="page"><div class="card"><h2>Erro ao abrir o painel</h2><p class="muted">O login entrou, mas alguma informação do perfil veio diferente do esperado. Esta tela evita a tela preta.</p><div class="linkBox">${esc(e?.message || String(e))}</div><br><button class="primary" onclick="sessionStorage.removeItem('zenbarber_user'); location.hash=''; location.reload()">Sair e tentar novamente</button></div></div>`;
  }
}

function renderLogin(){
  root.innerHTML = `<div class="page"><div class="loginWrap cleanLogin">
    <div class="loginCard welcomeCard"><div class="brand bigBrand"><div class="logo">✂</div><div><h1>ZenBarber</h1><p class="muted">Sistema de agendamentos para barbearias</p></div></div><h2>Organize sua barbearia em um só lugar.</h2><p class="muted">Agenda, serviços, barbeiros, carteira, link público e WhatsApp integrados.</p><div class="featureList"><span>✅ Link para clientes</span><span>✅ Agenda por barbeiro</span><span>✅ Bloqueio por duração do serviço</span></div></div>
    <div class="loginCard"><h2>Entrar</h2><form id="loginForm" class="form" onsubmit="event.preventDefault(); doLogin();"><input id="login" placeholder="Login" autocomplete="username"><input id="pass" type="password" placeholder="Senha" autocomplete="current-password"><button class="primary" type="submit">Entrar</button><button type="button" onclick="showCreate()">Criar conta de barbearia</button></form></div>
  </div></div>`;
}
window.doLogin = async () => {
  const loginInput = document.getElementById("login");
  const passInput = document.getElementById("pass");
  const loginRaw = (loginInput?.value || "").trim();
  const login = loginRaw.toLowerCase().replace(/\s+/g,"-");
  const password = (passInput?.value || "").trim();
  if(!loginRaw || !password) return toast("Preencha login e senha");
  if(ADMIN_LOGIN && ADMIN_PASS && loginRaw === ADMIN_LOGIN && password === ADMIN_PASS) return saveUser({role:"admin",name:"Administrador"});

  // SEGURANÇA ETAPA 3: primeiro tenta validar por password_hash, sem trazer senha aberta.
  // Apenas se o usuário ainda não tiver hash, faz fallback legado para MIGRAR uma única vez.
  const hashColumns = `${BARBER_SAFE_COLUMNS},password_hash`;
  let {data,error} = await db.from("barbers")
    .select(hashColumns)
    .in("login", [loginRaw, login])
    .limit(5);
  if(error) return toast(error.message);

  let candidates = Array.isArray(data) ? data : [];
  if(!candidates.length){
    const alt = await db.from("barbers")
      .select(hashColumns)
      .ilike("login", loginRaw)
      .limit(5);
    if(alt.error) return toast(alt.error.message);
    candidates = alt.data || [];
  }

  let user = null;
  for(const candidate of candidates){
    if(candidate.password_hash && await verifyBarberPassword(candidate, password)){ user = candidate; break; }
  }

  // Fallback controlado: só busca a coluna password se nenhum hash conferiu.
  if(!user){
    let legacy = await db.from("barbers")
      .select(`${BARBER_SAFE_COLUMNS},password,password_hash`)
      .in("login", [loginRaw, login])
      .limit(5);
    if(legacy.error) return toast(legacy.error.message);
    let legacyCandidates = legacy.data || [];
    if(!legacyCandidates.length){
      const legacyAlt = await db.from("barbers")
        .select(`${BARBER_SAFE_COLUMNS},password,password_hash`)
        .ilike("login", loginRaw)
        .limit(5);
      if(legacyAlt.error) return toast(legacyAlt.error.message);
      legacyCandidates = legacyAlt.data || [];
    }
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
};window.showCreate = () => {
  root.innerHTML = `<div class="page"><div class="loginWrap"><div class="loginCard"><h1>Criar barbearia</h1><p class="muted">Crie o perfil principal. O acesso ficará pendente até aprovação do ADM.</p></div><div class="loginCard"><div class="form"><input id="n" placeholder="Seu nome"><input id="l" placeholder="Login único. Ex: barbearia-renan"><input id="p" type="password" placeholder="Senha"><input id="ph" placeholder="WhatsApp"><input id="shop" placeholder="Nome da barbearia">${fileField("photoFile","Foto/logo da barbearia (opcional)")}${fileField("bgFile","Foto de fundo da página do cliente (opcional)")}<button class="primary" onclick="createBarber()">Solicitar cadastro</button><button onclick="route()">Voltar</button></div></div></div></div>`;
};
window.createBarber = async () => {
  const rawPassword = p.value.trim();
  const row = {name:n.value.trim(),login:l.value.trim().toLowerCase().replace(/\s+/g,"-"),phone:ph.value.trim(),shop_name:shop.value.trim()||n.value.trim(),photo_url:await imageInputData("photoFile"),background_url:await imageInputData("bgFile"),role:"gerente",access_status:"pendente",activation_note:"Cadastro novo pela tela inicial | aguardando escolha de plano"};
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
function managerNavHtml(){
  const proButton = isAdminRole() ? `<button class="${page==='backup'?'active':''}" onclick="page='backup';renderApp()">🛡️ Gestão PRO</button>` : ``;
  return `<button class="${page==='dashboard'?'active':''}" onclick="page='dashboard';renderApp()">🏠 Dashboard PRO</button><button class="${page==='business'?'active':''}" onclick="page='business';renderApp()">💼 Meu Negócio</button><button class="${page==='services'?'active':''}" onclick="page='services';renderApp()">Serviços</button><button class="${page==='units'?'active':''}" onclick="page='units';renderApp()">Unidades</button><button class="${page==='barbers'?'active':''}" onclick="page='barbers';renderApp()">Barbeiros</button><button class="${page==='commissions'?'active':''}" onclick="page='commissions';renderApp()">Comissões</button><button class="${page==='hours'?'active':''}" onclick="page='hours';renderApp()">Funcionamento</button><button class="${page==='appointments'?'active':''}" onclick="page='appointments';renderApp()">📅 Agenda Premium</button><button class="${page==='whatsapp'?'active':''}" onclick="page='whatsapp';renderApp()">📲 Central WhatsApp</button><button class="${page==='recurring'?'active':''}" onclick="page='recurring';renderApp()">Clientes fixos</button><button class="${page==='pending'?'active':''}" onclick="page='pending';renderApp()">Pendências / Baixa</button><button class="${page==='wallet'?'active':''}" onclick="page='wallet';renderApp()">Clientes em carteira</button><button class="${page==='link'?'active':''}" onclick="page='link';renderApp()">Link do cliente</button><button class="${page==='profile'?'active':''}" onclick="page='profile';renderApp()">Perfil / Configurações</button><button class="${page==='reports'?'active':''}" onclick="page='reports';renderApp()">Ranking / Comissão</button><button class="${page==='clients'?'active':''}" onclick="page='clients';renderApp()">🎯 Retenção</button>${proButton}<button class="${page==='support'?'active':''}" onclick="page='support';renderApp()">Contato suporte</button>`;
}
function layout(title,sub,body){
  root.innerHTML = `<div class="page"><div class="shell"><aside class="sidebar"><div class="brand">${avatar(me.photo_url,me.name)}<div><h1>ZenBarber</h1><p>${esc(me.name||"")}</p><small class="brandProSeal">PRO</small></div></div><nav class="nav">${isAdminRole()?`<button class="active">Painel ADM</button>`:managerNavHtml()}</nav><div class="spacer"></div><button class="danger" onclick="logout()">Sair</button></aside><main class="content">${isAdminRole()?"":appProfileHero()}<div class="top"><div><h2>${title}</h2><p class="muted">${sub||""}</p></div><div class="topActions">${unitSelectorHtml()}<button onclick="route()">Atualizar</button></div></div>${body}</main></div></div>`;
}

async function refreshCurrentUser(){
  if(!me || isAdminRole() || !me.id) return;
  const {data,error} = await db.from("barbers").select(BARBER_SAFE_COLUMNS).eq("id",me.id).maybeSingle();
  if(!error && data){
    me = {...data, role:normalizeRole(data.role || me.role), access_status:data.access_status || "ativo"};
    sessionStorage.setItem("zenbarber_user", JSON.stringify(me));
  }
}

async function loadMine(){
  await refreshCurrentUser();
  const shop = sameShopName();
  const [barb,serv,appt] = await Promise.all([
    db.from("barbers").select(BARBER_SAFE_COLUMNS).eq("shop_name",shop).neq("access_status","pendente").order("created_at",{ascending:true}),
    db.from("services").select("*").order("created_at",{ascending:false}),
    db.from("appointments").select("*, services(name, price, duration)").order("date",{ascending:true}).order("time",{ascending:true})
  ]);
  if(barb.error) toast(barb.error.message); if(serv.error) toast(serv.error.message); if(appt.error) toast(appt.error.message);
  cache.allShopBarbers = barb.data?.length ? barb.data : [me];
  cache.shopBarbers = filterBarbersByActiveUnit(cache.allShopBarbers);
  const ids = cache.shopBarbers.map(b=>b.id);
  cache.services = (serv.data||[]).filter(s=>ids.includes(s.barber_id));
  cache.appointments = (appt.data||[]).filter(a=>ids.includes(a.barber_id)).sort((x,y)=>`${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`));
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
    <div class="barberDashTop"><div class="brand">${barberAvatar(me)}<div><h1>ZenBarber</h1><p>${esc(me.name||'Barbeiro')}</p></div></div><button class="danger" onclick="logout()">Sair</button></div>
    <section class="card barberHero barberHeroPremium"><div><h2>Painel individual do barbeiro</h2><p class="muted">Seu faturamento, comissão prevista, agenda do dia e próximo cliente em uma tela rápida.</p></div>${nextClient?`<div class="nextClientPremium"><small>Próximo cliente</small><b>${esc(nextClient.time||'')}</b><strong>${esc(nextClient.client_name||'Cliente')}</strong><span>${esc(nextClient.services?.name||'Serviço')}</span></div>`:''}</section>
    <div class="statgrid barberKpiGrid"><div class="stat"><span>Faturamento do mês</span><b>${money(bruto)}</b></div><div class="stat"><span>Comissão prevista</span><b>${money(comissao)}</b></div><div class="stat"><span>Atendimentos concluídos</span><b>${doneMonth.length}</b></div><div class="stat"><span>Ticket médio</span><b>${money(ticketMedio)}</b></div><div class="stat"><span>Percentual</span><b>${perc}%</b></div><div class="stat"><span>Atendimentos hoje</span><b>${agendaHoje.length}</b></div></div>
    <section class="card barberTodayPremium"><h3>Minha agenda de hoje</h3>${agendaHoje.map(a=>`<div class="item barberTodayItem ${a.id===nextClient?.id?'next':''}"><div class="timeBubble">${esc(a.time||'')}</div><div><strong>${esc(a.client_name)}</strong><small>${a.status==='encaixe'?'⚡ Encaixe • ':''}${esc(a.services?.name||'Serviço')} • termina ${safeEndTimeForAppt(a)||'--'} • ${esc(a.client_phone||'')}</small></div><div class="barberApptActions"><a target="_blank" href="${wa(a.client_phone,`Olá ${a.client_name}, passando para confirmar seu horário hoje às ${a.time} na ${sameShopName()}.`)}"><button class="whats">WhatsApp</button></a><button class="danger" onclick="cancelOwnBarberAppt('${a.id}')">Cancelar</button></div></div>`).join('') || '<div class="empty">Nenhum agendamento para hoje.</div>'}</section>
    ${typeof meuNegocioPage==='function'?meuNegocioPage({embedded:true}):''}
    ${barberScheduleManagerHtml()}
    <section class="card barberInternalSchedule"><h3>Agendamento interno / encaixe</h3><p class="muted">O barbeiro pode lançar clientes direto na própria agenda. Use Agendar para horário normal ou Encaixe para encaixar em horário já ocupado.</p><div class="grid"><input id="bcn" placeholder="Nome do cliente"><input id="bcp" placeholder="Telefone"><select id="bsv" onchange="updateBarberInternalSlots()">${publicServiceOptions(me.id,firstService)}</select><input id="bdt" type="date" min="${todayISO()}" value="${today}" onchange="updateBarberInternalSlots()"><select id="btm">${slotOptionsManual(me.id,today,firstService)}</select><button class="primary" onclick="addBarberInternalAppt()">Agendar</button><button class="gold" onclick="addBarberInternalFitIn()">Encaixe</button></div>${ownServices.length?'':'<div class="empty">Nenhum serviço cadastrado para você. Peça ao gerente para cadastrar serviços.</div>'}</section>
    <section class="card"><h3>Meu link para compartilhar</h3><p class="muted">Envie este link para o cliente agendar com a barbearia.</p><div class="linkBox">${link}</div><br><div class="row"><button class="primary" onclick="navigator.clipboard.writeText('${link}');toast('Link copiado')">Copiar link</button><a target="_blank" href="${wa('',`Olá! Para agendar seu horário, acesse: ${link}`)}"><button class="whats">Enviar pelo WhatsApp</button></a></div></section>
  </main></div>`;
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
  const {error}=await db.from('appointments').insert({barber_id:me.id,service_id:serviceId,client_name:name,client_phone:phone,date,time,status:'agendado'});
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
  const {error}=await db.from('appointments').insert({barber_id:me.id,service_id:serviceId,client_name:name,client_phone:phone,date,time,status:'encaixe'});
  if(error) return toast(error.message);
  toast('Encaixe criado na sua agenda.');
  renderBarberDashboard();
};

async function renderApp(){
  if(page === 'backup' && !isAdminRole()){ page = 'dashboard'; toast('Gestão PRO é exclusiva do Admin.'); }
  await loadMine();
  if(typeof loadBusinessGoals==='function') await loadBusinessGoals();
  const title = {dashboard:"Dashboard",business:"Meu Negócio",services:"Serviços",units:"Unidades",barbers:"Barbeiros",commissions:"Comissões",hours:"Funcionamento",appointments:"Agendamentos",whatsapp:"Central WhatsApp",recurring:"Clientes fixos",wallet:"Clientes em carteira",pending:"Pendências / Baixa",link:"Link do cliente",profile:"Perfil / Configurações",support:"Contato suporte",reports:"Ranking / Comissão",clients:"Retenção",backup:"Gestão PRO"}[page] || "Dashboard";
  const body = {dashboard:dash(),business:(typeof meuNegocioPage==='function'?meuNegocioPage():'<div class="card">Módulo indisponível</div>'),services:services(),units:unitsPage(),barbers:barbersPage(),commissions:commissionsPage(),hours:hoursPage(),appointments:appointments(),whatsapp:whatsappPage(),recurring:recurringPage(),wallet:wallet(),pending:pendingSettlementPage(),link:linkPage(),profile:profilePage(),support:supportPage(),reports:reportsPage(),clients:clientsPage(),backup:backupPage()}[page] || dash();
  layout(title, sameShopName() || me.login, body);
  if(page==='dashboard') setTimeout(drawChart,50);
  if(page==='clients') setTimeout(()=>{ if(typeof renderReactivationList==='function') renderReactivationList(); },50);
  if(page==='appointments') setTimeout(()=>{ const el=document.getElementById('dt'); if(el){el.min=todayISO(); el.value=el.value||todayISO(); updateManualSlots();}},50);
}

