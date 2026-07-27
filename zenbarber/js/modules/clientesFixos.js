function addDaysISO(date, days){ const d=new Date(date+"T12:00:00"); d.setDate(d.getDate()+Number(days||0)); return d.toISOString().slice(0,10); }
function addMonthsISO(date, months){ const d=new Date(date+"T12:00:00"); d.setMonth(d.getMonth()+Number(months||0)); return d.toISOString().slice(0,10); }
function recurringCountFor(frequency, periodWeeks){
  // Agora o operador define por quantas semanas o pacote deve bloquear.
  // Ex: semanal por 12 semanas = 12 horários; quinzenal por 12 semanas = 6 horários; mensal por 12 semanas ≈ 3 horários.
  const weeks = Math.max(1, Number(periodWeeks || 12));
  if(frequency==='biweekly') return Math.max(1, Math.ceil(weeks/2));
  if(frequency==='monthly') return Math.max(1, Math.ceil(weeks/4));
  return weeks;
}
function nextDateForWeekday(start, weekday){
  const base = new Date(String(start||todayISO()).slice(0,10)+"T12:00:00");
  const target = Number(weekday);
  if(Number.isNaN(target)) return base.toISOString().slice(0,10);
  const diff = (target - base.getDay() + 7) % 7;
  base.setDate(base.getDate()+diff);
  return base.toISOString().slice(0,10);
}
function recurringDates(start, frequency, count, weekday){
  // Gera datas reais de recorrência, respeitando o dia da semana escolhido.
  const dates=[];
  let current=nextDateForWeekday(start, weekday);
  const max=Number(count || recurringCountFor(frequency,12));
  const seen=new Set();
  for(let i=0;i<max && current;i++){
    if(!seen.has(current)){ dates.push(current); seen.add(current); }
    if(frequency==='weekly') current=addDaysISO(current,7);
    else if(frequency==='biweekly') current=addDaysISO(current,14);
    else if(frequency==='monthly') current=addMonthsISO(current,1);
    else current=addDaysISO(current,7);
  }
  return dates;
}
function weekdayOptions(selected){
  const names=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const val = selected ?? new Date(todayISO()+"T12:00:00").getDay();
  return names.map((n,i)=>`<option value="${i}" ${Number(val)===i?'selected':''}>${n}</option>`).join('');
}
function frequencyLabel(f){ return ({weekly:'Semanal',biweekly:'Quinzenal',monthly:'Mensal'})[f] || 'Semanal'; }
function monthDiffInclusive(startDate, endDate){
  const a=new Date(startDate+'T12:00:00');
  const b=new Date(endDate+'T12:00:00');
  if(isNaN(a)||isNaN(b)) return 1;
  return Math.max(1, (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth()) + 1);
}
function addMonthsISO(startDate, monthsToAdd, billingDay){
  const d=new Date(startDate+'T12:00:00');
  const y=d.getFullYear();
  const m=d.getMonth()+Number(monthsToAdd||0);
  const target=new Date(y, m, 1, 12, 0, 0);
  const last=new Date(target.getFullYear(), target.getMonth()+1, 0).getDate();
  target.setDate(Math.min(Math.max(1, Number(billingDay||1)), last));
  return target.toISOString().slice(0,10);
}
function firstMonthlyChargeISO(startDate, billingDay){
  const start=new Date(startDate+'T12:00:00');
  let charge=addMonthsISO(startDate, 0, billingDay);
  if(new Date(charge+'T12:00:00') < start){
    charge=addMonthsISO(startDate, 1, billingDay);
  }
  return charge;
}
function monthlyInstallmentCount(freq, weeks){
  // Compatibilidade com pacotes antigos que ainda usavam semanas.
  return Math.max(1, Math.ceil(Number(weeks||1) / 4));
}
function appointmentsPerMonthByFrequency(freq){
  // Regra simples para o barbeiro não precisar fazer conta:
  // semanal = 4 atendimentos/mês, quinzenal = 2 atendimentos/mês, mensal = 1 atendimento/mês.
  if(freq==='biweekly') return 2;
  if(freq==='monthly') return 1;
  return 4;
}
function recurringCountForMonths(freq, months){
  return Math.max(1, Number(months||1) * appointmentsPerMonthByFrequency(freq));
}
function addCalendarMonthsKeepDayISO(date, months){
  const base=new Date(String(date||todayISO()).slice(0,10)+'T12:00:00');
  const originalDay=base.getDate();
  const target=new Date(base.getFullYear(), base.getMonth()+Number(months||0), 1, 12, 0, 0);
  const last=new Date(target.getFullYear(), target.getMonth()+1, 0).getDate();
  target.setDate(Math.min(originalDay,last));
  return target.toISOString().slice(0,10);
}
function simpleContractTotal(monthlyValue, months){
  return Number(monthlyValue||0) * Math.max(1, Number(months||1));
}
function fixedServiceIsScheduleBlock(a){
  const n=String(a?.services?.name||'').toLowerCase();
  return n.includes('bloqueio assinatura') || n.includes('assinatura semanal') || n.includes('cliente fixo') || (n.includes('assinatura') && !n.includes('parcela mensal') && !n.includes('parcela semanal') && !n.includes('recebimento'));
}
function fixedServiceIsPayment(a){
  const n=String(a?.services?.name||'').toLowerCase();
  return n.includes('parcela mensal') || n.includes('parcela semanal') || n.includes('recebimento imediato') || n.includes('recebimento final') || /^Parcela\s+\d+\/\d+\s+assinatura/i.test(String(a?.client_name||''));
}
function fixedSubscriptionRevenueFromGroup(g){
  try{
    const p=parcelInfoForFixedClient(g[0]);
    if(p.total) return Number(p.total||0)*Number(p.value||0);
  }catch(e){}
  // Se for um grupo de bloqueios de agenda, não soma atendimento como receita.
  // Receita de cliente fixo vem somente de parcela mensal/recebimento.
  return (g||[]).filter(fixedServiceIsPayment).reduce((t,a)=>t+Number(a.services?.price||0),0);
}
function updateRecurringPreview(){
  const value=Number(String(document.getElementById('rvalue')?.value||'0').replace(',','.'))||0;
  const months=Math.max(1,Math.min(24,Number(document.getElementById('rmonths')?.value||1)));
  const freq=document.getElementById('rfq')?.value||'weekly';
  const pay=document.getElementById('rpay')?.value||'monthly';
  const el=document.getElementById('recurringPreview');
  if(!el) return;
  const attends=recurringCountForMonths(freq, months);
  const total=value*months;
  const weeklyParcels=months*4;
  const paymentText = pay==='weekly' ? `${weeklyParcels} parcela(s) semanal(is) de ${money(value/4)} = <strong>${money(total)}</strong> no contrato` : pay==='monthly' ? `${months} mensalidade(s) de ${money(value)} = <strong>${money(total)}</strong> no contrato` : `contrato total de <strong>${money(total)}</strong>`;
  el.innerHTML = `<b>Resumo automático:</b> ${paymentText}. A frequência ${frequencyLabel(freq).toLowerCase()} cria ${attends} horário(s) na agenda, mas esses horários ficam com R$0,00 para não inflar o faturamento.`;
}
window.toggleBillingDay = () => {
  const pay=document.getElementById('rpay')?.value;
  const box=document.getElementById('rbilldateBox');
  if(box) box.classList.toggle('hidden', !(pay==='monthly' || pay==='weekly'));
  updateRecurringPreview();
};
function subscriptionCodeFrom(obj){
  const txt = `${obj?.contract_code||''} ${obj?.client_name||''} ${obj?.services?.name||''}`;
  const m = String(txt).match(/ZB-[A-Z0-9]{5,}/i);
  return m ? m[0].toUpperCase() : '';
}
function stripSubscriptionCode(txt){
  return String(txt||'').replace(/\s*[•\-]?\s*ZB-[A-Z0-9]{5,}\s*/ig,' ').replace(/\s+/g,' ').trim();
}
function cleanPackageNameFromService(name){
  return stripSubscriptionCode(String(name||'Assinatura'))
    .replace(/•\s*(bloqueio assinatura|assinatura semanal|recebimento imediato|recebimento final|parcela mensal|parcela semanal).*$/i,'')
    .replace(/\s+/g,' ')
    .trim() || 'Assinatura';
}
function fixedClientGroupKey(a){
  const code = subscriptionCodeFrom(a);
  if(code) return ['contract', code, a?.barber_id||''].join('|');
  const phone = normPhone(a?.client_phone);
  const who = phone || normName(a?.client_name) || 'cliente';
  const pack = cleanPackageNameFromService(a?.services?.name).toLowerCase();
  return [who, a?.barber_id||'', a?.time||'', pack].join('|');
}
function parcelInfoForFixedClient(base){
  const phone = normPhone(base?.client_phone);
  const baseName = subscriptionBaseName(stripSubscriptionCode(base?.client_name));
  const baseCode = subscriptionCodeFrom(base);
  const basePack = cleanPackageNameFromService(base?.services?.name).toLowerCase();
  const parcels = cache.appointments.filter(a=>{
    const serviceName=String(a.services?.name||'').toLowerCase();
    const clientName=subscriptionBaseName(stripSubscriptionCode(a.client_name));
    const samePhone=phone && normPhone(a.client_phone)===phone;
    const sameName=baseName && (clientName===baseName || clientName.includes(baseName) || baseName.includes(clientName));
    const isParcel = serviceName.includes('parcela mensal') || serviceName.includes('parcela semanal') || /^Parcela\s+\d+\/\d+\s+assinatura/i.test(String(a.client_name||''));
    if(!isParcel || a.barber_id!==base.barber_id) return false;
    const code = subscriptionCodeFrom(a);
    if(baseCode) return code === baseCode;
    if(code) return false; // contrato novo com código não deve misturar com contrato antigo sem código
    const pack = cleanPackageNameFromService(a.services?.name).toLowerCase();
    return (samePhone || sameName) && (!basePack || !pack || pack===basePack);
  }).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  let total = parcels.length;
  parcels.forEach(a=>{ const m=String(a.client_name||'').match(/Parcela\s+\d+\/(\d+)/i); if(m) total=Math.max(total, Number(m[1]||0)); });
  const paid = parcels.filter(a=>a.status==='concluido').length;
  const pending = total ? Math.max(0,total-paid) : 0;
  const value = parcels[0]?.services?.price || 0;
  return {parcels,total,paid,pending,value,code:baseCode};
}
function initialsFromName(name){
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return 'CL';
  return (parts[0][0] + (parts.length>1 ? parts[parts.length-1][0] : '')).toUpperCase();
}
function fixedClientStatus(g, parcels){
  const today=todayISO();
  const pendingCharges = (parcels?.parcels||[]).filter(a=>a.status!=='concluido');
  const overdue = pendingCharges.some(a=>String(a.date||'') < today);
  const nextCharge = pendingCharges.filter(a=>String(a.date||'') >= today).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))[0];
  const daysToNext = nextCharge ? Math.ceil((new Date(nextCharge.date+'T12:00:00')-new Date(today+'T12:00:00'))/86400000) : null;
  const future = (g||[]).filter(a=>a.status==='agendado' && String(a.date||'')>=today).length;
  if(parcels?.total && parcels.paid>=parcels.total) return {cls:'done',label:'Finalizado'};
  if(overdue) return {cls:'late',label:'Atrasado'};
  if(daysToNext!==null && daysToNext<=5) return {cls:'soon',label:'Vencendo'};
  if(!future) return {cls:'done',label:'Finalizado'};
  return {cls:'ok',label:'Em dia'};
}
function fixedClientProgressHtml(paid,total,label='Parcelas da assinatura'){
  total=Math.max(1, Number(total||1));
  paid=Math.max(0, Math.min(Number(paid||0), total));
  const pct=Math.round((paid/total)*100);
  const cells=[];
  for(let i=1;i<=total;i++) cells.push(`<span title="Parcela ${i}" class="payDot ${i<=paid?'paid':'open'}"><b>${i}</b></span>`);
  return `<div class="payProgress premium" style="--pct:${pct}%"><div class="payProgressTop"><div><strong>${esc(label)}</strong><em>${pct}% concluído</em></div><small>${paid}/${total} ${label.toLowerCase().includes('parcela')?'pagas':'realizados'} • ${Math.max(0,total-paid)} restantes</small></div><div class="payBar"><i></i></div><div class="payDots">${cells.join('')}</div></div>`;
}
function fixedClientCardHtml(g){
  const sorted = g.slice().sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const first = sorted[0];
  const last = sorted[sorted.length-1];
  const parcels = parcelInfoForFixedClient(first);
  const linkedWallet = linkedWalletChargesFor(first, sorted);
  const allRelated = cache.appointments.filter(a=>sameFixedClient(first,a) && a.barber_id===first.barber_id && !isClosureAppt(a));
  const completed = allRelated.filter(a=>a.status==='concluido' && !isMonthlyParcel(a)).length;
  const future = sorted.filter(a=>a.status==='agendado' && a.date>=todayISO()).length;
  const totalAttendances = completed + future;
  const hasParcels = parcels.total > 0;
  const totalValue = hasParcels ? parcels.total * Number(parcels.value||0) : fixedSubscriptionRevenueFromGroup(sorted);
  const packageName = cleanPackageNameFromService(first.services?.name);
  const weekday = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][new Date(first.date+'T12:00:00').getDay()] || '';
  const start = sorted[0]?.date || first.date;
  const end = last?.date || first.date;
  const paidForChart = hasParcels ? parcels.paid : completed;
  const totalForChart = hasParcels ? parcels.total : Math.max(1,totalAttendances);
  const parcelLine = hasParcels ? `${parcels.total} parcela(s) de ${money(parcels.value)}` : `${totalAttendances} atendimento(s) no pacote`;
  const installmentValue = hasParcels ? Number(parcels.value||0) : 0;
  const nextParcel = (parcels.parcels||[]).filter(a=>a.status!=='concluido').sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))[0];
  const lastPaid = (parcels.parcels||[]).filter(a=>a.status==='concluido').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
  const status = fixedClientStatus(sorted, parcels);
  return `<details class="fixedClientCard">
    <summary>
      <div class="fixedClientMain">
        <div class="fixedIdentity">
          <span class="fixedAvatar">${esc(initialsFromName(first.client_name))}</span>
          <div>
            <strong>${esc(stripSubscriptionCode(first.client_name))}</strong>
            <small>${esc(first.client_phone||'Sem telefone')} • ${esc(barberName(first.barber_id))}</small>
          </div>
        </div>
        <div class="fixedClientFacts">
          <span class="statusPill ${status.cls}"><b>${status.label}</b><small>Status</small></span>
          <span><b>${money(totalValue)}</b><small>valor total</small></span>
          <span><b>${esc(weekday)}</b><small>${esc(first.time)} até ${endTime(first.time, first.services?.duration||30)}</small></span>
        </div>
      </div>
      <span class="fixedArrow">⌄</span>
    </summary>
    <div class="fixedClientExpand">
      <div class="fixedInfoGrid">
        <div><small>Pacote</small><b>${esc(packageName)}</b></div>
        <div><small>Data inicial</small><b>${formatDateBR(start)}</b></div>
        <div><small>Data final</small><b>${formatDateBR(end)}</b></div>
        <div><small>Parcelamento</small><b>${esc(parcelLine)}</b></div>
        <div><small>Valor da parcela</small><b>${installmentValue ? money(installmentValue) : '—'}</b></div>
        <div><small>Último pagamento</small><b>${lastPaid ? formatDateBR(lastPaid.date) : 'Ainda não pago'}</b></div>
        <div><small>Próximo vencimento</small><b>${nextParcel ? formatDateBR(nextParcel.date) : 'Sem pendências'}</b></div>
        <div><small>Horários ativos</small><b>${future} futuro(s)</b></div>
      </div>
      ${fixedClientProgressHtml(paidForChart,totalForChart, hasParcels ? 'Parcelas da assinatura' : 'Atendimentos do pacote')}
      <div class="fixedActions">
        <button class="primary" onclick="openEditFixedClient('${first.id}')">Editar cliente fixo</button>
        <a target="_blank" href="${wa(first.client_phone,`Olá ${first.client_name}, lembrando do seu horário fixo na ${sameShopName()} toda ${weekday} às ${first.time}.`)}"><button class="whats">WhatsApp automático</button></a>
        <button class="danger" onclick="cancelFixedClientPackage('${first.id}')">Cancelar pacote</button>
      </div>
      <small class="muted">${future} horário(s) futuro(s) ativo(s)${linkedWallet.length ? ` • ${linkedWallet.length} cobrança(s) em carteira` : ''}</small>
    </div>
  </details>`;
}

