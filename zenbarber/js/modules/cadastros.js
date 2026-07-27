function serviceIconPreview(s){
  if(typeof publicServiceIconHtml === 'function') return publicServiceIconHtml(s);
  return `<span class="serviceIcon"><b>${esc(String(s?.name||'S').slice(0,2).toUpperCase())}</b></span>`;
}
function services(){
  const allowed = canManageAll() ? cache.shopBarbers : cache.shopBarbers.filter(b=>b.id===me.id);
  return `<div class="card"><h3>Novo serviço</h3><p class="muted">Cada barbeiro tem seus próprios serviços. Agora você pode escolher um ícone curto ou foto do serviço para deixar o link público mais bonito.</p><div class="grid3"><select id="sb">${allowed.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join("")}</select><input id="sn" placeholder="Nome do serviço"><input id="sp" type="number" placeholder="Preço"><input id="sd" type="number" value="30" placeholder="Duração em minutos"><input id="si" maxlength="4" placeholder="Ícone curto. Ex: ✂️, AL, BAR">${fileField('sphotoFile','Foto do serviço (opcional)')}<button class="primary" onclick="addService()">Salvar serviço</button></div></div><div class="card"><h3>Serviços da barbearia</h3><p class="muted">Arraste os serviços para organizar a ordem que aparece para o cliente. A foto/ícone também aparece no link público.</p>${allowed.map(b=>`<div class="serviceGroup"><h4>${esc(b.name)}</h4><div class="serviceSortList" data-barber="${esc(b.id)}">${publicServicesForBarber(b.id).map((s,idx)=>`<div class="item serviceDraggable serviceManageItem" draggable="true" data-service-id="${esc(s.id)}" data-barber="${esc(b.id)}" ondragstart="serviceDragStart(event,'${esc(s.id)}')" ondragover="serviceAllowDrop(event)" ondrop="serviceDrop(event,'${esc(s.id)}')"><div class="serviceDragHandle">☰</div>${serviceIconPreview(s)}<div><strong>${esc(s.name)}</strong><small>${money(s.price)} • ${s.duration||30} min • posição ${idx+1}</small></div><div class="row"><button class="miniBtn" onclick="moveService('${s.id}','up')">↑</button><button class="miniBtn" onclick="moveService('${s.id}','down')">↓</button><button class="primary" onclick="editService('${s.id}')">Editar</button><button class="danger" onclick="delService('${s.id}')">Excluir</button></div></div>`).join("") || '<div class="empty">Nenhum serviço para este barbeiro.</div>'}</div></div>`).join("")}</div>`;
}
window.addService = async () => {
  if(!sn.value || !sp.value) return toast("Preencha serviço e preço");
  const order=publicServicesForBarber(sb.value).length;
  const photo = await imageInputData('sphotoFile');
  const base={barber_id:sb.value,name:sn.value.trim(),price:Number(sp.value),duration:Number(sd.value||30)};
  const payload={...base,display_order:order,icon_text:(si?.value||'').trim(),image_url:photo};
  const {error}=await db.from("services").insert(payload);
  if(error){
    const fallback={...base,display_order:order};
    const retry=await db.from("services").insert(fallback);
    if(retry.error) return toast(retry.error.message);
    toast('Serviço salvo. Rode o SQL de ícone/foto para salvar visual personalizado no Supabase.');
  }
  renderApp();
};
window.editService = id => { const s=cache.services.find(x=>x.id===id); if(!s) return; document.body.insertAdjacentHTML("beforeend",`<div class="modalBack" id="modal"><div class="modal"><h2>Editar serviço</h2><div class="form"><div class="previewRow">${serviceIconPreview(s)}<span class="muted">Visual atual no link público</span></div><input id="esn" value="${esc(s.name)}" placeholder="Nome"><input id="esp" type="number" value="${s.price||0}" placeholder="Preço"><input id="esd" type="number" value="${s.duration||30}" placeholder="Duração"><input id="esi" maxlength="4" value="${esc(s.icon_text||s.public_icon||'')}" placeholder="Ícone curto. Ex: ✂️, AL, BAR">${fileField('esphotoFile','Trocar foto do serviço (opcional)')}<div class="row"><button class="primary" onclick="saveService('${id}')">Salvar</button><button onclick="modal.remove()">Cancelar</button></div></div></div></div>`); };
window.saveService = async id => { const s=cache.services.find(x=>x.id===id)||{}; const row={name:esn.value.trim(),price:Number(esp.value||0),duration:Number(esd.value||30),icon_text:(esi?.value||'').trim(),image_url:await imageInputData('esphotoFile', s.image_url||s.photo_url||s.icon_url||'')}; if(!row.name) return toast("Informe o nome"); let {error}=await db.from("services").update(row).eq("id",id); if(error){ const fallback={name:row.name,price:row.price,duration:row.duration}; const retry=await db.from("services").update(fallback).eq("id",id); if(retry.error) return toast(retry.error.message); toast('Serviço salvo. Rode o SQL de ícone/foto para persistir o visual personalizado.'); modal.remove(); renderApp(); } else {modal.remove(); renderApp();} };
window.delService = async id => { if(!confirm("Excluir serviço?"))return; await db.from("services").delete().eq("id",id); renderApp(); };
let __dragServiceId = null;
window.serviceDragStart = (ev,id) => { __dragServiceId=id; ev.dataTransfer.setData('text/plain',id); ev.dataTransfer.effectAllowed='move'; };
window.serviceAllowDrop = ev => { ev.preventDefault(); ev.currentTarget.classList.add('dragHover'); };
window.serviceDrop = async (ev,targetId) => {
  ev.preventDefault();
  document.querySelectorAll('.serviceDraggable.dragHover').forEach(el=>el.classList.remove('dragHover'));
  const sourceId = ev.dataTransfer.getData('text/plain') || __dragServiceId;
  if(!sourceId || !targetId || sourceId===targetId) return;
  const source = cache.services.find(s=>s.id===sourceId);
  const target = cache.services.find(s=>s.id===targetId);
  if(!source || !target || source.barber_id!==target.barber_id) return toast('Só é possível ordenar serviços do mesmo barbeiro.');
  await reorderServices(source.barber_id, sourceId, targetId);
};
window.moveService = async (id,dir) => {
  const s=cache.services.find(x=>x.id===id); if(!s) return;
  const list=publicServicesForBarber(s.barber_id).map(x=>x.id);
  const i=list.indexOf(id); if(i<0) return;
  const j=dir==='up'?i-1:i+1; if(j<0 || j>=list.length) return;
  [list[i],list[j]]=[list[j],list[i]];
  await saveServiceOrder(s.barber_id,list);
};
async function reorderServices(barberId, sourceId, targetId){
  const ids=publicServicesForBarber(barberId).map(s=>s.id);
  const from=ids.indexOf(sourceId), to=ids.indexOf(targetId);
  if(from<0 || to<0) return;
  const [moved]=ids.splice(from,1);
  ids.splice(to,0,moved);
  await saveServiceOrder(barberId, ids);
}
async function saveServiceOrder(barberId, ids){
  saveLocalServiceOrder(barberId, ids);
  let dbOk=true;
  for(const [idx,id] of ids.entries()){
    const {error}=await db.from('services').update({display_order:idx}).eq('id',id);
    if(error){ dbOk=false; break; }
  }
  if(!dbOk) toast('Ordem salva neste aparelho. Para salvar para todos, rode o SQL display_order incluído no ZIP.');
  else toast('Ordem dos serviços atualizada.');
  await loadMine();
  renderApp();
}

