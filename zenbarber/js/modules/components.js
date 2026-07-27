function safeImg(url){ return String(url||"").trim(); }
function bgStyle(url){ url=safeImg(url); return url ? `style="background:linear-gradient(rgba(5,9,18,.78),rgba(5,9,18,.9)),url('${esc(url)}') center/cover no-repeat"` : ""; }
function avatar(url,name=""){ url=safeImg(url); return url ? `<img class="avatar" src="${esc(url)}" alt="${esc(name)}">` : `<div class="avatar placeholder">✂</div>`; }

const BARBER_PHOTO_PREFIX = "BARBER_PHOTO::";
const BARBER_NOTE_FLAG_SELF_BLOCK = "AGENDA_SELF_BLOCK=1";
function barberNoteParts(note){
  return String(note || "").split("|").map(x=>x.trim()).filter(Boolean);
}
function barberNoteHasFlag(note, flag){
  return barberNoteParts(note).some(x=>x.toUpperCase() === String(flag||"").toUpperCase());
}
function barberNoteSetFlag(note, flag, enabled){
  const parts = barberNoteParts(note).filter(x=>x.toUpperCase() !== String(flag||"").toUpperCase());
  if(enabled) parts.push(flag);
  return parts.join(" | ");
}
function barberCanSelfBlock(b){
  return ["admin","gerente"].includes(normalizeRole(b?.role)) || barberNoteHasFlag(b?.activation_note, BARBER_NOTE_FLAG_SELF_BLOCK);
}
function barberPhotoUrl(b){
  const note = String(b?.activation_note || "");
  const photoPart = barberNoteParts(note).find(x=>x.startsWith(BARBER_PHOTO_PREFIX));
  if(photoPart) return photoPart.slice(BARBER_PHOTO_PREFIX.length);
  return b?.photo_url || "";
}
function barberNoteSetPhoto(note, photoUrl){
  const parts = barberNoteParts(note).filter(x=>!x.startsWith(BARBER_PHOTO_PREFIX));
  if(photoUrl) parts.unshift(BARBER_PHOTO_PREFIX + photoUrl);
  return parts.join(" | ");
}
function barberAvatar(b){ return avatar(barberPhotoUrl(b), b?.name || ""); }

async function imageInputData(inputId, fallback=""){
  const input=document.getElementById(inputId);
  const file=input?.files?.[0];
  if(!file) return fallback || "";
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const reader=new FileReader();
    reader.onload=()=>{ img.onload=()=>{
      const max=1200; let w=img.width, h=img.height;
      if(w>max || h>max){ const r=Math.min(max/w,max/h); w=Math.round(w*r); h=Math.round(h*r); }
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',0.78));
    }; img.onerror=reject; img.src=reader.result; };
    reader.onerror=reject; reader.readAsDataURL(file);
  });
}
function fileField(id,label){ return `<label class="fileLabel">${label}<input id="${id}" type="file" accept="image/*"></label>`; }

function barberOptions(selected=""){return cache.shopBarbers.map(b=>`<option value="${b.id}" ${b.id===selected?'selected':''}>${esc(b.name)}</option>`).join("")}
function servicesForBarber(id){ return cache.services.filter(s=>s.barber_id===id); }

// HOTFIX: ordem manual dos serviços do catálogo.
// Prioriza display_order quando existir no Supabase e usa localStorage como fallback,
// assim a tela não quebra caso a coluna ainda não tenha sido criada.
function serviceOrderStorageKey(barberId){
  const shop = sameShopName() || me?.shop_name || me?.login || 'zenbarber';
  return 'zenbarber_service_order_' + String(shop).toLowerCase().replace(/[^a-z0-9_-]+/g,'_') + '_' + String(barberId||'all');
}
function getLocalServiceOrder(barberId){
  try{ return JSON.parse(localStorage.getItem(serviceOrderStorageKey(barberId)) || '[]'); }catch(e){ return []; }
}
function saveLocalServiceOrder(barberId, ids){ localStorage.setItem(serviceOrderStorageKey(barberId), JSON.stringify(ids||[])); }
function serviceSortValue(s, order){
  if(s && s.display_order !== undefined && s.display_order !== null && s.display_order !== '') return Number(s.display_order);
  const i = order.indexOf(String(s?.id||''));
  return i >= 0 ? i : 9999;
}
function sortCatalogServices(list, barberId){
  const order = getLocalServiceOrder(barberId);
  return [...(list||[])].sort((a,b)=>{
    const ao = serviceSortValue(a, order), bo = serviceSortValue(b, order);
    if(ao !== bo) return ao - bo;
    return String(a.name||'').localeCompare(String(b.name||''),'pt-BR',{sensitivity:'base'});
  });
}

