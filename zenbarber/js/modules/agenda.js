function addDays(date, days){ const d=new Date(String(date||todayISO())+"T12:00:00"); d.setDate(d.getDate()+Number(days||0)); return d.toISOString().slice(0,10); }
function dayShort(date){ return ["DOM","SEG","TER","QUA","QUI","SEX","SAB"][dayIndex(date)] || ""; }
function agendaDayAppts(date){
  return cache.appointments
    .filter(a=>['agendado','encaixe','em_andamento','bloqueio'].includes(a.status) && a.date===date)
    .sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
}
function clientDayAppts(date){ return agendaDayAppts(date).filter(a=>!isClosureAppt(a)); }
function dayOccupation(date){
  const barbers=cache.shopBarbers.length?cache.shopBarbers:[me];
  let total=0,busy=0;
  for(const b of barbers){
    if(isDayOff(b,date)) continue;
    total += Math.max(0, minutes(workEnd(b,date)||CLOSE)-minutes(workStart(b,date)||OPEN));
  }
  agendaDayAppts(date).forEach(a=>{ busy += Number(a.services?.duration||30); });
  return total ? Math.min(100,Math.round((busy/total)*100)) : 0;
}
function agendaCalendarDays(){
  const base=new Date(String(agendaDate||todayISO())+"T12:00:00");
  const today=todayISO();
  const out=[];
  for(let i=-3;i<=7;i++){
    const d=new Date(base); d.setDate(base.getDate()+i);
    const iso=d.toISOString().slice(0,10);
    const count=clientDayAppts(iso).length;
    out.push(`<button class="dayChip ${iso===agendaDate?'selected':''} ${iso===today?'today':''}" onclick="setAgendaDate('${iso}')"><span>${dayShort(iso)}</span><b>${String(d.getDate()).padStart(2,'0')}</b><em>${count ? '•'.repeat(Math.min(5,count)) : '·'}</em></button>`);
  }
  return out.join('');
}
function timeUntilText(a){
  if(!a?.date || !a?.time) return '';
  const now=new Date(); const when=new Date(`${a.date}T${a.time}:00`); const diff=Math.round((when-now)/60000);
  if(diff>60) return `Em ${Math.floor(diff/60)}h${diff%60?String(diff%60).padStart(2,'0'):''}`;
  if(diff>0) return `Em ${diff} min`;
  const dur=Number(a.services?.duration||30);
  if(diff>-dur) return `Agora`;
  return `Atrasado ${Math.abs(diff)} min`;
}
function agendaNowMinutes(){ const n=new Date(); return n.getHours()*60+n.getMinutes(); }
function isUnconfirmedLateForNext(a,date){
  if(date!==todayISO()) return false;
  if(!['agendado','encaixe'].includes(a.status)) return false;
  if(isClosureAppt(a) || isInternalSubscriptionService(a.services||{})) return false;
  return minutes(a.time)+15 < agendaNowMinutes();
}
function overdueUnconfirmedAppts(date){
  if(date!==todayISO()) return [];
  return clientDayAppts(date)
    .filter(a=>isUnconfirmedLateForNext(a,date))
    .sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
}
function nextClientFor(date){
  const nowMin = date===todayISO() ? agendaNowMinutes() : 0;
  const list = clientDayAppts(date).filter(a=>!isUnconfirmedLateForNext(a,date));
  return list.find(a=>minutes(a.time)+Number(a.services?.duration||30)>=nowMin) || list[0];
}
function statusLabel(st){ return ({agendado:'Pendente',encaixe:'Encaixe',em_andamento:'Em andamento',bloqueio:'Bloqueio',concluido:'Pago',faltou:'Faltou',cancelado:'Cancelado'}[st] || st || 'Pendente'); }

function clientFirstName(name){ return String(name||'').trim().split(/\s+/)[0] || 'cliente'; }
function apptWhatsappTemplate(a,type){
  const shop=sameShopName()||'barbearia';
  const first=clientFirstName(a?.client_name);
  const date=formatDateFullBR(a?.date);
  const time=a?.time||'';
  const service=a?.services?.name||'serviço';
  const price=money(a?.services?.price||0);
  const link=publicDashboardLink();
  const templates={
    confirm:`Olá ${first}, tudo bem? Passando para confirmar seu horário na ${shop} hoje às ${time}. Posso confirmar?`,
    reminder:`Olá ${first}, passando para lembrar do seu horário na ${shop}: ${date} às ${time}. Serviço: ${service}.`,
    delay:`Olá ${first}, tudo bem? Seu horário na ${shop} era às ${time}. Me avisa se ainda vem ou se prefere remarcar?`,
    reschedule:`Olá ${first}, tudo bem? Precisamos ajustar seu horário na ${shop}. Me chama por aqui para remarcarmos o melhor horário para você.`,
    charge:`Olá ${first}, tudo bem? Passando para lembrar do valor de ${price} referente ao ${service} na ${shop}.`,
    comeback:`Olá ${first}, tudo bem? Faz alguns dias que você não aparece na ${shop}. Quer agendar seu próximo horário? ${link}`,
    thanks:`Obrigado pela preferência, ${first}! Foi um prazer atender você na ${shop}. Quando quiser agendar novamente, é só chamar.`
  };
  return templates[type] || templates.reminder;
}
function whatsappActionLink(a,type){ return wa(a?.client_phone, apptWhatsappTemplate(a,type)); }
function whatsappQuickButtons(a,opts={}){
  if(!a || isClosureAppt(a)) return '';
  const id=a.id;
  const compact=opts.compact?' miniBtn':'';
  const cls=compact.trim()||'';
  return `<div class="whatsCommandBtns">
    <button type="button" class="whats${compact}" onclick="event.stopPropagation(); window.open('${whatsappActionLink(a,'confirm')}','_blank')">Confirmar</button>
    <button type="button" class="gold${compact}" onclick="event.stopPropagation(); window.open('${whatsappActionLink(a,'reschedule')}','_blank')">Reagendar</button>
    <button type="button" class="${cls}" onclick="event.stopPropagation(); window.open('${whatsappActionLink(a,'delay')}','_blank')">Atraso</button>
    <button type="button" class="${cls}" onclick="event.stopPropagation(); window.open('${whatsappActionLink(a,'charge')}','_blank')">Cobrar</button>
    <button type="button" class="${cls}" onclick="event.stopPropagation(); copyWhatsMsg('${id}','confirm')">Copiar</button>
  </div>`;
}
window.copyWhatsMsg = (id,type='confirm') => {
  const a=cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Agendamento não encontrado.');
  navigator.clipboard?.writeText(apptWhatsappTemplate(a,type));
  toast('Mensagem copiada para o WhatsApp.');
};

