const ADMIN_BILLING_KEY = 'zenbarber_admin_billing_v1';
function adminBillingLoad(){
  try{return JSON.parse(localStorage.getItem(ADMIN_BILLING_KEY)||'{}')||{};}catch(e){return {};}
}
function adminBillingSave(obj){ localStorage.setItem(ADMIN_BILLING_KEY, JSON.stringify(obj||{})); }
function adminBillingFor(id){
  const all=adminBillingLoad();
  return Object.assign({monthly_fee:0,due_day:10,start_date:'',end_date:'',status:'ativo',bonus:'',note:'',last_payment:'',payment_method:'Pix'}, all[id]||{});
}
function adminBillingSet(id,b){ const all=adminBillingLoad(); all[id]=Object.assign(adminBillingFor(id),b||{}); adminBillingSave(all); }

function adminHasMultiunit(b){ return String(b?.activation_note||'').toUpperCase().includes('MULTIUNIDADE_LIBERADA'); }
function adminNextNoteWithMultiunit(note, enabled){
  let txt = String(note||'').replace(/\s*\|?\s*MULTIUNIDADE_LIBERADA/gi,'').trim();
  if(enabled) txt = (txt ? txt + ' | ' : '') + 'MULTIUNIDADE_LIBERADA';
  return txt;
}
function adminBillingMonthsRemaining(bill){
  if(!bill.end_date) return 'sem prazo final';
  const now=new Date(todayISO()+'T12:00:00');
  const end=new Date(bill.end_date+'T12:00:00');
  const diff=(end.getFullYear()-now.getFullYear())*12 + (end.getMonth()-now.getMonth());
  return diff<0 ? 'encerrado' : `${diff+1} mês(es)`;
}
function adminBillingNextDue(bill){
  const d=Math.min(28, Math.max(1, Number(bill.due_day||10)));
  const now=new Date(todayISO()+'T12:00:00');
  let due=new Date(now.getFullYear(), now.getMonth(), d, 12,0,0);
  if(due < now) due=new Date(now.getFullYear(), now.getMonth()+1, d, 12,0,0);
  return due.toISOString().slice(0,10);
}
function adminBillingStatus(bill){
  if((bill.status||'ativo')==='bloqueado') return {label:'Bloqueado',cls:'danger'};
  if((bill.status||'ativo')==='bonificado') return {label:'Bonificado',cls:'info'};
  if((bill.status||'ativo')==='trial') return {label:'Teste',cls:'warn'};
  const due=adminBillingNextDue(bill);
  const days=Math.round((new Date(due+'T12:00:00')-new Date(todayISO()+'T12:00:00'))/86400000);
  if(days<=2) return {label:'Vencendo',cls:'warn'};
  return {label:'Ativo',cls:'ok'};
}
function adminBillingSummary(barbers){
  const active=(barbers||[]).filter(b=>(b.access_status||'ativo')!=='pendente');
  let mrr=0, vencendo=0, bonificados=0, bloqueados=0;
  active.forEach(b=>{ const bill=adminBillingFor(b.id); const st=adminBillingStatus(bill); if((bill.status||'ativo')==='bonificado') bonificados++; if((bill.status||'ativo')==='bloqueado') bloqueados++; if(st.label==='Vencendo') vencendo++; if(!['bloqueado','bonificado'].includes(bill.status||'ativo')) mrr += Number(bill.monthly_fee||0); });
  return {active,mrr,vencendo,bonificados,bloqueados};
}