function fixedClientGroupByFirstId(id){
  const base=cache.appointments.find(a=>a.id===id);
  if(!base) return [];
  return cache.appointments.filter(a=>sameFixedClient(base,a) && a.barber_id===base.barber_id && !isClosureAppt(a));
}
function guessFixedFrequencyDays(g){
  const dates=[...new Set((g||[]).filter(a=>a.status==='agendado').map(a=>a.date).filter(Boolean))].sort();
  if(dates.length<2) return 7;
  const diffs=[];
  for(let i=1;i<dates.length;i++) diffs.push(Math.round((new Date(dates[i]+'T12:00:00')-new Date(dates[i-1]+'T12:00:00'))/86400000));
  return diffs.sort((a,b)=>a-b)[Math.floor(diffs.length/2)] || 7;
}
window.openEditFixedClient = (id) => {
  const group=fixedClientGroupByFirstId(id).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  if(!group.length) return toast('Cliente fixo não encontrado.');
  const first=group.find(a=>a.status==='agendado') || group[0];
  const parcels=parcelInfoForFixedClient(first);
  const start=group.filter(a=>a.status==='agendado').sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0]?.date || first.date || todayISO();
  const allServiceIds=[...new Set(group.map(a=>a.service_id).filter(Boolean))];
  const pack=String(first.services?.name||'Assinatura').split('•')[0].trim();
  const dur=Number(first.services?.duration||30);
  const totalValue = parcels.total ? Number(parcels.value||0)*Number(parcels.total||0) : group.reduce((t,a)=>t+Number(a.services?.price||0),0);
  const parcelValue = parcels.total ? Number(parcels.value||0) : 0;
  const firstParcel = (parcels.parcels||[]).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))[0];
  document.body.insertAdjacentHTML('beforeend',`<div class="modalBack" id="modal"><div class="modal wideModal"><h2>Editar cliente fixo</h2><p class="muted">Edite dados pessoais, pacote, datas de agendamento e datas/valores de pagamento. As alterações serão aplicadas nos horários futuros deste cliente.</p><div class="grid2">
    <label>Nome completo<input id="ef_name" value="${esc(first.client_name||'')}"></label>
    <label>WhatsApp<input id="ef_phone" value="${esc(first.client_phone||'')}"></label>
    <label>Barbeiro<select id="ef_barber" onchange="updateEditFixedSlots()">${barberOptions(first.barber_id)}</select></label>
    <label>Nome do pacote<input id="ef_pack" value="${esc(pack)}"></label>
    <label>Valor mensal da assinatura<input id="ef_monthly" type="number" min="0" step="0.01" value="${Number(parcelValue || (totalValue/Math.max(1,parcels.total||1)) || 0).toFixed(2)}"></label>
    <label>Total do contrato<input id="ef_total" type="number" min="0" step="0.01" value="${Number(totalValue||0).toFixed(2)}" disabled></label>
    <label>Data inicial dos agendamentos<input id="ef_start" type="date" value="${esc(start)}" onchange="updateEditFixedSlots()"></label>
    <label>Horário<select id="ef_time">${slotOptionsDuration(first.barber_id,start,dur)}</select></label>
    <label>Tempo por atendimento<input id="ef_dur" type="number" min="1" value="${dur}" oninput="updateEditFixedSlots()"></label>
    <label>Primeira data de pagamento<input id="ef_paydate" type="date" value="${esc(firstParcel?.date||start)}"></label>
  </div><small class="muted">Dica: para alterar somente um atendimento isolado, use a edição da Agenda. Aqui é edição do pacote/cliente fixo inteiro.</small><div class="row"><button class="primary" onclick="saveEditFixedClient('${id}')">Salvar cliente fixo</button><button onclick="modal.remove()">Cancelar</button></div></div></div>`);
  const time=document.getElementById('ef_time'); if(time) time.value=first.time||time.value;
};
window.updateEditFixedSlots = () => {
  const b=document.getElementById('ef_barber')?.value;
  const d=document.getElementById('ef_start')?.value || todayISO();
  const dur=Number(document.getElementById('ef_dur')?.value||30);
  const t=document.getElementById('ef_time'); if(t) t.innerHTML=slotOptionsDuration(b,d,dur);
};
window.saveEditFixedClient = async (id) => {
  try{
    const group=fixedClientGroupByFirstId(id).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    if(!group.length) return toast('Cliente fixo não encontrado.');
    const base=group.find(a=>a.status==='agendado') || group[0];
    const name=(document.getElementById('ef_name')?.value||'').trim();
    const phone=(document.getElementById('ef_phone')?.value||'').trim();
    const barberId=document.getElementById('ef_barber')?.value;
    const pack=(document.getElementById('ef_pack')?.value||'Assinatura').trim();
    const parcelValue=Number(String(document.getElementById('ef_monthly')?.value||'0').replace(',','.'));
    const totalValue=parcelValue * Math.max(1, (parcelInfoForFixedClient(base).total || 1));
    const start=document.getElementById('ef_start')?.value || base.date;
    const time=document.getElementById('ef_time')?.value || base.time;
    const dur=Math.max(1,Number(document.getElementById('ef_dur')?.value||base.services?.duration||30));
    const payDate=document.getElementById('ef_paydate')?.value || start;
    if(!name || !phone || !barberId || !pack || !start || !time) return toast('Preencha nome, telefone, barbeiro, pacote, data e horário.');
    const agendados=group.filter(a=>a.status==='agendado').sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const freqDays=guessFixedFrequencyDays(agendados);
    const serviceIds=[...new Set(group.map(a=>a.service_id).filter(Boolean))];
    for(const sid of serviceIds){
      const related=group.filter(a=>a.service_id===sid);
      const sample=related[0];
      const isParcel=related.some(isMonthlyParcel) || String(sample.services?.name||'').toLowerCase().includes('parcela');
      const isBlock=String(sample.services?.name||'').toLowerCase().includes('bloqueio');
      const price=isParcel ? parcelValue : (isBlock ? 0 : Number(sample.services?.price||0));
      await db.from('services').update({name:isParcel?`${pack} • parcela mensal`:isBlock?`${pack} • bloqueio assinatura`:pack, price:Number(price||0), duration:isParcel?1:dur}).eq('id',sid);
    }
    for(let i=0;i<agendados.length;i++){
      const a=agendados[i];
      const d=new Date(start+'T12:00:00'); d.setDate(d.getDate()+i*freqDays);
      const newDate=d.toISOString().slice(0,10);
      const payload={client_name:name,client_phone:phone,barber_id:barberId,date:newDate,time};
      const {error}=await db.from('appointments').update(payload).eq('id',a.id);
      if(error) throw new Error(error.message);
    }
    const parcels=parcelInfoForFixedClient(base).parcels||[];
    const billingDay=new Date(payDate+'T12:00:00').getDate();
    for(let i=0;i<parcels.length;i++){
      const a=parcels[i];
      const chargeDate=addMonthsISO(payDate,i,billingDay);
      const payload={client_name:`Parcela ${i+1}/${parcels.length} assinatura - ${name}`,client_phone:phone,barber_id:barberId,date:chargeDate,time:'00:00',reminder_date:chargeDate};
      const {error}=await db.from('appointments').update(payload).eq('id',a.id);
      if(error) throw new Error(error.message);
    }
    modal.remove();
    toast('Cliente fixo atualizado com sucesso.');
    await loadData(); renderApp();
  }catch(err){ toast(err.message||'Erro ao editar cliente fixo'); }
};
function recurringPage(){
  const bid = cache.shopBarbers[0]?.id || me.id;
  const startDate = todayISO();
  const selectedDay = dayIndex(startDate);
  const firstDate = nextDateForWeekday(startDate, selectedDay);
  const upcomingGroups={};
  cache.appointments.filter(a=>a.status==='agendado' && a.date>=todayISO() && !isClosureAppt(a)).forEach(a=>{
    const k=fixedClientGroupKey(a);
    if(!upcomingGroups[k]) upcomingGroups[k]=[];
    upcomingGroups[k].push(a);
  });
  const upcoming = Object.values(upcomingGroups)
    .filter(g=>g.length>1 || g.some(isSubscriptionServiceName))
    .sort((ga,gb)=>`${ga[0].date} ${ga[0].time}`.localeCompare(`${gb[0].date} ${gb[0].time}`))
    .slice(0,40);
  const crmMetrics = upcoming.reduce((acc,g)=>{
    const p=parcelInfoForFixedClient(g[0]);
    const st=fixedClientStatus(g,p);
    acc.active += 1;
    acc.expected += fixedSubscriptionRevenueFromGroup(g);
    acc.pending += p.pending || 0;
    if(st.cls==='late') acc.late += 1;
    return acc;
  },{active:0,expected:0,pending:0,late:0});
  const crmSummary = `<div class="fixedSummaryGrid">
    <div><small>Receita recorrente prevista</small><b>${money(crmMetrics.expected)}</b></div>
    <div><small>Assinaturas ativas</small><b>${crmMetrics.active}</b></div>
    <div><small>Parcelas pendentes</small><b>${crmMetrics.pending}</b></div>
    <div class="${crmMetrics.late?'dangerMetric':''}"><small>Clientes atrasados</small><b>${crmMetrics.late}</b></div>
  </div>`;
  return `<div class="card"><h3>Criar cliente fixo / assinatura</h3><p class="muted">Crie um pacote fixo para bloquear automaticamente a agenda e controlar quando o valor da assinatura entra no financeiro. Se escolher receber mensalmente, informe o valor mensal do plano.</p><div class="grid">
    <label>Nome do cliente<input id="rcn" placeholder=""></label>
    <label>WhatsApp<input id="rcp" placeholder=""></label>
    <label>Barbeiro<select id="rab" onchange="updateRecurringSlots()">${barberOptions(bid)}</select></label>
    <label>Nome do pacote/serviço<input id="rpack" placeholder=""></label>
    <label>Valor mensal da assinatura<input id="rvalue" type="number" min="0" step="0.01" placeholder="Ex: 200" oninput="updateRecurringPreview()"></label>
    <label>Tempo por atendimento<input id="rminutes" type="number" min="1" value="30" placeholder="" onchange="updateRecurringSlots()" oninput="updateRecurringSlots()"></label>
    <label>Data inicial<input id="rdt" type="date" min="${todayISO()}" value="${firstDate}" onchange="syncRecurringWeekday(); updateRecurringSlots()"></label>
    <label>Horário livre<select id="rtm">${slotOptionsDuration(bid,firstDate,30)}</select></label>
    <label>Frequência<select id="rfq" onchange="updateRecurringPreview();updateRecurringSlots()"><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option><option value="monthly">Mensal</option></select></label>
    <label>Dia da semana<select id="rday" onchange="updateRecurringDateFromWeekday(); updateRecurringSlots()">${weekdayOptions(selectedDay)}</select></label>
    <label>Duração do contrato em meses<input id="rmonths" type="number" min="1" max="24" value="3" placeholder="Ex: 3" oninput="updateRecurringPreview()"></label>
    <label>Forma de recebimento<select id="rpay" onchange="toggleBillingDay()"><option value="monthly">Receber mensalmente</option><option value="weekly">Receber semanalmente</option><option value="start">Receber contrato inteiro agora</option><option value="end">Receber contrato inteiro no final</option></select></label>
    <label id="rbilldateBox">Data da primeira cobrança<input id="rbilldate" type="date" min="${todayISO()}" value="${addMonthsISO(firstDate,0,new Date(firstDate+'T12:00:00').getDate())}" placeholder=""></label>
    <button id="saveRecurringBtn" class="primary" onclick="createRecurringClient()">Salvar assinatura</button>
  </div><div id="recurringPreview" class="subPreview"><b>Resumo automático:</b> informe valor, frequência e meses para ver o cálculo.</div><p class="muted">Regra corrigida: frequência cria horários; mensalidade cria parcelas. Exemplo: R$ 200 por 3 meses = R$ 600 total. Se escolher semanalmente, vira 12 parcelas de R$ 50. Os cortes semanais entram na agenda com R$0,00.</p></div><div class="card fixedClientsPanel"><h3>Próximos clientes fixos</h3><p class="muted">Agora cada cliente fixo aparece em uma única caixa. Clique na seta para abrir detalhes, cobrança, WhatsApp e cancelamento.</p>${crmSummary}<div class="row"><button class="danger" onclick="cleanupRecurringDuplicates()">Corrigir duplicados</button></div><div class="fixedClientList">${upcoming.map(fixedClientCardHtml).join('') || '<div class="empty">Nenhum cliente fixo criado ainda.</div>'}</div></div>`;
}