function statusClass(st,a){
  if(a?.date===todayISO() && a?.time && minutes(a.time)<(new Date().getHours()*60+new Date().getMinutes()) && st==='agendado') return 'late';
  return ({agendado:'pending',encaixe:'fitin',em_andamento:'confirmed',concluido:'paid',cancelado:'cancelled',faltou:'late',bloqueio:'blocked'}[st] || 'pending');
}
function paymentActionButtons(a, opts={}){
  if(!a || isClosureAppt(a)) return '';
  const mini = opts.mini ? ' miniBtn' : '';
  if(a.status==='concluido') return `<button class="gold${mini}" onclick="editPayment('${a.id}')">Editar pagamento</button>`;
  return `<button class="primary${mini}" onclick="finishAppt('${a.id}')">Concluir</button><button${mini?` class="${mini.trim()}"`:''} onclick="setStatus('${a.id}','faltou')">Faltou</button>`;
}
function periodOfTime(t){ const m=minutes(t); if(m<12*60) return '☀️ Manhã'; if(m<18*60) return '🌤️ Tarde'; return '🌙 Noite'; }
function gapHtml(prev,a){
  if(!prev || !a) return '';
  const end=minutes(prev.time)+Number(prev.services?.duration||30); const gap=minutes(a.time)-end;
  if(gap<30) return '';
  const h=Math.floor(gap/60), m=gap%60;
  const label=h ? `${h}h${m?String(m).padStart(2,'0'):''} livres` : `${gap} min livres`;
  return `<div class="timelineGap"><span>Janela livre · ${label}</span></div>`;
}
function isPastAgendaItem(a,date){
  if(date!==todayISO()) return false;
  const now=new Date().getHours()*60+new Date().getMinutes();
  return minutes(a.time)+Number(a.services?.duration||30) < now;
}
function compactPastRow(a){
  const search = [a.client_name,a.client_phone,barberName(a.barber_id),a.services?.name,a.date,a.time,a.status].filter(Boolean).join(' ').toLowerCase();
  const canSettle = ['agendado','encaixe','em_andamento'].includes(a.status) && !isClosureAppt(a) && !isInternalSubscriptionService(a.services||{});
  const actions = canSettle ? `<div class="pastActions"><button class="primary miniBtn" onclick="markPaid('${a.id}')">Dar baixa</button><button class="gold miniBtn" onclick="receiveWithDiscount('${a.id}')">Valor</button><button class="gold miniBtn" onclick="sendPastToWallet('${a.id}')">Carteira</button><button class="danger miniBtn" onclick="markPastNoShow('${a.id}')">Faltou</button></div>` : '';
  return `<div class="pastRow apptItem pastRowWithActions" data-search="${esc(search)}"><strong>${esc(a.time||'')}</strong><span>${esc(a.client_name||'Cliente')}</span><small>${esc(a.services?.name||'Serviço')}</small>${actions}</div>`;
}
function timelineCard(a,prev){
  const cls=statusClass(a.status,a); const end=a.time?hhmm(minutes(a.time)+Number(a.services?.duration||30)):'';
  const searchText=[a.client_name,a.client_phone,barberName(a.barber_id),a.services?.name,a.date,a.time,a.status].filter(Boolean).join(' ').toLowerCase();
  if(isClosureAppt(a)){
    return `${gapHtml(prev,a)}<div class="timelineItem apptItem blocked" data-search="${esc(searchText)}"><div class="timeRail"><strong>${esc(a.time||'')}</strong><i></i></div><div class="timelineCard"><div class="timelineMain"><div><b>${esc(a.client_name||'Agenda fechada')}</b><small>${end?`até ${end} • `:''}${esc(a.services?.name||'Bloqueio interno')}</small></div><span class="statusBadge blocked">Bloqueio</span></div><div class="quickActions"><button class="danger" onclick="cancelAppt('${a.id}')">Reabrir/cancelar</button></div></div></div>`;
  }
  return `${gapHtml(prev,a)}<details class="timelineItem apptItem ${cls}" data-search="${esc(searchText)}"><summary><div class="timeRail"><strong>${esc(a.time||'')}</strong><i></i></div><div class="timelineCard"><div class="timelineMain"><div><b>${a.status==='encaixe'?'⚡ Cliente encaixe • ':''}${esc(a.client_name)}</b><small>${esc(a.services?.name||'Serviço')} • ${Number(a.services?.duration||30)} min</small><small>${esc(barberName(a.barber_id))}</small></div><span class="statusBadge ${cls}">${statusLabel(a.status)}</span></div><div class="timelineMeta"><span>${end?`até ${end}`:''}</span><span>${money(a.services?.price)}</span></div></div></summary><div class="timelineExpand"><p><b>WhatsApp:</b> ${esc(a.client_phone||'Não informado')}</p>${whatsappQuickButtons(a)}<div class="quickActions"><button onclick="editAppt('${a.id}')">Editar</button>${paymentActionButtons(a)}<button class="danger" onclick="cancelAppt('${a.id}')">Cancelar</button></div></div></details>`;
}
function groupedSearchText(items){
  return items.map(a=>[a.client_name,a.client_phone,barberName(a.barber_id),a.services?.name,a.date,a.time,a.status].filter(Boolean).join(' ')).join(' ').toLowerCase();
}
function groupEndMinutes(items){
  return Math.max(...items.map(a=>minutes(a.time)+Number(a.services?.duration||30)));
}
function groupGapHtml(prevGroup, currentGroup){
  if(!prevGroup?.length || !currentGroup?.length) return '';
  const gap = minutes(currentGroup[0].time) - groupEndMinutes(prevGroup);
  if(gap < 30) return '';
  const h=Math.floor(gap/60), m=gap%60;
  const label=h ? `${h}h${m?String(m).padStart(2,'0'):''} livres` : `${gap} min livres`;
  return `<div class="timelineGap groupedGap"><span>Janela livre · ${label}</span></div>`;
}
function appointmentMiniCard(a){
  const cls=statusClass(a.status,a);
  const end=a.time?hhmm(minutes(a.time)+Number(a.services?.duration||30)):'';
  const isBlock=isClosureAppt(a);
  const title=isBlock ? (a.client_name||'Agenda fechada') : `${a.status==='encaixe'?'⚡ Cliente encaixe • ':''}${a.client_name||'Cliente'}`;
  const subtitle=isBlock ? `${end?`até ${end} • `:''}${a.services?.name||'Bloqueio interno'}` : `${a.services?.name||'Serviço'} • ${Number(a.services?.duration||30)} min • até ${end}`;
  const dragAttrs = isBlock ? '' : ` draggable="true" ondragstart="agendaDragStart(event,'${a.id}')"`;
  return `<details class="groupedApptCard apptItem ${isBlock?'blocked':cls}" data-search="${esc(groupedSearchText([a]))}"${dragAttrs}><summary><div class="groupedApptMain"><div><b>${esc(title)}</b><small>${esc(subtitle)}</small><small>💈 ${esc(barberName(a.barber_id))}${a.client_phone?` • ${esc(a.client_phone)}`:''}</small></div><span class="statusBadge ${isBlock?'blocked':cls}">${isBlock?'Bloqueio':statusLabel(a.status)}</span></div><div class="timelineMeta"><span>${money(a.services?.price)}</span></div></summary><div class="timelineExpand groupedExpand"><p><b>WhatsApp:</b> ${esc(a.client_phone||'Não informado')}</p>${isBlock?'':whatsappQuickButtons(a)}<div class="quickActions">${isBlock?'':`<button onclick="quickReschedule('${a.id}')">Remarcar</button><button onclick="editAppt('${a.id}')">Editar</button>${paymentActionButtons(a)}`}<button class="danger" onclick="cancelAppt('${a.id}')">${isBlock?'Reabrir/cancelar':'Cancelar'}</button></div></div></details>`;
}
function timeGroupCard(items,prevGroup){
  const time=items[0]?.time || '';
  const searchText=groupedSearchText(items);
  const barberCount=new Set(items.map(a=>a.barber_id)).size;
  const customerCount=items.filter(a=>!isClosureAppt(a)).length;
  return `${groupGapHtml(prevGroup,items)}<div class="timelineTimeGroup apptItem" data-search="${esc(searchText)}"><div class="timeRail groupTimeRail"><strong>${esc(time)}</strong><i></i></div><div class="timeGroupBody"><div class="timeGroupHeader"><div><b>${items.length>1?'Mesmo horário':'Horário'}</b><small>${customerCount} cliente(s) • ${barberCount} barbeiro(s)</small></div><span>${items.map(a=>esc(barberName(a.barber_id))).join(' · ')}</span></div><div class="groupedAppts">${items.map(appointmentMiniCard).join('')}</div></div></div>`;
}
function renderTimelineGroup(title,items){
  if(!items.length) return '';
  const byTime={};
  items.forEach(a=>{ const key=a.time||'Sem horário'; (byTime[key]||(byTime[key]=[])).push(a); });
  const timeGroups=Object.keys(byTime).sort().map(k=>byTime[k].sort((a,b)=>barberName(a.barber_id).localeCompare(barberName(b.barber_id))));
  let html=`<div class="periodTitle">${title}</div>`;
  timeGroups.forEach((group,i)=> html += timeGroupCard(group, timeGroups[i-1]));
  return html;
}
function timelineAgenda(date){
  const arr=agendaDayAppts(date);
  if(!arr.length) return `<div class="agendaEmpty"><h3>Sem agendamentos neste dia</h3><p>Use o formulário acima para adicionar um horário ou navegue para outro dia.</p></div>`;
  const past=date===todayISO()?arr.filter(a=>isPastAgendaItem(a,date)):[];
  const focus=date===todayISO()?arr.filter(a=>!isPastAgendaItem(a,date)):arr;
  let html='';
  if(past.length){
    html += `<details class="pastCollapsed"><summary>✓ Atendimentos passados hoje (${past.length})</summary><div>${past.map(compactPastRow).join('')}</div></details><div class="nowDivider"><span>AGORA</span></div>`;
  }
  const groups={}; focus.forEach(a=>{ const p=periodOfTime(a.time); (groups[p]||(groups[p]=[])).push(a); });
  ['☀️ Manhã','🌤️ Tarde','🌙 Noite'].forEach(period=>{ html += renderTimelineGroup(period, groups[period]||[]); });
  if(!focus.length) html += `<div class="agendaEmpty smallEmpty"><h3>Nenhum próximo atendimento</h3><p>Os horários restantes do dia estão livres.</p></div>`;
  return `<div class="timeline cleanTimeline groupedTimeline">${html}</div>`;
}
function lateNextRow(a){
  return `<div class="lateNextRow"><div><span>Passou sem confirmação</span><b>${esc(a.time||'')} • ${esc(a.client_name||'Cliente')}</b><small>${esc(a.services?.name||'Serviço')} • ${timeUntilText(a)}</small></div><div class="lateNextActions"><a target="_blank" href="${whatsappActionLink(a,'confirm')}"><button class="whats">Confirmar</button></a><button class="primary" onclick="finishAppt('${a.id}')">Concluir</button><button class="danger" onclick="setStatus('${a.id}','faltou')">Faltou</button></div></div>`;
}
function nextClientCard(date){
  const a=nextClientFor(date);
  const late=overdueUnconfirmedAppts(date);
  const lateHtml = late.length ? `<div class="lateNextStack"><div class="lateNextTitle">⚠️ Aguardando ação (${late.length})</div>${late.map(lateNextRow).join('')}</div>` : '';
  const main = !a
    ? `<div class="nextClient emptyNext"><span>Próximo cliente</span><h3>Nenhum cliente agendado</h3><p class="muted">Dia livre até agora.</p></div>`
    : `<div class="nextClient"><div><span>Próximo cliente</span><h3>${esc(a.time||'')} • ${a.status==='encaixe'?'⚡ Cliente encaixe • ':''}${esc(a.client_name)}</h3><p>${esc(a.services?.name||'Serviço')} • ${Number(a.services?.duration||30)} min • ${timeUntilText(a)}</p></div><div class="nextActions"><a target="_blank" href="${whatsappActionLink(a,'confirm')}"><button class="whats">Confirmar WhatsApp</button></a><button class="primary" onclick="finishAppt('${a.id}')">Concluir</button></div></div>`;
  return `<div class="nextClientPanel">${main}${lateHtml}</div>`;
}

