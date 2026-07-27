// ===== ReportService (Sprint 013) =====
window.ReportService = {
  completed(){
    return (cache.appointments||[]).filter(a=>a.status==='concluido');
  },
  revenue(){
    return this.completed().reduce((t,a)=>t+Number(a.services?.price||0),0);
  },
  ranking(){
    const done=this.completed();
    return cache.shopBarbers.map(b=>{
      const ap=done.filter(a=>a.barber_id===b.id);
      const total=ap.reduce((t,a)=>t+Number(a.services?.price||0),0);
      const com=total*Number(b.commission_rate||0)/100;
      return {b,ap,total,com,lucro:total-com};
    }).sort((a,b)=>b.total-a.total);
  }
};
// ===== End ReportService =====

function wallet(){
  const arr=cache.appointments.filter(a=>a.status==='em_carteira').sort((a,b)=>String(a.reminder_date||a.date||'').localeCompare(String(b.reminder_date||b.date||'')));
  return `<div class="card"><h3>Valores pendentes</h3><p class="muted">Use Bonificar quando o barbeiro decidir isentar aquela cobrança. Use Cancelar cobrança para remover um lançamento pendente errado sem somar no faturamento.</p>${arr.map(a=>`<div class="item"><div><strong>${esc(a.client_name)} — ${money(appointmentPrice(a))} • ${esc(barberName(a.barber_id))}</strong><small>${esc(appointmentServiceName(a)||'')} • vencimento/lembrete: ${formatDateBR(a.reminder_date||a.date)||'sem data'}</small><br><small>${esc(a.client_phone||'')}</small></div><div class="walletActions"><a target="_blank" href="${wa(a.client_phone,`Olá ${a.client_name}, tudo bem? Passando para lembrar do valor em aberto de ${money(appointmentPrice(a))} referente ao serviço ${appointmentServiceName(a)||''}.`)}"><button class="whats">Cobrar no WhatsApp</button></a><button class="primary" onclick="markPaid('${a.id}')">Marcar recebido</button><button class="gold" onclick="receiveWithDiscount('${a.id}')">Valor a receber</button><button class="gold" onclick="bonifyWallet('${a.id}')">Bonificar</button><button class="danger" onclick="cancelWalletCharge('${a.id}')">Cancelar cobrança</button>${isMonthlyParcel(a)?`<button onclick="fixWalletParcelValue('${a.id}')">Corrigir valor</button>`:''}</div></div>`).join("") || '<div class="empty">Nenhum cliente em carteira.</div>'}</div>`;
}

function overdueAppointments(){
  return (cache.appointments||[])
    .filter(a => a.status === 'agendado' && String(a.date||'') < todayISO() && !isClosureAppt(a) && !isInternalSubscriptionService(a.services||{}))
    .sort((a,b)=>apptSortValue(a).localeCompare(apptSortValue(b)));
}

function pendingSettlementPage(){
  const past = overdueAppointments();
  const walletHtml = wallet();
  const pastHtml = `<div class="card"><h3>Agendamentos passados sem baixa</h3><p class="muted">Aqui aparecem horários que já passaram e ainda estão como agendados. Use para dar baixa quando o barbeiro esqueceu de confirmar o pagamento no dia. Ao marcar como recebido, o faturamento entra na data original do atendimento.</p>${past.map(a=>`<div class="item pendingPast"><div><strong>${esc(a.client_name||'Cliente')} — ${money(appointmentPrice(a))} • ${esc(barberName(a.barber_id))}</strong><small>${apptWhenHtml(a)} • ${esc(appointmentServiceName(a)||'Serviço')} • ${appointmentService(a)?.duration||30}min</small><br><small>${esc(a.client_phone||'')}</small></div><div class="walletActions"><button class="primary" onclick="markPaid('${a.id}')">Dar baixa / Recebido</button><button class="gold" onclick="receiveWithDiscount('${a.id}')">Valor a receber</button><button class="gold" onclick="sendPastToWallet('${a.id}')">Enviar para carteira</button><button class="danger" onclick="markPastNoShow('${a.id}')">Cliente faltou</button></div></div>`).join('') || '<div class="empty">Nenhum agendamento passado pendente de baixa.</div>'}</div>`;
  return pastHtml + walletHtml;
}