async function adminLoadUnitRequests(){
  const {data,error} = await db.from('unit_requests').select('*').order('created_at',{ascending:false});
  if(!error && Array.isArray(data)) return data;
  return localUnitRequestsLoad();
}
function adminUnitRequestsHtml(requests){
  const list = requests || [];
  return `<div class="card adminUnitRequests"><h3>Solicitações de Unidades</h3><p class="muted">Pedidos internos feitos pelos gerentes. A unidade só é liberada quando o Admin Master aprova.</p>${list.map(r=>{
    const st = String(r.status||'pendente').toLowerCase();
    return `<div class="item unitReqItem"><div><strong>${esc(r.unit_name||'Nova unidade')} — ${esc(r.shop_name||'')}</strong><small>${esc(r.city||'')} / ${esc(r.state||'')} • ${Number(r.barber_count||0)} barbeiro(s) • Status: <b>${requestStatusLabel(st)}</b></small><br><small>Gerente: ${esc(r.manager_name||r.manager_login||'')} • ${esc(r.manager_login||'')}</small><br><small>Obs: ${esc(r.notes||'sem observações')}</small></div><div class="row"><button class="primary" onclick="adminUnitRequestAction('${esc(r.id)}','aprovado')">Aprovar</button><button onclick="adminUnitRequestAction('${esc(r.id)}','aguardando_pagamento')">Aguardando pagamento</button><button onclick="adminUnitRequestAction('${esc(r.id)}','rejeitado')">Rejeitar</button><button class="danger" onclick="adminUnitRequestAction('${esc(r.id)}','bloqueado')">Bloquear</button></div></div>`;
  }).join('') || '<div class="empty">Nenhuma solicitação de unidade no momento.</div>'}</div>`;
}
function approvedUnitFromRequest(r){
  return {id:'u_'+String(r.id||Date.now()).replace(/[^a-zA-Z0-9_-]/g,'_'), name:String(r.unit_name||'Nova unidade'), city:r.city||'', state:r.state||'', barber_count:Number(r.barber_count||0)};
}
async function adminUpdateUnitRequestStatus(id,status){
  let ok = false;
  const {error} = await db.from('unit_requests').update({status}).eq('id',id);
  if(!error) ok = true;
  if(!ok){
    const list = localUnitRequestsLoad();
    const item = list.find(x=>String(x.id)===String(id));
    if(item){ item.status=status; localUnitRequestsSave(list); ok = true; }
  }
  return ok;
}
window.adminUnitRequestAction = async (id,status) => {
  const requests = window.__adminUnitRequests || [];
  const r = requests.find(x=>String(x.id)===String(id));
  if(!r) return toast('Solicitação não encontrada.');
  if(status === 'aprovado'){
    const manager = cache.barbers.find(b=>String(b.id)===String(r.manager_id)) || cache.barbers.find(b=>String(b.login||'')===String(r.manager_login||''));
    if(!manager) return toast('Gerente da solicitação não encontrado.');
    const existing = unitsFromActivationNote(manager.activation_note);
    const unit = approvedUnitFromRequest(r);
    if(!existing.some(u=>u.id===unit.id || String(u.name).toLowerCase()===String(unit.name).toLowerCase())) existing.push(unit);
    const note = noteWithUnits(adminNextNoteWithMultiunit(manager.activation_note, true), existing);
    const {error} = await db.from('barbers').update({activation_note:note}).eq('id',manager.id);
    if(error) return toast(error.message);
  }
  const ok = await adminUpdateUnitRequestStatus(id,status);
  toast(ok ? `Solicitação marcada como ${requestStatusLabel(status)}.` : 'Não foi possível atualizar a solicitação.');
  renderAdmin();
};

function requireAdminMaster(){
  if(isAdminRole()) return true;
  toast('Acesso negado: recurso exclusivo do Admin Master.');
  return false;
}