function agendaKpis(date){
  const arr=clientDayAppts(date);
  const revenue=arr.filter(a=>['agendado','encaixe','em_andamento','concluido'].includes(a.status)).reduce((sum,a)=>sum+Number(a.services?.price||0),0);
  const fit=arr.filter(a=>a.status==='encaixe').length;
  const late=overdueUnconfirmedAppts(date).length;
  const busy=arr.reduce((sum,a)=>sum+Number(a.services?.duration||30),0);
  return `<div class="agendaKpiGrid"><div class="agendaKpi"><span>Clientes no dia</span><b>${arr.length}</b><small>${fit} encaixe(s)</small></div><div class="agendaKpi"><span>Previsão do dia</span><b>${money(revenue)}</b><small>Agendado + concluído</small></div><div class="agendaKpi"><span>Tempo vendido</span><b>${Math.floor(busy/60)}h${String(busy%60).padStart(2,'0')}</b><small>Somando serviços</small></div><div class="agendaKpi warning"><span>Aguardando ação</span><b>${late}</b><small>Passou 15 min sem confirmar</small></div></div>`;
}
function barberLoadForDay(barberId,date){
  const b=barberById(barberId);
  const total=Math.max(0, minutes(workEnd(b,date)||CLOSE)-minutes(workStart(b,date)||OPEN));
  const used=agendaDayAppts(date).filter(a=>a.barber_id===barberId && !isClosureAppt(a)).reduce((sum,a)=>sum+Number(a.services?.duration||30),0);
  return total?Math.min(100,Math.round((used/total)*100)):0;
}
function barberBoard(date){
  const barbers=cache.shopBarbers.length?cache.shopBarbers:[me];
  const html=barbers.map(b=>{
    const items=agendaDayAppts(date).filter(a=>a.barber_id===b.id && !isClosureAppt(a));
    const load=barberLoadForDay(b.id,date);
    const cards=items.length ? items.map(a=>`<div class="barberBoardAppt apptItem ${statusClass(a.status,a)}" data-search="${esc(groupedSearchText([a]))}" draggable="true" ondragstart="agendaDragStart(event,'${a.id}')"><b>${esc(a.time||'')} • ${esc(a.client_name||'Cliente')}</b><small>${esc(a.services?.name||'Serviço')} • ${Number(a.services?.duration||30)} min</small><small>${statusLabel(a.status)} • ${money(a.services?.price)}</small><div class="boardActions"><button onclick="quickReschedule('${a.id}')">Remarcar</button><button onclick="editAppt('${a.id}')">Editar</button>${a.status==='concluido'?`<button class="gold" onclick="editPayment('${a.id}')">Editar pagamento</button>`:''}</div></div>`).join('') : '<div class="barberBoardEmpty">Sem clientes neste dia</div>';
    return `<div class="barberBoardCol"><div class="barberBoardHead"><div><b>${esc(b.name||'Barbeiro')}</b><small>${items.length} cliente(s) • ${load}% ocupado</small></div><i><em style="width:${load}%"></em></i></div>${cards}${freeSlotsMini(b.id,date)}</div>`;
  }).join('');
  return `<details class="card barberBoardPanel"><summary><div><h3>Visão por barbeiro</h3><p class="muted">Arraste um cliente para um horário livre ou use Remarcar para trocar horário/barbeiro com segurança.</p></div><span>abrir/fechar</span></summary><div class="barberBoardGrid">${html}</div></details>`;
}
function freeSlotsMini(barberId,date){
  const b=barberById(barberId);
  if(isDayOff(b,date)) return '<div class="boardDrop muted">Barbeiro de folga</div>';
  const slots=[];
  for(let m=minutes(workStart(b,date)); m<minutes(workEnd(b,date)); m+=STEP){
    const t=hhmm(m);
    const past=isPastDateTime(date,t);
    const interval=isBreakConflict(b,t,STEP,date);
    const occupied=hasLocalConflict(barberId,date,t,STEP);
    if(!past && !interval && !occupied) slots.push(t);
  }
  return `<div class="boardFreeSlots"><small>Horários livres rápidos</small>${slots.slice(0,10).map(t=>`<button class="boardDrop" ondragover="agendaAllowDrop(event)" ondrop="agendaDropMove(event,'${barberId}','${date}','${t}')" onclick="fillManualFromBoard('${barberId}','${date}','${t}')">${t}</button>`).join('')}${slots.length>10?`<em>+${slots.length-10} horários</em>`:''}</div>`;
}
window.fillManualFromBoard = (barberId,date,time) => {
  agendaDate=date;
  const abEl=document.getElementById('ab'), dtEl=document.getElementById('dt');
  if(abEl) abEl.value=barberId;
  if(dtEl) dtEl.value=date;
  updateManualServices();
  const tmEl=document.getElementById('tm');
  if(tmEl) tmEl.value=time;
  document.getElementById('cn')?.focus();
  toast(`Horário ${time} selecionado para novo agendamento.`);
};
window.agendaDragStart = (ev,id) => {
  ev.dataTransfer.setData('text/plain',id);
  ev.dataTransfer.effectAllowed='move';
};
window.agendaAllowDrop = (ev) => { ev.preventDefault(); ev.currentTarget.classList.add('dragHover'); };
window.agendaDropMove = async (ev,barberId,date,time) => {
  ev.preventDefault();
  ev.currentTarget.classList.remove('dragHover');
  const id=ev.dataTransfer.getData('text/plain');
  if(!id) return;
  const a=cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Agendamento não encontrado.');
  if(await hasConflict(barberId,date,time,a.service_id,id)) return toast('Não foi possível mover: horário indisponível.');
  const {error}=await db.from('appointments').update({barber_id:barberId,date,time}).eq('id',id);
  if(error) return toast(error.message);
  toast(`Agendamento movido para ${barberName(barberId)} às ${time}.`);
  renderApp();
};
function quickSlotsForAppt(a,barberId,date){
  const dur=Number(a.services?.duration || serviceById(a.service_id)?.duration || 30);
  const b=barberById(barberId);
  if(isDayOff(b,date)) return '<option value="">Barbeiro de folga neste dia</option>';
  let out='';
  for(let m=minutes(workStart(b,date)); m+dur<=minutes(workEnd(b,date)); m+=STEP){
    const t=hhmm(m);
    const reason=(t!==a.time && isPastDateTime(date,t))?'passado':hasLocalConflict(barberId,date,t,dur,a.id)?'ocupado':isBreakConflict(b,t,dur,date)?'intervalo':'';
    out += `<option value="${t}" ${t===a.time?'selected':''} ${reason?'disabled':''}>${t}${reason?' — '+reason:''}</option>`;
  }
  return out || '<option value="">Sem horários</option>';
}
window.quickReschedule = id => {
  const a=cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Agendamento não encontrado.');
  document.body.insertAdjacentHTML('beforeend',`<div class="modalBack" id="modal"><div class="modal"><h2>Remarcar rápido</h2><p class="muted">Troque horário, dia ou barbeiro sem refazer o cadastro do cliente.</p><div class="form"><input value="${esc(a.client_name||'')}" disabled><select id="qrBarber" onchange="qrSlots('${id}')">${barberOptions(a.barber_id)}</select><input id="qrDate" type="date" value="${a.date}" onchange="qrSlots('${id}')"><select id="qrTime">${quickSlotsForAppt(a,a.barber_id,a.date)}</select><div class="row"><button class="primary" onclick="saveQuickReschedule('${id}')">Salvar remarcação</button><button onclick="modal.remove()">Cancelar</button></div></div></div></div>`);
};
window.qrSlots = id => {
  const a=cache.appointments.find(x=>x.id===id); if(!a) return;
  qrTime.innerHTML=quickSlotsForAppt(a,qrBarber.value,qrDate.value||todayISO());
};
window.saveQuickReschedule = async id => {
  const a=cache.appointments.find(x=>x.id===id); if(!a) return toast('Agendamento não encontrado.');
  if(!qrBarber.value || !qrDate.value || !qrTime.value) return toast('Escolha barbeiro, data e horário.');
  if(await hasConflict(qrBarber.value,qrDate.value,qrTime.value,a.service_id,id)) return toast('Esse horário sobrepõe outro agendamento.');
  const {error}=await db.from('appointments').update({barber_id:qrBarber.value,date:qrDate.value,time:qrTime.value}).eq('id',id);
  if(error) return toast(error.message);
  const m=document.getElementById('modal'); if(m)m.remove();
  agendaDate=qrDate.value;
  toast('Agendamento remarcado.');
  renderApp();
};
// Preserva o formulário de agendamento interno durante atualizações da agenda.
function agendaDraftKey(){
  const shop = (typeof sameShopName==='function' && sameShopName()) || me?.shop_name || me?.login || 'zenbarber';
  return 'zenbarber_agenda_draft_' + String(shop).toLowerCase().replace(/[^a-z0-9_-]+/g,'_');
}
function readAgendaDraft(){
  try{ return JSON.parse(sessionStorage.getItem(agendaDraftKey()) || 'null'); }catch(e){ return null; }
}
function captureAgendaDraft(){
  if(typeof page==='undefined' || page!=='appointments') return;
  const ids=['cn','cp','ab','sv','dt','tm'];
  const data={};
  let found=false;
  ids.forEach(id=>{ const el=document.getElementById(id); if(el){ data[id]=el.value; found=true; } });
  if(!found) return;
  data.dirty = !!(data.cn || data.cp || window.__zenAgendaDraftDirty);
  data.savedAt = Date.now();
  sessionStorage.setItem(agendaDraftKey(), JSON.stringify(data));
}
function markAgendaDraftDirty(){
  window.__zenAgendaDraftDirty=true;
  captureAgendaDraft();
}
function clearAgendaDraft(){
  window.__zenAgendaDraftDirty=false;
  sessionStorage.removeItem(agendaDraftKey());
}
function restoreAgendaDraft(){
  if(typeof page==='undefined' || page!=='appointments') return;
  const d=readAgendaDraft();
  if(!d) return;
  const set=(id,val)=>{ const el=document.getElementById(id); if(el && val!==undefined && val!==null) el.value=val; };
  set('cn',d.cn); set('cp',d.cp); set('ab',d.ab);
  if(document.getElementById('ab')) updateManualServices();
  set('sv',d.sv); set('dt',d.dt);
  if(document.getElementById('dt')) updateManualSlots();
  set('tm',d.tm);
  window.__zenAgendaDraftDirty=!!d.dirty;
}
function agendaFormIsBeingEdited(){
  if(typeof page==='undefined' || page!=='appointments') return false;
  const active=document.activeElement;
  const inForm=active && ['cn','cp','ab','sv','dt','tm'].includes(active.id);
  const d=readAgendaDraft();
  return !!(inForm || window.__zenAgendaDraftDirty || d?.dirty);
}
window.captureAgendaDraft=captureAgendaDraft;
window.restoreAgendaDraft=restoreAgendaDraft;
window.markAgendaDraftDirty=markAgendaDraftDirty;
window.clearAgendaDraft=clearAgendaDraft;
window.agendaFormIsBeingEdited=agendaFormIsBeingEdited;