window.toggleRecurringBox = () => {
  const box=document.getElementById('recurringBox');
  const on=document.getElementById('rrec')?.checked;
  if(box) box.classList.toggle('hidden', !on);
};
window.updateRecurringDateFromWeekday = () => {
  const dateEl=document.getElementById('rdt');
  const dayEl=document.getElementById('rday');
  if(dateEl && dayEl){ dateEl.value = nextDateForWeekday(dateEl.value || todayISO(), dayEl.value); }
};
window.syncRecurringWeekday = () => {
  const d=document.getElementById('rdt')?.value;
  const sel=document.getElementById('rday');
  if(d && sel) sel.value = new Date(d+"T12:00:00").getDay();
};
window.updateRecurringSlots = () => {
  const dateEl=document.getElementById('rdt');
  const dayEl=document.getElementById('rday');
  const timeEl=document.getElementById('rtm');
  const barberEl=document.getElementById('rab');
  const minutesEl=document.getElementById('rminutes');
  if(!dateEl || !timeEl || !barberEl) return;
  if(!dateEl.value) dateEl.value=todayISO();
  const effectiveDate = dayEl ? nextDateForWeekday(dateEl.value, dayEl.value) : dateEl.value;
  dateEl.value = effectiveDate;
  timeEl.innerHTML = slotOptionsDuration(barberEl.value, effectiveDate, Number(minutesEl?.value||30));
};
window.createRecurringClient = async () => {
  if(window._creatingRecurring) return;
  window._creatingRecurring = true;
  const btn=document.getElementById('saveRecurringBtn');
  if(btn){ btn.disabled=true; btn.textContent='Salvando...'; }
  try{
    const name=(document.getElementById('rcn')?.value||'').trim();
    const phone=(document.getElementById('rcp')?.value||'').trim();
    const barberId=document.getElementById('rab')?.value;
    const pack=(document.getElementById('rpack')?.value||'Assinatura').trim();
    const monthlyValue=Number(String(document.getElementById('rvalue')?.value||'0').replace(',','.'));
    const dur=Math.max(1, Number(document.getElementById('rminutes')?.value || 30));
    const start=document.getElementById('rdt')?.value;
    const time=document.getElementById('rtm')?.value;
    const freq = document.getElementById('rfq')?.value || 'weekly';
    const weekday = document.getElementById('rday')?.value;
    const contractMonths = Math.max(1, Math.min(24, Number(document.getElementById('rmonths')?.value || 3)));
    const totalContractValue = simpleContractTotal(monthlyValue, contractMonths);
    const contractCode = 'ZB-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const payMode = document.getElementById('rpay')?.value || 'monthly';
    const firstBillingDate = document.getElementById('rbilldate')?.value || '';
    if(!name || !phone || !barberId || !pack || !start || !time) return toast('Preencha todos os dados da assinatura');
    if(!monthlyValue || monthlyValue <= 0) return toast('Informe o valor mensal da assinatura');
    if(!weekday && weekday !== 0) return toast('Escolha o dia da semana do atendimento recorrente');
    if((payMode==='monthly' || payMode==='weekly') && !firstBillingDate) return toast('Escolha a data da primeira cobrança');
    const total = recurringCountForMonths(freq, contractMonths);
    const dates = recurringDates(start,freq,total,weekday);
    const rows=[]; let skipped=0;

    const makeService = async (nameSuffix, price, duration) => {
      const payload = {barber_id:barberId, name:nameSuffix, price:Number(price||0), duration:Number(duration||dur)};
      const {data,error}=await db.from('services').insert(payload).select().single();
      if(error) throw new Error(error.message);
      return data.id;
    };

    let serviceIdZero=null, serviceIdTotal=null, serviceIdMonthly=null, serviceIdWeekly=null;
    const firstBillingDay = (payMode==='monthly' || payMode==='weekly') ? new Date(firstBillingDate+'T12:00:00').getDate() : new Date(start+'T12:00:00').getDate();
    // Todos os horários recorrentes são apenas BLOQUEIOS de agenda com valor R$0,00.
    // O dinheiro da assinatura entra somente nas cobranças/recebimentos abaixo.
    serviceIdZero = await makeService(`${pack} • ${contractCode} • bloqueio assinatura`, 0, dur);
    if(payMode==='monthly'){
      serviceIdMonthly = await makeService(`${pack} • ${contractCode} • parcela mensal`, monthlyValue, 1);
    } else if(payMode==='weekly'){
      serviceIdWeekly = await makeService(`${pack} • ${contractCode} • parcela semanal`, monthlyValue/4, 1);
    } else if(payMode==='end'){
      serviceIdTotal = await makeService(`${pack} • ${contractCode} • recebimento final`, totalContractValue, 1);
    } else {
      serviceIdTotal = await makeService(`${pack} • ${contractCode} • recebimento imediato`, totalContractValue, 1);
    }

    for(let i=0;i<dates.length;i++){
      const date = dates[i];
      const repeatedInBatch = rows.some(r=>r.barber_id===barberId && r.date===date && r.time===time && statusBlocks(r.status));
      if(repeatedInBatch){ skipped++; continue; }
      const has=await hasConflictDuration(barberId,date,time,dur);
      if(has){ skipped++; continue; }
      rows.push({barber_id:barberId,service_id:serviceIdZero,client_name:name,client_phone:phone,date,time,status:'agendado'});
    }
    if(!rows.length) return toast('Nenhum horário foi criado porque todos tinham conflito.');
    if(payMode==='start'){
      rows.push({barber_id:barberId,service_id:serviceIdTotal,client_name:`Recebimento assinatura ${contractCode} - ${name}`,client_phone:phone,date:rows[0].date,time:'00:00',status:'concluido'});
    }
    if(payMode==='monthly'){
      const months = contractMonths;
      const firstCharge = firstBillingDate;
      const billingDay = firstBillingDay;
      for(let m=0;m<months;m++){
        const chargeDate = addMonthsISO(firstCharge, m, billingDay);
        rows.push({barber_id:barberId,service_id:serviceIdMonthly,client_name:`Parcela ${m+1}/${months} assinatura ${contractCode} - ${name}`,client_phone:phone,date:chargeDate,time:'00:00',status:'em_carteira',reminder_date:chargeDate,reminder_days:0});
      }
    }
    if(payMode==='weekly'){
      const weeks = contractMonths * 4;
      for(let w=0; w<weeks; w++){
        const chargeDate = addDaysISO(firstBillingDate, w*7);
        rows.push({barber_id:barberId,service_id:serviceIdWeekly,client_name:`Parcela ${w+1}/${weeks} assinatura ${contractCode} - ${name}`,client_phone:phone,date:chargeDate,time:'00:00',status:'em_carteira',reminder_date:chargeDate,reminder_days:0});
      }
    }
    if(payMode==='end'){
      const finalDate = rows.filter(r=>r.status==='agendado').slice(-1)[0]?.date || rows[0].date;
      rows.push({barber_id:barberId,service_id:serviceIdTotal,client_name:`Recebimento final assinatura ${contractCode} - ${name}`,client_phone:phone,date:finalDate,time:'00:00',status:'em_carteira',reminder_date:finalDate,reminder_days:0});
    }
    const {error}=await db.from('appointments').insert(rows);
    if(error) return toast(error.message);
    const msgPay = payMode==='start' ? `contrato de ${money(totalContractValue)} lançado no faturamento agora` : payMode==='end' ? `contrato de ${money(totalContractValue)} ficará em carteira no final` : payMode==='weekly' ? `${contractMonths*4} parcela(s) semanal(is) de ${money(monthlyValue/4)} criada(s), totalizando ${money(totalContractValue)}` : `${contractMonths} parcela(s) mensal(is) de ${money(monthlyValue)} criada(s), totalizando ${money(totalContractValue)}`;
    toast(`${rows.filter(r=>r.status==='agendado').length} bloqueio(s) criado(s); ${msgPay}. ${skipped ? skipped+' pulado(s) por conflito.' : ''}`);
    renderApp();
  } catch(err){
    toast(err.message || 'Erro ao salvar assinatura');
  } finally {
    window._creatingRecurring = false;
    if(btn){ btn.disabled=false; btn.textContent='Salvar assinatura'; }
  }
};