function normalizedServiceName(s){
  return String(s?.name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function isInternalSubscriptionService(s){
  const n = normalizedServiceName(s);
  // Serviços criados automaticamente pelo módulo de clientes fixos/assinaturas,
  // bloqueios, carteira e acertos financeiros não são catálogo.
  // Eles continuam existindo no banco para agenda/financeiro, mas ficam escondidos
  // da aba Serviços e principalmente do link público do cliente.
  const internalWords = [
    'assinatura',
    'bloqueio',
    'recebimento',
    'parcela',
    'cliente fixo',
    'mensalidade',
    'cobranca',
    'fechamento',
    'fechamento de agenda',
    'agenda fechada',
    'feriado',
    'ferias',
    'folga',

    // HOTFIX: serviços técnicos criados por desconto/acréscimo/valor a receber.
    // Versões antigas do ZenBarber criavam um novo registro em services para cada
    // atendimento com preço diferente; por isso o cliente via o histórico inteiro.
    'ajuste financeiro',
    'ajuste',
    'valor a receber',
    'valor receber',
    'valor recebido',
    'valor pago',
    'valor final',
    'recebido',
    'receber',
    'pago',
    'pagamento',
    'desconto',
    'descontado',
    'com desconto',
    'acrescimo',
    'acerto',
    'ajustado',
    'bonificado',
    'cortesia',
    'carteira',
    'contrato',
    'recorrente',
    'pacote'
  ];

  const hasTechnicalMarker = internalWords.some(w=>n.includes(w));
  const isLongBlock = Number(s?.price||0) === 0 && Number(s?.duration||0) >= 240;
  const hasContractCode = /ZB-[A-Z0-9]{4,}/i.test(String(s?.name||''));
  return hasTechnicalMarker || isLongBlock || hasContractCode;
}

function publicServicesForBarber(id){
  // Lista usada pelo link público: somente serviços reais do catálogo do barbeiro.
  // Não usa histórico de appointments e remove registros técnicos antigos criados
  // por descontos, valor a receber, parcelas, bloqueios e carteira.
  return sortCatalogServices(
    servicesForBarber(id)
      .filter(s=>!isInternalSubscriptionService(s))
      .filter(s=>String(s?.id||'') && String(s?.name||'').trim())
      .filter(s=>Number(s?.duration||0) > 0),
    id
  );
}
function serviceOptions(barberId,selected=""){
  // Usado em agendamentos normais: mostra somente serviços cadastrados pelo gerente/barbeiro.
  // Itens internos de clientes fixos/assinaturas ficam escondidos para não poluir a lista.
  return publicServicesForBarber(barberId).map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${esc(s.name)} - ${money(s.price)} • ${s.duration||30}min</option>`).join("");
}
function publicServiceOptions(barberId,selected=""){ return publicServicesForBarber(barberId).map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${esc(s.name)} - ${money(s.price)} • ${s.duration||30}min</option>`).join(""); }
function slotOptions(barberId,date,serviceId,selected=""){
  const dur=durationOfService(serviceId); let out=""; const b=barberById(barberId);
  if(date && isDayOff(b,date)) return `<option value="">Barbeiro de folga neste dia</option>`;
  for(let m=minutes(workStart(b,date)); m+dur<=minutes(workEnd(b,date)); m+=STEP){
    const t=hhmm(m); const reason = isPastDateTime(date,t) ? "passado" : hasLocalConflict(barberId,date,t,dur) ? "ocupado" : isBreakConflict(b,t,dur,date) ? "intervalo" : "";
    out += `<option value="${t}" ${t===selected?'selected':''} ${reason?'disabled':''}>${t}${reason?' — '+reason:''}</option>`;
  }
  return out || `<option value="">Sem horários</option>`;
}

function slotOptionsManual(barberId,date,serviceId,selected=""){
  // Usado no agendamento interno: mantém a lista de horários visível para encaixe.
  // Horários ocupados aparecem marcados como "ocupado", mas continuam selecionáveis
  // para o botão Encaixe. O botão Agendar normal continua validando conflito.
  const dur=durationOfService(serviceId); let out=""; const b=barberById(barberId);
  if(date && isDayOff(b,date)) return `<option value="">Barbeiro de folga neste dia</option>`;
  for(let m=minutes(workStart(b,date)); m+dur<=minutes(workEnd(b,date)); m+=STEP){
    const t=hhmm(m);
    const past=isPastDateTime(date,t);
    const interval=isBreakConflict(b,t,dur,date);
    const occupied=hasLocalConflict(barberId,date,t,dur);
    const disabled=past || interval;
    const reason = past ? "passado" : interval ? "intervalo" : occupied ? "ocupado / encaixe" : "";
    out += `<option value="${t}" ${t===selected?'selected':''} ${disabled?'disabled':''}>${t}${reason?' — '+reason:''}</option>`;
  }
  return out || `<option value="">Sem horários</option>`;
}

function slotOptionsEdit(barberId,date,serviceId,selected="",ignoreId=null){
  const dur=durationOfService(serviceId); let out=""; const b=barberById(barberId);
  if(date && isDayOff(b,date)) return `<option value="">Barbeiro de folga neste dia</option>`;
  for(let m=minutes(workStart(b,date)); m+dur<=minutes(workEnd(b,date)); m+=STEP){
    const t=hhmm(m);
    const reason = (t!==selected && isPastDateTime(date,t)) ? "passado" : hasLocalConflict(barberId,date,t,dur,ignoreId) ? "ocupado" : isBreakConflict(b,t,dur,date) ? "intervalo" : "";
    out += `<option value="${t}" ${t===selected?'selected':''} ${reason?'disabled':''}>${t}${reason?' — '+reason:''}</option>`;
  }
  return out || `<option value="">Sem horários</option>`;
}

function slotOptionsDuration(barberId,date,duration,selected=""){
  const dur=Math.max(1, Number(duration||30)); let out=""; const b=barberById(barberId);
  if(date && isDayOff(b,date)) return `<option value="">Barbeiro de folga neste dia</option>`;
  for(let m=minutes(workStart(b,date)); m+dur<=minutes(workEnd(b,date)); m+=STEP){
    const t=hhmm(m); const reason = isPastDateTime(date,t) ? "passado" : hasLocalConflict(barberId,date,t,dur) ? "ocupado" : isBreakConflict(b,t,dur,date) ? "intervalo" : "";
    out += `<option value="${t}" ${t===selected?'selected':''} ${reason?'disabled':''}>${t}${reason?' — '+reason:''}</option>`;
  }
  return out || `<option value="">Sem horários</option>`;
}
async function hasConflictDuration(barberId,date,time,duration,ignoreId=null){
  if(!date || !time) return true;
  if(isPastDateTime(date,time)) { toast("Não é possível agendar em data ou horário passado."); return true; }
  const dur = Math.max(1, Number(duration||30));
  const b = barberById(barberId);
  if(isDayOff(b,date)){ toast("Esse barbeiro está de folga neste dia."); return true; }
  if(minutes(time) < minutes(workStart(b,date)) || minutes(time)+dur > minutes(workEnd(b,date))){ toast("Horário fora do expediente do barbeiro."); return true; }
  if(isBreakConflict(b,time,dur,date)){ toast("Esse horário pega almoço/intervalo do barbeiro."); return true; }
  const {data,error} = await db.from("appointments").select("id,status,time,service_id,services(duration)").eq("barber_id",barberId).eq("date",date).in("status",["agendado","em_carteira","encaixe","em_andamento","bloqueio"]);
  if(error){toast(error.message); return true;}
  return (data||[]).some(a=>a.id!==ignoreId && intervalOverlaps(time,dur,a.time,a.services?.duration || serviceById(a.service_id)?.duration || 30));
}
function hasLocalConflict(barberId,date,time,duration,ignoreId=null){
  return cache.appointments.some(a=>a.id!==ignoreId && a.barber_id===barberId && a.date===date && statusBlocks(a.status) && intervalOverlaps(time,duration,a.time,a.services?.duration || serviceById(a.service_id)?.duration || 30));
}
async function hasConflict(barberId,date,time,serviceId,ignoreId=null){
  if(!date || !time || !serviceId) return true;
  if(isPastDateTime(date,time)) { toast("Não é possível agendar em data ou horário passado."); return true; }
  const dur = Number(durationOfService(serviceId)||30);
  const b = barberById(barberId);
  if(isDayOff(b,date)){ toast("Esse barbeiro está de folga neste dia."); return true; }
  if(minutes(time) < minutes(workStart(b,date)) || minutes(time)+dur > minutes(workEnd(b,date))){ toast("Horário fora do expediente do barbeiro."); return true; }
  if(isBreakConflict(b,time,dur,date)){ toast("Esse horário pega almoço/intervalo do barbeiro."); return true; }
  const {data,error} = await db.from("appointments").select("id,status,time,service_id,services(duration)").eq("barber_id",barberId).eq("date",date).in("status",["agendado","em_carteira","encaixe","em_andamento","bloqueio"]);
  if(error){toast(error.message); return true;}
  return (data||[]).some(a=>a.id!==ignoreId && intervalOverlaps(time,dur,a.time,a.services?.duration || serviceById(a.service_id)?.duration || 30));
}

