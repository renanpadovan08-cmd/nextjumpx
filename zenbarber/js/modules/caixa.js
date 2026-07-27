// ===== CashService (Sprint 012) =====
window.CashService = {
  receiptAmount(a){ return Number(a?.services?.price||0); },
  openReceipts(){
    const closed = cashState.closedAppointmentIds || new Set();
    return (cache.appointments||[])
      .filter(a=>a.status==='concluido')
      .filter(a=>!closed.has(String(a.id)))
      .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.time||'').localeCompare(String(b.time||'')));
  },
  totals(){
    const receipts=this.openReceipts();
    const expenses=(cashState.movements||[]).filter(m=>m.type==='saida'&&!m.closed_at);
    const adjustments=(cashState.movements||[]).filter(m=>m.type==='ajuste'&&!m.closed_at);
    const totalIn=receipts.reduce((t,a)=>t+this.receiptAmount(a),0);
    const totalOut=expenses.reduce((t,m)=>t+Number(m.amount||0),0);
    return {receipts,expenses,adjustments,totalIn,totalOut,balance:totalIn-totalOut};
  }
};
// ===== End CashService =====

// ===== ZenBarber PRO — Controle de Caixa protegido =====
const CASH_PASS_PREFIX = 'zb_cash_sha256_v1$';
let cashUnlocked = false;
let cashState = { settings:null, movements:[], closures:[], closedAppointmentIds:new Set() };

function cashShopKey(){ return sameShopId() || ('shop:' + sameShopName().toLowerCase()); }
function cashUnlockKey(){ return 'zenbarber_cash_unlocked_' + cashShopKey(); }
function cashScopeFilter(q){ const sid=sameShopId(); return sid ? q.eq('shop_id', sid) : q.eq('shop_name', sameShopName()); }
async function makeCashPasswordHash(password){ return CASH_PASS_PREFIX + await sha256Hex('ZenBarber|cash|' + cashShopKey() + '|' + String(password||'') + '|v1'); }
function isCashUnlocked(){ return sessionStorage.getItem(cashUnlockKey()) === '1' || cashUnlocked; }
function cashCanOpen(){ return isManagerRole() || isAdminRole(); }
function currentPeriodLabel(){ return new Date().toLocaleDateString('pt-BR'); }

async function loadCashSettings(){
  let q = db.from('cash_access_settings').select('*').limit(1);
  q = cashScopeFilter(q);
  const {data,error}=await q;
  if(error){ cashState.settings=null; return {error}; }
  cashState.settings = (data||[])[0] || null;
  return {data:cashState.settings};
}
async function loadCashMovements(){
  let q = db.from('cash_movements').select('*').order('created_at',{ascending:false});
  q = cashScopeFilter(q);
  const {data,error}=await q;
  cashState.movements = error ? [] : (data||[]);
  cashState.closedAppointmentIds = new Set(cashState.movements.filter(m=>m.source==='receipt_snapshot' && m.appointment_id).map(m=>String(m.appointment_id)));
  return {data:cashState.movements,error};
}
async function loadCashClosures(){
  let q = db.from('cash_closures').select('*').order('created_at',{ascending:false}).limit(30);
  q = cashScopeFilter(q);
  const {data,error}=await q;
  cashState.closures = error ? [] : (data||[]);
  return {data:cashState.closures,error};
}
async function loadCashAll(){ await loadCashSettings(); await loadCashMovements(); await loadCashClosures(); }

function cashOpenReceipts(){
  const closedIds = cashState.closedAppointmentIds || new Set();
  return (cache.appointments||[])
    .filter(a=>a.status==='concluido')
    .filter(a=>!closedIds.has(String(a.id)))
    .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.time||'').localeCompare(String(b.time||'')));
}
function cashOpenExpenses(){ return (cashState.movements||[]).filter(m=>m.type==='saida' && !m.closed_at); }
function cashOpenAdjustments(){ return (cashState.movements||[]).filter(m=>m.type==='ajuste' && !m.closed_at); }
function cashReceiptAmount(a){ return CashService.receiptAmount(a); }
function cashTotals(){ return CashService.totals(); }
function cashWeekKey(d=new Date()){ const x=new Date(d); x.setHours(0,0,0,0); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); return x.toISOString().slice(0,10); }
function cashPeriodStart(){
  const latest = cashState.closures?.[0];
  return latest?.created_at ? formatDateFullBR(String(latest.created_at).slice(0,10)) : 'Início dos registros abertos';
}