function appointments(){
  if(!agendaDate) agendaDate=todayISO();
  const bid = cache.shopBarbers[0]?.id || me.id; const sid = publicServicesForBarber(bid)[0]?.id || "";
  const activeAppts = cache.appointments.filter(a=>['agendado','encaixe','em_andamento'].includes(a.status));
  const todayCount = activeAppts.filter(a=>a.date===todayISO()).length;
  const pastSettleCount = agendaDayAppts(agendaDate).filter(a=>isPastAgendaItem(a,agendaDate) && ['agendado','encaixe','em_andamento'].includes(a.status) && !isClosureAppt(a) && !isInternalSubscriptionService(a.services||{})).length;
  const pastSettleBanner = pastSettleCount ? `<div class="card agendaSettleBanner"><div><h3>🧾 Dar baixa nos atendimentos passados</h3><p class="muted">${pastSettleCount} horário(s) desta data já passaram e ainda estão sem pagamento/falta confirmado. Abra "Atendimentos passados" na timeline para dar baixa, enviar para carteira ou marcar falta.</p></div><button class="primary" onclick="document.querySelector('.pastCollapsed')?.setAttribute('open','open');document.querySelector('.pastCollapsed')?.scrollIntoView({behavior:'smooth',block:'center'});">Abrir na timeline</button></div>` : '';
  const occ=dayOccupation(agendaDate);
  const headerDate = `${agendaDate===todayISO()?'Hoje • ':''}${DAY_NAMES[dayIndex(agendaDate)]} • ${formatDateFullBR(agendaDate)}`;
  return `<section class="agendaPremiumHeader"><div><span>Agenda premium</span><h2>${headerDate}</h2><p>Ocupação do dia: <b>${occ}%</b></p></div><div class="occupation"><i style="width:${occ}%"></i></div></section>
  <div class="miniCalendar">${agendaCalendarDays()}</div>
  ${agendaKpis(agendaDate)}
  ${nextClientCard(agendaDate)}
  ${barberBoard(agendaDate)}
  <div class="card"><h3>Novo agendamento interno</h3><div class="grid"><input id="cn" placeholder="Nome do cliente" oninput="markAgendaDraftDirty()"><input id="cp" placeholder="Telefone" oninput="markAgendaDraftDirty()"><select id="ab" onchange="markAgendaDraftDirty();updateManualServices()">${barberOptions(bid)}</select><select id="sv" onchange="markAgendaDraftDirty();updateManualSlots()">${serviceOptions(bid,sid)}</select><input id="dt" type="date" value="${agendaDate}" onchange="markAgendaDraftDirty();agendaDate=this.value||agendaDate;updateManualSlots();captureAgendaDraft()"><select id="tm" onchange="markAgendaDraftDirty()">${slotOptionsManual(bid,agendaDate,sid)}</select><button class="primary" onclick="addAppt()">Agendar</button><button class="gold" onclick="addFitIn()">Encaixe</button></div></div>
  ${pastSettleBanner}
  <div class="card agendaTimelineCard"><div class="agendaHeader"><div><h3>Timeline da barbearia</h3><p class="muted">Pesquise por nome, WhatsApp, barbeiro, serviço, data ou horário.</p></div><button class="dailyReminderBtn" onclick="dailyReminder()">🔔 Lembrete diário <span>${todayCount}</span></button></div><input id="apptSearch" class="searchInput" placeholder="Pesquisar agendamento. Ex: Eduardo" oninput="filterAppointments()">${timelineAgenda(agendaDate)}</div>`;
}
window.setAgendaDate = (date) => { agendaDate=date; renderApp(); };