function managerAgendaLockCard(list){
  if(!canManageAll()) return "";
  const employees = (list||[]).filter(b=>String(b.id)!==String(me?.id));
  return `<div class="card agendaLockManager"><h3>Permissões e bloqueio de agenda</h3><p class="muted">O gerente decide quem pode bloquear a própria agenda. Também pode pausar a agenda de um funcionário quando precisar.</p>${employees.map(b=>{ const locked=isEmployeeAgendaLocked(b.id); const until=employeeAgendaLockUntil(b.id); const allowed=barberCanSelfBlock(b); return `<div class="item barberLockItem ${locked?'locked':''}"><div><strong>${esc(b.name)}</strong><small>${allowed?'Pode bloquear a própria agenda':'Não pode bloquear a própria agenda'} • ${locked?`agenda bloqueada até ${formatDateFullBR(until)}`:'agenda liberada'} • ${esc(b.phone||'sem WhatsApp')}</small></div><div class="row"><button class="${allowed?'danger':'primary'}" onclick="toggleSelfBlockPermission('${b.id}', ${allowed?'false':'true'})">${allowed?'Desativar bloqueio próprio':'Ativar bloqueio próprio'}</button>${locked?`<button class="primary" onclick="unlockEmployeeAgenda('${b.id}')">Desbloquear agenda</button>`:`<button class="danger" onclick="lockEmployeeAgenda('${b.id}')">Bloquear agenda</button>`}</div></div>`;}).join("") || '<div class="empty">Nenhum barbeiro funcionário encontrado. O gerente não aparece nesta lista.</div>'}</div>`;
}

function barbersPage(){
  const list = cache.shopBarbers.filter(b => (b.access_status||"ativo") !== "pendente");
  const nameManager = canManageAll() ? `<div class="card"><h3>Editar nomes dos barbeiros</h3><p class="muted">O gerente pode alterar o nome de qualquer barbeiro da barbearia, incluindo o próprio nome. A alteração aparece na agenda, no financeiro, nas comissões e no link do cliente.</p>${list.map(b=>`<div class="item"><div><strong>${esc(b.name)}</strong><small>${b.id===me.id?'Seu usuário / gerente':'Barbeiro da equipe'}</small></div><div class="nameEdit"><input id="name_${b.id}" value="${esc(b.name)}" placeholder="Nome do barbeiro"><button class="primary" onclick="saveBarberName('${b.id}')">Salvar nome</button></div></div>`).join("")}</div>` : "";
  const agendaLockManager = managerAgendaLockCard(list);
  return `${nameManager}${agendaLockManager}<div class="card"><h3>Solicitar novo barbeiro</h3><p class="muted">Por segurança, novos barbeiros não são liberados automaticamente. Ao solicitar, vai aparecer no Painel ADM como pendente e também abre o WhatsApp para pedir ativação.</p><div class="grid3"><input id="bn" placeholder="Nome do novo barbeiro"><input id="bph" placeholder="WhatsApp do barbeiro"><input id="bobs" placeholder="Observação / função (opcional)"><button class="primary" onclick="requestShopBarber()">Solicitar ativação pelo WhatsApp</button></div></div><div class="card"><h3>Barbeiros da ${esc(sameShopName())}</h3><p class="muted">Cada barbeiro abaixo possui agenda própria. Os serviços também são separados por barbeiro.</p>${list.map(b=>`<div class="item barberItem"><div class="barberInfo">${barberAvatar(b)}<div><strong>${esc(b.name)}</strong><small>${esc(b.phone||'sem WhatsApp')}</small><div class="linkBox">${publicDashboardLink()} — link único da barbearia</div></div></div><div class="row"><button type="button" class="primary" data-edit-barber-id="${esc(b.id)}">Editar completo</button><a target="_blank" href="${wa(b.phone,`Olá ${b.name}, você foi adicionado à agenda da ${sameShopName()}. Link da barbearia: ${publicDashboardLink()}`)}"><button class="whats">WhatsApp</button></a></div></div>`).join("")}</div>`;
}