window.normalizeFixedClientFinance = async () => {
  if(!confirm('Corrigir pacotes antigos? Horários recorrentes/assinaturas antigas ficarão com valor R$0,00, evitando faturamento inflado. As parcelas mensais e recebimentos continuam valendo.')) return;
  try{
    const usedAsPayments = new Set((cache.appointments||[]).filter(fixedServiceIsPayment).map(a=>a.service_id).filter(Boolean));
    const targets=(cache.services||[]).filter(s=>{
      const n=String(s.name||'').toLowerCase();
      if(usedAsPayments.has(s.id)) return false;
      return n.includes('bloqueio assinatura') || n.includes('assinatura semanal') || n.includes('cliente fixo') || (n.includes('assinatura') && !n.includes('parcela mensal') && !n.includes('parcela semanal') && !n.includes('recebimento'));
    });
    let changed=0;
    for(const sv of targets){
      const newName=String(sv.name||'Assinatura').replace(/assinatura semanal/ig,'bloqueio assinatura').replace(/cliente fixo/ig,'bloqueio assinatura');
      const {error}=await db.from('services').update({name:newName, price:0}).eq('id',sv.id);
      if(error) throw new Error(error.message);
      changed++;
    }
    toast(`${changed} serviço(s) antigo(s) normalizado(s). Os cortes recorrentes não inflarão mais o faturamento.`);
    await loadData(); renderApp();
  }catch(err){ toast(err.message || 'Erro ao corrigir lógica financeira antiga'); }
};

window.cleanupRecurringDuplicates = async () => {
  const active = cache.appointments.filter(a=>['agendado','em_andamento','em_carteira'].includes(a.status));
  const seen = new Map();
  const duplicates = [];
  active.sort((a,b)=>String(a.created_at||a.id).localeCompare(String(b.created_at||b.id))).forEach(a=>{
    const k=[a.barber_id,a.service_id,a.date,a.time,(a.client_phone||a.client_name||'').toLowerCase()].join('|');
    if(seen.has(k)) duplicates.push(a.id); else seen.set(k,a.id);
  });
  if(!duplicates.length) return toast('Nenhum agendamento duplicado encontrado.');
  const {error}=await db.from('appointments').update({status:'cancelado'}).in('id',duplicates);
  if(error) return toast(error.message);
  toast(`${duplicates.length} duplicado(s) cancelado(s).`);
  renderApp();
};

