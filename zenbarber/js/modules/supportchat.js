// ===== MÓDULO SUPORTE / CHAT — NextJumpX =====
const SUPPORT_BUCKET = 'support-attachments';
const SUPPORT_TITLE_BASE = 'ZenBarber Pro';
const supportState = { conversation:null, conversations:[], messages:[], activeConversationId:null, channel:null, typingChannel:null, typingTimer:null, typingUsers:{}, unread:0, notificationAsked:false };

function supportUserRole(){ return isAdminRole() ? 'admin' : normalizeRole(me?.role || 'barber'); }
function supportShopKey(){ return sameShopId() || sameShopName() || me?.shop_name || me?.login || me?.id || 'sem-loja'; }
function supportSafeId(v){ return String(v||'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,80); }
function supportConversationTitle(c){ return c?.shop_name || c?.barber_name || c?.shop_id || 'Barbearia'; }
function supportOtherLabel(){ return isAdminRole() ? 'Barbearia' : 'Suporte NextJumpX'; }
function supportCanNotify(){ return 'Notification' in window; }
function supportUnreadBadgeHtml(){ return supportState.unread ? `<b class="supportNavBadge">${supportState.unread > 99 ? '99+' : supportState.unread}</b>` : ''; }

function supportSetTitle(){
  document.title = supportState.unread > 0 ? `(${supportState.unread}) ZenBarber Pro` : 'ZenBarber Pro Powered by NextJumpX';
}
function supportBrowserNotify(){
  if(!supportCanNotify() || Notification.permission !== 'granted') return;
  try{ new Notification('Nova mensagem de suporte', { body:'Você recebeu uma nova mensagem no suporte do ZenBarber.', icon:'icon-192.png' }); }catch(e){}
}
async function supportAskNotificationPermission(){
  if(!supportCanNotify()) return toast('Este navegador não suporta notificações.');
  const permission = await Notification.requestPermission();
  toast(permission === 'granted' ? 'Notificações ativadas.' : 'Notificações não ativadas.');
}
window.supportAskNotificationPermission = supportAskNotificationPermission;

async function supportEnsureConversation(){
  if(isAdminRole()) return null;
  const sid = sameShopId();
  let query = db.from('support_conversations').select('*').limit(1);
  query = sid ? query.eq('shop_id', sid) : query.eq('shop_name', sameShopName());
  const found = await query.maybeSingle();
  if(found.data){ supportState.conversation = found.data; supportState.activeConversationId = found.data.id; return found.data; }
  const row = { shop_id: sid || null, shop_name: sameShopName(), barber_id: me?.id || null, barber_name: me?.name || '', created_by: me?.id || null, last_message_at: new Date().toISOString() };
  const {data,error} = await db.from('support_conversations').insert(row).select('*').single();
  if(error){ toast('Erro ao abrir suporte: ' + error.message); return null; }
  supportState.conversation = data; supportState.activeConversationId = data.id; return data;
}

async function supportLoadConversations(){
  if(!isAdminRole()) return [];
  const {data,error} = await db.from('support_conversations').select('*').order('last_message_at',{ascending:false}).limit(200);
  if(error){ toast(error.message); return []; }
  supportState.conversations = data || [];
  if(!supportState.activeConversationId && supportState.conversations[0]) supportState.activeConversationId = supportState.conversations[0].id;
  return supportState.conversations;
}

async function supportLoadMessages(){
  const id = supportState.activeConversationId;
  if(!id) return [];
  const {data,error} = await db.from('support_messages').select('*').eq('conversation_id', id).order('created_at',{ascending:true}).limit(500);
  if(error){ toast(error.message); return []; }
  supportState.messages = data || [];
  await supportMarkCurrentAsRead();
  supportRenderMessages();
  supportRenderConversations();
  return supportState.messages;
}

async function supportUnreadCount(){
  try{
    if(isAdminRole()){
      const {count,error} = await db.from('support_messages').select('id',{count:'exact',head:true}).neq('sender_role','admin').is('read_by_admin_at', null);
      if(error) throw error;
      supportState.unread = count || 0;
    }else{
      const c = supportState.conversation || await supportEnsureConversation();
      if(!c){ supportState.unread = 0; }
      else{
        const {count,error} = await db.from('support_messages').select('id',{count:'exact',head:true}).eq('conversation_id', c.id).eq('sender_role','admin').is('read_by_shop_at', null);
        if(error) throw error;
        supportState.unread = count || 0;
      }
    }
  }catch(e){ supportState.unread = 0; }
  supportSetTitle();
  const navBadge = document.getElementById('supportUnreadBadge');
  if(navBadge) navBadge.textContent = supportState.unread ? (supportState.unread > 99 ? '99+' : supportState.unread) : '';
  return supportState.unread;
}

async function supportMarkCurrentAsRead(){
  const id = supportState.activeConversationId;
  if(!id) return;
  const now = new Date().toISOString();
  if(isAdminRole()){
    await db.from('support_messages').update({ delivered_at: now, read_by_admin_at: now }).eq('conversation_id', id).neq('sender_role','admin').is('read_by_admin_at', null);
  }else{
    await db.from('support_messages').update({ delivered_at: now, read_by_shop_at: now }).eq('conversation_id', id).eq('sender_role','admin').is('read_by_shop_at', null);
  }
  await supportUnreadCount();
}

function supportTickHtml(m){
  const mine = m.sender_id === me?.id || (isAdminRole() && m.sender_role === 'admin') || (!isAdminRole() && m.sender_role !== 'admin');
  if(!mine) return '';
  const read = m.sender_role === 'admin' ? !!m.read_by_shop_at : !!m.read_by_admin_at;
  const delivered = !!m.delivered_at || read;
  const cls = read ? 'read' : delivered ? 'delivered' : 'sent';
  return `<span class="supportTicks ${cls}" title="${read?'Lida':delivered?'Entregue':'Enviada'}">${delivered?'✓✓':'✓'}</span>`;
}
function supportMessageHtml(m){
  const mine = m.sender_id === me?.id || (isAdminRole() && m.sender_role === 'admin') || (!isAdminRole() && m.sender_role !== 'admin');
  const time = m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
  const img = m.attachment_url ? `<a class="supportAttachment" target="_blank" href="${esc(m.attachment_url)}"><img src="${esc(m.attachment_url)}" alt="Anexo do suporte"></a>` : '';
  return `<div class="supportMsg ${mine?'mine':'theirs'}"><div class="supportMsgBubble"><small>${esc(m.sender_name || (mine?'Você':supportOtherLabel()))}</small>${m.body?`<p>${esc(m.body)}</p>`:''}${img}<span class="supportMsgMeta">${esc(time)} ${supportTickHtml(m)}</span></div></div>`;
}
function supportRenderMessages(){
  const box = document.getElementById('supportMessages');
  if(!box) return;
  box.innerHTML = supportState.messages.map(supportMessageHtml).join('') || `<div class="supportEmpty">Nenhuma mensagem ainda. Envie um print ou descreva o problema.</div>`;
  box.scrollTop = box.scrollHeight;
  supportRenderTyping();
}
function supportRenderConversations(){
  const box = document.getElementById('supportConversationList');
  if(!box) return;
  box.innerHTML = supportState.conversations.map(c=>`<button class="supportConv ${supportState.activeConversationId===c.id?'active':''}" onclick="supportSelectConversation('${esc(c.id)}')"><b>${esc(supportConversationTitle(c))}</b><small>${esc(c.anydesk_code ? 'AnyDesk: '+c.anydesk_code : 'Sem AnyDesk cadastrado')}</small></button>`).join('') || '<div class="supportEmpty small">Nenhuma conversa.</div>';
}
function supportRenderTyping(){
  const el = document.getElementById('supportTyping');
  if(!el) return;
  const active = Object.values(supportState.typingUsers||{}).some(x=>Date.now() - x < 4500);
  el.innerHTML = active ? `<span>${supportOtherLabel()} digitando</span><i></i><i></i><i></i>` : '';
}

window.supportSelectConversation = async id => {
  supportState.activeConversationId = id;
  supportRenderConversations();
  await supportLoadMessages();
  supportSubscribe();
};

async function supportUploadAttachment(file){
  if(!file) return '';
  if(!/^image\//.test(file.type || '')){ toast('Anexe apenas imagens/prints.'); return ''; }
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${supportSafeId(supportShopKey())}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const {error} = await db.storage.from(SUPPORT_BUCKET).upload(path, file, {cacheControl:'3600', upsert:false});
  if(error){ toast('Erro ao anexar imagem: ' + error.message); return ''; }
  const {data} = db.storage.from(SUPPORT_BUCKET).getPublicUrl(path);
  return data?.publicUrl || '';
}

window.supportSendMessage = async () => {
  const input = document.getElementById('supportInput');
  const fileInput = document.getElementById('supportFile');
  const body = String(input?.value || '').trim();
  const file = fileInput?.files?.[0] || null;
  if(!body && !file) return toast('Digite uma mensagem ou anexe uma imagem.');
  const conv = supportState.activeConversationId ? {id:supportState.activeConversationId} : await supportEnsureConversation();
  if(!conv?.id) return;
  const btn = document.getElementById('supportSendBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Enviando...'; }
  const attachment_url = await supportUploadAttachment(file);
  const row = { conversation_id: conv.id, sender_id: me?.id || null, sender_name: me?.name || 'Usuário', sender_role: supportUserRole(), body, attachment_url: attachment_url || null, status:'sent' };
  const {error} = await db.from('support_messages').insert(row);
  if(error) toast('Erro ao enviar: ' + error.message);
  else{
    input.value = ''; if(fileInput) fileInput.value = '';
    await db.from('support_conversations').update({ last_message_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id', conv.id);
    await supportStopTyping();
  }
  if(btn){ btn.disabled = false; btn.textContent = 'Enviar'; }
  await supportLoadMessages();
};

window.supportTypingChanged = async () => {
  const id = supportState.activeConversationId || supportState.conversation?.id;
  if(!id || !me?.id) return;
  await db.from('support_typing').upsert({ conversation_id:id, user_id:me.id, user_name:me.name||'', user_role:supportUserRole(), is_typing:true, updated_at:new Date().toISOString() }, { onConflict:'conversation_id,user_id' });
  clearTimeout(supportState.typingTimer);
  supportState.typingTimer = setTimeout(supportStopTyping, 1800);
};
async function supportStopTyping(){
  const id = supportState.activeConversationId || supportState.conversation?.id;
  if(id && me?.id) await db.from('support_typing').upsert({ conversation_id:id, user_id:me.id, user_name:me.name||'', user_role:supportUserRole(), is_typing:false, updated_at:new Date().toISOString() }, { onConflict:'conversation_id,user_id' });
}

window.supportSaveAnydesk = async () => {
  const id = supportState.activeConversationId || supportState.conversation?.id;
  if(!id) return toast('Abra a conversa antes de salvar.');
  const code = String(document.getElementById('supportAnydesk')?.value || '').trim();
  const {error} = await db.from('support_conversations').update({ anydesk_code:code || null, updated_at:new Date().toISOString() }).eq('id', id);
  if(error) return toast(error.message);
  toast(code ? 'Código AnyDesk salvo.' : 'AnyDesk removido.');
  if(isAdminRole()) await supportLoadConversations(); else supportState.conversation = {...supportState.conversation, anydesk_code:code};
};

function supportSubscribe(){
  try{ if(supportState.channel) db.removeChannel(supportState.channel); if(supportState.typingChannel) db.removeChannel(supportState.typingChannel); }catch(e){}
  const id = supportState.activeConversationId || supportState.conversation?.id;
  const msgFilter = id ? `conversation_id=eq.${id}` : undefined;
  supportState.channel = db.channel('support_messages_' + (id || 'admin_all'))
    .on('postgres_changes', {event:'*', schema:'public', table:'support_messages', ...(msgFilter?{filter:msgFilter}:{})}, async payload=>{
      const incoming = payload.new || {};
      const fromOther = incoming.sender_id !== me?.id;
      if(fromOther){ supportBrowserNotify(); toast('Nova mensagem de suporte.'); }
      await supportUnreadCount();
      if(!isAdminRole() || incoming.conversation_id === supportState.activeConversationId) await supportLoadMessages();
      if(isAdminRole()) await supportLoadConversations();
    })
    .on('postgres_changes', {event:'*', schema:'public', table:'support_conversations'}, async()=>{ if(isAdminRole()) await supportLoadConversations(); })
    .subscribe();
  if(id){
    supportState.typingChannel = db.channel('support_typing_' + id)
      .on('postgres_changes', {event:'*', schema:'public', table:'support_typing', filter:`conversation_id=eq.${id}`}, payload=>{
        const t = payload.new || {};
        if(t.user_id === me?.id) return;
        supportState.typingUsers[t.user_id || t.user_name || 'other'] = t.is_typing ? Date.now() : 0;
        supportRenderTyping();
      }).subscribe();
  }
}

async function supportInit(){
  if(!me) return;
  if(!supportState.notificationAsked && supportCanNotify() && Notification.permission === 'default') supportState.notificationAsked = true;
  if(isAdminRole()) await supportLoadConversations(); else await supportEnsureConversation();
  await supportUnreadCount();
  await supportLoadMessages();
  supportSubscribe();
}

function supportPage(){
  const notify = supportCanNotify() ? `<button onclick="supportAskNotificationPermission()">Ativar notificações</button>` : '';
  setTimeout(supportInit, 60);
  if(isAdminRole()){
    return `<div class="supportLayout adminSupport"><aside class="supportList card"><div class="supportHead"><h3>Conversas</h3><button onclick="supportInit()">Atualizar</button></div><div id="supportConversationList"><div class="supportEmpty small">Carregando conversas...</div></div></aside><section class="supportChat card"><div class="supportHead"><div><h3>Suporte NextJumpX</h3><p class="muted">Todas as conversas das barbearias aparecem aqui.</p></div>${notify}</div><div id="supportMessages" class="supportMessages"></div><div id="supportTyping" class="supportTyping"></div><div class="supportComposer"><button onclick="document.getElementById('supportFile').click()">Anexar imagem</button><input id="supportFile" type="file" accept="image/*" hidden><textarea id="supportInput" rows="2" placeholder="Digite a resposta do suporte..." oninput="supportTypingChanged()"></textarea><button id="supportSendBtn" class="primary" onclick="supportSendMessage()">Enviar</button></div></section><aside class="supportSide card"><h3>AnyDesk</h3><p class="muted">Código opcional da barbearia selecionada.</p><input id="supportAnydesk" placeholder="Ex: 123 456 789"><button class="primary" onclick="supportSaveAnydesk()">Salvar AnyDesk</button></aside></div>`;
  }
  const c = supportState.conversation || {};
  return `<div class="supportLayout"><section class="supportChat card"><div class="supportHead"><div><h3>Chat de suporte</h3><p class="muted">Fale com o suporte NextJumpX sem sair do ZenBarber.</p></div>${notify}</div><div id="supportMessages" class="supportMessages"></div><div id="supportTyping" class="supportTyping"></div><div class="supportComposer"><button onclick="document.getElementById('supportFile').click()">Anexar imagem</button><input id="supportFile" type="file" accept="image/*" hidden><textarea id="supportInput" rows="2" placeholder="Digite sua mensagem para o suporte..." oninput="supportTypingChanged()"></textarea><button id="supportSendBtn" class="primary" onclick="supportSendMessage()">Enviar</button></div></section><aside class="supportSide card"><h3>AnyDesk</h3><p class="muted">Opcional. Cadastre seu código para facilitar futuras conexões do suporte.</p><input id="supportAnydesk" value="${esc(c.anydesk_code||'')}" placeholder="Ex: 123 456 789"><button class="primary" onclick="supportSaveAnydesk()">Cadastrar / Editar AnyDesk</button><small class="muted">Se não quiser cadastrar, deixe em branco.</small></aside></div>`;
}