window.sendPastToWallet = async id => {
  const a = cache.appointments.find(x=>x.id===id);
  if(!a) return toast('Agendamento não encontrado.');
  const typed = prompt('Em quantos dias lembrar/cobrar este cliente?', '15');
  if(typed===null) return;
  const days = Math.max(1, Number(String(typed).replace(/\D/g,'')) || 15);
  const d = new Date(); d.setDate(d.getDate()+days);
  const {error}=await db.from('appointments').update({status:'em_carteira',reminder_days:days,reminder_date:d.toISOString().slice(0,10)}).eq('id',id);
  if(error) return toast(error.message);
  toast('Agendamento enviado para Clientes em carteira.');
  renderApp();
};

window.markPastNoShow = async id => {
  if(!confirm('Marcar este agendamento passado como falta/cancelado? Ele NÃO entrará no faturamento.')) return;
  const {error}=await db.from('appointments').update({status:'cancelado'}).eq('id',id);
  if(error) return toast(error.message);
  toast('Agendamento marcado como falta/cancelado.');
  renderApp();
};

function linkSnippet(){ const link=publicDashboardLink(); return `<div class="linkBox" id="pubLink">${link}</div><br><div class="row"><button class="primary" onclick="copyLink()">Copiar link</button><a target="_blank" href="${wa('',`Olá! Você pode agendar seu horário na ${sameShopName()} por este link: ${link}`)}"><button class="whats">Enviar pelo WhatsApp</button></a></div>`; }
function supportPage(){
  const msg = `Olá Vitor, preciso de suporte no ZenBarber.%0A%0ABarbearia: ${sameShopName()}%0AUsuário: ${me.name} / ${me.login}%0AProblema: `;
  return `<div class="card"><h3>Contato de suporte</h3><p class="muted">Use este botão para falar com o suporte pelo WhatsApp. A mensagem já vai identificando sua barbearia e seu usuário.</p><a target="_blank" href="https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g,"")}?text=${msg}"><button class="whats">Falar com suporte no WhatsApp</button></a></div>`;
}

function reportsPage(){
  const rows=ReportService.ranking();
  return `<div class="card"><h3>Ranking, comissão e lucro</h3>${rows.map((r,i)=>`<div class="item"><div><strong>#${i+1} ${esc(r.b.name)}</strong><small>${r.ap.length} atendimentos concluídos • Comissão: ${r.b.commission_rate||0}%</small></div><div><strong>${money(r.total)}</strong><small>Comissão: ${money(r.com)} • Lucro: ${money(r.lucro)}</small></div></div>`).join("") || '<div class="empty">Sem dados.</div>'}</div>`;
}