async function cashPage(){
  if(!cashCanOpen()) return '<div class="card"><h3>Acesso restrito</h3><p class="muted">Controle de Caixa é exclusivo do dono/gerente autorizado.</p></div>';
  await loadCashAll();
  if(!cashState.settings?.password_hash){
    return `<div class="card cashLockCard"><h3>🔐 Controle de Caixa</h3><p class="muted">A senha do dono ainda não foi criada pelo Admin NextJumpX. Entre no Painel ADM e configure a senha desta barbearia.</p></div>`;
  }
  if(!isCashUnlocked()) return cashLockHtml();
  return cashMainHtml();
}

function cashLockHtml(){
  return `<section class="card cashLockCard"><h3>🔐 Controle de Caixa</h3><p class="muted">Área protegida por senha exclusiva do dono da barbearia.</p><div class="grid2"><input id="cashPassword" type="password" placeholder="Senha do dono"><button class="primary" onclick="unlockCashControl()">Entrar no caixa</button></div><small class="muted">A senha é definida pelo Admin NextJumpX e não fica visível para funcionários.</small></section>`;
}

window.unlockCashControl = async function(){
  const pass = document.getElementById('cashPassword')?.value || '';
  if(!pass) return toast('Digite a senha do Controle de Caixa.');
  await loadCashSettings();
  const expected = cashState.settings?.password_hash || '';
  const hash = await makeCashPasswordHash(pass);
  if(hash !== expected) return toast('Senha do caixa incorreta.');
  cashUnlocked = true; sessionStorage.setItem(cashUnlockKey(),'1'); toast('Controle de Caixa liberado.'); renderApp();
};
window.lockCashControl = function(){ cashUnlocked=false; sessionStorage.removeItem(cashUnlockKey()); renderApp(); };

function cashMainHtml(){
  const t = cashTotals();
  const receiptsHtml = t.receipts.map(a=>`<div class="item cashRow"><div><strong>${esc(a.client_name||'Cliente')} — ${money(cashReceiptAmount(a))}</strong><small>${formatDateBR(a.date)} ${esc(a.time||'')} • ${esc(a.services?.name||'Serviço')} • ${esc(barberName(a.barber_id))}</small></div><div class="row"><button class="gold" onclick="openCashEditReceipt('${a.id}')">Alterar recebimento</button></div></div>`).join('') || '<div class="empty">Nenhum recebimento aberto. Recebimentos já fechados ficam no histórico.</div>';
  const expensesHtml = t.expenses.map(m=>`<div class="item cashRow"><div><strong>${esc(m.description||'Despesa')} — ${money(m.amount)}</strong><small>${new Date(m.created_at).toLocaleString('pt-BR')} • por ${esc(m.created_by_name||'')}</small>${m.reason?`<br><small>Obs: ${esc(m.reason)}</small>`:''}</div></div>`).join('') || '<div class="empty">Nenhuma saída lançada neste caixa aberto.</div>';
  const adjHtml = t.adjustments.map(m=>`<div class="item cashRow"><div><strong>${esc(m.client_name||'Recebimento alterado')} — ${money(m.old_amount)} → ${money(m.new_amount)}</strong><small>${new Date(m.created_at).toLocaleString('pt-BR')} • ${esc(m.reason||'sem motivo informado')}</small></div></div>`).join('') || '<div class="empty">Nenhuma alteração de recebimento neste caixa aberto.</div>';
  const closuresHtml = (cashState.closures||[]).slice(0,8).map(c=>`<div class="item"><div><strong>Fechamento ${formatDateFullBR(String(c.created_at||'').slice(0,10))}</strong><small>Entradas: ${money(c.total_in)} • Saídas: ${money(c.total_out)} • Saldo: ${money(c.balance)}</small></div></div>`).join('') || '<div class="empty">Nenhum fechamento registrado ainda.</div>';
  return `<section class="card cashHero"><div><span class="eyebrow">Cofre do Dono</span><h2>Controle de Caixa</h2><p class="muted">Período aberto desde: ${esc(cashPeriodStart())}. Feche o caixa semanal para baixar o relatório e arquivar os registros.</p></div><button onclick="lockCashControl()">Bloquear tela</button></section>
  <div class="statgrid"><div class="stat"><span>Recebimentos abertos</span><b>${money(t.totalIn)}</b><small>${t.receipts.length} pagamento(s)</small></div><div class="stat"><span>Saídas abertas</span><b>${money(t.totalOut)}</b><small>${t.expenses.length} despesa(s)</small></div><div class="stat"><span>Saldo do caixa</span><b>${money(t.balance)}</b><small>Entradas - saídas</small></div><div class="stat"><span>Alterações</span><b>${t.adjustments.length}</b><small>recebimentos editados</small></div></div>
  <div class="grid2"><section class="card"><h3>Lançar despesa / saída</h3><div class="form"><input id="cashExpenseDesc" placeholder="Descrição. Ex: compra de lâmina"><input id="cashExpenseAmount" type="number" min="0" step="0.01" placeholder="Valor"><textarea id="cashExpenseReason" rows="2" placeholder="Observação opcional"></textarea><button class="danger" onclick="addCashExpense()">Lançar saída</button></div></section><section class="card"><h3>Fechamento semanal</h3><p class="muted">Baixa um CSV com entradas, saídas e alterações. Depois arquiva o caixa aberto e inicia um novo período limpo.</p><button class="primary" onclick="closeCashWeek()">Baixar e fechar caixa</button></section></div>
  <section class="card"><h3>Recebimentos em aberto</h3>${receiptsHtml}</section>
  <section class="card"><h3>Saídas em aberto</h3>${expensesHtml}</section>
  <section class="card"><h3>Alterações de recebimento</h3>${adjHtml}</section>
  <section class="card"><h3>Histórico de fechamentos</h3>${closuresHtml}</section>`;
}