function dailyReminderMessage(a){
  const service = a.services?.name || 'seu serviço';
  const barber = barberName(a.barber_id);
  return `Olá ${a.client_name}, tudo bem? 😊\n\nPassando para lembrar e confirmar seu agendamento de hoje na ${sameShopName()}.\n\n📅 Data: ${formatDateFullBR(a.date)}\n⏰ Horário: ${a.time}\n✂️ Serviço: ${service}\n💈 Barbeiro: ${barber}\n\nPodemos confirmar sua presença?`;
}
window.dailyReminder = () => {
  const today = todayISO();
  const arr = cache.appointments
    .filter(a=>['agendado','encaixe','em_andamento'].includes(a.status) && a.date===today)
    .sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  if(!arr.length) return toast('Nenhum agendamento para hoje.');
  const withPhone = arr.filter(a=>(a.client_phone||'').replace(/\D/g,''));
  const links = withPhone.map(a=>wa(a.client_phone,dailyReminderMessage(a)));
  document.body.insertAdjacentHTML('beforeend',`<div class="modalBack" id="modal"><div class="modal dailyReminderModal"><h2>🔔 Lembrete diário</h2><p class="muted">Clientes agendados para hoje (${formatDateFullBR(today)}). Clique em cada WhatsApp ou use Abrir todos para enviar as confirmações.</p><div class="dailyReminderList">${arr.map(a=>`<div class="dailyReminderItem"><div><strong>${esc(a.client_name)} • ${esc(a.time||'')}</strong><small>${esc(a.services?.name||'Serviço')} • ${esc(barberName(a.barber_id))} • ${esc(a.client_phone||'Sem telefone')}</small></div>${(a.client_phone||'').replace(/\D/g,'') ? `<a target="_blank" href="${wa(a.client_phone,dailyReminderMessage(a))}"><button class="whats">WhatsApp</button></a>` : `<button disabled>Sem WhatsApp</button>`}</div>`).join('')}</div><div class="row"><button class="dailyReminderBtn" onclick="openAllDailyReminders()">Abrir todos (${links.length})</button><button onclick="modal.remove()">Fechar</button></div></div></div>`);
  window.__dailyReminderLinks = links;
};
window.openAllDailyReminders = () => {
  const links = window.__dailyReminderLinks || [];
  if(!links.length) return toast('Nenhum WhatsApp válido para abrir.');
  links.forEach((url,i)=>setTimeout(()=>window.open(url,'_blank'), i*650));
  toast('Abrindo WhatsApps dos clientes de hoje.');
};