// ===== MÓDULO RETENÇÃO — Clientes para Recuperar =====
function clientKeyFromAppointment(a){
  return String(a?.client_phone || a?.client_name || 'cliente').replace(/\D/g,'') || String(a?.client_name || 'cliente').trim().toLowerCase();
}
function daysSince(date){
  const d = new Date(String(date||todayISO())+'T12:00:00');
  const n = new Date(todayISO()+'T12:00:00');
  return Math.max(0, Math.floor((n-d)/86400000));
}
function retentionStatus(days){
  if(days<=15) return {key:'ativo',label:'Verde',text:'Cliente ativo',cls:'green',level:'verde'};
  if(days<=25) return {key:'risco',label:'Amarelo',text:'Em atenção',cls:'yellow',level:'amarelo'};
  if(days<=35) return {key:'risco',label:'Laranja',text:'Alto risco',cls:'orange',level:'laranja'};
  return {key:'perdido',label:'Vermelho',text:'Cliente perdido',cls:'red',level:'vermelho'};
}
function retentionWhatsMessage(c){
  return `Olá ${c.name}, tudo bem? Faz algum tempo desde sua última visita. Temos horários disponíveis esta semana. Gostaria de agendar seu próximo atendimento?`;
}
function completedAppointmentsForRetention(){
  return (cache.appointments||[])
    .filter(a=>a.status==='concluido' && !isClosureAppt(a) && !isInternalSubscriptionService(a.services||{}) && (a.client_name || a.client_phone));
}
function retentionClients(){
  const map={};
  completedAppointmentsForRetention().forEach(a=>{
    const k=clientKeyFromAppointment(a);
    if(!map[k]) map[k]={key:k,name:a.client_name||'Cliente',phone:a.client_phone||'',appointments:[],barber_id:a.barber_id,last:null,total:0};
    map[k].appointments.push(a);
    map[k].total += Number(a.services?.price||0);
    if(!map[k].last || apptSortValue(a).localeCompare(apptSortValue(map[k].last))>0){
      map[k].last=a; map[k].name=a.client_name||map[k].name; map[k].phone=a.client_phone||map[k].phone; map[k].barber_id=a.barber_id;
    }
  });
  return Object.values(map).map(c=>{
    const days=daysSince(c.last?.date);
    const st=retentionStatus(days);
    const avg=c.appointments.length ? c.total/c.appointments.length : 0;
    return {...c,days,status:st,avg,last_date:c.last?.date||'',last_time:c.last?.time||'',last_service:c.last?.services?.name||'Serviço'};
  }).sort((a,b)=>b.days-a.days || String(a.name).localeCompare(String(b.name),'pt-BR'));
}
function retentionMetrics(){
  const clients=retentionClients();
  const active=clients.filter(c=>c.days<=15).length;
  const risk=clients.filter(c=>c.days>=16 && c.days<=35).length;
  const lost=clients.filter(c=>c.days>=36).length;
  const month=new Date().toISOString().slice(0,7);
  const recovered=clients.filter(c=>{
    const ap=c.appointments.sort((a,b)=>apptSortValue(a).localeCompare(apptSortValue(b)));
    if(ap.length<2) return false;
    const last=ap[ap.length-1], prev=ap[ap.length-2];
    return monthKey(last.date)===month && daysSince(prev.date)>=26;
  }).length;
  const returnRate=clients.length ? Math.round(((active+recovered)/clients.length)*100) : 0;
  return {clients,active,risk,lost,recovered,returnRate};
}
function scheduleOccupationPercent(){
  const today=todayISO();
  const active=(cache.appointments||[]).filter(a=>['agendado','encaixe','em_andamento','concluido'].includes(a.status) && a.date===today && !isClosureAppt(a));
  const totalSlots=Math.max(1,(cache.shopBarbers||[]).reduce((sum,b)=>{
    if(isDayOff(b,today)) return sum;
    return sum + Math.max(1, Math.floor((minutes(workEnd(b,today))-minutes(workStart(b,today)))/STEP));
  },0));
  return Math.min(100, Math.round((active.length/totalSlots)*100));
}
function attendancePercent(){
  const last30=new Date(); last30.setDate(last30.getDate()-30);
  const list=(cache.appointments||[]).filter(a=>String(a.date||'')>=last30.toISOString().slice(0,10) && !isClosureAppt(a));
  const relevant=list.filter(a=>['concluido','cancelado'].includes(a.status));
  return relevant.length ? Math.round((relevant.filter(a=>a.status==='concluido').length/relevant.length)*100) : 100;
}
function revenueScore(){
  const current=new Date().toISOString().slice(0,7);
  const done=(cache.appointments||[]).filter(a=>a.status==='concluido' && monthKey(a.date)===current);
  const revenue=done.reduce((t,a)=>t+Number(a.services?.price||0),0);
  const baseline=Math.max(1200,(cache.shopBarbers||[]).length*3000);
  return Math.min(100, Math.round((revenue/baseline)*100));
}
function zenHealthIndex(){
  const m=retentionMetrics();
  const ret=m.clients.length ? Math.round(((m.active + Math.round(m.risk*.35) + m.recovered)/m.clients.length)*100) : 100;
  const occ=scheduleOccupationPercent();
  const rev=revenueScore();
  const att=attendancePercent();
  const score=Math.round(ret*.4 + occ*.2 + rev*.2 + att*.2);
  const label=score>=85?'Excelente':score>=70?'Bom':score>=50?'Atenção':'Crítico';
  const cls=score>=85?'green':score>=70?'blue':score>=50?'orange':'red';
  return {score,label,cls,ret,occ,rev,att};
}
function lastCompletedByClient(days=30){
  return retentionClients().filter(c=>c.days>=Number(days||30)).map(c=>c.last);
}
function reactivationMessage(a,days){
  const c={name:a?.client_name||'Cliente'};
  return retentionWhatsMessage(c);
}
function retentionMetricCards(){
  const m=retentionMetrics();
  const z=zenHealthIndex();
  return `<div class="retentionHero card"><div><span class="eyebrow">Retenção • Clientes para Recuperar</span><h2>Transforme cliente sumido em faturamento novo</h2><p class="muted">O ZenBarber analisa automaticamente atendimentos concluídos, classifica risco por tempo sem retorno e entrega ações rápidas de WhatsApp, agendamento e histórico.</p></div><div class="zenScore ${z.cls}"><b>${z.score}</b><small>Saúde da Barbearia</small><em>${z.label}</em></div></div>
  <div class="premiumStatGrid retentionStats"><div class="premiumStat green"><span>Clientes ativos</span><b>${m.active}</b><small>0 a 15 dias sem atendimento</small></div><div class="premiumStat amber"><span>Clientes em risco</span><b>${m.risk}</b><small>16 a 35 dias sem retorno</small></div><div class="premiumStat purple"><span>Clientes recuperados</span><b>${m.recovered}</b><small>voltaram após período de risco</small></div><div class="premiumStat blue"><span>Taxa de retorno</span><b>${m.returnRate}%</b><small>${m.lost} perdido(s) em 36+ dias</small></div></div>
  <div class="card zenFormula"><h3>Índice ZEN</h3><p class="muted">Cálculo proprietário: 40% retorno dos clientes, 20% ocupação da agenda, 20% faturamento e 20% comparecimento.</p><div class="zenParts"><span>Retorno <b>${z.ret}%</b></span><span>Ocupação <b>${z.occ}%</b></span><span>Faturamento <b>${z.rev}%</b></span><span>Comparecimento <b>${z.att}%</b></span></div></div>`;
}
function clientsPage(){
  if(!['admin','gerente','barber'].includes(normalizeRole(me?.role))) return `<div class="card"><h3>Sem acesso</h3><p class="muted">Clientes não acessam o módulo de retenção.</p></div>`;
  const m=retentionMetrics();
  const filterOptions=`<option value="todos">Todos os status</option><option value="verde">Verde — 0 a 15 dias</option><option value="amarelo">Amarelo — 16 a 25 dias</option><option value="laranja">Laranja — 26 a 35 dias</option><option value="vermelho">Vermelho — 36+ dias</option>`;
  return `${retentionMetricCards()}<div class="card"><div class="chartTitle"><div><h3>Clientes para Recuperar</h3><p class="muted">Lista baseada somente em atendimentos concluídos. Barbeiro vê apenas clientes vinculados a ele; gerente vê sua unidade; Admin Master consolida tudo.</p></div><span>${m.clients.length} cliente(s)</span></div><div class="grid3"><select id="retentionFilter" onchange="renderReactivationList()">${filterOptions}</select><input id="reactivationSearch" placeholder="Buscar cliente, telefone ou barbeiro" oninput="renderReactivationList()"><button class="gold" onclick="renderReactivationList()">Atualizar</button></div><div id="reactivationBox" class="retentionBox"><div class="empty">Carregando clientes...</div></div></div>`;
}
async function logRetentionAction(key, action){
  try{
    const c=retentionClients().find(x=>x.key===key);
    if(!c) return;
    await db.from('client_retention_actions').insert({
      shop_name:sameShopName(), barber_id:c.barber_id || null, client_key:c.key, client_name:c.name, client_phone:c.phone, action, status_level:c.status.level, days_without_return:c.days, created_by:me?.id || null, unit_id:(typeof getActiveUnitId==='function'?getActiveUnitId():'all')
    });
  }catch(e){}
}
window.logRetentionAction = logRetentionAction;
function customerHistoryHtml(c){
  const list=[...c.appointments].sort((a,b)=>apptSortValue(b).localeCompare(apptSortValue(a)));
  return `<div class="customerHistory"><h4>Histórico de ${esc(c.name)}</h4>${list.map(a=>`<div class="historyLine"><span>${formatDateFullBR(a.date)} ${esc(a.time||'')}</span><b>${esc(appointmentServiceName(a)||'Serviço')}</b><small>${money(appointmentPrice(a))} • ${esc(barberName(a.barber_id))}</small></div>`).join('')}</div>`;
}
window.openRetentionHistory = function(key){
  const c=retentionClients().find(x=>x.key===key);
  if(!c) return toast('Cliente não encontrado.');
  const box=document.getElementById('history_'+key);
  if(box) box.innerHTML = box.innerHTML ? '' : customerHistoryHtml(c);
};
window.openRetentionSchedule = function(key){
  const c=retentionClients().find(x=>x.key===key);
  page='appointments';
  renderApp();
  setTimeout(()=>toast(`Abra um novo agendamento para ${c?.name||'este cliente'} na agenda interna.`),250);
};
window.renderReactivationList = () => {
  const box=document.getElementById('reactivationBox'); if(!box) return;
  const q=String(document.getElementById('reactivationSearch')?.value||'').trim().toLowerCase();
  const filter=String(document.getElementById('retentionFilter')?.value||'todos');
  let list=retentionClients();
  if(filter!=='todos') list=list.filter(c=>c.status.level===filter);
  if(q) list=list.filter(c=>`${c.name} ${c.phone} ${barberName(c.barber_id)} ${c.last_service}`.toLowerCase().includes(q));
  box.innerHTML = `${list.map(c=>{ const msg=retentionWhatsMessage(c); return `<div class="retentionClient ${c.status.cls}"><div class="retentionMain"><div><span class="retentionDot ${c.status.cls}"></span><strong>${esc(c.name)}</strong><small>${esc(c.phone||'sem telefone')} • Responsável: ${esc(barberName(c.barber_id)||'Barbeiro')}</small></div><div class="retentionStatus"><b>${c.days} dia(s)</b><small>${c.status.label} • ${c.status.text}</small></div></div><div class="retentionDetails"><span>Último atendimento: <b>${formatDateFullBR(c.last_date)} ${esc(c.last_time||'')}</b></span><span>Valor médio: <b>${money(c.avg)}</b></span><span>Serviço: <b>${esc(c.last_service)}</b></span></div><div class="retentionActions"><a target="_blank" onclick="logRetentionAction('${esc(c.key)}','whatsapp')" href="${wa(c.phone,msg)}"><button class="whats">WhatsApp</button></a><button class="primary" onclick="logRetentionAction('${esc(c.key)}','agendar');openRetentionSchedule('${esc(c.key)}')">Agendar</button><button onclick="logRetentionAction('${esc(c.key)}','historico');openRetentionHistory('${esc(c.key)}')">Histórico</button></div><div id="history_${esc(c.key)}"></div></div>`; }).join('') || '<div class="empty">Nenhum cliente encontrado neste filtro.</div>'}`;
};