window.addCashExpense = async function(){
  if(!isCashUnlocked()) return toast('Desbloqueie o Controle de Caixa.');
  const description = String(document.getElementById('cashExpenseDesc')?.value||'').trim();
  const amount = Number(document.getElementById('cashExpenseAmount')?.value||0);
  const reason = String(document.getElementById('cashExpenseReason')?.value||'').trim();
  if(!description || !amount || amount<=0) return toast('Informe descrição e valor da saída.');
  const row = shopScopedPayload({shop_name:sameShopName(), type:'saida', source:'expense', description, amount, reason, created_by:me?.id||null, created_by_name:me?.name||'', week_key:cashWeekKey()});
  const {error}=await db.from('cash_movements').insert(row);
  if(error) return toast(error.message);
  toast('Saída lançada no caixa.'); renderApp();
};

window.openCashEditReceipt = function(id){
  const a=(cache.appointments||[]).find(x=>String(x.id)===String(id)); if(!a) return toast('Atendimento não encontrado.');
  document.body.insertAdjacentHTML('beforeend',`<div class="modalBack" id="modal"><div class="modal"><h2>Alterar recebimento</h2><p class="muted">Essa alteração fica registrada no Controle de Caixa com motivo e usuário.</p><div class="form"><input disabled value="${esc(a.client_name||'Cliente')} • ${money(cashReceiptAmount(a))}"><input id="cashNewReceiptValue" type="number" min="0" step="0.01" value="${Number(cashReceiptAmount(a)).toFixed(2)}"><textarea id="cashEditReason" rows="3" placeholder="Motivo obrigatório. Ex: funcionária lançou valor errado"></textarea><div class="row"><button class="primary" onclick="saveCashReceiptEdit('${a.id}')">Salvar alteração</button><button onclick="modal.remove()">Cancelar</button></div></div></div></div>`);
};

window.saveCashReceiptEdit = async function(id){
  if(!isCashUnlocked()) return toast('Desbloqueie o Controle de Caixa.');
  const a=(cache.appointments||[]).find(x=>String(x.id)===String(id)); if(!a) return toast('Atendimento não encontrado.');
  const oldAmount = cashReceiptAmount(a);
  const newAmount = Number(document.getElementById('cashNewReceiptValue')?.value||0);
  const reason = String(document.getElementById('cashEditReason')?.value||'').trim();
  if(newAmount<0 || isNaN(newAmount)) return toast('Valor inválido.');
  if(!reason) return toast('Informe o motivo da alteração.');
  const baseName = a.services?.name || 'Recebimento ajustado';
  const {data:svc,error:svcErr}=await db.from('services').insert(shopScopedPayload({barber_id:a.barber_id, name:`${baseName} • ajuste caixa`, price:newAmount, duration:Number(a.services?.duration||30)})).select().single();
  if(svcErr) return toast(svcErr.message);
  const {error:apptErr}=await db.from('appointments').update({service_id:svc.id,status:'concluido'}).eq('id',id);
  if(apptErr) return toast(apptErr.message);
  const mov = shopScopedPayload({shop_name:sameShopName(), type:'ajuste', source:'payment_edit', appointment_id:id, barber_id:a.barber_id, client_name:a.client_name||'', description:'Alteração de recebimento', amount:newAmount-oldAmount, old_amount:oldAmount, new_amount:newAmount, reason, created_by:me?.id||null, created_by_name:me?.name||'', week_key:cashWeekKey()});
  await db.from('cash_movements').insert(mov);
  if(typeof modal!=='undefined' && modal) modal.remove();
  toast('Recebimento alterado e registrado no caixa.'); renderApp();
};

