// ===== DashboardService (Sprint 016) =====
window.DashboardService={
 metrics(done,wallet){
   return {
     revenue:DashboardMetrics.revenue(done),
     commission:DashboardMetrics.commission(done),
     profit:DashboardMetrics.revenue(done)-DashboardMetrics.commission(done),
     wallet:DashboardMetrics.wallet(wallet)
   };
 }
};
// ===== End DashboardService =====

// Refatoração NextJumpX v2.1.11
const DashboardMetrics={
 revenue(list){return list.reduce((t,a)=>t+Number(a.services?.price||0),0);},
 commission(list){return list.reduce((t,a)=>t+commissionValueFor(a),0);},
 wallet(list){return list.reduce((t,a)=>t+Number(a.services?.price||0),0);}
};

function monthKey(date){ return String(date||'').slice(0,7); }
function monthLabel(key){
  const [y,m]=String(key||dashboardMonth).split('-');
  if(!y||!m) return key||'';
  const names=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${names[Number(m)-1]||m}/${y}`;
}
function monthOptions(){
  const months = new Set([dashboardMonth, new Date().toISOString().slice(0,7)]);
  cache.appointments.forEach(a=>{ if(a.date) months.add(monthKey(a.date)); });
  return [...months].filter(Boolean).sort().reverse().map(m=>`<option value="${m}" ${m===dashboardMonth?'selected':''}>${monthLabel(m)}</option>`).join('');
}
window.changeDashboardMonth = () => { dashboardMonth = document.getElementById('dashMonth')?.value || new Date().toISOString().slice(0,7); renderApp(); };

function commissionPercentFor(a){ return Number(barberById(a.barber_id)?.commission_rate || 0); }
function commissionValueFor(a){ return Number(a.services?.price||0) * commissionPercentFor(a) / 100; }
function dash(){
  const selectedMonth = dashboardMonth || new Date().toISOString().slice(0,7);
  const today = todayISO();
  const allDone = cache.appointments.filter(a=>a.status==='concluido');
  const done = allDone.filter(a=>monthKey(a.date)===selectedMonth);
  const activeToday = cache.appointments.filter(a=>['agendado','encaixe','em_andamento'].includes(a.status) && a.date===today && !isClosureAppt(a)).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  const wal = cache.appointments.filter(a=>a.status==='em_carteira');
  const summary=DashboardService.metrics(done,wal);
  const fat=summary.revenue;
  const comissao=summary.commission;
  const lucro=summary.profit;
  const car=summary.wallet;
  const todayDone = cache.appointments.filter(a=>a.status==='concluido' && a.date===today).reduce((t,a)=>t+Number(a.services?.price||0),0);

  const futureGroups = {};
  cache.appointments.filter(a=>a.status==='agendado' && a.date>=today && !isClosureAppt(a)).forEach(a=>{
    const k = fixedClientGroupKey ? fixedClientGroupKey(a) : `${a.client_name}|${a.client_phone}|${a.time}`;
    if(!futureGroups[k]) futureGroups[k]=[];
    futureGroups[k].push(a);
  });
  const fixedGroups = Object.values(futureGroups).filter(g=>g.length>1 || g.some(isSubscriptionServiceName));
  const recurringExpected = fixedGroups.reduce((sum,g)=>sum + fixedSubscriptionRevenueFromGroup(g),0);
  const lateFixed = fixedGroups.filter(g=>{ try{ return fixedClientStatus(g, parcelInfoForFixedClient(g[0])).cls==='late'; }catch(e){ return false; } }).length;

  const porBarbeiro = cache.shopBarbers.map(b=>{
    const atend=done.filter(a=>a.barber_id===b.id);
    const total=atend.reduce((t,a)=>t+Number(a.services?.price||0),0);
    const com=total*Number(b.commission_rate||0)/100;
    return {b,total,com,lucro:total-com,qtd:atend.length};
  }).filter(r=>r.total>0 || Number(r.b.commission_rate||0)>0).sort((a,b)=>b.total-a.total);
  const topBarber = porBarbeiro[0];

  const dayAtNoon = (offset)=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); };
  const revenueByDate = (date)=>cache.appointments.filter(a=>a.status==='concluido' && a.date===date).reduce((t,a)=>t+Number(a.services?.price||0),0);
  const thisWeekDays = Array.from({length:7},(_,i)=>dayAtNoon(i-6));
  const lastWeekDays = Array.from({length:7},(_,i)=>dayAtNoon(i-13));
  const thisWeekTotal = thisWeekDays.reduce((t,d)=>t+revenueByDate(d),0);
  const lastWeekTotal = lastWeekDays.reduce((t,d)=>t+revenueByDate(d),0);
  const weekPct = lastWeekTotal>0 ? Math.round(((thisWeekTotal-lastWeekTotal)/lastWeekTotal)*100) : (thisWeekTotal>0 ? 100 : 0);
  const bestDay = thisWeekDays.map(d=>({date:d,total:revenueByDate(d)})).sort((a,b)=>b.total-a.total)[0];
  const hourMap = {};
  cache.appointments.filter(a=>a.status==='concluido' && thisWeekDays.includes(a.date)).forEach(a=>{ const h=String(a.time||'').slice(0,2)||'--'; hourMap[h]=(hourMap[h]||0)+Number(a.services?.price||0); });
  const bestHour = Object.entries(hourMap).sort((a,b)=>b[1]-a[1])[0];

  const nextAppts = activeToday.slice(0,5);
  const absent15 = (typeof lastCompletedByClient === 'function') ? lastCompletedByClient(15) : [];
  const absent30 = (typeof lastCompletedByClient === 'function') ? lastCompletedByClient(30) : [];
  const absentTop = absent15.slice(0,5);
  const openSlotsHint = Math.max(0, (cache.shopBarbers.length*3) - activeToday.length);
  const alerts = [];
  if(lateFixed>0) alerts.push({cls:'danger',title:`${lateFixed} cliente(s) fixo(s) atrasado(s)`,text:'Abra Clientes Fixos para cobrar ou atualizar o pagamento.'});
  const pastPending = (typeof overdueAppointments === 'function') ? overdueAppointments() : [];
  if(pastPending.length>0) alerts.push({cls:'danger',title:`${pastPending.length} agendamento(s) passado(s) sem baixa`,text:'Abra Pendências / Baixa para confirmar pagamento, carteira ou falta.'});
  if(wal.length>0) alerts.push({cls:'warn',title:`${wal.length} valor(es) em carteira`,text:`Existe ${money(car)} aguardando recebimento.`});
  if(absent15.length>0) alerts.push({cls:'warn',title:`${absent15.length} cliente(s) para recuperar`,text:'Use o botão de WhatsApp para chamar clientes que sumiram.'});
  if(activeToday.length>0) alerts.push({cls:'ok',title:`${activeToday.length} atendimento(s) hoje`,text:'Acompanhe a agenda do dia e confirme os próximos horários.'});
  if(!alerts.length) alerts.push({cls:'ok',title:'Tudo organizado por aqui',text:'Nenhum alerta importante para hoje.'});

  const monthControl = `<div class="card monthFilter premiumMonth"><div><h3>Resumo financeiro de ${monthLabel(selectedMonth)}</h3><p class="muted">Filtro mensal preservado para consultar histórico, com visão premium da operação.</p></div><select id="dashMonth" onchange="changeDashboardMonth()">${monthOptions()}</select></div>`;
  const firstClient = activeToday[0];
  const hero = `<section class="dashboardHero card etapa6Hero">
    <div><span class="eyebrow">ZenBarber PRO • operação ao vivo</span><h2>Bom dia, ${esc((me.name||'Barbearia').split(' ')[0])} 👋</h2><p class="muted">Painel executivo com agenda, dinheiro, WhatsApp e oportunidades de retorno em uma única tela.</p><div class="heroQuickActions"><button class="primary" onclick="page='appointments';renderApp()">Abrir agenda</button><button class="whats" onclick="page='whatsapp';renderApp()">Central WhatsApp</button><button onclick="page='clients';renderApp()">Retenção</button></div></div>
    <div class="heroPulse heroPulsePremium"><small>Próximo horário</small><b>${firstClient?esc(firstClient.time||'--:--'):'Livre'}</b><em>${firstClient?esc(firstClient.client_name||'Cliente'):'sem atendimento agora'}</em></div>
  </section>`;
  const premiumStats = `<div class="premiumStatGrid">
    <div class="premiumStat green"><span>Faturamento hoje</span><b>${money(todayDone)}</b><small>concluído no dia</small></div>
    <div class="premiumStat blue"><span>Recorrência prevista</span><b>${money(recurringExpected)}</b><small>${fixedGroups.length} assinatura(s) ativa(s)</small></div>
    <div class="premiumStat amber"><span>Agenda de hoje</span><b>${activeToday.length}</b><small>${openSlotsHint} encaixe(s) possíveis</small></div>
    <div class="premiumStat purple"><span>Clientes em risco</span><b>${(typeof retentionMetrics==='function'?retentionMetrics().risk:absent15.length)}</b><small>${(typeof retentionMetrics==='function'?retentionMetrics().recovered:0)} recuperado(s) • ${(typeof retentionMetrics==='function'?retentionMetrics().returnRate:0)}% retorno</small></div>
  </div>`;
  const actionItems = [];
  fixedGroups.slice(0,4).forEach(g=>{
    const a=g[0];
    let info={paid:0,total:g.length,value:0};
    try{ info=parcelInfoForFixedClient(a); }catch(e){}
    const st = (()=>{ try{return fixedClientStatus(g, info);}catch(e){return {cls:'ok',label:'Ativo'};} })();
    if(st.cls==='late' || st.cls==='warn') actionItems.push({kind:st.cls==='late'?'danger':'warn',icon:st.cls==='late'?'⚠️':'⏰',title:`Cobrar ${a.client_name||'cliente fixo'}`,text:`${st.label} • ${info.paid||0}/${info.total||g.length} parcela(s)`,phone:a.client_phone,msg:`Olá ${a.client_name||''}, tudo bem? Passando para lembrar da sua assinatura/pacote na ${sameShopName()}.`});
  });
  nextAppts.slice(0,3).forEach(a=>actionItems.push({kind:'ok',icon:'✅',title:`Confirmar ${a.client_name||'cliente'}`,text:`Hoje às ${a.time||'--:--'} • ${barberById(a.barber_id)?.name||'Barbeiro'}`,phone:a.client_phone,msg:`Olá ${a.client_name||''}, passando para confirmar seu horário hoje às ${a.time||''} na ${sameShopName()}.`}));
  if(openSlotsHint>0) actionItems.push({kind:'blue',icon:'⚡',title:`${openSlotsHint} encaixe(s) possível(is) hoje`,text:'Use a agenda para aproveitar horários livres e aumentar o faturamento.'});
  if(pastPending.length>0) actionItems.push({kind:'danger',icon:'🧾',title:'Dar baixa em agendamentos passados',text:`${pastPending.length} horário(s) precisam de baixa manual`});
  if(wal.length>0) actionItems.push({kind:'warn',icon:'💰',title:'Receber valores em carteira',text:`${wal.length} cobrança(s) pendente(s) • ${money(car)}`});
  if(absent15.length>0) actionItems.push({kind:'blue',icon:'📲',title:'Recuperar clientes ausentes',text:`${absent15.length} cliente(s) sem retorno há 15+ dias`});
  const actions = `<section class="card actionCommand"><div class="chartTitle"><div><h3>Ações recomendadas de hoje</h3><p class="muted">A home agora não só mostra números: ela aponta o que precisa de atenção.</p></div><span>${actionItems.length||1} ação(ões)</span></div><div class="actionGrid">${actionItems.slice(0,6).map((it,idx)=>`<div class="actionItem ${it.kind}"><div class="actionIcon">${it.icon}</div><div><b>${esc(it.title)}</b><small>${esc(it.text)}</small></div><div class="actionButtons">${it.phone?`<a target="_blank" href="${wa(it.phone,it.msg)}"><button class="whats miniBtn">WhatsApp</button></a>`:''}${it.title.includes('agendamentos passados')?`<button class="miniBtn" onclick="page='pending';renderApp()">Abrir</button>`:''}${it.title.includes('carteira')?`<button class="miniBtn" onclick="page='wallet';renderApp()">Abrir</button>`:''}${it.title.includes('encaixe')?`<button class="miniBtn" onclick="page='appointments';renderApp()">Agenda</button>`:''}${it.title.includes('ausentes')?`<button class="miniBtn" onclick="page='clients';renderApp()">Abrir</button>`:''}</div></div>`).join('') || '<div class="empty">Nenhuma ação urgente agora. A barbearia está organizada.</div>'}</div></section>`;
  const retentionDash = (typeof retentionMetrics==='function' && typeof zenHealthIndex==='function') ? (()=>{ const rm=retentionMetrics(); const zh=zenHealthIndex(); return `<section class="card retentionDashCard"><div class="chartTitle"><div><h3>Retenção de clientes</h3><p class="muted">Controle de clientes em risco, recuperados, taxa de retorno e meta mensal de retorno.</p></div><button class="gold" onclick="page='clients';renderApp()">Abrir Retenção</button></div><div class="retentionDashGrid"><div><span>Clientes em risco</span><b>${rm.risk}</b></div><div><span>Clientes recuperados</span><b>${rm.recovered}</b></div><div><span>Taxa de retorno</span><b>${rm.returnRate}%</b></div><div><span>Meta mensal</span><b>70%</b></div><div class="zenDashScore ${zh.cls}"><span>Índice ZEN</span><b>${zh.score}</b><small>${zh.label}</small></div></div></section>`; })() : '';
  const absentPanel = `<section class="card absentCommand"><div class="chartTitle"><div><h3>Clientes para recuperar</h3><p class="muted">Lista automática dos clientes que concluíram atendimento e não voltaram. Ideal para gerar faturamento parado.</p></div><button class="gold" onclick="page='clients';renderApp()">Ver todos</button></div><div class="absentGrid">${absentTop.map(a=>{ const diff=Math.max(0,Math.floor((new Date(todayISO()+'T12:00:00')-new Date(String(a.date||todayISO())+'T12:00:00'))/86400000)); const msg=(typeof reactivationMessage==='function')?reactivationMessage(a,diff):`Olá ${a.client_name||''}, tudo bem? Faz alguns dias que você não aparece por aqui. Quer agendar seu próximo horário?`; return `<div class="absentItem"><div><b>${esc(a.client_name||'Cliente')}</b><small>Último corte há ${diff} dia(s) • ${esc(a.services?.name||'Serviço')} • ${esc(barberName(a.barber_id)||'Barbeiro')}</small></div><a target="_blank" href="${wa(a.client_phone,msg)}"><button class="whats miniBtn">Chamar</button></a></div>`}).join('') || '<div class="empty">Nenhum cliente ausente encontrado agora.</div>'}</div></section>`;
  const intelligence = `<div class="dashSplit"><section class="card smartAlerts"><h3>Alertas inteligentes</h3>${alerts.map(a=>`<div class="smartAlert ${a.cls}"><b>${esc(a.title)}</b><small>${esc(a.text)}</small></div>`).join('')}</section><section class="card nextAppts"><h3>Próximos atendimentos de hoje</h3>${nextAppts.map(a=>`<div class="miniAppt"><span>${esc(a.time||'')}</span><div><b>${esc(a.client_name||'Cliente')}</b><small>${esc(barberById(a.barber_id)?.name||'Barbeiro')} • ${esc(a.services?.name||'Serviço')} • até ${safeEndTimeForAppt(a)}</small></div></div>`).join('') || '<div class="empty">Nenhum atendimento restante para hoje.</div>'}<br><button class="primary" onclick="page='appointments';renderApp()">Ver agenda completa</button></section></div>`;
  const trendClass = weekPct>=0 ? 'positive' : 'negative';
  const bestDayLabel = bestDay?.date ? bestDay.date.split('-').reverse().slice(0,2).join('/') : '—';
  const insightRow = `<div class="insightGrid">
    <div class="insightCard ${trendClass}"><span>Comparativo semanal</span><b>${weekPct>=0?'+':''}${weekPct}%</b><small>${money(thisWeekTotal)} nos últimos 7 dias • antes ${money(lastWeekTotal)}</small></div>
    <div class="insightCard"><span>Melhor dia</span><b>${bestDayLabel}</b><small>${money(bestDay?.total||0)} faturados</small></div>
    <div class="insightCard"><span>Horário mais lucrativo</span><b>${bestHour?bestHour[0]+':00':'—'}</b><small>${bestHour?money(bestHour[1]):'sem dados concluídos'}</small></div>
  </div>`;
  const whatsToday = `<section class="card whatsCommandCenter"><div class="chartTitle"><div><h3>Central WhatsApp do dia</h3><p class="muted">Ações rápidas para confirmar, reagendar, cobrar ou avisar atraso sem escrever mensagem do zero.</p></div><button class="whats" onclick="page='appointments';renderApp()">Abrir agenda</button></div><div class="whatsTodayGrid">${activeToday.slice(0,6).map(a=>`<div class="whatsTodayItem"><div><b>${esc(a.time||'')} • ${esc(a.client_name||'Cliente')}</b><small>${esc(barberById(a.barber_id)?.name||'Barbeiro')} • ${esc(a.services?.name||'Serviço')} • ${esc(a.client_phone||'sem WhatsApp')}</small></div>${typeof whatsappQuickButtons==='function'?whatsappQuickButtons(a,{compact:true}):`<a target="_blank" href="${wa(a.client_phone,`Olá ${a.client_name||''}, confirmando seu horário hoje às ${a.time||''} na ${sameShopName()}.`)}"><button class="whats miniBtn">Confirmar</button></a>`}</div>`).join('') || '<div class="empty">Nenhum atendimento ativo hoje para acionar pelo WhatsApp.</div>'}</div></section>`;

  const ranking = `<div class="card barberRankCard"><div class="chartTitle"><div><h3>Ranking de barbeiros</h3><p class="muted">Faturamento, atendimentos e comissão do mês selecionado.</p></div><button onclick="page='reports';renderApp()">Ver ranking completo</button></div><div class="barberRankGrid">${porBarbeiro.slice(0,3).map((r,i)=>`<div class="barberRankItem rank${i+1}"><span>#${i+1}</span><b>${esc(r.b.name)}</b><small>${r.qtd} atendimento(s)</small><strong>${money(r.total)}</strong><em>Comissão: ${money(r.com)}</em></div>`).join('') || '<div class="empty">Ainda não há faturamento para ranquear.</div>'}</div></div>`;

  const quickDock = `<div class="quickDock card"><button onclick="page='appointments';renderApp()"><span>📅</span>Agenda</button><button onclick="page='whatsapp';renderApp()"><span>📲</span>WhatsApp</button><button onclick="page='wallet';renderApp()"><span>💰</span>Carteira</button><button onclick="page='clients';renderApp()"><span>🎯</span>Retenção</button>${isAdminRole()?`<button onclick="page='backup';renderApp()"><span>🛡️</span>Gestão PRO</button>`:''}</div>`;
  return `${hero}${quickDock}${premiumStats}${monthControl}<div class="statgrid proStatgrid"><div class="stat"><span>Faturamento bruto</span><b>${money(fat)}</b></div><div class="stat"><span>Comissões a pagar</span><b>${money(comissao)}</b></div><div class="stat"><span>Lucro da barbearia</span><b>${money(lucro)}</b></div><div class="stat"><span>Em carteira</span><b>${money(car)}</b></div></div><div class="card premiumChartCard stage2"><div class="chartTitle"><div><h3>Gráfico financeiro do mês</h3><p class="muted">Faturamento dia após dia no mês selecionado, com carregamento animado e hover flutuante.</p></div><span>${weekPct>=0?'Crescimento':'Atenção'} ${weekPct>=0?'+':''}${weekPct}%</span></div><span class="spark"></span><span class="spark"></span><span class="spark"></span><canvas id="chart" height="240"></canvas></div>${insightRow}${actions}${retentionDash}${whatsToday}${absentPanel}${ranking}${intelligence}<div class="card"><h3>Resumo por barbeiro</h3>${porBarbeiro.map(r=>`<div class="item"><div><strong>${esc(r.b.name)}</strong><small>${r.qtd} atendimento(s) • Comissão ${r.b.commission_rate||0}%</small></div><div><strong>${money(r.total)}</strong><small>Comissão: ${money(r.com)} • Lucro: ${money(r.lucro)}</small></div></div>`).join("") || '<div class="empty">Ainda não há faturamento neste mês.</div>'}<br><button class="primary" onclick="page='commissions';renderApp()">Editar comissões dos barbeiros</button></div><div class="card"><h3>Link público da barbearia</h3>${linkSnippet()}</div>`;
}
function drawChart(){
  const c=document.getElementById('chart');
  if(!c) return;
  c.classList.add('chartLoading');
  const draw=(progress=1, hoverX=null)=>{
    const ctx=c.getContext('2d');
    const ratio=window.devicePixelRatio||1;
    const cw=Math.max(320,c.clientWidth||760);
    const ch=240;
    c.width=cw*ratio; c.height=ch*ratio;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.clearRect(0,0,cw,ch);

    const [y,m]=String(dashboardMonth||monthKey(todayISO())).split('-').map(Number);
    const daysInMonth=new Date(y,m,0).getDate();
    const days=Array.from({length:daysInMonth},(_,i)=>`${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
    const vals=days.map(d=>cache.appointments.filter(a=>a.status==='concluido'&&a.date===d).reduce((t,a)=>t+Number(a.services?.price||0),0));
    const visibleCount=Math.max(1,Math.ceil(days.length*progress));
    const valsVisible=vals.map((v,i)=> i<visibleCount ? v : 0);
    const max=Math.max(1,...vals);
    const padL=46,padR=22,top=24,base=184;
    const areaW=cw-padL-padR;
    const step=areaW/Math.max(1,days.length-1);
    const barW=Math.max(4,Math.min(18,step*.56));
    const points=[];

    const bg=ctx.createLinearGradient(0,0,cw,ch);
    bg.addColorStop(0,'rgba(34,197,94,.07)');
    bg.addColorStop(.55,'rgba(14,165,233,.045)');
    bg.addColorStop(1,'rgba(168,85,247,.055)');
    ctx.fillStyle=bg; roundRect(ctx,6,6,cw-12,ch-12,18); ctx.fill();

    ctx.strokeStyle='rgba(148,163,184,.13)'; ctx.lineWidth=1;
    ctx.font='11px Inter, Arial'; ctx.textAlign='right';
    for(let i=0;i<4;i++){
      const yline=top+i*((base-top)/3);
      ctx.beginPath(); ctx.moveTo(padL,yline); ctx.lineTo(cw-padR,yline); ctx.stroke();
      const val=Math.round(max*(1-i/3));
      ctx.fillStyle='rgba(154,167,189,.82)';
      ctx.fillText('R$ '+val, padL-8, yline+4);
    }

    valsVisible.forEach((v,i)=>{
      const x=padL+i*step;
      const yv=base-((base-top)*(v/max));
      points.push({x,y:yv,v,date:days[i],idx:i});
      const bh=Math.max(v>0?8:2, base-yv);
      const g=ctx.createLinearGradient(0,yv,0,base);
      g.addColorStop(0,'rgba(34,197,94,.88)');
      g.addColorStop(1,'rgba(14,165,233,.16)');
      ctx.fillStyle=g;
      ctx.shadowColor='rgba(34,197,94,.20)'; ctx.shadowBlur=10;
      roundRect(ctx,x-barW/2,base-bh,barW,bh,7); ctx.fill();
      ctx.shadowBlur=0;
    });

    if(points.length){
      const line=ctx.createLinearGradient(0,top,cw,base);
      line.addColorStop(0,'#67f497'); line.addColorStop(.55,'#7dd3fc'); line.addColorStop(1,'#c084fc');
      ctx.strokeStyle=line; ctx.lineWidth=3; ctx.shadowColor='rgba(125,211,252,.24)'; ctx.shadowBlur=12;
      ctx.beginPath();
      points.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else { const prev=points[i-1]; const cx=(prev.x+p.x)/2; ctx.bezierCurveTo(cx,prev.y,cx,p.y,p.x,p.y); } });
      ctx.stroke(); ctx.shadowBlur=0;
      points.forEach(p=>{ if(p.idx%3===0 || p.v>0){ ctx.fillStyle='#06111f'; ctx.strokeStyle='rgba(125,211,252,.9)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill(); ctx.stroke(); } });
    }

    const hover = hoverX==null ? null : points.reduce((best,p)=> !best || Math.abs(p.x-hoverX)<Math.abs(best.x-hoverX) ? p : best, null);
    ctx.textAlign='center'; ctx.font='11px Inter, Arial';
    points.forEach((p,i)=>{ if(i===0 || i===days.length-1 || (i+1)%5===0){ const [,mes,dia]=p.date.split('-'); ctx.fillStyle='#9aa7bd'; ctx.fillText(`${dia}/${mes}`,p.x,210); } });
    if(hover){
      ctx.strokeStyle='rgba(125,211,252,.35)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(hover.x,top); ctx.lineTo(hover.x,base); ctx.stroke();
      ctx.fillStyle='#06111f'; ctx.strokeStyle='rgba(103,244,151,.95)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(hover.x,hover.y,7,0,Math.PI*2); ctx.fill(); ctx.stroke();
      const tipW=142, tipH=54, tx=Math.min(Math.max(hover.x-tipW/2,8),cw-tipW-8), ty=Math.max(10,hover.y-72);
      ctx.fillStyle='rgba(7,17,31,.96)'; ctx.shadowColor='rgba(14,165,233,.18)'; ctx.shadowBlur=18; roundRect(ctx,tx,ty,tipW,tipH,14); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(125,211,252,.32)'; ctx.stroke();
      ctx.textAlign='left'; ctx.fillStyle='#f8fbff'; ctx.font='700 12px Inter, Arial'; ctx.fillText(formatDateBR(hover.date),tx+12,ty+20);
      ctx.fillStyle='#67f497'; ctx.font='900 14px Inter, Arial'; ctx.fillText(money(hover.v),tx+12,ty+40);
    }
  };
  let startTime=null;
  function anim(ts){
    if(!startTime) startTime=ts;
    const t=Math.min(1,(ts-startTime)/850);
    const ease=1-Math.pow(1-t,3);
    draw(ease,null);
    if(t<1) requestAnimationFrame(anim); else c.classList.remove('chartLoading');
  }
  requestAnimationFrame(anim);
  c.onmousemove=(ev)=>{ const r=c.getBoundingClientRect(); draw(1, ev.clientX-r.left); c.classList.add('chartHovering'); };
  c.onmouseleave=()=>{ draw(1,null); c.classList.remove('chartHovering'); };
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}