window.saveBarberName = async id => {
  const input = document.getElementById(`name_${id}`);
  const name = (input?.value || "").trim();
  if(!name) return toast("Informe o nome do barbeiro");
  const {data,error}=await db.from("barbers").update({name}).eq("id",id).select().single();
  if(error) return toast(error.message);
  toast("Nome do barbeiro atualizado");
  if(me && me.id===id){
    me = {...me, ...data, role:data.role || me.role || "barber"};
    sessionStorage.setItem("zenbarber_user", JSON.stringify(me));
  }
  await loadMine();
  renderApp();
};


window.toggleSelfBlockPermission = async (barberId, enabled) => {
  if(!canManageAll()) return toast('Acesso restrito.');
  const b=barberById(barberId);
  if(!b) return toast('Barbeiro não encontrado.');
  const nextNote = barberNoteSetFlag(b.activation_note, BARBER_NOTE_FLAG_SELF_BLOCK, !!enabled);
  const {data,error}=await db.from('barbers').update({activation_note:nextNote}).eq('id',barberId).select(BARBER_SAFE_COLUMNS).maybeSingle();
  if(error) return toast(error.message);
  cache.shopBarbers = cache.shopBarbers.map(x=>x.id===barberId?{...x,...(data||{}),activation_note:nextNote}:x);
  toast(enabled ? 'Permissão de bloqueio próprio ativada.' : 'Permissão de bloqueio próprio desativada.');
  await loadMine();
  renderApp();
};

function isManagerLockAppt(a){
  return isClosureAppt(a) && String(a?.client_name||'').toLowerCase().includes('bloqueio do gerente');
}
function isEmployeeAgendaLocked(barberId){
  return (cache.appointments||[]).some(a=>String(a.barber_id)===String(barberId) && a.date>=todayISO() && isManagerLockAppt(a));
}
function employeeAgendaLockUntil(barberId){
  const dates=(cache.appointments||[]).filter(a=>String(a.barber_id)===String(barberId) && a.date>=todayISO() && isManagerLockAppt(a)).map(a=>a.date).sort();
  return dates[dates.length-1] || todayISO();
}
window.lockEmployeeAgenda = async barberId => {
  if(!canManageAll()) return toast('Acesso restrito.');
  if(String(barberId)===String(me?.id)) return toast('Use Funcionamento para bloquear sua própria agenda.');
  const b=barberById(barberId);
  if(!b) return toast('Barbeiro não encontrado.');
  const days=Number(prompt(`Bloquear a agenda de ${b.name} por quantos dias?`, '30') || 0);
  if(!days || days<1) return toast('Informe uma quantidade de dias válida.');
  if(days>365) return toast('Limite máximo: 365 dias por bloqueio.');
  const reason=(prompt('Motivo do bloqueio (opcional):', 'Bloqueio do gerente') || 'Bloqueio do gerente').trim();
  if(!confirm(`Confirmar bloqueio da agenda de ${b.name} por ${days} dia(s)?\n\nOs agendamentos já existentes continuam aparecendo, mas novos horários ficam indisponíveis.`)) return;
  try{
    const rows=[];
    for(let i=0;i<days;i++){
      const date=addDays(todayISO(),i);
      const startHour=workStart(b,date)||OPEN;
      const dur=Math.max(30, minutes(workEnd(b,date)||CLOSE)-minutes(startHour));
      const serviceId=await ensureClosureService(b.id,dur);
      const exists=(cache.appointments||[]).some(a=>String(a.barber_id)===String(b.id) && a.date===date && isManagerLockAppt(a));
      if(!exists) rows.push({barber_id:b.id,service_id:serviceId,client_name:`Agenda fechada - Bloqueio do gerente - ${reason}`,client_phone:'',date,time:startHour,status:'bloqueio'});
    }
    if(!rows.length) return toast('Essa agenda já estava bloqueada no período.');
    const {error}=await db.from('appointments').insert(rows);
    if(error) return toast(error.message);
    toast('Agenda do funcionário bloqueada.');
    await loadMine();
    renderApp();
  }catch(err){ toast(err.message || 'Erro ao bloquear agenda.'); }
};
window.unlockEmployeeAgenda = async barberId => {
  if(!canManageAll()) return toast('Acesso restrito.');
  const b=barberById(barberId);
  const locks=(cache.appointments||[]).filter(a=>String(a.barber_id)===String(barberId) && a.date>=todayISO() && isManagerLockAppt(a));
  if(!locks.length) return toast('Essa agenda já está liberada.');
  if(!confirm(`Desbloquear a agenda de ${b?.name || 'funcionário'} e liberar novos horários?`)) return;
  const ids=locks.map(a=>a.id).filter(id=>!String(id).startsWith('local-'));
  if(!ids.length) return toast('Nenhum bloqueio válido encontrado para desbloquear.');
  const {error}=await db.from('appointments').update({status:'cancelado'}).in('id',ids);
  if(error) return toast(error.message);
  toast('Agenda do funcionário desbloqueada.');
  await loadMine();
  renderApp();
};