function cashCsvEscape(v){ return '"' + String(v??'').replace(/"/g,'""') + '"'; }
function cashRowsToCsv(rows){ return rows.map(r=>r.map(cashCsvEscape).join(';')).join('\n'); }
function cashDownloadCsv(filename, rows){ const blob=new Blob(['\ufeff'+cashRowsToCsv(rows)],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},500); }

window.closeCashWeek = async function(){
  if(!isCashUnlocked()) return toast('Desbloqueie o Controle de Caixa.');
  await loadCashAll();
  const t=cashTotals();
  if(!t.receipts.length && !t.expenses.length && !t.adjustments.length) return toast('Não há registros abertos para fechar.');
  if(!confirm('Fechar o caixa aberto? O relatório será baixado e os registros sairão da tela operacional, mas continuarão arquivados no Supabase.')) return;
  const now = new Date();
  const file = `fechamento-caixa-${sameShopName().replace(/[^a-z0-9]+/gi,'-')}-${todayISO()}.csv`;
  const rows = [['ZenBarber - Fechamento de Caixa'],['Barbearia',sameShopName()],['Fechado em',now.toLocaleString('pt-BR')],[],['TIPO','DATA','CLIENTE/DESCRIÇÃO','BARBEIRO','VALOR','MOTIVO/OBS']];
  t.receipts.forEach(a=>rows.push(['ENTRADA',`${formatDateFullBR(a.date)} ${a.time||''}`,a.client_name||'',barberName(a.barber_id),cashReceiptAmount(a),'Recebimento concluído']));
  t.expenses.forEach(m=>rows.push(['SAÍDA',new Date(m.created_at).toLocaleString('pt-BR'),m.description||'',m.created_by_name||'',Number(m.amount||0),m.reason||'']));
  t.adjustments.forEach(m=>rows.push(['ALTERAÇÃO',new Date(m.created_at).toLocaleString('pt-BR'),m.client_name||'',barberName(m.barber_id),`${money(m.old_amount)} -> ${money(m.new_amount)}`,m.reason||'']));
  rows.push([],['TOTAL ENTRADAS',t.totalIn],['TOTAL SAÍDAS',t.totalOut],['SALDO FINAL',t.balance]);
  cashDownloadCsv(file, rows);
  const closureRow = shopScopedPayload({shop_name:sameShopName(), period_start:cashWeekKey(), period_end:todayISO(), total_in:t.totalIn, total_out:t.totalOut, balance:t.balance, closed_by:me?.id||null, closed_by_name:me?.name||'', file_name:file});
  const {data:closure,error}=await db.from('cash_closures').insert(closureRow).select().single();
  if(error) return toast(error.message);
  const closeStamp = new Date().toISOString();
  const openMoveIds = [...t.expenses, ...t.adjustments].map(m=>m.id).filter(Boolean);
  if(openMoveIds.length) await db.from('cash_movements').update({closed_at:closeStamp,cash_closure_id:closure.id}).in('id',openMoveIds);
  const snapshots = t.receipts.map(a=>shopScopedPayload({shop_name:sameShopName(), type:'entrada', source:'receipt_snapshot', appointment_id:a.id, barber_id:a.barber_id, client_name:a.client_name||'', description:a.services?.name||'Recebimento', amount:cashReceiptAmount(a), created_by:me?.id||null, created_by_name:me?.name||'', week_key:cashWeekKey(), closed_at:closeStamp, cash_closure_id:closure.id}));
  if(snapshots.length) await db.from('cash_movements').insert(snapshots);
  toast('Caixa fechado e arquivado.'); renderApp();
};