function adminShopCard(b){
  const bill=adminBillingFor(b.id);
  const st=adminBillingStatus(bill);
  const due=adminBillingNextDue(bill);
  const msg=`Olá ${b.name||''}, tudo bem? Passando para lembrar da mensalidade do ZenBarber da ${b.shop_name||'sua barbearia'} no valor de ${money(bill.monthly_fee)}. Vencimento: ${formatDateBR(due)}. Qualquer dúvida me chama por aqui.`;
  return `<details class="fixedClientCard adminShopCard">
    <summary>
      <div class="fixedClientMain">
        <div class="fixedIdentity">
          <span class="fixedAvatar">${esc(initialsFromName(b.shop_name||b.name||'ZB'))}</span>
          <div><strong>${esc(b.shop_name||b.name||'Barbearia')}</strong><small>${esc(b.name||'Responsável')} • ${esc(b.phone||'sem WhatsApp')}</small></div>
        </div>
        <div class="fixedClientFacts">
          <span class="statusPill ${st.cls}"><b>${st.label}</b><small>Status</small></span>
          <span><b>${money(bill.monthly_fee)}</b><small>mensalidade</small></span>
          <span class="statusPill ${adminHasMultiunit(b)?'ok':'warn'}"><b>${adminHasMultiunit(b)?'Liberada':'1 unidade'}</b><small>multiunidade</small></span>
          <span><b>Dia ${esc(bill.due_day||10)}</b><small>vencimento</small></span>
        </div>
      </div>
      <span class="fixedArrow">⌄</span>
    </summary>
    <div class="fixedClientExpand">
      <div class="fixedInfoGrid">
        <div><small>Login</small><b>${esc(b.login||'')}</b></div>
        <div><small>Senha</small><b>••••••</b></div>
        <div><small>Próximo vencimento</small><b>${formatDateBR(due)}</b></div>
        <div><small>Prazo restante</small><b>${esc(adminBillingMonthsRemaining(bill))}</b></div>
        <div><small>Data inicial</small><b>${bill.start_date?formatDateBR(bill.start_date):'—'}</b></div>
        <div><small>Data final</small><b>${bill.end_date?formatDateBR(bill.end_date):'—'}</b></div>
        <div><small>Forma de pagamento</small><b>${esc(bill.payment_method||'Pix')}</b></div>
        <div><small>Bonificação</small><b>${esc(bill.bonus||'Sem bonificação')}</b></div>
      </div>
      <div class="fixedActions">
        <button class="primary" onclick="adminEditShopBilling('${b.id}')">Editar barbearia</button>
        <button onclick="adminToggleMultiunit('${b.id}')">${adminHasMultiunit(b)?'Bloquear multiunidade':'Liberar multiunidade'}</button>
        <a target="_blank" href="${wa(b.phone,msg)}"><button class="whats">Cobrar no WhatsApp</button></a>
        <button onclick="adminMarkPaid('${b.id}')">Marcar como pago</button><button class="gold" onclick="adminOpenCashPassword('${b.id}')">Senha do caixa</button>
        <button class="danger" onclick="adminToggleBlock('${b.id}')">${(bill.status||'ativo')==='bloqueado'?'Reativar':'Bloquear'}</button>
      </div>
      <small class="muted">${esc(bill.note||'Sem observações internas.')}</small>
    </div>
  </details>`;
}