function slugify(v){ return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "barbeiro"; }
window.requestShopBarber = async () => {
  const nome = bn.value.trim();
  const phone = bph.value.trim();
  const obs = bobs.value.trim();
  if(!nome || !phone) return toast("Preencha nome e WhatsApp do barbeiro");
  const login = `${slugify(nome)}-${Date.now().toString().slice(-5)}`;
  const row = {
    shop_id:sameShopId() || null, name:nome, login, password:"aguardando", phone, shop_name:sameShopName(), role:"barber",
    access_status:"pendente", activation_note:obs, photo_url:"", background_url:"",
    work_start:OPEN, work_end:CLOSE, commission_rate:0, off_days: cache.shopBarbers[0]?.off_days || ""
  };
  const {error}=await db.from("barbers").insert(row);
  if(error) return toast(error.message);
  const msg = `Solicitação de ativação de novo barbeiro\n\nBarbearia: ${sameShopName()}\nDono/login: ${me.name} / ${me.login}\nNovo barbeiro: ${nome}\nWhatsApp: ${phone}\nObservação: ${obs || "sem observação"}\n\nA solicitação já ficou pendente no Painel ADM do ZenBarber.`;
  window.open(wa(ACTIVATION_WHATSAPP,msg),"_blank");
  toast("Solicitação enviada e registrada no ADM");
  bn.value=""; bph.value=""; bobs.value="";
};

function barberWorkScheduleHtml(b){
  const sched = parseWeeklySchedule(b || {});
  return `<div class="barberWorkBox"><h3>Horários de atendimento</h3><p class="muted">Defina os dias e horários deste barbeiro. A agenda interna e o link público do cliente usam exatamente esta configuração.</p><div class="row"><button type="button" onclick="copyBarberWorkingDay(1,'week')">Copiar segunda para dias úteis</button><button type="button" onclick="copyBarberWorkingDay(1,'all')">Copiar segunda para todos</button></div><div class="hoursList barberHoursList">${DAY_NAMES.map((d,i)=>{ const x=sched[i] || {}; return `<div class="hoursDay barberHoursDay"><label class="switchLine"><input id="bwopen_${i}" type="checkbox" ${x.open?'checked':''} onchange="toggleBarberWorkDay(${i})"><span class="switchVisual"></span><b>${d}</b></label><div id="bwbox_${i}" class="hoursFields ${x.open?'':'hidden'}"><label>Início ${timeSelect(`bwstart_${i}`,x.start||OPEN,'Início')}</label><label>Pausa almoço ${timeSelect(`bwbs_${i}`,x.break_start||'','Sem pausa')}</label><label>Até ${timeSelect(`bwbe_${i}`,x.break_end||'','Sem pausa')}</label><label>Fim ${timeSelect(`bwend_${i}`,x.end||CLOSE,'Fim')}</label></div></div>`; }).join('')}</div><small class="muted">Para deixar sem almoço, mantenha os dois campos da pausa como “Sem pausa”. Para fechar um dia, desmarque o dia.</small></div>`;
}
window.toggleBarberWorkDay = i => { const box=document.getElementById('bwbox_'+i); if(box) box.classList.toggle('hidden', !document.getElementById('bwopen_'+i)?.checked); };
window.copyBarberWorkingDay = (source=1,mode='week') => {
  const srcOpen=!!document.getElementById('bwopen_'+source)?.checked;
  const srcStart=document.getElementById('bwstart_'+source)?.value || OPEN;
  const srcEnd=document.getElementById('bwend_'+source)?.value || CLOSE;
  const srcBs=document.getElementById('bwbs_'+source)?.value || '';
  const srcBe=document.getElementById('bwbe_'+source)?.value || '';
  const targets = mode==='week' ? [1,2,3,4,5] : [0,1,2,3,4,5,6];
  targets.forEach(i=>{
    const open=document.getElementById('bwopen_'+i); if(open) open.checked=srcOpen;
    const st=document.getElementById('bwstart_'+i); if(st) st.value=srcStart;
    const en=document.getElementById('bwend_'+i); if(en) en.value=srcEnd;
    const bs=document.getElementById('bwbs_'+i); if(bs) bs.value=srcBs;
    const be=document.getElementById('bwbe_'+i); if(be) be.value=srcBe;
    toggleBarberWorkDay(i);
  });
  toast(mode==='week' ? 'Horários copiados para segunda a sexta.' : 'Horários copiados para todos os dias.');
};
function collectBarberWorkSchedule(){
  const schedule=[];
  for(let i=0;i<7;i++){
    const open=!!document.getElementById('bwopen_'+i)?.checked;
    const start=(document.getElementById('bwstart_'+i)?.value||OPEN).trim();
    const end=(document.getElementById('bwend_'+i)?.value||CLOSE).trim();
    const bs=(document.getElementById('bwbs_'+i)?.value||'').trim();
    const be=(document.getElementById('bwbe_'+i)?.value||'').trim();
    if(open){
      if(!isValidHour(start) || !isValidHour(end) || minutes(end)<=minutes(start)){ toast(`Confira início e fim de ${DAY_NAMES[i]}.`); return null; }
      if((bs && !be) || (!bs && be)){ toast(`Preencha início e fim da pausa de ${DAY_NAMES[i]}, ou deixe os dois vazios.`); return null; }
      if(bs && be){
        if(!isValidHour(bs) || !isValidHour(be) || minutes(be)<=minutes(bs)){ toast(`Confira a pausa de almoço de ${DAY_NAMES[i]}.`); return null; }
        if(minutes(bs)<minutes(start) || minutes(be)>minutes(end)){ toast(`A pausa de ${DAY_NAMES[i]} precisa estar dentro do expediente.`); return null; }
      }
    }
    schedule.push({open,start,end,break_start:bs,break_end:be});
  }
  return schedule;
}

