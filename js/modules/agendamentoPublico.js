function publicBarberPreviewHtml(id){
  const b = cache.shopBarbers.find(x=>x.id===id) || cache.shopBarbers[0];
  if(!b) return "";
  return `<div class="selectedBarber">${barberAvatar(b)}<div><strong>${esc(b.name)}</strong><small>Barbeiro selecionado</small></div></div>`;
}
function publicBarberCardsHtml(selected=""){
  const current = selected || cache.shopBarbers[0]?.id || "";
  return `<div class="publicBarberCards">${cache.shopBarbers.map(b=>{
    const active = b.id === current ? ' selected' : (current ? ' not-selected' : '');
    const qtd = publicServicesForBarber(b.id).length;
    const statusLabel = b.id === current ? 'Selecionado para o agendamento' : 'Toque para escolher este barbeiro';
    return `<button type="button" class="publicBarberCard${active}" onclick="selectPublicBarber('${b.id}')" aria-pressed="${b.id === current ? 'true' : 'false'}">${barberAvatar(b)}<span><strong>${esc(b.name)}</strong><small>${qtd ? qtd+' serviço(s) disponível(is)' : 'Escolher barbeiro'}</small><em>${statusLabel}</em></span></button>`;
  }).join('')}</div>`;
}



function publicServiceInitials(s){
  const raw = String(s?.name || 'Serviço').trim();
  const words = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\s+/).filter(Boolean);
  const ignore = ['de','da','do','das','dos','com','e','a','o'];
  const useful = words.filter(w=>!ignore.includes(w.toLowerCase()));
  const base = useful.length ? useful : words;
  return (base.length >= 2 ? (base[0][0] + base[1][0]) : (base[0] || 'S').slice(0,2)).toUpperCase();
}
function publicServiceIconHtml(s){
  const img = String(s?.image_url || s?.photo_url || s?.icon_url || '').trim();
  const custom = String(s?.icon_text || s?.public_icon || '').trim();
  if(img) return `<span class="serviceIcon serviceIconPhoto"><img src="${esc(img)}" alt="${esc(s?.name||'Serviço')}"></span>`;
  return `<span class="serviceIcon"><b>${esc((custom || publicServiceInitials(s)).slice(0,4))}</b></span>`;
}
function publicServiceDescription(s){
  const n = String(s?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(n.includes('sobrancel')) return 'Design e acabamento de sobrancelhas.';
  if(n.includes('barba') && n.includes('corte')) return 'Corte de cabelo com acabamento de barba.';
  if(n.includes('barba')) return 'Modelagem e acabamento de barba.';
  if(n.includes('navalh')) return 'Acabamento detalhado na navalha.';
  if(n.includes('camufl')) return 'Camuflagem para preenchimento de falhas.';
  if(n.includes('luz')) return 'Luzes para realçar o visual.';
  if(n.includes('platin')) return 'Descoloração completa para tom platinado.';
  if(n.includes('alis') || n.includes('progress')) return 'Efeito liso e natural com brilho.';
  if(n.includes('pezinho') || n.includes('acab')) return 'Acabamento e alinhamento final.';
  return `${Number(s?.duration || 30)} min • ${money(s?.price || 0)}`;
}
function publicServiceCardsHtml(barberId, selected=''){
  const services = publicServicesForBarber(barberId);
  const current = selected || services[0]?.id || '';
  if(!services.length) return '<div class="empty">Nenhum serviço disponível para este barbeiro.</div>';
  return `<div class="publicServiceCards">${services.map(s=>{
    const active = String(s.id) === String(current) ? ' selected' : (current ? ' not-selected' : '');
    return `<button type="button" class="publicServiceCard${active}" onclick="selectPublicService('${esc(s.id)}')" aria-pressed="${String(s.id)===String(current)?'true':'false'}">
      ${publicServiceIconHtml(s)}
      <span class="serviceInfo"><strong>${esc(s.name)}</strong><small>${esc(publicServiceDescription(s))}</small><em>${money(s.price)} • ${Number(s.duration||30)}min</em></span>
    </button>`;
  }).join('')}</div>`;
}

function publicSelectionSummaryHtml(){
  return `<div id="publicSelectionSummary" class="publicSelectionSummary premiumBookingSummary">
    <div class="summaryTitle">Resumo do agendamento</div>
    <div class="summaryGrid">
      <div class="summaryBarber" id="publicSelectedBarberBox"><span class="avatar placeholder">✂</span><div><small>Profissional</small><strong id="publicSelectedBarber">Selecione</strong></div></div>
      <div class="summaryInfo"><small>Serviço</small><strong id="publicSelectedService">Selecione</strong></div>
      <div class="summaryInfo"><small>Data</small><strong id="publicSelectedDate">Selecione</strong></div>
      <div class="summaryInfo"><small>Horário</small><strong id="publicSelectedTime">Selecione</strong></div>
      <div class="summaryInfo"><small>Duração</small><strong id="publicSelectedDuration">--</strong></div>
      <div class="summaryInfo"><small>Valor</small><strong id="publicSelectedPrice">--</strong></div>
    </div>
  </div>`;
}

function updatePublicSelectionHighlight(){
  const barberId = document.getElementById("bb")?.value || "";
  const date = document.getElementById("bd")?.value || "";
  const time = document.getElementById("bt")?.value || "";
  const serviceId = document.getElementById("bs")?.value || "";
  const barber = (cache.shopBarbers || []).find(b=>b.id===barberId) || barberById(barberId) || {};
  const service = serviceById(serviceId) || {};
  document.querySelectorAll(".publicBarberCard").forEach(card=>{
    const isSelected = card.getAttribute("onclick")?.includes(barberId);
    card.classList.toggle("selected", !!barberId && isSelected);
    card.classList.toggle("not-selected", !!barberId && !isSelected);
    card.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
  const dateInput = document.getElementById("bd");
  const timeSelect = document.getElementById("bt");
  const serviceSelect = document.getElementById("bs");
  dateInput?.classList.toggle("choiceSelected", !!date);
  timeSelect?.classList.toggle("choiceSelected", !!time);
  serviceSelect?.classList.toggle("choiceSelected", !!serviceId);
  document.querySelectorAll(".publicServiceCard").forEach(card=>{
    const isSelected = card.getAttribute("onclick")?.includes(serviceId);
    card.classList.toggle("selected", !!serviceId && isSelected);
    card.classList.toggle("not-selected", !!serviceId && !isSelected);
    card.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
  const bEl = document.getElementById("publicSelectedBarber");
  const dEl = document.getElementById("publicSelectedDate");
  const tEl = document.getElementById("publicSelectedTime");
  const sEl = document.getElementById("publicSelectedService");
  const durEl = document.getElementById("publicSelectedDuration");
  const priceEl = document.getElementById("publicSelectedPrice");
  const bBox = document.getElementById("publicSelectedBarberBox");
  if(bEl) bEl.textContent = barber.name || "Selecione";
  if(sEl) sEl.textContent = service.name || "Selecione";
  if(dEl) dEl.textContent = date ? formatDateFullBR(date) : "Selecione";
  if(tEl) tEl.textContent = time || "Selecione";
  if(durEl) durEl.textContent = serviceId ? `${Number(service.duration||30)} min` : "--";
  if(priceEl) priceEl.textContent = serviceId ? money(service.price||0) : "--";
  if(bBox) bBox.innerHTML = `${barberAvatar(barber)}<div><small>Profissional</small><strong id="publicSelectedBarber">${esc(barber.name || 'Selecione')}</strong></div>`;
}

function normalizePublicDate(v){
  const raw = String(v || '').trim();
  if(!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if(br) return `${br[3]}-${br[2]}-${br[1]}`;
  return raw.slice(0,10);
}
function normalizePublicTime(v){
  const m = String(v || '').trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${String(Number(m[1])).padStart(2,'0')}:${m[2]}` : String(v || '').trim();
}
function publicAppointmentDuration(a){
  return Number(a?.services?.duration || serviceById(a?.service_id)?.duration || a?.duration || 30);
}
async function loadPublicAppointments(barberId,date){
  const normalizedDate = normalizePublicDate(date);
  if(!barberId || !normalizedDate) return [];
  const {data,error} = await db.from("appointments")
    .select("id,barber_id,service_id,date,time,status,services(duration)")
    .eq("barber_id", barberId)
    .eq("date", normalizedDate)
    .in("status", ["agendado","em_carteira","encaixe","em_andamento","bloqueio"]);
  if(error){ toast("Erro ao consultar agenda: " + error.message); return []; }
  const cleaned = (data || []).map(a=>({ ...a, date: normalizePublicDate(a.date), time: normalizePublicTime(a.time) }));
  cache.appointments = [
    ...(cache.appointments || []).filter(a=>!(a.barber_id === barberId && normalizePublicDate(a.date) === normalizedDate)),
    ...cleaned
  ];
  return cleaned;
}
function publicSlotValuesFromAppointments(barberId,date,serviceId,appointments){
  const dur = durationOfService(serviceId);
  const b = barberById(barberId);
  const normalizedDate = normalizePublicDate(date);
  if(!barberId || !normalizedDate || !serviceId) return {slots:[], message:'Escolha barbeiro, serviço e data'};
  if(isDayOff(b,normalizedDate)) return {slots:[], message:'Barbeiro de folga neste dia'};
  const slots = [];
  const busy = appointments || [];
  for(let m=minutes(workStart(b,normalizedDate)); m+dur<=minutes(workEnd(b,normalizedDate)); m+=STEP){
    const t = hhmm(m);
    const blocked = isPastDateTime(normalizedDate,t)
      || isBreakConflict(b,t,dur,normalizedDate)
      || busy.some(a=>a.barber_id===barberId && normalizePublicDate(a.date)===normalizedDate && statusBlocks(a.status) && intervalOverlaps(t,dur,normalizePublicTime(a.time),publicAppointmentDuration(a)));
    if(!blocked) slots.push(t);
  }
  return {slots, message: slots.length ? '' : 'Sem horários disponíveis'};
}
function publicSlotOptionsFromAppointments(barberId,date,serviceId,appointments,selected=""){
  const result = publicSlotValuesFromAppointments(barberId,date,serviceId,appointments);
  if(!result.slots.length) return `<option value="">${esc(result.message)}</option>`;
  return result.slots.map(t=>`<option value="${t}" ${t===selected?'selected':''}>${t}</option>`).join('');
}
function publicTimeButtonsFromAppointments(barberId,date,serviceId,appointments,selected=""){
  const result = publicSlotValuesFromAppointments(barberId,date,serviceId,appointments);
  if(!result.slots.length) return `<div class="empty publicTimeEmpty">${esc(result.message)}</div>`;
  return result.slots.map(t=>`<button type="button" class="publicTimeChip ${t===selected?'selected':''}" onclick="selectPublicTime('${t}')" aria-pressed="${t===selected?'true':'false'}">${t}</button>`).join('');
}

function publicSlotOptions(barberId,date,serviceId,selected=""){
  const normalizedDate = normalizePublicDate(date);
  const dayAppointments = (cache.appointments || []).filter(a=>a.barber_id===barberId && normalizePublicDate(a.date)===normalizedDate);
  return publicSlotOptionsFromAppointments(barberId,normalizedDate,serviceId,dayAppointments,selected);
}

async function renderBooking(login){
  const {data:owner,error}=await db.from("barbers").select(BARBER_PUBLIC_COLUMNS).eq("login",login).maybeSingle();
  if(error||!owner){root.innerHTML='<div class="page"><div class="public"><div class="hero"><h1>Link não encontrado</h1><p>Confira se o endereço está correto.</p></div></div></div>';return}
  const shop=(owner.shop_name||owner.name||"").trim();
  const {data:barbs}=await db.from("barbers")
    .select(BARBER_PUBLIC_COLUMNS)
    .eq("shop_name",shop)
    .neq("access_status","pendente")
    .neq("access_status","bloqueado")
    .order("created_at");

  cache.shopBarbers = barbs?.length ? barbs : [owner];
  const ids=cache.shopBarbers.map(b=>b.id);

  // HOTFIX: no link público, os serviços precisam vir SEMPRE da tabela oficial `services`
  // e nunca de dados antigos salvos no aparelho/PWA. Isso evita que celular com cache antigo
  // mostre valores com desconto, valor recebido, carteira ou histórico de atendimentos.
  cache.services = [];
  const {data:servs,error:servErr}=await db.from("services")
    .select("*")
    .in("barber_id", ids)
    .order("created_at", {ascending:true});
  if(servErr){ toast("Erro ao carregar serviços: " + servErr.message); }
  cache.services=(servs||[])
    .filter(s=>ids.includes(s.barber_id))
    .filter(s=>!isInternalSubscriptionService(s))
    .filter(s=>String(s?.id||'') && String(s?.name||'').trim())
    .filter(s=>Number(s?.duration||0) > 0);
  cache.appointments=[];
  const bid=cache.shopBarbers[0]?.id||owner.id; const sid=publicServicesForBarber(bid)[0]?.id||"";
  await loadPublicAppointments(bid,todayISO());
  cache.publicOwnerPhone = owner.phone || "";
  cache.publicShopName = shop;
  root.innerHTML = `<div class="page"><div class="public"><div class="hero" ${bgStyle(owner.background_url)}><span class="pill">Agendamento online</span><div class="publicHead">${avatar(owner.photo_url,shop)}<div><h1>${esc(shop)}</h1><p class="muted">Escolha barbeiro, serviço, data e horário. O sistema só mostra horários realmente livres.</p></div></div><div class="card"><h3>Novo agendamento</h3><div class="form"><input id="bc" placeholder="Seu nome"><input id="bp" placeholder="Seu WhatsApp"><div><label class="fieldTitle">Escolha o barbeiro</label><div id="publicBarberCards">${publicBarberCardsHtml(bid)}</div><select id="bb" class="hidden" onchange="publicUpdateServices()">${barberOptions(bid)}</select></div><div><label class="fieldTitle">Escolha o serviço</label><div id="publicServiceCards">${publicServiceCardsHtml(bid,sid)}</div><select id="bs" class="hidden" onchange="publicUpdateSlots()">${publicServiceOptions(bid,sid)}</select></div><div class="dateOnly"><label class="fieldTitle">Escolha a data</label><input id="bd" type="date" min="${todayISO()}" value="${todayISO()}" onchange="publicUpdateSlots()"><select id="bt" class="hidden" onchange="updatePublicSelectionHighlight()">${publicSlotOptions(bid,todayISO(),sid)}</select></div><label class="fieldTitle">Escolha o horário</label><div id="publicTimeGrid" class="publicTimeGrid">${publicTimeButtonsFromAppointments(bid,todayISO(),sid,cache.appointments)}</div>${publicSelectionSummaryHtml()}<button id="confirmPublicBtn" class="primary" type="button" onclick="publicSchedule()">Confirmar agendamento</button><a target="_blank" href="${wa(owner.phone,`Olá, vim pelo link de agendamento da ${shop}.`)}"><button class="whats" type="button" style="width:100%">Falar no WhatsApp</button></a></div></div></div></div></div>`;
  setTimeout(updatePublicSelectionHighlight, 0);
}
window.selectPublicBarber = id => {
  const select = document.getElementById("bb");
  if(!select) return;
  select.value = id;
  publicUpdateServices();
};
window.publicUpdateServices = () => {
  // Ao trocar barbeiro, puxa os serviços e recalcula os horários usando a agenda semanal daquele barbeiro.
  // Isso usa work_start/work_end/off_days/SCHEDULE_JSON do barbeiro selecionado, não do gerente.
  if(document.getElementById("publicBarberCards")) publicBarberCards.innerHTML = publicBarberCardsHtml(bb.value);
  const firstService = publicServicesForBarber(bb.value)[0]?.id || "";
  bs.innerHTML = publicServiceOptions(bb.value, firstService);
  bs.value = firstService;
  if(document.getElementById("publicServiceCards")) publicServiceCards.innerHTML = publicServiceCardsHtml(bb.value, firstService);
  const t=document.getElementById('bt'); if(t) t.value='';
  updatePublicSelectionHighlight();
  publicUpdateSlots();
};
window.selectPublicService = id => {
  const select = document.getElementById("bs");
  if(!select) return;
  select.value = id;
  if(document.getElementById("publicServiceCards")) publicServiceCards.innerHTML = publicServiceCardsHtml(document.getElementById("bb")?.value || "", id);
  updatePublicSelectionHighlight();
  publicUpdateSlots();
};
window.selectPublicTime = time => {
  const select = document.getElementById("bt");
  if(!select) return;
  select.value = time;
  document.querySelectorAll(".publicTimeChip").forEach(btn=>{
    const active = btn.textContent.trim() === time;
    btn.classList.toggle("selected", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  updatePublicSelectionHighlight();
};
window.publicUpdateSlots = async () => {
  const slotSelect = document.getElementById("bt");
  const barberSelect = document.getElementById("bb");
  const serviceSelect = document.getElementById("bs");
  const dateInput = document.getElementById("bd");
  if(!slotSelect || !barberSelect || !serviceSelect || !dateInput) return;
  if(!dateInput.value) dateInput.value=todayISO();
  slotSelect.innerHTML = `<option value="">Consultando agenda...</option>`;
  const grid = document.getElementById("publicTimeGrid");
  if(grid) grid.innerHTML = `<div class="empty publicTimeEmpty">Consultando agenda...</div>`;
  const appts = await loadPublicAppointments(barberSelect.value,dateInput.value);
  slotSelect.innerHTML = publicSlotOptionsFromAppointments(barberSelect.value,dateInput.value,serviceSelect.value,appts);
  if(grid) grid.innerHTML = publicTimeButtonsFromAppointments(barberSelect.value,dateInput.value,serviceSelect.value,appts,slotSelect.value);
  updatePublicSelectionHighlight();
};
document.addEventListener("change", (event) => {
  if(event.target?.id === "bt") event.target.blur();
});

function showPublicScheduleSuccess({shopUrl,shopPhone,name,date,time,barberName,serviceName}){
  const card = document.querySelector(".public .card");
  if(!card) return;
  card.innerHTML = `
    <h3>Agendamento confirmado ✅</h3>
    <p class="muted">Seu horário foi salvo no sistema.</p>
    <div class="successBox">
      <strong>${esc(name)}</strong>
      <small>${formatDateFullBR(date)} às ${esc(time)} • ${esc(serviceName)} • ${esc(barberName)}</small>
    </div>
    <a target="_blank" href="${shopUrl}"><button class="whats" type="button" style="width:100%">Avisar barbearia no WhatsApp</button></a>
    <button class="primary" type="button" style="width:100%;margin-top:8px" onclick="renderBooking(location.hash.replace('#book/', ''))">Fazer outro agendamento</button>
    ${shopPhone ? '' : '<p class="muted">Atenção: cadastre o WhatsApp da barbearia no perfil para o botão abrir com o número correto.</p>'}
  `;
}

window.publicSchedule = async () => {
  const btn = document.getElementById("confirmPublicBtn");
  const bphone = cache.publicOwnerPhone || "";
  const bname = cache.publicShopName || "barbearia";
  const name = (document.getElementById("bc")?.value || "").trim();
  const phone = (document.getElementById("bp")?.value || "").trim();
  const barberId = document.getElementById("bb")?.value || "";
  const serviceId = document.getElementById("bs")?.value || "";
  const date = document.getElementById("bd")?.value || "";
  const time = document.getElementById("bt")?.value || "";
  if(!name || !phone || !barberId || !serviceId || !date || !time) return toast("Preencha todos os campos");
  if(btn){ btn.disabled = true; btn.textContent = "Agendando..."; }
  try{
    if(await hasConflict(barberId,date,time,serviceId)) return toast("Esse horário acabou de ficar ocupado. Escolha outro horário disponível.");
    const {error}=await db.from("appointments").insert({barber_id:barberId,service_id:serviceId,client_name:name,client_phone:phone,date:date,time:time,status:"agendado"});
    if(error) return toast("Erro ao salvar: " + error.message);
    cache.appointments.push({id:`local-${Date.now()}`,barber_id:barberId,service_id:serviceId,date,time,status:"agendado",services:{duration:durationOfService(serviceId)}});

    const selectedBarber = barberById(barberId) || {};
    const selectedService = serviceById(serviceId) || {};
    // O destinatário do aviso deve ser sempre a barbearia/barbeiro, nunca o cliente.
    // O telefone do cliente fica apenas escrito dentro da mensagem para contato posterior.
    const shopPhone = bphone || selectedBarber.phone || "";
    const serviceName = selectedService.name || "Serviço";
    const barberName = selectedBarber.name || "Barbeiro";
    const serviceDuration = durationOfService(serviceId);
    const msgShop = `Novo agendamento confirmado no ZenBarber ✅\n\nBarbearia: ${bname}\nCliente: ${name}\nWhatsApp do cliente: ${phone}\nBarbeiro: ${barberName}\nServiço: ${serviceName}\nData: ${formatDateFullBR(date)}\nHorário: ${time}\nDuração: ${serviceDuration} min`;
    const shopUrl = wa(shopPhone,msgShop);

    toast("Agendamento confirmado. Abrindo WhatsApp da barbearia...");
    const opened = window.open(shopUrl,"_blank");
    showPublicScheduleSuccess({shopUrl,shopPhone,name,date,time,barberName,serviceName});
    if(!opened) toast("Agendamento salvo. Clique no botão verde para avisar a barbearia pelo WhatsApp.");
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = "Confirmar agendamento"; }
  }
};


// HOTFIX ENTER LOGIN: garante que a tecla Enter funcione no acesso,
// mesmo se o navegador ignorar handler inline antigo ou o foco estiver no card de login.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const loginEl = document.getElementById("login");
  const passEl = document.getElementById("pass");
  if (!loginEl || !passEl) return;
  const active = document.activeElement;
  const isLoginArea = active === loginEl || active === passEl || active?.closest?.("#loginForm");
  if (!isLoginArea) return;
  event.preventDefault();
  doLogin();
});