async function renderAdmin(){
  if(!isAdminRole()){ root.innerHTML = `<div class="page"><div class="card"><h2>Acesso negado</h2><p class="muted">Este painel é exclusivo do Admin Master.</p><button onclick="logout()">Sair</button></div></div>`; return; }
  if(page === "support" && typeof supportPage === "function"){
    layout("Suporte / Chat", "Conversas em tempo real das barbearias", supportPage());
    setTimeout(()=>{ if(typeof supportInit === "function") supportInit(); },80);
    return;
  }
  const {data,error}=await db.from("barbers").select(typeof ADMIN_BARBER_COLUMNS !== 'undefined' ? ADMIN_BARBER_COLUMNS : BARBER_SAFE_COLUMNS).order("created_at",{ascending:false}); if(error) toast(error.message); cache.barbers=data||[];
  cache.shopBarbers = cache.barbers;
  cache.allShopBarbers = cache.barbers;
  const [adminServices, adminAppointments] = await Promise.all([
    db.from("services").select("*"),
    db.from("appointments").select("*, services(name, price, duration)").order("date",{ascending:true}).order("time",{ascending:true})
  ]);
  cache.services = adminServices.data || [];
  cache.appointments = adminAppointments.data || [];
  window.__adminUnitRequests = await adminLoadUnitRequests();
  const pending = cache.barbers.filter(b=>(b.access_status||"")==="pendente");
  const active = cache.barbers.filter(b=>(b.access_status||"ativo")!=="pendente");
  const sum=adminBillingSummary(cache.barbers);
  const pendingHtml = pending.length ? `<div class="card alertCard"><h3>Prospecção de clientes</h3><p class="muted">Cadastros criados pelo site. Entre em contato, aprove/bloqueie ou exclua a solicitação.</p>${pending.map(b=>`<div class="item"><div><strong>${esc(b.name)} — ${esc(b.shop_name||'')}</strong><small>WhatsApp: ${esc(b.phone||'')} • Pendente de aprovação</small><br><small>Obs: ${esc(b.activation_note||'sem observação')}</small><br><small>Login temporário: <b>${esc(b.login)}</b> • Senha cadastrada: <b>protegida</b></small></div><div class="row"><a target="_blank" href="${wa(b.phone,`Olá ${b.name}, tudo bem? Recebemos seu cadastro no ZenBarber para a ${b.shop_name||'sua barbearia'}. Vamos te passar as opções de plano e liberar seu acesso.`)}"><button class="whats">Entrar em contato</button></a><button class="primary" onclick="adminEditShopBilling('${b.id}')">Editar perfil / autorizar</button><button class="danger" onclick="adminDelete('${b.id}')">Excluir solicitação</button></div></div>`).join('')}</div>` : '';
  const adminHero = `<section class="card adminCommand"><div><span class="eyebrow">Controle do administrador</span><h2>Faturamento mensal do ZenBarber</h2><p class="muted">Aqui você acompanha suas barbearias como clientes recorrentes: mensalidade, vencimento, status, bonificação e cobrança pelo WhatsApp.</p></div></section>`;
  const adminStats = `<div class="statgrid adminStats"><div class="stat"><span>Receita mensal prevista</span><b>${money(sum.mrr)}</b><small>MRR das barbearias ativas</small></div><div class="stat"><span>Barbearias ativas</span><b>${sum.active.length}</b><small>clientes cadastrados</small></div><div class="stat"><span>Vencendo agora</span><b>${sum.vencendo}</b><small>precisam de cobrança</small></div><div class="stat"><span>Bonificadas</span><b>${sum.bonificados}</b><small>sem mensalidade no mês</small></div></div>`;
  const createBox = `<div class="card"><h3>Nova barbearia / cliente SaaS</h3><p class="muted">Cadastre uma barbearia e já defina o controle financeiro dela.</p><div class="grid3"><input id="an" placeholder="Nome do responsável"><input id="al" placeholder="Login"><input id="ap" type="password" placeholder="Senha"><input id="aw" placeholder="WhatsApp"><input id="as" placeholder="Nome da barbearia"><select id="ar"><option value="gerente">Gerente</option><option value="barber">Barbeiro</option><option value="admin_master">Admin Master</option></select><input id="aexp" type="date" placeholder="Vencimento de acesso"><input id="amonthly" type="number" min="0" step="0.01" placeholder="Mensalidade. Ex: 97"><input id="adue" type="number" min="1" max="28" placeholder="Dia vencimento"><button class="primary" onclick="adminCreate()">Criar barbearia</button></div></div>`;
  const unitRequests = adminUnitRequestsHtml(window.__adminUnitRequests || []);
  const adminRetention = (typeof retentionMetrics==='function' && typeof zenHealthIndex==='function') ? (()=>{ const rm=retentionMetrics(); const zh=zenHealthIndex(); return `<div class="card retentionDashCard"><div class="chartTitle"><div><h3>Retenção geral das barbearias</h3><p class="muted">Visão Admin Master consolidada: clientes em risco, recuperados, taxa de retorno e Índice ZEN global.</p></div></div><div class="retentionDashGrid"><div><span>Clientes em risco</span><b>${rm.risk}</b></div><div><span>Clientes recuperados</span><b>${rm.recovered}</b></div><div><span>Taxa de retorno</span><b>${rm.returnRate}%</b></div><div><span>Clientes perdidos</span><b>${rm.lost}</b></div><div class="zenDashScore ${zh.cls}"><span>Índice ZEN</span><b>${zh.score}</b><small>${zh.label}</small></div></div></div>`; })() : '';
  const shops = `<div class="card adminShopList"><h3>Minhas barbearias</h3><p class="muted">Modelo igual aos Clientes Fixos: card fechado, expansão para detalhes, edição e cobrança.</p>${active.map(adminShopCard).join('') || '<div class="empty">Nenhuma barbearia cadastrada.</div>'}</div>`;
  layout("Painel ADM","Controle financeiro mensal e gestão das barbearias",`${adminHero}${adminStats}${adminRetention}${pendingHtml}${unitRequests}${createBox}${shops}`);
}