window.openEditBarber = id => {
  // HOTFIX: busca robusta por ID em todas as listas carregadas.
  const allBarbers = [
    ...(cache.shopBarbers || []),
    ...(cache.barbers || []),
    ...(cache.publicBarbers || [])
  ];
  const b = allBarbers.find(x => String(x.id) === String(id));
  if(!b) {
    toast('Não consegui abrir este barbeiro. Atualize a página e tente novamente.');
    console.warn('ZenBarber: barbeiro não encontrado para edição', id, allBarbers);
    return;
  }
  if(!canManageAll() && String(me?.id)!==String(b.id)) return toast('Você só pode editar seu próprio perfil.');
  const oldModal = document.getElementById('modal');
  if(oldModal) oldModal.remove();
  const canEditSensitive = canManageAll();
  document.body.insertAdjacentHTML("beforeend",`<div class="modalBack" id="modal"><div class="modal"><h2>Editar barbeiro</h2><p class="muted">Troque os dados do barbeiro e defina o período de trabalho por dia, com pausa para almoço. Esses horários ficam vinculados à agenda do barbeiro e ao link público de agendamento.</p><div class="form"><input id="en" value="${esc(b.name)}" placeholder="Nome"><input id="el" value="${esc(b.login||'')}" placeholder="Login" ${canEditSensitive?'':'disabled'}><input id="ep" type="password" placeholder="Nova senha (deixe vazio para manter)" ${canEditSensitive?'':'disabled'}><input id="ew" value="${esc(b.phone||'')}" placeholder="WhatsApp"><select id="erole" ${canEditSensitive?'':'disabled'}><option value="barber" ${(!b.role||b.role==='barber')?'selected':''}>Barbeiro</option><option value="gerente" ${b.role==='gerente'?'selected':''}>Gerente</option></select><input id="ecom" type="number" value="${b.commission_rate||0}" placeholder="Comissão %" ${canEditSensitive?'':'disabled'}>${barberWorkScheduleHtml(b)}<div class="previewRow">${barberAvatar(b)}<span class="muted">Foto atual do barbeiro</span></div>${fileField("ephotoFile","Trocar foto do barbeiro")}<div class="row"><button type="button" class="primary" onclick="saveEditBarber('${b.id}')">Salvar alterações</button><button type="button" onclick="document.getElementById('modal')?.remove()">Cancelar</button></div></div></div></div>`);
};