window.updateManualServices = () => { sv.innerHTML = serviceOptions(ab.value); updateManualSlots(); };
window.updateManualSlots = () => { if(!dt.value) dt.value=todayISO(); tm.innerHTML = slotOptionsManual(ab.value,dt.value,sv.value); };
window.addAppt = async () => {
  if(!cn.value || !sv.value || !dt.value || !tm.value) return toast("Preencha os dados");
  if(await hasConflict(ab.value,dt.value,tm.value,sv.value)) return toast("Esse horário sobrepõe outro agendamento. Escolha outro horário.");
  const {error}=await db.from("appointments").insert(shopScopedPayload({barber_id:ab.value,service_id:sv.value,client_name:cn.value,client_phone:cp.value,date:dt.value,time:tm.value,status:"agendado"}));
  if(error) toast(error.message); else { clearAgendaDraft(); renderApp(); }
};
window.addFitIn = async () => {
  if(!cn.value || !sv.value || !dt.value || !tm.value) return toast("Preencha os dados");
  if(isPastDateTime(dt.value,tm.value)) return toast("Não permite encaixe no passado");
  const {error}=await db.from("appointments").insert(shopScopedPayload({barber_id:ab.value,service_id:sv.value,client_name:cn.value.trim(),client_phone:cp.value.trim(),date:dt.value,time:tm.value,status:"encaixe"}));
  if(error) toast(error.message); else { clearAgendaDraft(); toast("Encaixe agendado e identificado na agenda."); renderApp(); }
};
function barberName(id){ return cache.shopBarbers.find(b=>b.id===id)?.name || "Barbeiro"; }
function listAppts(arr){
  return arr.map(a=>{
    const searchText = [a.client_name, a.client_phone, barberName(a.barber_id), a.services?.name, a.date, a.time, a.status].filter(Boolean).join(' ').toLowerCase();
    return `<div class="item apptItem" data-search="${esc(searchText)}"><div><strong>${esc(a.client_name)} • ${esc(barberName(a.barber_id))}</strong><small>${apptWhenHtml(a)} • ${esc(a.services?.name||'Serviço')} • ${money(a.services?.price)} • ${esc(a.status)}</small><br><small>${esc(a.client_phone||'')}</small></div><div class="row"><a target="_blank" href="${wa(a.client_phone,`Olá ${a.client_name}, passando sobre seu agendamento na ${sameShopName()} em ${formatDateFullBR(a.date)} às ${a.time}.`)}"><button class="whats">WhatsApp</button></a><button onclick="editAppt('${a.id}')">Editar</button>${paymentActionButtons(a)}<button class="danger" onclick="cancelAppt('${a.id}')">Cancelar</button></div></div>`;
  }).join("") || '<div class="empty">Nada por aqui.</div>';
}
window.filterAppointments = () => {
  const q = (document.getElementById('apptSearch')?.value || '').trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll('.apptItem').forEach(el=>{
    const match = !q || (el.dataset.search || '').includes(q);
    el.style.display = match ? '' : 'none';
    if(match) visible++;
  });
  let empty = document.getElementById('apptSearchEmpty');
  const card = document.getElementById('apptSearch')?.closest('.card');
  if(card){
    if(!empty){
      empty = document.createElement('div');
      empty.id = 'apptSearchEmpty';
      empty.className = 'empty';
      empty.textContent = 'Nenhum agendamento encontrado para essa pesquisa.';
      empty.style.display = 'none';
      card.appendChild(empty);
    }
    empty.style.display = q && visible === 0 ? '' : 'none';
  }
};
window.editAppt = id => {
  const a=cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Agendamento não encontrado');
  const bid=a.barber_id || cache.shopBarbers[0]?.id || me.id;
  const sid=a.service_id || servicesForBarber(bid)[0]?.id || '';
  document.body.insertAdjacentHTML('beforeend',`<div class="modalBack" id="modal"><div class="modal"><h2>Editar agendamento</h2><p class="muted">Altere nome, telefone, barbeiro, serviço, data ou horário sem cancelar e refazer do zero.</p><div class="form"><input id="ecn" value="${esc(a.client_name||'')}" placeholder="Nome do cliente"><input id="ecp" value="${esc(a.client_phone||'')}" placeholder="Telefone"><select id="eab" onchange="updateEditServices('${id}')">${barberOptions(bid)}</select><select id="esv" onchange="updateEditSlots('${id}')">${serviceOptions(bid,sid)}</select><input id="edt" type="date" min="${todayISO()}" value="${esc(a.date||todayISO())}" onchange="updateEditSlots('${id}')"><select id="etm">${slotOptionsEdit(bid,a.date||todayISO(),sid,a.time,id)}</select><label class="switchLine"><input id="applyFutureFixed" type="checkbox"><span class="switchVisual"></span><b>Aplicar também aos próximos horários deste cliente fixo</b></label><small class="muted">Use para cliente fixo/assinatura: nome, WhatsApp, barbeiro, serviço e horário serão replicados nos próximos agendamentos do mesmo cliente. Datas passadas e concluídas não mudam.</small><div class="row"><button class="primary" onclick="saveEditAppt('${id}')">Salvar alterações</button><button onclick="modal.remove()">Cancelar</button></div></div></div></div>`);
};
window.updateEditServices = id => { esv.innerHTML = serviceOptions(eab.value); updateEditSlots(id); };
window.updateEditSlots = id => { if(!edt.value) edt.value=todayISO(); etm.innerHTML = slotOptionsEdit(eab.value,edt.value,esv.value,etm.value,id); };
window.saveEditAppt = async id => {
  const original=cache.appointments.find(x=>x.id===id);
  if(!original) return toast('Agendamento não encontrado');
  if(!ecn.value || !esv.value || !edt.value || !etm.value) return toast('Preencha os dados');
  if(await hasConflict(eab.value,edt.value,etm.value,esv.value,id)) return toast('Esse horário sobrepõe outro agendamento. Escolha outro horário.');
  const payload={barber_id:eab.value,service_id:esv.value,client_name:ecn.value.trim(),client_phone:ecp.value.trim(),date:edt.value,time:etm.value};
  const applyFuture=!!document.getElementById('applyFutureFixed')?.checked;
  if(applyFuture){
    const keyPhone=String(original.client_phone||'').replace(/\D/g,'');
    const keyName=String(original.client_name||'').trim().toLowerCase();
    const group=cache.appointments.filter(a=>a.id!==id && a.status==='agendado' && a.date>=original.date && !isClosureAppt(a) && ((keyPhone && String(a.client_phone||'').replace(/\D/g,'')===keyPhone) || (!keyPhone && String(a.client_name||'').trim().toLowerCase()===keyName)));
    for(const a of group){
      if(await hasConflict(eab.value,a.date,etm.value,esv.value,a.id)) return toast(`Conflito em ${formatDateFullBR(a.date)}. Ajuste o horário antes de aplicar em todos.`);
    }
    const ids=[id,...group.map(a=>a.id)];
    const futurePayload={barber_id:eab.value,service_id:esv.value,client_name:ecn.value.trim(),client_phone:ecp.value.trim(),time:etm.value};
    const {error}=await db.from('appointments').update(futurePayload).in('id',ids);
    if(error) return toast(error.message);
    // A data editada só muda no horário atual; os demais mantêm suas datas recorrentes.
    if(edt.value !== original.date){
      const {error:dateErr}=await db.from('appointments').update({date:edt.value}).eq('id',id);
      if(dateErr) return toast(dateErr.message);
    }
    const m=document.getElementById('modal'); if(m)m.remove();
    toast(`Agendamento atualizado e aplicado a ${ids.length} horário(s) futuro(s).`);
    renderApp();
    return;
  }
  const {error}=await db.from('appointments').update(payload).eq('id',id);
  if(error) return toast(error.message);
  const m=document.getElementById('modal'); if(m)m.remove();
  toast('Agendamento atualizado.');
  renderApp();
};
window.setStatus = async (id,status) => { await db.from("appointments").update({status}).eq("id",id); renderApp(); };
function normPhone(v){ return String(v||'').replace(/\D/g,''); }
function normName(v){ return String(v||'').trim().toLowerCase(); }
function isSubscriptionServiceName(a){ return String(a?.services?.name||'').toLowerCase().includes('assinatura'); }
function sameFixedClient(a,b){
  const ca = subscriptionCodeFrom(a), cb = subscriptionCodeFrom(b);
  if(ca || cb) return ca && cb && ca===cb;
  const pa=normPhone(a?.client_phone), pb=normPhone(b?.client_phone);
  if(pa && pb) return pa===pb;
  return normName(a?.client_name) && normName(a?.client_name)===normName(b?.client_name);
}
function subscriptionBaseName(v){
  return normName(stripSubscriptionCode(String(v||'').replace(/^parcela\s+\d+\/\d+\s+assinatura\s*/i,'').replace(/^recebimento(\s+final)?\s+assinatura\s*/i,'').replace(/^[-\s]+/,'')));
}
function linkedWalletChargesFor(base, group){
  const phone=normPhone(base?.client_phone);
  const baseName=subscriptionBaseName(base?.client_name);
  const baseCode=subscriptionCodeFrom(base);
  return cache.appointments.filter(a=>{
    // Ao cancelar uma assinatura/cliente fixo, cancela também as cobranças pendentes
    // da mesma assinatura na carteira. Não mexe em recebidos, concluídos ou bonificados.
    if(a.status!=='em_carteira') return false;
    if(base?.barber_id && a.barber_id && a.barber_id!==base.barber_id) return false;
    const serviceName=String(a.services?.name||'').toLowerCase();
    const code=subscriptionCodeFrom(a);
    if(baseCode) return code===baseCode;
    if(code) return false;
    const clientName=subscriptionBaseName(a.client_name);
    const samePhone=phone && normPhone(a.client_phone)===phone;
    const sameName=baseName && (clientName===baseName || clientName.includes(baseName) || baseName.includes(clientName));
    const looksLikeSubscription = serviceName.includes('assinatura') || serviceName.includes('parcela') || normName(a.client_name).includes('assinatura') || normName(a.client_name).includes('parcela');
    return looksLikeSubscription && (samePhone || sameName);
  });
}
window.cancelAppt = async id => {
  const base=cache.appointments.find(a=>a.id===id);
  if(!base){ await db.from("appointments").update({status:"cancelado"}).eq("id",id); renderApp(); return; }
  const futureGroup=cache.appointments.filter(a=>a.status==='agendado' && a.id!==id && a.date>=todayISO() && !isClosureAppt(a) && sameFixedClient(base,a) && a.barber_id===base.barber_id);
  const isFixed = isSubscriptionServiceName(base) || futureGroup.length>0;
  if(isFixed){
    const totalFuture=1+futureGroup.length;
    const wallet=linkedWalletChargesFor(base,[base,...futureGroup]);
    const msg=`Cancelar este cliente fixo/pacote?\n\nIsso vai cancelar ${totalFuture} horário(s) futuro(s) e remover ${wallet.length} cobrança(s) futura(s) de Clientes em carteira. Serviços já concluídos/recebidos não serão alterados.`;
    if(confirm(msg)) return cancelFixedClientPackage(id);
    return;
  }
  await db.from("appointments").update({status:"cancelado"}).eq("id",id);
  renderApp();
};
window.cancelFixedClientPackage = async id => {
  const base=cache.appointments.find(a=>a.id===id);
  if(!base) return toast('Agendamento não encontrado');
  const fixedIds=cache.appointments
    .filter(a=>a.status==='agendado' && a.date>=todayISO() && !isClosureAppt(a) && sameFixedClient(base,a) && a.barber_id===base.barber_id)
    .map(a=>a.id);
  if(!fixedIds.includes(id)) fixedIds.push(id);
  const walletIds=linkedWalletChargesFor(base, cache.appointments.filter(a=>fixedIds.includes(a.id))).map(a=>a.id);
  if(fixedIds.length){
    const {error}=await db.from('appointments').update({status:'cancelado'}).in('id',fixedIds);
    if(error) return toast(error.message);
  }
  if(walletIds.length){
    const {error}=await db.from('appointments').update({status:'cancelado'}).in('id',walletIds);
    if(error) return toast(error.message);
  }
  toast(`Pacote cancelado: ${fixedIds.length} horário(s) futuro(s) e ${walletIds.length} cobrança(s) removida(s) da carteira.`);
  renderApp();
};
window.finishAppt = id => { document.body.insertAdjacentHTML("beforeend",`<div class="modalBack" id="modal"><div class="modal"><h2>Como foi o pagamento?</h2><p class="muted">Se ficou devendo, mande para clientes em carteira e defina lembrete. Se o valor mudou, use Valor a receber para diminuir ou aumentar o total cobrado.</p><div class="form"><button class="primary" onclick="markPaid('${id}')">Recebido agora</button><button class="gold" onclick="receiveWithDiscount('${id}')">Valor a receber</button><select id="rd"><option value="15">Lembrar em 15 dias</option><option value="30">Lembrar em 30 dias</option><option value="45">Lembrar em 45 dias</option></select><button class="gold" onclick="markWallet('${id}')">Enviar para carteira</button><button onclick="modal.remove()">Voltar</button></div></div></div>`); };
window.markPaid = async id => { await db.from("appointments").update({status:"concluido"}).eq("id",id); const m=document.getElementById("modal"); if(m)m.remove(); renderApp(); };
window.receiveWithDiscount = async id => {
  const a = cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Atendimento/cobrança não encontrado.');
  const original = appointmentPrice(a);
  if(original<=0) return toast('Não encontrei o valor original deste lançamento. Abra Serviços e confira se o serviço ainda existe ou use Corrigir valor na carteira.');
  const typed = prompt(`Valor original: ${money(original)}\nInforme o VALOR A RECEBER final.\n\nExemplos:\n- Cliente ganhou desconto: digite 40\n- Cliente levou produto extra: digite 50`, String(original).replace('.',','));
  if(typed===null) return;
  const finalValue = Number(String(typed).replace('R$','').replace(/\s/g,'').replace(',','.'));
  if(isNaN(finalValue) || finalValue<0) return toast('Valor a receber inválido.');
  const difference = finalValue - original;
  const movementLabel = difference===0 ? 'sem alteração' : (difference<0 ? `desconto de ${money(Math.abs(difference))}` : `acréscimo de ${money(difference)}`);
  if(!confirm(`Confirmar valor a receber?\n\nValor original: ${money(original)}\nValor final: ${money(finalValue)}\nDiferença: ${movementLabel}\n\nÉ este valor final que entrará no faturamento.`)) return;
  let newServiceId = a.service_id;
  if(finalValue!==original){
    const baseName = String(appointmentServiceName(a)||'Serviço').split('•')[0].trim() || 'Serviço';
    const dur = Number(appointmentService(a)?.duration||30);
    // IMPORTANTE: não alteramos nem recriamos o serviço visível do catálogo.
    // Criamos um serviço técnico oculto apenas para este atendimento, com o preço final recebido.
    // O filtro publicServicesForBarber/isInternalSubscriptionService esconde "ajuste financeiro"
    // da tela Serviços e do link público, evitando poluir a agenda do cliente.
    const name = `${baseName} • ajuste financeiro • valor a receber`;
    const {data,error} = await db.from('services').insert(shopScopedPayload({barber_id:a.barber_id,name,price:finalValue,duration:dur})).select().single();
    if(error) return toast(error.message);
    newServiceId = data.id;
  }
  const {error} = await db.from('appointments').update({status:'concluido', service_id:newServiceId}).eq('id',id);
  if(error) return toast(error.message);
  const m=document.getElementById('modal'); if(m)m.remove();
  toast(`Recebido: ${money(finalValue)} (${movementLabel}).`);
  renderApp();
};
window.editPayment = async id => {
  const a = cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Atendimento não encontrado.');
  if(a.status!=='concluido') return receiveWithDiscount(id);
  return receiveWithDiscount(id);
};
window.bonifyWallet = async id => {
  if(!confirm('Bonificar/isentar esta cobrança? Ela sairá da carteira e NÃO entrará no faturamento.')) return;
  const {error}=await db.from("appointments").update({status:"bonificado"}).eq("id",id);
  if(error) return toast(error.message);
  toast('Cobrança bonificada. Ela não soma no faturamento.');
  renderApp();
};
window.markWallet = async id => { const days=Number(rd.value||15); const d=new Date(); d.setDate(d.getDate()+days); await db.from("appointments").update({status:"em_carteira",reminder_days:days,reminder_date:d.toISOString().slice(0,10)}).eq("id",id); modal.remove(); renderApp(); };