// ===== Etapa 5: ZenBarber PRO - gestão, backup e auditoria =====
function downloadTextFile(filename, content, type='text/plain;charset=utf-8'){
  const blob = new Blob([content], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function csvCell(v){ return '"' + String(v ?? '').replace(/"/g,'""') + '"'; }
function rowsToCsv(headers, rows){ return [headers.map(csvCell).join(';'), ...rows.map(r=>headers.map(h=>csvCell(r[h])).join(';'))].join('\n'); }
function appointmentCsvRows(){
  return (cache.appointments||[]).map(a=>({
    data:a.date||'', horario:a.time||'', cliente:a.client_name||'', telefone:a.client_phone||'', barbeiro:barberName(a.barber_id)||'', servico:appointmentServiceName(a)||'', valor:Number(a.services?.price||0).toFixed(2).replace('.',','), duracao:a.services?.duration||'', status:a.status||''
  }));
}
function clientCsvRows(){
  const map={};
  (cache.appointments||[]).filter(a=>a.client_name||a.client_phone).forEach(a=>{
    const key=String(a.client_phone||a.client_name).trim().toLowerCase();
    if(!map[key]) map[key]={cliente:a.client_name||'', telefone:a.client_phone||'', ultimo:'', total:0, gasto:0};
    map[key].total += 1;
    map[key].gasto += a.status==='concluido' ? Number(a.services?.price||0) : 0;
    if(a.status==='concluido' && String(a.date||'') > String(map[key].ultimo||'')) map[key].ultimo = a.date;
  });
  return Object.values(map).sort((a,b)=>String(b.ultimo||'').localeCompare(String(a.ultimo||''))).map(c=>({
    cliente:c.cliente, telefone:c.telefone, ultimo_atendimento:c.ultimo, total_agendamentos:c.total, gasto_concluido:c.gasto.toFixed(2).replace('.',',')
  }));
}
function findScheduleConflicts(){
  const list=(cache.appointments||[]).filter(a=>statusBlocks(a.status) && !isClosureAppt(a));
  const conflicts=[];
  list.forEach((a,idx)=>{
    for(let j=idx+1;j<list.length;j++){
      const b=list[j];
      if(a.barber_id===b.barber_id && a.date===b.date && intervalOverlaps(a.time,appointmentService(a)?.duration||30,b.time,b.services?.duration||30)){
        conflicts.push({a,b});
      }
    }
  });
  return conflicts;
}
function proHealthChecks(){
  const cfg = typeof getUnitConfig==='function' ? getUnitConfig() : {barberUnits:{}};
  const missingPhone=(cache.appointments||[]).filter(a=>a.client_name && !String(a.client_phone||'').trim() && ['agendado','encaixe','em_carteira'].includes(a.status)).length;
  const servicesBad=(cache.services||[]).filter(s=>!s.name || Number(s.price||0)<0 || Number(s.duration||0)<=0).length;
  const noCommission=(cache.shopBarbers||[]).filter(b=>Number(b.commission_rate||0)===0).length;
  const noUnit=(cache.shopBarbers||[]).filter(b=>!cfg.barberUnits?.[b.id]).length;
  const conflicts=findScheduleConflicts().length;
  const pending=typeof overdueAppointments==='function' ? overdueAppointments().length : 0;
  return [
    {label:'Agendamentos conflitantes', value:conflicts, ok:conflicts===0, fix:'Abrir Agenda e remarcar horários sobrepostos.'},
    {label:'Agendamentos passados sem baixa', value:pending, ok:pending===0, fix:'Abrir Pendências / Baixa.'},
    {label:'Clientes sem telefone para WhatsApp', value:missingPhone, ok:missingPhone===0, fix:'Completar telefone nos agendamentos/clientes importantes.'},
    {label:'Serviços com cadastro incompleto', value:servicesBad, ok:servicesBad===0, fix:'Revisar nome, preço e duração em Serviços.'},
    {label:'Barbeiros sem comissão definida', value:noCommission, ok:noCommission===0, fix:'Definir comissão em Comissões.'},
    {label:'Barbeiros sem unidade vinculada', value:noUnit, ok:noUnit===0, fix:'Abrir Unidades e vincular cada barbeiro.'}
  ];
}
function backupPage(){
  if(!isAdminRole()) return `<div class="card"><h3>Acesso negado</h3><p class="muted">Gestão PRO, backup, CSV e auditoria são exclusivos do Admin Master do ZenBarber.</p></div>`;
  const done=(cache.appointments||[]).filter(a=>a.status==='concluido');
  const revenue=done.reduce((t,a)=>t+Number(a.services?.price||0),0);
  const clients=clientCsvRows();
  const health=proHealthChecks();
  const score=Math.max(0, Math.round(100 - health.reduce((t,h)=>t+(h.ok?0:Math.min(25,Number(h.value||0)*7)),0)));
  const conflicts=findScheduleConflicts().slice(0,5);
  return `<section class="dashboardHero card proHero"><div><span class="eyebrow">ZenBarber PRO</span><h2>Gestão, backup e auditoria</h2><p class="muted">Painel para deixar a barbearia mais segura antes de subir versões, vender para clientes maiores ou migrar dados.</p></div><div class="heroPulse"><b>${score}%</b><small>saúde da base</small></div></section>
  <div class="premiumStatGrid"><div class="premiumStat green"><span>Backup</span><b>JSON</b><small>barbeiros, serviços e agenda</small></div><div class="premiumStat blue"><span>Exportação</span><b>CSV</b><small>agenda e clientes</small></div><div class="premiumStat amber"><span>Auditoria</span><b>${health.filter(h=>!h.ok).length}</b><small>ponto(s) de atenção</small></div><div class="premiumStat purple"><span>Clientes únicos</span><b>${clients.length}</b><small>${money(revenue)} concluído</small></div></div>
  <div class="grid2"><div class="card"><h3>Backups e exportações</h3><p class="muted">Use antes de mudanças grandes ou para enviar dados ao dono da barbearia.</p><div class="row"><button class="primary" onclick="downloadBackup()">Baixar backup JSON</button><button onclick="downloadAppointmentsCsv()">Agenda CSV</button><button onclick="downloadClientsCsv()">Clientes CSV</button></div><p class="muted">O backup JSON não exporta senhas dos barbeiros.</p></div><div class="card"><h3>Resumo operacional</h3><div class="item"><div><strong>${cache.shopBarbers.length} barbeiro(s)</strong><small>${cache.services.length} serviço(s) no catálogo ativo</small></div></div><div class="item"><div><strong>${cache.appointments.length} agendamento(s)</strong><small>${done.length} concluído(s) • ${money(revenue)} faturado</small></div></div></div></div>
  <div class="card"><h3>Auditoria da base</h3><p class="muted">Pontos que podem atrapalhar agenda, WhatsApp, comissão, multiunidade ou venda para barbearias maiores.</p>${health.map(h=>`<div class="item proAudit ${h.ok?'ok':'warn'}"><div><strong>${h.ok?'✅':'⚠️'} ${esc(h.label)}</strong><small>${h.ok?'Tudo certo':'Encontrado(s): '+h.value+' • '+h.fix}</small></div>${!h.ok && h.label.includes('Pendências')?'<button onclick="page=\'pending\';renderApp()">Abrir</button>':''}${!h.ok && h.label.includes('comissão')?'<button onclick="page=\'commissions\';renderApp()">Abrir</button>':''}${!h.ok && h.label.includes('unidade')?'<button onclick="page=\'units\';renderApp()">Abrir</button>':''}${!h.ok && h.label.includes('Serviços')?'<button onclick="page=\'services\';renderApp()">Abrir</button>':''}</div>`).join('')}</div>
  ${conflicts.length?`<div class="card"><h3>Conflitos encontrados</h3>${conflicts.map(c=>`<div class="item"><div><strong>${esc(barberName(c.a.barber_id))} • ${formatDateBR(c.a.date)} às ${esc(c.a.time)}</strong><small>${esc(c.a.client_name||'Cliente')} sobrepõe ${esc(c.b.client_name||'outro cliente')}</small></div><button onclick="page='appointments';renderApp()">Abrir agenda</button></div>`).join('')}</div>`:''}`;
}
window.downloadBackup = () => {
  if(!isAdminRole()) return toast('Backup exclusivo do Admin Master.');
  const safeBarbers=(cache.shopBarbers||[]).map(({password,...b})=>b);
  const data={date:new Date().toISOString(),shop:sameShopName(),active_unit:typeof getActiveUnitId==='function'?getActiveUnitId():'all',units:typeof getUnitConfig==='function'?getUnitConfig():null,barbers:safeBarbers,services:cache.services,appointments:cache.appointments,health:proHealthChecks()};
  downloadTextFile('backup-zenbarber-'+todayISO()+'.json', JSON.stringify(data,null,2), 'application/json;charset=utf-8');
};
window.downloadAppointmentsCsv = () => { if(!isAdminRole()) return toast('Exportação CSV exclusiva do Admin Master.'); downloadTextFile('agenda-zenbarber-'+todayISO()+'.csv', rowsToCsv(['data','horario','cliente','telefone','barbeiro','servico','valor','duracao','status'], appointmentCsvRows()), 'text/csv;charset=utf-8'); };
window.downloadClientsCsv = () => { if(!isAdminRole()) return toast('Exportação CSV exclusiva do Admin Master.'); downloadTextFile('clientes-zenbarber-'+todayISO()+'.csv', rowsToCsv(['cliente','telefone','ultimo_atendimento','total_agendamentos','gasto_concluido'], clientCsvRows()), 'text/csv;charset=utf-8'); };

function linkPage(){return `<div class="card"><h3>Seu link para clientes</h3><p class="muted">Esse é o link da barbearia. O cliente escolhe o barbeiro, serviço, data e horário livre.</p>${linkSnippet()}</div><div class="card"><h3>Mensagem pronta</h3><div class="linkBox">Olá! Para agendar seu horário na ${sameShopName()}, acesse: ${publicDashboardLink()}</div></div>`}
window.copyLink = () => {navigator.clipboard.writeText(publicDashboardLink()); toast("Link copiado")};



// ===== ADM SaaS / Mensalidades das barbearias =====