window.adminCreate = async () => { if(!requireAdminMaster()) return;
  const rawPassword = ap.value;
  const row={name:an.value,login:al.value.trim().toLowerCase().replace(/\s+/g,"-"),phone:aw.value,shop_name:as.value,role:ar.value,expires_at:aexp.value||null,access_status:"ativo",photo_url:"",background_url:"",work_start:OPEN,work_end:CLOSE,commission_rate:0,off_days:""};
  if(!row.name||!row.login||!rawPassword) return toast("Preencha nome, login e senha");
  await setBarberPasswordFields(row, row.login, rawPassword);
  let {data,error}=await db.from("barbers").insert(row).select().single();
  if(error && String(error.message||"").toLowerCase().includes("password_hash")){
    const legacyRow = {...row, password:rawPassword}; delete legacyRow.password_hash;
    ({data,error}=await db.from("barbers").insert(legacyRow).select().single());
  }
  if(error) toast(error.message); else { adminBillingSet(data.id,{monthly_fee:Number(amonthly?.value||0),due_day:Number(adue?.value||10),start_date:todayISO(),status:'ativo'}); renderAdmin(); }
};
window.adminEdit = id => adminEditShopBilling(id);
window.adminEditShopBilling = id => {
  const b=cache.barbers.find(x=>x.id===id); if(!b) return;
  const bill=adminBillingFor(id);
  document.body.insertAdjacentHTML("beforeend",`<div class="modalBack" id="modal"><div class="modal wideModal"><h2>Editar barbearia</h2><p class="muted">Edite acesso, mensalidade, prazo de pagamento, ativação, bonificação e dados de cobrança.</p><div class="grid2">
    <label>Nome do responsável<input id="adn" value="${esc(b.name)}"></label>
    <label>Nome da barbearia<input id="ads" value="${esc(b.shop_name||'')}"></label>
    <label>Login<input id="adl" value="${esc(b.login)}"></label>
    <label>Nova senha<input id="adp" type="password" placeholder="Deixe vazio para manter a senha atual"></label>
    <label>WhatsApp<input id="adw" value="${esc(b.phone||'')}"></label>
    <label>Tipo de acesso<select id="adr"><option value="barber" ${(!b.role||b.role==='barber')?'selected':''}>Barbeiro</option><option value="gerente" ${b.role==='gerente'?'selected':''}>Gerente</option><option value="admin_master" ${normalizeRole(b.role)==='admin'?'selected':''}>Admin Master</option></select></label>
    <label>Status de acesso<select id="adst"><option value="ativo" ${(b.access_status||'ativo')==='ativo'?'selected':''}>Ativo</option><option value="pendente" ${b.access_status==='pendente'?'selected':''}>Pendente</option><option value="bloqueado" ${b.access_status==='bloqueado'?'selected':''}>Bloqueado</option></select></label>
    <label>Vencimento do acesso<input id="adexp" type="date" value="${esc(b.expires_at||'')}"></label>
    <label>Mensalidade<input id="admfee" type="number" min="0" step="0.01" value="${Number(bill.monthly_fee||0).toFixed(2)}"></label>
    <label>Dia de pagamento<input id="admdue" type="number" min="1" max="28" value="${esc(bill.due_day||10)}"></label>
    <label>Início do contrato<input id="admstart" type="date" value="${esc(bill.start_date||todayISO())}"></label>
    <label>Fim do contrato<input id="admend" type="date" value="${esc(bill.end_date||'')}"></label>
    <label>Status financeiro<select id="admstatus"><option value="ativo" ${(bill.status||'ativo')==='ativo'?'selected':''}>Ativo / cobrando</option><option value="trial" ${bill.status==='trial'?'selected':''}>Teste</option><option value="bonificado" ${bill.status==='bonificado'?'selected':''}>Bonificado</option><option value="bloqueado" ${bill.status==='bloqueado'?'selected':''}>Bloqueado financeiro</option></select></label>
    <label>Forma de pagamento<input id="admpay" value="${esc(bill.payment_method||'Pix')}"></label>
    <label>Bonificação<input id="admbonus" value="${esc(bill.bonus||'')}"></label>
    <label>Último pagamento<input id="admlast" type="date" value="${esc(bill.last_payment||'')}"></label>
    <label>Multiunidade premium<select id="admulti"><option value="nao" ${!adminHasMultiunit(b)?'selected':''}>Bloqueada / plano 1 unidade</option><option value="sim" ${adminHasMultiunit(b)?'selected':''}>Liberada após taxa</option></select></label>
  </div><label>Observação interna<textarea id="admnote" rows="3">${esc(bill.note||'')}</textarea></label><div class="row"><button class="primary" onclick="adminSave('${id}')">Salvar tudo</button><button class="danger" onclick="adminDelete('${id}')">Excluir</button><button onclick="modal.remove()">Cancelar</button></div></div></div>`);
};
window.adminSave = async id => { if(!requireAdminMaster()) return;
  const original=cache.barbers.find(x=>x.id===id)||{};
  const row={name:adn.value,login:adl.value.trim().toLowerCase().replace(/\s+/g,"-"),phone:adw.value,shop_name:ads.value,role:adr.value,access_status:adst.value,expires_at:adexp.value||null,activation_note:adminNextNoteWithMultiunit(original.activation_note, admulti.value==='sim')};
  const newPass = (adp.value||'').trim();
  if(newPass) await setBarberPasswordFields(row, row.login, newPass);
  let {error}=await db.from("barbers").update(row).eq("id",id);
  if(error && String(error.message||"").toLowerCase().includes("password_hash") && newPass){
    const legacyRow = {...row, password:newPass}; delete legacyRow.password_hash;
    ({error}=await db.from("barbers").update(legacyRow).eq("id",id));
  }
  if(error) toast(error.message); else {
    adminBillingSet(id,{monthly_fee:Number(admfee.value||0),due_day:Number(admdue.value||10),start_date:admstart.value||'',end_date:admend.value||'',status:admstatus.value,payment_method:admpay.value||'Pix',bonus:admbonus.value||'',last_payment:admlast.value||'',note:admnote.value||''});
    modal.remove(); renderAdmin();
  }
};
window.adminToggleMultiunit = async id => { if(!requireAdminMaster()) return;
  const b = cache.barbers.find(x=>x.id===id); if(!b) return;
  const next = !adminHasMultiunit(b);
  const note = adminNextNoteWithMultiunit(b.activation_note, next);
  const {error}=await db.from('barbers').update({activation_note:note}).eq('id',id);
  if(error) return toast(error.message);
  toast(next ? 'Multiunidade liberada para esta barbearia.' : 'Multiunidade bloqueada para esta barbearia.');
  renderAdmin();
};
window.adminMarkPaid = id => { if(!requireAdminMaster()) return; adminBillingSet(id,{last_payment:todayISO(),status:'ativo'}); toast('Pagamento marcado como recebido.'); renderAdmin(); };
window.adminToggleBlock = async id => { if(!requireAdminMaster()) return;
  const bill=adminBillingFor(id); const blocked=(bill.status||'ativo')==='bloqueado'; adminBillingSet(id,{status:blocked?'ativo':'bloqueado'});
  await db.from('barbers').update({access_status:blocked?'ativo':'bloqueado'}).eq('id',id);
  renderAdmin();
};
window.adminApprove = async id => { if(!requireAdminMaster()) return; const {error}=await db.from("barbers").update({access_status:"ativo"}).eq("id",id); if(error) toast(error.message); else {toast("Barbeiro autorizado"); renderAdmin();} };
window.adminDelete = async id => { if(!requireAdminMaster()) return; if(!confirm("Excluir este perfil?")) return; await db.from("barbers").delete().eq("id",id); const all=adminBillingLoad(); delete all[id]; adminBillingSave(all); if(typeof modal!=="undefined" && modal) modal.remove(); renderAdmin(); };