// HOTFIX: delegação de clique para o botão Editar completo.
// Assim a ação funciona mesmo quando o navegador/PWA usa cache ou quando o botão é renderizado dinamicamente.
if(!window.__zenEditBarberDelegationInstalled){
  window.__zenEditBarberDelegationInstalled = true;
  document.addEventListener('click', function(ev){
    const btn = ev.target && ev.target.closest ? ev.target.closest('[data-edit-barber-id]') : null;
    if(!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    window.openEditBarber(btn.getAttribute('data-edit-barber-id'));
  }, true);
}
window.saveEditBarber = async id => {
  if(!canManageAll() && String(me?.id)!==String(id)) return toast('Você só pode editar seu próprio perfil.');
  const currentBarber = cache.shopBarbers.find(x=>String(x.id)===String(id)) || {};
  const schedule = collectBarberWorkSchedule();
  if(!schedule) return;
  const firstOpen = schedule.find(x=>x.open) || {start:OPEN,end:CLOSE};
  const canEditSensitive = canManageAll();
  const row={
    name:en.value.trim(),
    login:canEditSensitive ? el.value.trim().toLowerCase().replace(/\s+/g,"-") : (currentBarber.login || me?.login || '').trim(),
    phone:ew.value.trim(),
    role:canEditSensitive ? erole.value : (currentBarber.role || me?.role || 'barber'),
    commission_rate:canEditSensitive ? Number(ecom.value||0) : Number(currentBarber.commission_rate||0),
    work_start:firstOpen.start||OPEN,
    work_end:firstOpen.end||CLOSE,
    off_days:'SCHEDULE_JSON:'+JSON.stringify(schedule)
  };
  const newBarberPhoto = await imageInputData("ephotoFile", barberPhotoUrl(currentBarber));
  if(newBarberPhoto) row.activation_note = barberNoteSetPhoto(currentBarber.activation_note, newBarberPhoto);
  const newPassword = canEditSensitive ? ep.value.trim() : '';
  if(newPassword) await setBarberPasswordFields(row, row.login, newPassword);
  if(!row.name||!row.login) return toast("Nome e login são obrigatórios");
  let {data,error}=await db.from("barbers").update(row).eq("id",id).select(BARBER_SAFE_COLUMNS).single();
  if(error && String(error.message||"").toLowerCase().includes("password_hash") && newPassword){
    const legacyRow = {...row, password:newPassword}; delete legacyRow.password_hash;
    ({data,error}=await db.from("barbers").update(legacyRow).eq("id",id).select(BARBER_SAFE_COLUMNS).single());
  }
  if(error) return toast(error.message);
  toast('Barbeiro atualizado. A agenda e o link público já usam os novos horários.');
  if(me && String(me.id)===String(id)){ me={...me,...data,role:data.role || me.role || "barber"}; sessionStorage.setItem("zenbarber_user", JSON.stringify(me)); }
  modal.remove(); await loadMine(); renderApp();
};


function commissionsPage(){
  if(!canManageAll()) return `<div class="card"><h3>Acesso restrito</h3><p class="muted">Somente gerente ou dono da barbearia pode alterar as comissões.</p></div>`;
  const done=cache.appointments.filter(a=>a.status==='concluido');
  const totalBruto=done.reduce((t,a)=>t+Number(a.services?.price||0),0);
  const totalComissao=done.reduce((t,a)=>t+commissionValueFor(a),0);
  const lucro=totalBruto-totalComissao;
  return `<div class="statgrid"><div class="stat"><span>Faturamento bruto</span><b>${money(totalBruto)}</b></div><div class="stat"><span>Total comissão</span><b>${money(totalComissao)}</b></div><div class="stat"><span>Lucro líquido</span><b>${money(lucro)}</b></div><div class="stat"><span>Barbeiros</span><b>${cache.shopBarbers.length}</b></div></div><div class="card"><h3>Editar comissão dos barbeiros</h3><p class="muted">Defina a porcentagem que será paga para cada barbeiro. O Dashboard / Financeiro já desconta esse valor para mostrar o lucro real da barbearia.</p>${cache.shopBarbers.map(b=>{ const ap=done.filter(a=>a.barber_id===b.id); const bruto=ap.reduce((t,a)=>t+Number(a.services?.price||0),0); const perc=Number(b.commission_rate||0); const com=bruto*perc/100; return `<div class="item"><div><strong>${esc(b.name)}</strong><small>${ap.length} atendimento(s) concluído(s) • Bruto: ${money(bruto)}</small><br><small>Comissão atual: ${perc}% • A pagar: ${money(com)} • Sobra: ${money(bruto-com)}</small></div><div class="commissionEdit"><input id="com_${b.id}" type="number" min="0" max="100" step="0.01" value="${perc}" placeholder="Comissão %"><button class="primary" onclick="saveCommission('${b.id}')">Salvar</button></div></div>`;}).join("")}</div>`;
}
window.saveCommission = async id => {
  const el=document.getElementById('com_'+id);
  const value=Number(el?.value||0);
  if(value<0 || value>100) return toast('Informe uma comissão entre 0 e 100%');
  const {error}=await db.from('barbers').update({commission_rate:value}).eq('id',id);
  if(error) return toast(error.message);
  toast('Comissão atualizada');
  renderApp();
};

function profilePage(){
  const b = cache.shopBarbers.find(x=>x.id===me.id) || me;
  const funcionamentoCard = canManageAll() ? `<div class="card"><h3>Funcionamento da Barbearia</h3><p class="muted">Configure dias de atendimento, horário de abertura, horário de fechamento, intervalos e horários especiais da barbearia. Essa configuração alimenta a agenda interna e o link público do cliente.</p><div class="profileSettingsGrid"><div><strong>Dias de atendimento</strong><small>Abra ou feche cada dia da semana.</small></div><div><strong>Horário de abertura</strong><small>Defina o início do expediente.</small></div><div><strong>Horário de fechamento</strong><small>Defina o fim do expediente.</small></div><div><strong>Intervalos</strong><small>Bloqueie almoço ou pausas.</small></div><div><strong>Horários especiais</strong><small>Feche feriados, férias ou dias específicos.</small></div></div><br><button class="primary" onclick="page='hours';renderApp()">Abrir Funcionamento</button></div>` : `<div class="card"><h3>Funcionamento da Barbearia</h3><p class="muted">Somente gerente ou dono da barbearia pode alterar dias de atendimento, horários, intervalos e horários especiais.</p></div>`;
  return `<div class="card"><h3>Meu perfil / Configurações</h3><p class="muted">Altere os dados gerais da barbearia, logo e fundo da página pública. A foto individual de cada barbeiro é alterada na aba Barbeiros.</p><div class="profilePreview">${avatar(b.photo_url,b.name)}<div><strong>${esc(b.name)}</strong><small>${esc(sameShopName())}</small></div></div><div class="grid3"><input id="pn" value="${esc(b.name||'')}" placeholder="Nome"><input id="pl" value="${esc(b.login||'')}" placeholder="Login"><input id="pp" type="password" placeholder="Nova senha (deixe vazio para manter)"><input id="pw" value="${esc(b.phone||'')}" placeholder="WhatsApp"><input id="pshop" value="${esc(b.shop_name||'')}" placeholder="Nome da barbearia">${fileField("pphotoFile","Trocar logo da barbearia")}${fileField("pbgFile","Trocar fundo da página do cliente")}</div><br><button class="primary" onclick="saveProfile()">Salvar perfil</button></div>${funcionamentoCard}`;
}

window.saveProfile = async () => {
  const current = cache.shopBarbers.find(x=>x.id===me.id) || me;
  const row={name:pn.value.trim(),login:pl.value.trim().toLowerCase().replace(/\s+/g,"-"),phone:pw.value.trim(),shop_name:pshop.value.trim()||pn.value.trim(),photo_url:await imageInputData("pphotoFile", current.photo_url||""),background_url:await imageInputData("pbgFile", current.background_url||"")};
  const newPassword = pp.value.trim();
  if(newPassword) await setBarberPasswordFields(row, row.login, newPassword);
  if(!row.name||!row.login) return toast("Nome e login são obrigatórios");
  const oldShop=sameShopName();
  let {data,error}=await db.from("barbers").update(row).eq("id",me.id).select(BARBER_SAFE_COLUMNS).single();
  if(error && String(error.message||"").toLowerCase().includes("password_hash") && newPassword){
    const legacyRow = {...row, password:newPassword}; delete legacyRow.password_hash;
    ({data,error}=await db.from("barbers").update(legacyRow).eq("id",me.id).select(BARBER_SAFE_COLUMNS).single());
  }
  if(error) return toast(error.message);
  if(oldShop !== row.shop_name){ await db.from("barbers").update({shop_name:row.shop_name}).eq("shop_name",oldShop); }
  toast("Perfil atualizado"); saveUser({...data,role:normalizeRole(data.role || me.role)});
};



function timeSelect(id,value='',blankLabel='',extraClass=''){
  const opts=[];
  if(blankLabel) opts.push(`<option value="">${esc(blankLabel)}</option>`);
  for(let m=0;m<=24*60;m+=STEP){
    if(m>24*60) break;
    const t=hhmm(m);
    if(m===24*60) opts.push(`<option value="24:00" ${value==='24:00'?'selected':''}>24:00</option>`);
    else opts.push(`<option value="${t}" ${value===t?'selected':''}>${t}</option>`);
  }
  return `<select id="${id}" class="${extraClass}">${opts.join('')}</select>`;
}

function hoursPage(){
  if(!canManageAll()) return `<div class="card"><h3>Acesso restrito</h3><p class="muted">Somente gerente ou dono da barbearia pode alterar os horários de funcionamento.</p></div>`;
  const base = cache.shopBarbers[0] || me;
  const sched = parseWeeklySchedule(base);
  const futureClosures = cache.appointments.filter(isClosureAppt).filter(a=>a.date>=todayISO()).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return `<div class="card"><h3>Funcionamento da barbearia</h3><p class="muted">Defina dia por dia quando a barbearia abre, fecha ou fica bloqueada para almoço/intervalo. Agora os horários são por lista suspensa para evitar erro de digitação. Esses horários afetam diretamente a agenda interna e o link público do cliente.</p><div class="row"><button type="button" onclick="copyWorkingDay(1,'week')">Copiar segunda para dias úteis</button><button type="button" onclick="copyWorkingDay(1,'all')">Copiar segunda para todos</button></div><div class="hoursList">${DAY_NAMES.map((d,i)=>{const x=sched[i];return `<div class="hoursDay"><label class="switchLine"><input id="hopen_${i}" type="checkbox" ${x.open?'checked':''} onchange="toggleHourDay(${i})"><span class="switchVisual"></span><b>${d}</b></label><div id="hbox_${i}" class="hoursFields ${x.open?'':'hidden'}">${timeSelect(`hstart_${i}`,x.start||OPEN,'Abre')} ${timeSelect(`hend_${i}`,x.end||CLOSE,'Fecha')} ${timeSelect(`hbs_${i}`,x.break_start||'','Sem bloqueio/almoço')} ${timeSelect(`hbe_${i}`,x.break_end||'','Sem bloqueio/almoço')}</div></div>`}).join('')}</div><br><button class="primary" onclick="saveWorkingHours()">Salvar funcionamento</button></div>
  <div class="card"><h3>Fechar dia específico / férias</h3><p class="muted">Use para feriado, folga individual, viagem ou férias. Pode fechar a barbearia toda ou apenas a agenda de um barbeiro. O link do cliente e a agenda interna param de mostrar horários nesses dias.</p><div class="grid3"><label>De<input id="closeStart" type="date" min="${todayISO()}" value="${todayISO()}"></label><label>Até<input id="closeEnd" type="date" min="${todayISO()}" value="${todayISO()}"></label><label>Quem vai fechar?<select id="closeScope" onchange="toggleCloseBarber()"><option value="all">Todos os barbeiros / feriado geral</option><option value="one">Apenas um barbeiro</option></select></label><label id="closeBarberBox" class="hidden">Barbeiro<select id="closeBarber">${barberOptions(cache.shopBarbers[0]?.id||'')}</select></label><label>Motivo<input id="closeReason" placeholder="Ex: Feriado, férias, compromisso"></label><button class="danger" onclick="closeSpecificDays()">Fechar agenda</button></div></div>
  <div class="card"><h3>Dias fechados programados</h3>${futureClosures.map(a=>`<div class="item"><div><strong>${formatDateFullBR(a.date)} • ${esc(barberName(a.barber_id))}</strong><small>${esc(a.client_name||'Agenda fechada')} • bloqueia horários deste dia</small></div><button class="danger" onclick="removeSpecificClosure('${a.id}')">Reabrir</button></div>`).join('') || '<div class="empty">Nenhum fechamento específico programado.</div>'}</div>
  <div class="card"><h3>Como isso funciona</h3><p class="muted">Exemplo: se quarta estiver fechada, nenhum horário aparece para quarta. Se segunda tiver bloqueio 12:00 até 13:30, nenhum serviço que encoste nesse intervalo será oferecido. O almoço/bloqueio é opcional: deixe os dois campos como “Sem bloqueio/almoço” se não quiser pausa naquele dia.</p></div>`;
}
window.toggleHourDay = i => { const box=document.getElementById('hbox_'+i); if(box) box.classList.toggle('hidden', !document.getElementById('hopen_'+i).checked); };
window.copyWorkingDay = (source=1,mode='week') => {
  const srcOpen=!!document.getElementById('hopen_'+source)?.checked;
  const srcStart=document.getElementById('hstart_'+source)?.value || OPEN;
  const srcEnd=document.getElementById('hend_'+source)?.value || CLOSE;
  const srcBs=document.getElementById('hbs_'+source)?.value || '';
  const srcBe=document.getElementById('hbe_'+source)?.value || '';
  const targets = mode==='week' ? [1,2,3,4,5] : [0,1,2,3,4,5,6];
  targets.forEach(i=>{
    const open=document.getElementById('hopen_'+i); if(open) open.checked=srcOpen;
    const st=document.getElementById('hstart_'+i); if(st) st.value=srcStart;
    const en=document.getElementById('hend_'+i); if(en) en.value=srcEnd;
    const bs=document.getElementById('hbs_'+i); if(bs) bs.value=srcBs;
    const be=document.getElementById('hbe_'+i); if(be) be.value=srcBe;
    toggleHourDay(i);
  });
  toast(mode==='week' ? 'Horários copiados para segunda a sexta.' : 'Horários copiados para todos os dias.');
};
window.saveWorkingHours = async () => {
  const btn = document.querySelector('button[onclick="saveWorkingHours()"]');
  if(btn){ btn.disabled=true; btn.textContent='Salvando...'; }
  try{
    const schedule=[];
    for(let i=0;i<7;i++){
      const open=!!document.getElementById('hopen_'+i)?.checked;
      const start=(document.getElementById('hstart_'+i)?.value||OPEN).trim();
      const end=(document.getElementById('hend_'+i)?.value||CLOSE).trim();
      const bs=(document.getElementById('hbs_'+i)?.value||'').trim();
      const be=(document.getElementById('hbe_'+i)?.value||'').trim();
      if(open){
        if(!isValidHour(start) || !isValidHour(end) || minutes(end)<=minutes(start)) return toast(`Confira abertura/fechamento de ${DAY_NAMES[i]}`);
        if((bs && !be) || (!bs && be)) return toast(`Preencha início e fim do bloqueio/almoço de ${DAY_NAMES[i]}, ou deixe os dois vazios.`);
        if(bs && be){
          if(!isValidHour(bs) || !isValidHour(be) || minutes(be)<=minutes(bs)) return toast(`Confira bloqueio/almoço de ${DAY_NAMES[i]}`);
          if(minutes(bs)<minutes(start) || minutes(be)>minutes(end)) return toast(`O bloqueio/almoço de ${DAY_NAMES[i]} precisa estar dentro do expediente.`);
        }
      }
      schedule.push({open,start,end,break_start:bs,break_end:be});
    }
    const encoded='SCHEDULE_JSON:'+JSON.stringify(schedule);
    const ids=cache.shopBarbers.map(b=>b.id);
    if(!ids.length) return toast('Nenhum barbeiro encontrado');
    const firstOpen = schedule.find(x=>x.open) || {start:OPEN,end:CLOSE};
    const updates = await Promise.all(ids.map(id => db.from('barbers').update({off_days:encoded,work_start:firstOpen.start,work_end:firstOpen.end}).eq('id',id)));
    const err = updates.find(r=>r.error)?.error;
    if(err) return toast(err.message);
    cache.shopBarbers = cache.shopBarbers.map(b=>({...b,off_days:encoded,work_start:firstOpen.start,work_end:firstOpen.end}));
    cache.barbers = cache.barbers.map(b=>ids.includes(b.id)?({...b,off_days:encoded,work_start:firstOpen.start,work_end:firstOpen.end}):b);
    if(ids.includes(me.id)){
      me={...me,off_days:encoded,work_start:firstOpen.start,work_end:firstOpen.end};
      sessionStorage.setItem('zenbarber_user',JSON.stringify(me));
    }
    toast('Funcionamento salvo. A agenda e o link público já usam esses horários.');
    await loadMine();
    renderApp();
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='Salvar funcionamento'; }
  }
};
window.toggleCloseBarber = () => {
  const box=document.getElementById('closeBarberBox');
  const scope=document.getElementById('closeScope')?.value;
  if(box) box.classList.toggle('hidden', scope!=='one');
};
async function ensureClosureService(barberId,duration){
  const name='Fechamento de agenda';
  const found=cache.services.find(s=>s.barber_id===barberId && s.name===name && Number(s.duration||0)===Number(duration||0));
  if(found) return found.id;
  const {data,error}=await db.from('services').insert(shopScopedPayload({barber_id:barberId,name,price:0,duration:Number(duration||720)})).select().single();
  if(error) throw new Error(error.message);
  cache.services.push(data);
  return data.id;
}
window.closeSpecificDays = async () => {
  const start=document.getElementById('closeStart')?.value;
  const end=document.getElementById('closeEnd')?.value || start;
  const scope=document.getElementById('closeScope')?.value || 'all';
  const reason=(document.getElementById('closeReason')?.value || 'Agenda fechada').trim();
  const dates=dateRangeISO(start,end);
  if(!dates.length) return toast('Confira a data inicial e final.');
  const barbers = scope==='one' ? cache.shopBarbers.filter(b=>b.id===document.getElementById('closeBarber')?.value) : cache.shopBarbers;
  if(!barbers.length) return toast('Nenhum barbeiro selecionado.');
  if(!confirm(`Fechar ${barbers.length} agenda(s) por ${dates.length} dia(s)?`)) return;
  try{
    const rows=[];
    for(const b of barbers){
      for(const date of dates){
        const startHour=workStart(b,date)||OPEN;
        const dur=Math.max(30, minutes(workEnd(b,date)||CLOSE)-minutes(startHour));
        const serviceId=await ensureClosureService(b.id,dur);
        rows.push({barber_id:b.id,service_id:serviceId,client_name:`Agenda fechada - ${reason}`,client_phone:'',date,time:startHour,status:'bloqueio'});
      }
    }
    const {error}=await db.from('appointments').insert(rows.map(r=>shopScopedPayload(r)));
    if(error) return toast(error.message);
    toast('Agenda fechada no(s) dia(s) selecionado(s).');
    await loadMine(); renderApp();
  }catch(err){ toast(err.message || 'Erro ao fechar agenda'); }
};
window.removeSpecificClosure = async id => {
  if(!confirm('Reabrir este dia/agenda?')) return;
  const {error}=await db.from('appointments').update({status:'cancelado'}).eq('id',id);
  if(error) return toast(error.message);
  toast('Agenda reaberta.');
  renderApp();
};