function isMonthlyParcel(a){
  return /^Parcela\s+\d+\/\d+\s+assinatura/i.test(String(a?.client_name||'')) || String(a?.services?.name||'').toLowerCase().includes('parcela mensal') || String(a?.services?.name||'').toLowerCase().includes('parcela semanal');
}
window.fixWalletParcelValue = async id => {
  const a = cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Cobrança não encontrada.');
  const current = Number(a.services?.price||0);
  const typed = prompt('Informe o valor mensal correto desta assinatura. Esse valor será aplicado nas parcelas desta assinatura.', current ? String(current).replace('.',',') : '');
  if(typed===null) return;
  const value = Number(String(typed).replace(',','.'));
  if(!value || value<=0) return toast('Valor inválido.');
  const serviceId = a.service_id;
  if(!serviceId) return toast('Serviço da parcela não encontrado.');
  const {error} = await db.from('services').update({price:value}).eq('id', serviceId);
  if(error) return toast(error.message);
  toast('Valor das parcelas atualizado.');
  renderApp();
};
window.cancelWalletCharge = async id => {
  if(!confirm('Cancelar esta cobrança pendente? Ela sairá da carteira e não entrará no faturamento.')) return;
  const {error}=await db.from('appointments').update({status:'cancelado'}).eq('id',id);
  if(error) return toast(error.message);
  toast('Cobrança cancelada.');
  renderApp();
};


if(!window.__zenAgendaAutoRefresh){
  window.__zenAgendaAutoRefresh = setInterval(()=>{
    if(typeof page!=='undefined' && page==='appointments' && typeof renderApp==='function'){
      // Nunca recria a tela enquanto o barbeiro estiver preenchendo o formulário.
      if(typeof agendaFormIsBeingEdited==='function' && agendaFormIsBeingEdited()) return;
      renderApp();
    }
  },60000);
}