// ===== Admin Master: senha do Controle de Caixa =====
async function adminMakeCashPasswordHashForShop(b, password){
  const key = String(b?.shop_id || ('shop:' + String(b?.shop_name||b?.name||'').trim().toLowerCase()));
  return CASH_PASS_PREFIX + await sha256Hex('ZenBarber|cash|' + key + '|' + String(password||'') + '|v1');
}
window.adminOpenCashPassword = async function(id){
  if(!requireAdminMaster()) return;
  const b = cache.barbers.find(x=>String(x.id)===String(id));
  if(!b) return toast('Barbearia não encontrada.');
  let q = db.from('cash_access_settings').select('*').limit(1);
  q = b.shop_id ? q.eq('shop_id', b.shop_id) : q.eq('shop_name', b.shop_name||b.name||'');
  const {data,error}=await q;
  const cfg = !error ? (data||[])[0] : null;
  document.body.insertAdjacentHTML('beforeend',`<div class="modalBack" id="modal"><div class="modal"><h2>Senha do Controle de Caixa</h2><p class="muted">Barbearia: <b>${esc(b.shop_name||b.name||'')}</b></p><div class="form"><div class="linkBox">Status: ${cfg?.password_hash?'senha criada':'sem senha criada'}</div><input id="adminCashPass" type="password" placeholder="Nova senha do dono"><small class="muted">Por segurança, a senha não é exibida depois de salva. Você pode apenas criar ou resetar.</small><div class="row"><button class="primary" onclick="adminSaveCashPassword('${b.id}')">Salvar / Resetar senha</button><button onclick="modal.remove()">Cancelar</button></div></div></div></div>`);
};
window.adminSaveCashPassword = async function(id){
  if(!requireAdminMaster()) return;
  const b = cache.barbers.find(x=>String(x.id)===String(id));
  const pass = String(document.getElementById('adminCashPass')?.value||'').trim();
  if(!b) return toast('Barbearia não encontrada.');
  if(pass.length < 4) return toast('Use uma senha com pelo menos 4 caracteres.');
  const hash = await adminMakeCashPasswordHashForShop(b, pass);
  const row = { shop_id:b.shop_id||null, shop_name:b.shop_name||b.name||'', owner_barber_id:b.id, password_hash:hash, updated_by:me?.name||'Admin' };
  let q = db.from('cash_access_settings').select('id').limit(1);
  q = b.shop_id ? q.eq('shop_id', b.shop_id) : q.eq('shop_name', b.shop_name||b.name||'');
  const existing = await q;
  let res;
  if(existing.data && existing.data[0]) res = await db.from('cash_access_settings').update(row).eq('id', existing.data[0].id);
  else res = await db.from('cash_access_settings').insert(row);
  if(res.error) return toast(res.error.message);
  if(typeof modal!=='undefined' && modal) modal.remove();
  toast('Senha do Controle de Caixa salva.');
};
