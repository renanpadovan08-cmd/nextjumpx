// ===== BusinessService (Sprint 015) =====
window.BusinessService={
 metrics(){return businessMetrics();},
 rankings(){return clientRankings();},
 risks(){return riskClients();},
 score(){return proScore(businessMetrics());}
};
// ===== End BusinessService =====

// MÓDULO MEU NEGÓCIO — transforma cada barbeiro em microempreendedor dentro do ZenBarber.
// Usa dados existentes de Supabase: barbers, services e appointments. Metas ficam em barber_business_goals.

function zbDateObj(date){ return new Date(String(date || todayISO()) + 'T12:00:00'); }
function addDaysISO(date, delta){ const d = zbDateObj(date); d.setDate(d.getDate()+delta); return d.toISOString().slice(0,10); }
function daysInMonthKey(key){ const [y,m] = String(key || monthKey(todayISO())).split('-').map(Number); return new Date(y, m, 0).getDate(); }
function currentDayOfMonth(){ return Number(todayISO().slice(8,10)); }
function barberPrice(a){ return Number(a?.received_amount ?? a?.amount_received ?? a?.final_price ?? a?.services?.price ?? 0); }
function barberCommissionRate(barberId){ return Number(barberById(barberId)?.commission_rate ?? (barberId===me?.id?me?.commission_rate:0) ?? 0); }
function appointmentDuration(a){ return Number(a?.services?.duration || a?.duration || 30); }
function monthStartISO(key){ return `${key || monthKey(todayISO())}-01`; }
function monthEndISO(key){ const [y,m]=String(key||monthKey(todayISO())).split('-').map(Number); return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`; }
function canAccessBusiness(){ return ['admin','gerente','barber'].includes(normalizeRole(me?.role)); }
function businessBarberScope(){
  if(isBarberOnlyRole()) return [me.id];
  return (cache.shopBarbers || []).map(b=>b.id);
}
function selectedBusinessBarberId(){
  const ids = businessBarberScope();
  const stored = sessionStorage.getItem('zb_business_barber') || 'all';
  if(isBarberOnlyRole()) return me.id;
  if(stored !== 'all' && ids.includes(stored)) return stored;
  return 'all';
}
function setBusinessBarber(id){ sessionStorage.setItem('zb_business_barber', id || 'all'); renderApp(); }
window.setBusinessBarber = setBusinessBarber;

function getScopedBusinessData(){
  const ids = businessBarberScope();
  const selected = selectedBusinessBarberId();
  const scopeIds = selected === 'all' ? ids : [selected];
  const appts = (cache.appointments || []).filter(a=>scopeIds.includes(a.barber_id) && !isClosureAppt(a));
  const barbers = (cache.shopBarbers || []).filter(b=>scopeIds.includes(b.id));
  return {selected, scopeIds, appts, barbers};
}

async function loadBusinessGoals(){
  const ids = businessBarberScope();
  if(!ids.length){ cache.businessGoals = []; return []; }
  const month = monthKey(todayISO());
  const {data,error} = await db.from('barber_business_goals').select('*').in('barber_id', ids).eq('month_key', month);
  if(error){
    // Mantém o módulo funcionando mesmo antes da migration ser aplicada.
    console.warn('Metas Meu Negócio indisponíveis:', error.message);
    cache.businessGoals = [];
    return [];
  }
  cache.businessGoals = data || [];
  return cache.businessGoals;
}
function goalForBarber(barberId){ return (cache.businessGoals || []).find(g=>g.barber_id===barberId && g.month_key===monthKey(todayISO())) || {}; }
function scopedGoal(){
  const {selected, scopeIds} = getScopedBusinessData();
  if(selected !== 'all') return goalForBarber(selected);
  return (cache.businessGoals || []).filter(g=>scopeIds.includes(g.barber_id)).reduce((acc,g)=>({
    financial_goal:Number(acc.financial_goal||0)+Number(g.financial_goal||0),
    attendance_goal:Number(acc.attendance_goal||0)+Number(g.attendance_goal||0)
  }), {financial_goal:0, attendance_goal:0});
}
window.saveBusinessGoal = async function(){
  const selected = selectedBusinessBarberId();
  const barberId = isBarberOnlyRole() ? me.id : (selected === 'all' ? (document.getElementById('businessGoalBarber')?.value || '') : selected);
  if(!barberId) return toast('Escolha um barbeiro para salvar a meta.');
  if(isBarberOnlyRole() && barberId !== me.id) return toast('Você só pode editar suas próprias metas.');
  const financial = Number(String(document.getElementById('financialGoal')?.value || '0').replace(',','.'));
  const attendance = Number(document.getElementById('attendanceGoal')?.value || 0);
  const row = {barber_id:barberId, month_key:monthKey(todayISO()), financial_goal:financial, attendance_goal:attendance, updated_at:new Date().toISOString()};
  const {error} = await db.from('barber_business_goals').upsert(row, {onConflict:'barber_id,month_key'});
  if(error) return toast('Aplique a migration SQL do Meu Negócio: ' + error.message);
  toast('Meta mensal salva.');
  await loadBusinessGoals();
  renderApp();
};

function businessMetrics(){
  const {appts, scopeIds} = getScopedBusinessData();
  const today = todayISO();
  const currentMonth = monthKey(today);
  const weekStart = addDaysISO(today, -6);
  const done = appts.filter(a=>a.status==='concluido');
  const doneToday = done.filter(a=>a.date===today);
  const doneWeek = done.filter(a=>String(a.date)>=weekStart && String(a.date)<=today);
  const doneMonth = done.filter(a=>monthKey(a.date)===currentMonth);
  const sum = arr => arr.reduce((t,a)=>t+barberPrice(a),0);
  const monthRevenue = sum(doneMonth);
  const weekRevenue = sum(doneWeek);
  const dayRevenue = sum(doneToday);
  const commission = doneMonth.reduce((t,a)=>t+(barberPrice(a)*barberCommissionRate(a.barber_id)/100),0);
  const ticket = doneMonth.length ? monthRevenue/doneMonth.length : 0;
  const clients = new Set(doneMonth.map(a=>(a.client_phone || a.client_name || '').toLowerCase()).filter(Boolean)).size;
  const activeToday = appts.filter(a=>['agendado','encaixe','em_andamento'].includes(a.status) && a.date===today).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  const nowMin = new Date().getHours()*60 + new Date().getMinutes();
  const next = activeToday.find(a=>minutes(a.time||'00:00')>=nowMin) || activeToday[0];
  const freeToday = calculateOpenSlots(scopeIds, today, appts);
  const occupancy = calculateOccupancy(scopeIds, currentMonth, appts);
  const missedWeek = calculateMissedOpportunity(scopeIds, doneWeek, occupancy.freeMinutesWeek);
  const attendance = calculateAttendance(appts, currentMonth);
  return {dayRevenue, weekRevenue, monthRevenue, commission, ticket, clients, activeToday, next, freeToday, occupancy, missedWeek, attendance, doneMonth, doneWeek, done};
}
function calculateOpenSlots(scopeIds, date, appts){
  let free = 0;
  scopeIds.forEach(id=>{
    const b = barberById(id) || me;
    if(isDayOff(b,date)) return;
    let total = Math.max(0, minutes(workEnd(b,date))-minutes(workStart(b,date)));
    if(breakStart(b,date) && breakEnd(b,date)) total -= Math.max(0, minutes(breakEnd(b,date))-minutes(breakStart(b,date)));
    const used = appts.filter(a=>a.barber_id===id && a.date===date && statusBlocks(a.status)).reduce((t,a)=>t+appointmentDuration(a),0);
    free += Math.max(0, total-used);
  });
  return {minutes:free, slots:Math.floor(free/STEP), hours:free/60};
}
function calculateOccupancy(scopeIds, month, appts){
  const days = dateRangeISO(monthStartISO(month), monthEndISO(month));
  let available=0, used=0, freeWeek=0;
  const weekStart = addDaysISO(todayISO(), -6);
  days.forEach(d=>{
    scopeIds.forEach(id=>{
      const b = barberById(id) || me;
      if(isDayOff(b,d)) return;
      let total = Math.max(0, minutes(workEnd(b,d))-minutes(workStart(b,d)));
      if(breakStart(b,d) && breakEnd(b,d)) total -= Math.max(0, minutes(breakEnd(b,d))-minutes(breakStart(b,d)));
      const dayUsed = appts.filter(a=>a.barber_id===id && a.date===d && statusBlocks(a.status)).reduce((t,a)=>t+appointmentDuration(a),0);
      available += total; used += Math.min(total, dayUsed);
      if(String(d)>=weekStart && String(d)<=todayISO()) freeWeek += Math.max(0,total-dayUsed);
    });
  });
  const rate = available ? Math.round((used/available)*100) : 0;
  return {availableMinutes:available, usedMinutes:used, freeMinutes:Math.max(0,available-used), freeMinutesWeek:freeWeek, rate};
}
function calculateMissedOpportunity(scopeIds, doneWeek, freeMinutesWeek){
  const avgDur = doneWeek.length ? doneWeek.reduce((t,a)=>t+appointmentDuration(a),0)/doneWeek.length : 45;
  const avgTicket = doneWeek.length ? doneWeek.reduce((t,a)=>t+barberPrice(a),0)/doneWeek.length : avgServiceTicket(scopeIds);
  return Math.max(0, Math.floor((freeMinutesWeek/Math.max(15,avgDur))*avgTicket));
}
function avgServiceTicket(scopeIds){
  const list = (cache.services || []).filter(s=>scopeIds.includes(s.barber_id) && !(typeof isInternalSubscriptionService==='function' && isInternalSubscriptionService(s)));
  return list.length ? list.reduce((t,s)=>t+Number(s.price||0),0)/list.length : 0;
}
function calculateAttendance(appts, month){
  const relevant = appts.filter(a=>monthKey(a.date)===month && ['concluido','cancelado','faltou','no_show'].includes(String(a.status||'')));
  if(!relevant.length) return 100;
  const ok = relevant.filter(a=>a.status==='concluido').length;
  return Math.round((ok/relevant.length)*100);
}
function clientKey(a){ return (a.client_phone || a.client_name || '').toLowerCase().trim(); }
function clientRankings(){
  const {appts} = getScopedBusinessData();
  const done = appts.filter(a=>a.status==='concluido' && clientKey(a));
  const map = {};
  done.forEach(a=>{
    const k = clientKey(a); if(!map[k]) map[k]={name:a.client_name||'Cliente', phone:a.client_phone||'', spend:0, visits:0, last:'', referrals:0};
    map[k].spend += barberPrice(a); map[k].visits += 1; if(String(a.date)>String(map[k].last)) map[k].last=a.date;
    const txt = String(a.notes || a.observation || a.source || a.indication || '').toLowerCase();
    if(txt.includes('indic')) map[k].referrals += 1;
  });
  const arr = Object.values(map);
  return {
    spend: arr.slice().sort((a,b)=>b.spend-a.spend).slice(0,5),
    returns: arr.slice().sort((a,b)=>b.visits-a.visits).slice(0,5),
    referrals: arr.slice().sort((a,b)=>b.referrals-a.referrals || b.spend-a.spend).slice(0,5)
  };
}
function riskClients(){
  const {appts} = getScopedBusinessData();
  const done = appts.filter(a=>a.status==='concluido' && clientKey(a));
  const map = {};
  done.forEach(a=>{ const k=clientKey(a); if(!map[k] || String(a.date)>String(map[k].last)) map[k]={name:a.client_name||'Cliente', phone:a.client_phone||'', last:a.date, barber_id:a.barber_id}; });
  const today = zbDateObj(todayISO());
  return Object.values(map).map(c=>({ ...c, days:Math.floor((today-zbDateObj(c.last))/(1000*60*60*24)) }))
    .filter(c=>c.days>=15).sort((a,b)=>b.days-a.days).slice(0,18);
}
function proScore(metrics){
  const goal = scopedGoal();
  const revenuePct = goal.financial_goal ? Math.min(100,(metrics.monthRevenue/Number(goal.financial_goal))*100) : Math.min(100, metrics.monthRevenue/30);
  const retention = retentionRate(metrics.done);
  const occupation = metrics.occupancy.rate;
  const attendance = metrics.attendance;
  const avgTicket = avgServiceTicket(getScopedBusinessData().scopeIds) || metrics.ticket || 1;
  const ticketScore = Math.min(100, (metrics.ticket/avgTicket)*100);
  const score = Math.round(revenuePct*.30 + retention*.25 + occupation*.20 + attendance*.15 + ticketScore*.10);
  let label='Atenção'; if(score>=90) label='Lenda'; else if(score>=75) label='Elite'; else if(score>=60) label='Profissional'; else if(score>=40) label='Em Evolução';
  return {score, label, revenuePct, retention, occupation, attendance, ticketScore};
}
function retentionRate(done){
  const map={}; done.filter(a=>clientKey(a)).forEach(a=>{ const k=clientKey(a); map[k]=(map[k]||0)+1; });
  const total=Object.keys(map).length; if(!total) return 0;
  const returning=Object.values(map).filter(v=>v>=2).length;
  return Math.round((returning/total)*100);
}
function goalStatusClass(pct){ return pct>=80?'green':(pct>=50?'yellow':'red'); }
function businessSelectorHtml(){
  if(isBarberOnlyRole()) return '';
  const selected = selectedBusinessBarberId();
  return `<select class="businessSelect" onchange="setBusinessBarber(this.value)"><option value="all" ${selected==='all'?'selected':''}>Todos os barbeiros</option>${(cache.shopBarbers||[]).map(b=>`<option value="${esc(b.id)}" ${selected===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select>`;
}
function rankingList(items, type){
  return items.map((c,i)=>`<div class="businessRankItem"><span>#${i+1}</span><div><b>${esc(c.name)}</b><small>${type==='spend'?money(c.spend):type==='returns'?`${c.visits} retorno(s)`:`${c.referrals || 0} indicação(ões)`}</small></div><a target="_blank" href="${wa(c.phone, `Olá ${c.name}, passando para agradecer pela confiança na ${sameShopName()}.`)}"><button class="whats miniBtn">WhatsApp</button></a></div>`).join('') || '<div class="empty">Sem dados suficientes ainda.</div>';
}
function riskList(items){
  return items.map(c=>`<div class="riskClient ${c.days>=45?'danger':c.days>=30?'warn':''}"><div><b>${esc(c.name)}</b><small>Último atendimento: ${formatDateFullBR(c.last)} • ${c.days} dias sem voltar</small></div><div class="row"><a target="_blank" href="${wa(c.phone, `Olá ${c.name}, sentimos sua falta na ${sameShopName()}! Quer reservar um horário esta semana?`)}"><button class="whats miniBtn">WhatsApp</button></a><button class="miniBtn" onclick="page='appointments';renderApp()">Agendar</button><button class="miniBtn" onclick="page='clients';renderApp()">Histórico</button></div></div>`).join('') || '<div class="empty">Nenhum cliente em risco no momento.</div>';
}
function internalRanking(metrics){
  const month = monthKey(todayISO());
  return (cache.shopBarbers||[]).map(b=>{
    const appts=(cache.appointments||[]).filter(a=>a.barber_id===b.id && monthKey(a.date)===month && !isClosureAppt(a));
    const done=appts.filter(a=>a.status==='concluido');
    const revenue=done.reduce((t,a)=>t+barberPrice(a),0);
    const returned=Object.values(done.reduce((m,a)=>{const k=clientKey(a); if(k)m[k]=(m[k]||0)+1; return m;},{})).filter(v=>v>=2).length;
    return {b,revenue,services:done.length,returned,attendance:calculateAttendance(appts,month)};
  }).sort((a,b)=>b.revenue-a.revenue);
}
function meuNegocioPage(options={}){
  if(!canAccessBusiness()) return `<div class="card"><h3>Acesso restrito</h3><p class="muted">Clientes não acessam esta área.</p></div>`;
  const m = businessMetrics();
  const goal = scopedGoal();
  const financialPct = goal.financial_goal ? Math.round((m.monthRevenue/Number(goal.financial_goal))*100) : 0;
  const attendancePct = goal.attendance_goal ? Math.round((m.doneMonth.length/Number(goal.attendance_goal))*100) : 0;
  const projectedRevenue = Math.round((m.monthRevenue/Math.max(1,currentDayOfMonth())) * daysInMonthKey(monthKey(todayISO())));
  const projectedCommission = Math.round((m.commission/Math.max(1,currentDayOfMonth())) * daysInMonthKey(monthKey(todayISO())));
  const vip = BusinessService.rankings();
  const risk = BusinessService.risks();
  const score = BusinessService.score();
  const selected = selectedBusinessBarberId();
  const goalTargetOptions = isBarberOnlyRole() ? '' : `<label>Meta para<select id="businessGoalBarber">${(cache.shopBarbers||[]).map(b=>`<option value="${esc(b.id)}" ${selected===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label>`;
  const ranking = internalRanking(m);
  return `<div class="businessPage ${options.embedded?'embedded':''}">
    <section class="card businessHero"><div><span class="eyebrow">Meu Negócio</span><h2>O barbeiro como microempreendedor</h2><p class="muted">Faturamento, metas, clientes VIP, risco de perda, ociosidade e previsão de ganhos em uma visão prática.</p></div>${businessSelectorHtml()}</section>
    <div class="statgrid businessKpis"><div class="stat"><span>Hoje</span><b>${money(m.dayRevenue)}</b></div><div class="stat"><span>Semana</span><b>${money(m.weekRevenue)}</b></div><div class="stat"><span>Mês</span><b>${money(m.monthRevenue)}</b></div><div class="stat"><span>Comissão acumulada</span><b>${money(m.commission)}</b></div><div class="stat"><span>Ticket médio</span><b>${money(m.ticket)}</b></div><div class="stat"><span>Clientes atendidos</span><b>${m.clients}</b></div><div class="stat"><span>Horários livres hoje</span><b>${m.freeToday.slots}</b><small>${m.freeToday.hours.toFixed(1)}h livres</small></div><div class="stat"><span>Próximo atendimento</span><b>${m.next?esc(m.next.time):'—'}</b><small>${m.next?esc(m.next.client_name):'Sem próximo cliente'}</small></div></div>
    <section class="card goalCard ${goalStatusClass(financialPct)}"><div class="chartTitle"><div><h3>Meta mensal</h3><p class="muted">Defina meta financeira e meta de atendimentos. O ZenBarber mostra progresso, falta e projeção.</p></div><strong>${financialPct}%</strong></div><div class="goalBars"><div><span>Financeiro: ${money(m.monthRevenue)} / ${money(goal.financial_goal||0)}</span><i><em style="width:${Math.min(100,financialPct)}%"></em></i><small>Faltam ${money(Math.max(0,Number(goal.financial_goal||0)-m.monthRevenue))} • Projeção ${money(projectedRevenue)}</small></div><div><span>Atendimentos: ${m.doneMonth.length} / ${Number(goal.attendance_goal||0)}</span><i><em style="width:${Math.min(100,attendancePct)}%"></em></i><small>Faltam ${Math.max(0,Number(goal.attendance_goal||0)-m.doneMonth.length)} atendimento(s)</small></div></div><div class="grid goalForm">${goalTargetOptions}<label>Meta financeira<input id="financialGoal" type="number" min="0" step="10" value="${Number(goal.financial_goal||0)}"></label><label>Meta atendimentos<input id="attendanceGoal" type="number" min="0" step="1" value="${Number(goal.attendance_goal||0)}"></label><button class="primary" onclick="saveBusinessGoal()">Salvar meta</button></div></section>
    <div class="businessTwo"><section class="card"><h3>Clientes VIP</h3><p class="muted">Quem mais gasta, mais retorna e mais indica.</p><h4>Mais gastam</h4>${rankingList(vip.spend,'spend')}<h4>Mais retornam</h4>${rankingList(vip.returns,'returns')}<h4>Mais indicam</h4>${rankingList(vip.referrals,'referrals')}</section><section class="card"><h3>Clientes em risco</h3><p class="muted">Clientes sem retorno há 15, 30 ou 45 dias.</p>${riskList(risk)}</section></div>
    <div class="businessTwo"><section class="card idleCard"><h3>Ociosidade</h3><div class="bigNumber">${m.occupancy.rate}%</div><p class="muted">Taxa de ocupação do mês. Horas livres: ${(m.occupancy.freeMinutes/60).toFixed(1)}h</p><div class="opportunity">Você deixou de faturar <b>${money(m.missedWeek)}</b> esta semana.</div></section><section class="card proScore"><h3>Índice Barbeiro PRO</h3><div class="scoreCircle"><b>${score.score}</b><span>${score.label}</span></div><p class="muted">30% faturamento • 25% retorno • 20% ocupação • 15% comparecimento • 10% ticket médio</p></section></div>
    <section class="card forecastCard"><h3>Previsão de ganhos</h3><p>Se continuar neste ritmo você receberá aproximadamente <b>${money(projectedCommission)}</b> no fechamento.</p><div class="statgrid"><div class="stat"><span>Comissão prevista da semana</span><b>${money(m.doneWeek.reduce((t,a)=>t+(barberPrice(a)*barberCommissionRate(a.barber_id)/100),0))}</b></div><div class="stat"><span>Comissão prevista do mês</span><b>${money(projectedCommission)}</b></div><div class="stat"><span>Projeção de faturamento</span><b>${money(projectedRevenue)}</b></div></div></section>
    ${!isBarberOnlyRole()?`<section class="card"><h3>Ranking interno</h3><div class="businessRankingTable">${ranking.map((r,i)=>`<div class="item"><div><strong>#${i+1} ${esc(r.b.name)}</strong><small>${r.services} serviço(s) • ${r.returned} cliente(s) de volta • ${r.attendance}% comparecimento</small></div><b>${money(r.revenue)}</b></div>`).join('') || '<div class="empty">Sem dados para ranking.</div>'}</div></section>`:''}
  </div>`;
}
window.meuNegocioPage = meuNegocioPage;
