// Configuração segura para GitHub/auditoria.
// Para rodar localmente, copie js/config.example.js para js/config.js e preencha os valores reais.
const ZENBARBER_CONFIG = window.ZENBARBER_CONFIG || {};
const SUPABASE_URL = ZENBARBER_CONFIG.SUPABASE_URL || "COLE_SUA_SUPABASE_URL_AQUI";
const SUPABASE_KEY = ZENBARBER_CONFIG.SUPABASE_KEY || "COLE_SUA_SUPABASE_ANON_KEY_AQUI";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const BARBER_SAFE_COLUMNS = "id,name,login,phone,shop_name,role,photo_url,background_url,work_start,work_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note,must_change_password";
const BARBER_PUBLIC_COLUMNS = "id,name,phone,shop_name,photo_url,background_url,work_start,work_end,off_days,commission_rate,access_status,created_at,activation_note";
// Colunas administrativas sem password: a senha nunca deve ser exibida/listada no painel.
const ADMIN_BARBER_COLUMNS = "id,name,login,phone,shop_name,role,photo_url,background_url,work_start,work_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note,must_change_password";


// Segurança etapa 2: senha com hash no navegador (compatível com app estático).
// Observação: o ideal definitivo é Supabase Auth ou backend/Edge Function com bcrypt/argon2.
// Este hotfix remove senha aberta do fluxo e migra senhas antigas no primeiro login.
const PASSWORD_HASH_PREFIX = "zb_sha256_v1$";
async function sha256Hex(text){
  const data = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function makePasswordHash(login,password){
  const normalizedLogin = String(login||"").trim().toLowerCase().replace(/\s+/g,"-");
  return PASSWORD_HASH_PREFIX + await sha256Hex(`ZenBarber|${normalizedLogin}|${password}|v1`);
}
function stripSensitiveBarber(row){
  if(!row) return row;
  const {password,password_hash,...safe}=row;
  return safe;
}
async function setBarberPasswordFields(row, login, password){
  const hash = await makePasswordHash(login,password);
  row.password_hash = hash;
  row.password = null;
  row.must_change_password = false;
  return row;
}
async function migrateLegacyPasswordIfNeeded(user, plainPassword){
  if(!user?.id || user.password_hash || user.password !== plainPassword) return;
  const hash = await makePasswordHash(user.login, plainPassword);
  // Tenta limpar a senha antiga. Se o banco ainda não aceitar null, pelo menos grava o hash.
  let res = await db.from("barbers").update({password_hash:hash,password:null,must_change_password:false}).eq("id",user.id);
  if(res.error){
    await db.from("barbers").update({password_hash:hash,must_change_password:false}).eq("id",user.id);
  }
}
async function verifyBarberPassword(user, plainPassword){
  if(!user) return false;
  if(user.password_hash){
    const expected = await makePasswordHash(user.login, plainPassword);
    return user.password_hash === expected;
  }
  return String(user.password||"") === String(plainPassword||"");
}

// Segurança etapa 3: o acesso Admin deve existir no banco com role admin_master/admin.
// Não use senha fixa no JavaScript, porque todo front-end pode ser inspecionado no navegador.
const ADMIN_LOGIN = "";
const ADMIN_PASS = "";
// Configure estes números se precisar trocar depois. Use DDD + número.
const ACTIVATION_WHATSAPP = ZENBARBER_CONFIG.ACTIVATION_WHATSAPP || "5500000000000";
const ACTIVATION_WHATSAPP_2 = ZENBARBER_CONFIG.ACTIVATION_WHATSAPP_2 || "5500000000000";
const SUPPORT_WHATSAPP = ZENBARBER_CONFIG.SUPPORT_WHATSAPP || "5500000000000";
const root = document.getElementById("root");
let me = JSON.parse(sessionStorage.getItem("zenbarber_user") || "null");
let page = "dashboard";
let dashboardMonth = new Date().toISOString().slice(0,7);
let agendaDate = todayISO();
let cache = { services: [], appointments: [], barbers: [], shopBarbers: [], allShopBarbers: [], publicOwnerPhone: "", publicShopName: "" };

const OPEN = "08:00";
const CLOSE = "20:00";
const STEP = 30;

function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.style.display="block"; setTimeout(()=>t.style.display="none",2800); }
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function esc(s=""){return String(s).replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]))}
function wa(phone,msg){let p=(phone||"").replace(/\D/g,""); if(p && !p.startsWith("55")) p="55"+p; return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`}
function publicLink(login){return `${location.origin}${location.pathname}#book/${encodeURIComponent(login)}`}
function canonicalBookingLogin(fallbackLogin){
  // Link único de agendamento: sempre prioriza o login principal da barbearia
  // (mesmo link exibido na Dashboard), e não o login individual do barbeiro funcionário.
  const list = Array.isArray(cache?.shopBarbers) ? cache.shopBarbers : [];
  const owner = list.find(b => ["gerente","manager","owner","dono"].includes(normalizeRole(b.role))) || list[0] || me || {};
  return String(owner.login || fallbackLogin || me?.login || "").trim();
}
function publicDashboardLink(){ return publicLink(canonicalBookingLogin(me?.login)); }
function saveUser(u){me=u;sessionStorage.setItem("zenbarber_user",JSON.stringify(u));route()}
function refreshSessionUser(patch={}){
  me = {...(me||{}), ...patch};
  sessionStorage.setItem("zenbarber_user", JSON.stringify(me));
}
function normalizeRole(role){
  const r = String(role || "").toLowerCase();
  if(["admin","admin_master","master","adm"].includes(r)) return "admin";
  if(["gerente","manager","owner","dono"].includes(r)) return "gerente";
  if(["barber","barbeiro"].includes(r)) return "barber";
  return "barber";
}
function isAdminRole(){ return normalizeRole(me?.role) === "admin"; }
function isBarberOnlyRole(){ return normalizeRole(me?.role) === "barber"; }
function isManagerRole(){ return normalizeRole(me?.role) === "gerente"; }
function logout(){sessionStorage.removeItem("zenbarber_user");me=null;location.hash="";route()}
window.logout=logout;

function minutes(t){ const [h,m]=String(t||"00:00").split(":").map(Number); return h*60+m; }
function hhmm(min){ return `${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}`; }
function endTime(time,duration=30){
  const start = String(time || '').trim();
  if(!start) return '';
  const dur = Number(duration || 30);
  return hhmm(minutes(start) + (Number.isFinite(dur) ? dur : 30));
}
function safeEndTimeForAppt(a){
  return a?.time ? endTime(a.time, a?.services?.duration || 30) : '';
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function formatDateBR(date){
  const [y,m,d]=String(date||'').split('-');
  return (d&&m) ? `${d}/${m}` : esc(date||'');
}
function formatDateFullBR(date){
  const [y,m,d]=String(date||'').split('-');
  return (d&&m&&y) ? `${d}/${m}/${y}` : esc(date||'');
}
function apptWhenHtml(a){
  const end = a?.time ? hhmm(minutes(a.time)+Number(a.services?.duration||30)) : '';
  return `<span class="dateBadge">${formatDateBR(a.date)}</span> <span class="timeBadge">${esc(a.time||'')}</span>${end ? ` <span class="muted">até ${end}</span>` : ''}`;
}
function serviceById(id){ return cache.services.find(s=>s.id===id); }
function durationOfService(id){ return Number(serviceById(id)?.duration || 30); }
function sameShopName(){ return (me?.shop_name || me?.name || "").trim(); }
function belongsSameShop(b){ return (b.shop_name||"").trim().toLowerCase() === sameShopName().toLowerCase(); }
function barberById(id){ return cache.shopBarbers.find(b=>b.id===id) || cache.barbers.find(b=>b.id===id) || null; }
const DAY_NAMES = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
function dayIndex(date){ return new Date(date+"T12:00:00").getDay(); }
function defaultDaySchedule(b,idx){
  const oldOff = String(b?.off_days||"").startsWith("SCHEDULE_JSON:") ? "" : String(b?.off_days||"");
  const closed = oldOff.split(",").map(x=>x.trim()).includes(String(idx));
  return {open:!closed,start:b?.work_start||OPEN,end:b?.work_end||CLOSE,break_start:b?.break_start||"",break_end:b?.break_end||""};
}
function parseWeeklySchedule(b){
  const raw = String(b?.off_days||"");
  if(raw.startsWith("SCHEDULE_JSON:")){
    try{
      const parsed = JSON.parse(raw.replace("SCHEDULE_JSON:",""));
      return DAY_NAMES.map((_,idx)=>({ ...defaultDaySchedule(b,idx), ...(parsed[idx]||{}) }));
    }catch(e){}
  }
  return DAY_NAMES.map((_,idx)=>defaultDaySchedule(b,idx));
}
function daySchedule(b,date){ return parseWeeklySchedule(b)[dayIndex(date)] || defaultDaySchedule(b,dayIndex(date)); }
function workStart(b,date){ return date ? (daySchedule(b,date).start || OPEN) : (b?.work_start || OPEN); }
function workEnd(b,date){ return date ? (daySchedule(b,date).end || CLOSE) : (b?.work_end || CLOSE); }
function breakStart(b,date){ return date ? (daySchedule(b,date).break_start || "") : (b?.break_start || ""); }
function breakEnd(b,date){ return date ? (daySchedule(b,date).break_end || "") : (b?.break_end || ""); }
function isDayOff(b,date){ return !daySchedule(b,date).open; }
function isBreakConflict(b,time,dur,date){ return breakStart(b,date) && breakEnd(b,date) && intervalOverlaps(time,dur,breakStart(b,date),minutes(breakEnd(b,date))-minutes(breakStart(b,date))); }
function isValidHour(v){ const m=String(v||"").match(/^(\d{1,2}):(\d{2})$/); if(!m) return false; const h=Number(m[1]), mi=Number(m[2]); return h>=0 && h<=24 && mi>=0 && mi<60 && !(h===24 && mi>59); }
function canManageAll(){ return ["admin","gerente"].includes(normalizeRole(me?.role)) || me?.id === cache.shopBarbers[0]?.id; }
function canEditBarber(id){ return canManageAll() || me?.id === id; }

// ===== HOTFIX COMERCIAL: Multiunidade controlada pelo Admin Master =====
const MULTIUNIT_FLAG = "MULTIUNIDADE_LIBERADA";
function hasMultiunitAccess(user=me){
  if(isAdminRole()) return true;
  const note = String(user?.activation_note || "").toUpperCase();
  return note.includes(MULTIUNIT_FLAG) || note.includes("MULTIUNIT_ACTIVE") || note.includes("MULTIUNIDADE ATIVA");
}
const UNIT_DATA_PREFIX = 'ZEN_UNITS_JSON:';
function unitsFromActivationNote(note){
  const txt = String(note || '');
  const idx = txt.indexOf(UNIT_DATA_PREFIX);
  if(idx < 0) return [];
  const encoded = txt.slice(idx + UNIT_DATA_PREFIX.length).split('|')[0].trim();
  try{
    const arr = JSON.parse(decodeURIComponent(encoded));
    return Array.isArray(arr) ? arr.filter(u=>u && u.id && u.name) : [];
  }catch(e){ return []; }
}
function noteWithoutUnits(note){
  return String(note || '').replace(/\s*\|?\s*ZEN_UNITS_JSON:[^|]*/g,'').trim();
}
function noteWithUnits(note, units){
  const clean = noteWithoutUnits(note);
  const safeUnits = (units || []).filter(u=>u && u.id && u.name);
  const payload = safeUnits.length ? `${UNIT_DATA_PREFIX}${encodeURIComponent(JSON.stringify(safeUnits))}` : '';
  return [clean, payload].filter(Boolean).join(' | ');
}
function requestStatusLabel(st){
  const s = String(st || 'pendente').toLowerCase();
  if(s === 'aprovado') return 'Aprovado';
  if(s === 'rejeitado') return 'Rejeitado';
  if(s === 'aguardando_pagamento') return 'Aguardando pagamento';
  if(s === 'bloqueado') return 'Bloqueado';
  return 'Pendente';
}
function localUnitRequestsKey(){ return 'zenbarber_unit_requests_v1'; }
function localUnitRequestsLoad(){ try{return JSON.parse(localStorage.getItem(localUnitRequestsKey())||'[]')||[];}catch(e){return [];} }
function localUnitRequestsSave(list){ localStorage.setItem(localUnitRequestsKey(), JSON.stringify(list||[])); }
function multiunitRequestFormHtml(){
  return `<div class="card unitRequestForm"><h3>Solicitar nova unidade</h3><p class="muted">Preencha os dados da filial. A solicitação fica pendente e só o Admin Master pode aprovar, rejeitar, marcar como aguardando pagamento ou bloquear.</p><div class="grid2">
    <label>Nome da unidade<input id="unitReqName" placeholder="Ex: Unidade Ourinhos"></label>
    <label>Cidade<input id="unitReqCity" placeholder="Ex: Ourinhos"></label>
    <label>Estado<input id="unitReqState" maxlength="2" placeholder="SP"></label>
    <label>Quantidade de barbeiros<input id="unitReqBarbers" type="number" min="1" step="1" placeholder="Ex: 3"></label>
  </div><label>Observações<textarea id="unitReqNotes" rows="4" placeholder="Detalhes comerciais, endereço, previsão de abertura, etc."></textarea></label><div class="row"><button class="primary" onclick="submitUnitRequest()">Enviar solicitação</button></div></div>`;
}
window.requestMultiunitAccess = () => {
  const el = document.getElementById('unitRequestBox');
  if(el){ el.innerHTML = multiunitRequestFormHtml(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
};
window.submitUnitRequest = async () => {
  if(!canManageAll()) return toast('Somente gerente/dono pode solicitar nova unidade.');
  const row = {
    manager_id: me?.id || null,
    manager_name: me?.name || '',
    manager_login: me?.login || '',
    shop_name: sameShopName(),
    unit_name: String(document.getElementById('unitReqName')?.value||'').trim(),
    city: String(document.getElementById('unitReqCity')?.value||'').trim(),
    state: String(document.getElementById('unitReqState')?.value||'').trim().toUpperCase(),
    barber_count: Number(document.getElementById('unitReqBarbers')?.value||0),
    notes: String(document.getElementById('unitReqNotes')?.value||'').trim(),
    status: 'pendente'
  };
  if(!row.unit_name || !row.city || !row.state || !row.barber_count) return toast('Preencha nome, cidade, estado e quantidade de barbeiros.');
  let saved = false;
  const {error} = await db.from('unit_requests').insert(row);
  if(!error) saved = true;
  if(!saved){
    const list = localUnitRequestsLoad();
    list.unshift({...row,id:'local_'+Date.now(),created_at:new Date().toISOString()});
    localUnitRequestsSave(list);
  }
  toast(saved ? 'Solicitação enviada para o Admin Master.' : 'Solicitação salva localmente. Rode o SQL de atualização para aparecer em todos os acessos.');
  renderApp();
};
function multiunitLockedCard(){
  return `<div class="card multiHero lockedFeature"><span class="eyebrow">Recurso premium</span><h3>Multiunidade bloqueada</h3><p class="muted">Sua conta atual permite operar a unidade principal. Para cadastrar filiais, envie uma solicitação interna para análise do Admin Master.</p><div class="statgrid"><div class="stat"><span>Status</span><b>Aguardando liberação</b><small>Controle exclusivo NextJumpX</small></div><div class="stat"><span>Plano atual</span><b>1 unidade</b><small>Sem expansão automática</small></div></div><br><button class="primary" onclick="requestMultiunitAccess()">➕ Solicitar nova unidade</button><p class="muted">Após aprovação, a unidade é criada automaticamente e a Multiunidade é liberada para este cliente.</p></div><div id="unitRequestBox"></div>`;
}

// ===== ZenBarber Etapa 4A: Multiunidade Base =====
// Implementação segura sem exigir alteração imediata no banco.
// As unidades e o vínculo barbeiro -> unidade ficam no navegador (localStorage) por barbearia.
// Próxima geração pode migrar isso para Supabase com colunas/tabelas dedicadas.
function unitStorageKey(){
  const shop = sameShopName() || me?.shop_name || me?.login || 'zenbarber';
  return 'zenbarber_units_' + String(shop).toLowerCase().replace(/[^a-z0-9_-]+/g,'_');
}
function defaultUnitConfig(){ return { units:[{id:'matriz', name:'Matriz'}], barberUnits:{} }; }
function getUnitConfig(){
  try{
    const raw = localStorage.getItem(unitStorageKey());
    const parsed = raw ? JSON.parse(raw) : defaultUnitConfig();
    if(!Array.isArray(parsed.units) || !parsed.units.length) parsed.units = defaultUnitConfig().units;
    if(!parsed.barberUnits || typeof parsed.barberUnits !== 'object') parsed.barberUnits = {};
    const approvedUnits = unitsFromActivationNote(me?.activation_note);
    approvedUnits.forEach(u=>{ if(!parsed.units.some(x=>x.id===u.id)) parsed.units.push(u); });
    return parsed;
  }catch(e){
    const cfg = defaultUnitConfig();
    unitsFromActivationNote(me?.activation_note).forEach(u=>{ if(!cfg.units.some(x=>x.id===u.id)) cfg.units.push(u); });
    return cfg;
  }
}
function saveUnitConfig(cfg){ localStorage.setItem(unitStorageKey(), JSON.stringify(cfg || defaultUnitConfig())); }
function activeUnitKey(){ return unitStorageKey() + '_active'; }
function getActiveUnitId(){ return localStorage.getItem(activeUnitKey()) || 'all'; }
function setActiveUnitId(id){ localStorage.setItem(activeUnitKey(), id || 'all'); route(); }
window.setActiveUnitId = setActiveUnitId;
function unitNameById(id){
  if(id === 'all') return 'Todas as unidades';
  const cfg = getUnitConfig();
  return cfg.units.find(u=>u.id===id)?.name || 'Unidade';
}
function unitOptionsHtml(){
  const cfg = getUnitConfig();
  const active = getActiveUnitId();
  return `<option value="all" ${active==='all'?'selected':''}>Todas as unidades</option>${cfg.units.map(u=>`<option value="${esc(u.id)}" ${active===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}`;
}
function unitSelectorHtml(){
  if(isAdminRole() || isBarberOnlyRole()) return '';
  return `<div class="unitSelector"><span>Unidade</span><select onchange="setActiveUnitId(this.value)">${unitOptionsHtml()}</select><button onclick="page='units';renderApp()">Gerenciar</button></div>`;
}
function filterBarbersByActiveUnit(list){
  const active = getActiveUnitId();
  if(active === 'all') return list;
  const cfg = getUnitConfig();
  return (list||[]).filter(b => (cfg.barberUnits||{})[b.id] === active);
}
window.addUnit = () => {
  if(!hasMultiunitAccess()) return requestMultiunitAccess();
  if(!canManageAll()) return toast('Somente gerente/dono pode solicitar ou gerenciar unidades.');
  const name = String(document.getElementById('newUnitName')?.value || '').trim();
  if(!name) return toast('Informe o nome da unidade. Ex: Ourinhos');
  const cfg = getUnitConfig();
  const id = 'u_' + Date.now().toString(36);
  cfg.units.push({id, name});
  saveUnitConfig(cfg);
  toast('Unidade criada');
  renderApp();
};
window.saveUnitAssignments = () => {
  if(!hasMultiunitAccess()) return requestMultiunitAccess();
  if(!canManageAll()) return toast('Acesso restrito.');
  const cfg = getUnitConfig();
  cfg.barberUnits = cfg.barberUnits || {};
  (cache.allShopBarbers||cache.shopBarbers||[]).forEach(b=>{
    const v = document.getElementById('unit_b_'+b.id)?.value || '';
    if(v) cfg.barberUnits[b.id]=v; else delete cfg.barberUnits[b.id];
  });
  saveUnitConfig(cfg);
  toast('Unidades atualizadas');
  route();
};
window.deleteUnit = id => {
  if(!hasMultiunitAccess()) return requestMultiunitAccess();
  if(!canManageAll()) return toast('Acesso restrito.');
  const cfg = getUnitConfig();
  const unit = cfg.units.find(u=>u.id===id);
  if(!unit) return;
  if(!confirm(`Remover a unidade ${unit.name}? Os barbeiros vinculados voltarão para "sem unidade".`)) return;
  cfg.units = cfg.units.filter(u=>u.id!==id);
  Object.keys(cfg.barberUnits||{}).forEach(k=>{ if(cfg.barberUnits[k]===id) delete cfg.barberUnits[k]; });
  saveUnitConfig(cfg);
  if(getActiveUnitId()===id) localStorage.setItem(activeUnitKey(),'all');
  toast('Unidade removida');
  renderApp();
};
function unitsPage(){
  if(!canManageAll()) return `<div class="card"><h3>Acesso restrito</h3><p class="muted">Somente gerente ou dono pode gerenciar unidades.</p></div>`;
  if(!hasMultiunitAccess()) return multiunitLockedCard();
  const cfg = getUnitConfig();
  const all = cache.allShopBarbers?.length ? cache.allShopBarbers : cache.shopBarbers;
  const counts = cfg.units.map(u=>({u, q:all.filter(b=>(cfg.barberUnits||{})[b.id]===u.id).length}));
  return `<div class="card multiHero"><span class="eyebrow">Multiunidade liberada</span><h3>Controle de unidades</h3><p class="muted">Recurso premium liberado pelo Admin Master. As filiais são criadas somente após aprovação administrativa. O gerente pode vincular barbeiros às unidades já liberadas.</p><div class="unitCards"><div class="unitCard active"><b>Todas as unidades</b><small>Visão consolidada da barbearia</small></div>${counts.map(x=>`<div class="unitCard"><b>${esc(x.u.name)}</b><small>${x.q} barbeiro(s) vinculado(s)</small></div>`).join('')}</div></div>
  <div class="card"><h3>Solicitar outra unidade</h3><p class="muted">Para adicionar uma nova filial, envie uma solicitação interna. O Admin Master aprova e a unidade aparece automaticamente aqui.</p><button class="primary" onclick="requestMultiunitAccess()">➕ Solicitar nova unidade</button><div id="unitRequestBox"></div></div>
  <div class="card"><h3>Vincular barbeiros por unidade</h3><p class="muted">Para cada barbeiro, escolha em qual filial ele atende. Ao selecionar uma unidade no topo, a agenda e o dashboard passam a mostrar apenas os barbeiros daquela filial.</p>${all.map(b=>`<div class="item"><div><strong>${esc(b.name)}</strong><small>${esc(b.login||'')} • ${esc(b.role||'barbeiro')}</small></div><select id="unit_b_${esc(b.id)}"><option value="">Sem unidade definida</option>${cfg.units.map(u=>`<option value="${esc(u.id)}" ${(cfg.barberUnits||{})[b.id]===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>`).join('') || '<div class="empty">Nenhum barbeiro cadastrado.</div>'}<br><button class="primary" onclick="saveUnitAssignments()">Salvar vínculos</button></div>
  <div class="card"><h3>Regra comercial</h3><p class="muted">O gerente não cria unidades diretamente. Toda nova filial passa por solicitação interna e liberação do Admin Master.</p></div>`;
}


function intervalOverlaps(aStart,aDur,bStart,bDur){
  const a1=minutes(aStart), a2=a1+Number(aDur||30), b1=minutes(bStart), b2=b1+Number(bDur||30);
  return a1 < b2 && b1 < a2;
}
function statusBlocks(st){ return ["agendado","em_carteira","encaixe","em_andamento","bloqueio"].includes(st); }
function isClosureAppt(a){ return a?.status === "bloqueio" || String(a?.client_name||"").toLowerCase().includes("agenda fechada"); }
function dateRangeISO(start,end){
  const out=[]; const a=new Date(String(start||todayISO())+"T12:00:00"); const b=new Date(String(end||start||todayISO())+"T12:00:00");
  if(isNaN(a)||isNaN(b)||b<a) return out;
  for(let d=new Date(a); d<=b; d.setDate(d.getDate()+1)) out.push(d.toISOString().slice(0,10));
  return out;
}
function isPastDateTime(date,time){
  const now = new Date();
  const chosen = new Date(`${date}T${time}:00`);
  return chosen.getTime() < now.getTime();
}