// ===== ZenBarber Etapa 4B: Central WhatsApp PRO =====
function whatsTemplateStorageKey(){
  const shop = sameShopName() || me?.shop_name || me?.login || 'zenbarber';
  return 'zenbarber_whats_templates_' + String(shop).toLowerCase().replace(/[^a-z0-9_-]+/g,'_');
}
function defaultWhatsTemplates(){
  return {
    confirm: 'Olá {primeiro_nome}, tudo bem? 😊\n\nPassando para confirmar seu horário na {barbearia}.\n\n📅 {data}\n⏰ {horario}\n✂️ {servico}\n💈 {barbeiro}\n\nPodemos confirmar sua presença?',
    reminder: 'Olá {primeiro_nome}, tudo bem? Só passando para lembrar do seu horário na {barbearia}:\n\n📅 {data}\n⏰ {horario}\n✂️ {servico}\n💈 {barbeiro}\n\nTe esperamos por aqui! ✂️',
    delay: 'Olá {primeiro_nome}, tudo bem? Seu horário na {barbearia} era às {horario}.\n\nMe avisa por favor se ainda vem ou se prefere remarcar para outro horário?',
    reschedule: 'Olá {primeiro_nome}, tudo bem? Precisamos ajustar seu horário na {barbearia}.\n\nMe chama por aqui para remarcarmos o melhor dia e horário para você. ✂️',
    charge: 'Olá {primeiro_nome}, tudo bem? Passando para lembrar do valor de {valor} referente ao {servico} na {barbearia}.\n\nQualquer dúvida é só me chamar por aqui.',
    comeback: 'Olá {primeiro_nome}, tudo bem? Faz alguns dias que você não aparece na {barbearia}.\n\nQuer agendar seu próximo horário?\n{link}',
    thanks: 'Obrigado pela preferência, {primeiro_nome}! Foi um prazer atender você na {barbearia}.\n\nQuando quiser agendar novamente, é só chamar ou acessar: {link}'
  };
}
function getWhatsTemplates(){
  try{ return {...defaultWhatsTemplates(), ...(JSON.parse(localStorage.getItem(whatsTemplateStorageKey())||'{}')||{})}; }
  catch(e){ return defaultWhatsTemplates(); }
}
function fillWhatsTemplate(template,a={}){
  const shop=sameShopName()||'barbearia';
  const client=a?.client_name||'cliente';
  const map={
    '{cliente}': client,
    '{primeiro_nome}': clientFirstName(client),
    '{barbearia}': shop,
    '{data}': formatDateFullBR(a?.date||todayISO()),
    '{horario}': a?.time||'',
    '{servico}': a?.services?.name||'serviço',
    '{barbeiro}': barberName(a?.barber_id)||'barbeiro',
    '{valor}': money(a?.services?.price||0),
    '{link}': publicDashboardLink()
  };
  return Object.entries(map).reduce((txt,[k,v])=>txt.split(k).join(v), String(template||''));
}
// Sobrescreve a função anterior mantendo compatibilidade com os botões já existentes.
apptWhatsappTemplate = function(a,type){
  const templates=getWhatsTemplates();
  return fillWhatsTemplate(templates[type] || templates.reminder, a || {});
};
window.saveWhatsTemplates = () => {
  const current=getWhatsTemplates();
  Object.keys(defaultWhatsTemplates()).forEach(k=>{
    const el=document.getElementById('w_tpl_'+k);
    if(el) current[k]=el.value;
  });
  localStorage.setItem(whatsTemplateStorageKey(), JSON.stringify(current));
  toast('Modelos de WhatsApp salvos para esta barbearia.');
  renderApp();
};
window.resetWhatsTemplates = () => {
  if(!confirm('Restaurar os modelos padrão de WhatsApp?')) return;
  localStorage.removeItem(whatsTemplateStorageKey());
  toast('Modelos padrão restaurados.');
  renderApp();
};
function whatsappTemplateEditor(){
  const t=getWhatsTemplates();
  const labels={confirm:'Confirmar horário',reminder:'Lembrete',delay:'Atraso / passou do horário',reschedule:'Reagendar',charge:'Cobrança',comeback:'Cliente ausente',thanks:'Agradecimento'};
  const vars='<small class="muted">Variáveis: {primeiro_nome}, {cliente}, {barbearia}, {data}, {horario}, {servico}, {barbeiro}, {valor}, {link}</small>';
  return `<details class="card whatsTemplateEditor"><summary><div><h3>Modelos de mensagens</h3><p class="muted">Personalize as mensagens uma vez e use em toda a agenda, carteira e clientes ausentes.</p></div><span>editar modelos</span></summary>${vars}<div class="whatsTemplateGrid">${Object.keys(labels).map(k=>`<label><b>${labels[k]}</b><textarea id="w_tpl_${k}" rows="5">${esc(t[k]||'')}</textarea></label>`).join('')}</div><div class="row"><button class="primary" onclick="saveWhatsTemplates()">Salvar modelos</button><button onclick="resetWhatsTemplates()">Restaurar padrão</button></div></details>`;
}
function whatsappCentralRow(a,extra=''){
  return `<div class="whatsCentralRow"><div><b>${esc(a.time?`${a.time} • `:'')}${esc(a.client_name||'Cliente')}</b><small>${esc(a.services?.name||'Serviço')} • ${esc(barberName(a.barber_id))} • ${esc(a.client_phone||'sem WhatsApp')}</small>${extra?`<small>${extra}</small>`:''}</div>${whatsappQuickButtons(a,{compact:true})}</div>`;
}
function whatsappCentralAppointments(date,label){
  const arr=cache.appointments.filter(a=>['agendado','encaixe','em_andamento'].includes(a.status) && a.date===date && !isClosureAppt(a)).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  return `<section class="card whatsCentralCard"><div class="chartTitle"><div><h3>${label}</h3><p class="muted">Confirme, lembre, reagende ou avise atraso com um clique.</p></div><button class="whats" onclick="openBulkWhats('${date}','confirm')">Abrir confirmações (${arr.filter(a=>normPhone(a.client_phone)).length})</button></div>${arr.map(a=>whatsappCentralRow(a)).join('') || '<div class="empty">Nenhum agendamento nesta data.</div>'}</section>`;
}
window.openBulkWhats = (date,type='confirm') => {
  const arr=cache.appointments.filter(a=>['agendado','encaixe','em_andamento'].includes(a.status) && a.date===date && normPhone(a.client_phone) && !isClosureAppt(a)).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  if(!arr.length) return toast('Nenhum cliente com WhatsApp válido nesta data.');
  arr.forEach((a,i)=>setTimeout(()=>window.open(wa(a.client_phone, apptWhatsappTemplate(a,type)),'_blank'), i*700));
  toast(`Abrindo ${arr.length} conversa(s) no WhatsApp.`);
};
function whatsappWalletPanel(){
  const arr=cache.appointments.filter(a=>a.status==='em_carteira').sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return `<section class="card whatsCentralCard"><div class="chartTitle"><div><h3>Cobranças no WhatsApp</h3><p class="muted">Clientes em carteira com mensagem de cobrança já pronta.</p></div><button onclick="page='wallet';renderApp()">Abrir carteira</button></div>${arr.slice(0,10).map(a=>whatsappCentralRow(a,`Valor: ${money(a.services?.price||0)} • ${formatDateFullBR(a.date)}`)).join('') || '<div class="empty">Nenhuma cobrança em carteira.</div>'}</section>`;
}
function whatsappAbsentPanel(){
  const arr=(typeof lastCompletedByClient==='function'?lastCompletedByClient(15):[]).slice(0,10);
  return `<section class="card whatsCentralCard"><div class="chartTitle"><div><h3>Recuperar clientes ausentes</h3><p class="muted">Transforme clientes parados em novos horários na agenda.</p></div><button onclick="page='clients';renderApp()">Ver todos</button></div>${arr.map(a=>`<div class="whatsCentralRow"><div><b>${esc(a.client_name||'Cliente')}</b><small>Último serviço: ${formatDateFullBR(a.date)} • ${esc(a.services?.name||'Serviço')} • ${esc(a.client_phone||'sem WhatsApp')}</small></div><div class="whatsCommandBtns"><a target="_blank" href="${wa(a.client_phone, apptWhatsappTemplate(a,'comeback'))}"><button class="whats miniBtn">Chamar</button></a><button class="miniBtn" onclick="copyWhatsMsg('${a.id}','comeback')">Copiar</button></div></div>`).join('') || '<div class="empty">Nenhum cliente ausente no período.</div>'}</section>`;
}
function whatsappLinkPanel(){
  const link=publicDashboardLink();
  const msg=`Olá! Você pode agendar seu horário na ${sameShopName()} por este link: ${link}`;
  return `<section class="card whatsCentralCard"><h3>Link de agendamento</h3><p class="muted">Mensagem rápida para enviar o link público do ZenBarber.</p><div class="linkBox">${link}</div><br><div class="row"><button class="primary" onclick="navigator.clipboard.writeText('${link}');toast('Link copiado')">Copiar link</button><a target="_blank" href="${wa('',msg)}"><button class="whats">Compartilhar no WhatsApp</button></a></div></section>`;
}
function whatsappPage(){
  const today=todayISO();
  const tomorrow=addDays(today,1);
  const todayCount=cache.appointments.filter(a=>['agendado','encaixe','em_andamento'].includes(a.status) && a.date===today && !isClosureAppt(a)).length;
  const walletCount=cache.appointments.filter(a=>a.status==='em_carteira').length;
  const absentCount=(typeof lastCompletedByClient==='function'?lastCompletedByClient(15):[]).length;
  return `<section class="card whatsHeroPro"><div><span class="eyebrow">WhatsApp inteligente</span><h2>Central de atendimento da ${esc(sameShopName()||'barbearia')}</h2><p class="muted">Esse é o ponto que o dono gostou: mensagens prontas, rápidas e padronizadas para vender, confirmar e recuperar clientes.</p></div><div class="whatsHeroStats"><b>${todayCount}</b><small>hoje</small><b>${walletCount}</b><small>cobranças</small><b>${absentCount}</b><small>ausentes</small></div></section><div class="premiumStatGrid"><div class="premiumStat green"><span>Confirmações hoje</span><b>${todayCount}</b><small>envio individual ou em massa</small></div><div class="premiumStat amber"><span>Carteira</span><b>${walletCount}</b><small>clientes para cobrar</small></div><div class="premiumStat purple"><span>Recuperação</span><b>${absentCount}</b><small>sem retorno há 15+ dias</small></div><div class="premiumStat blue"><span>Modelos</span><b>7</b><small>mensagens editáveis</small></div></div>${whatsappTemplateEditor()}${whatsappCentralAppointments(today,'Agenda de hoje')}${whatsappCentralAppointments(tomorrow,'Agenda de amanhã')}${whatsappWalletPanel()}${whatsappAbsentPanel()}${whatsappLinkPanel()}`;
}
