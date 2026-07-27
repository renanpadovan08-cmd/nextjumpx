import { supabase, one, query } from '../services/supabaseService.js';
import { isAdminRole, sameShop } from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';

const conversationColumns =
  'id,shop_id,shop_name,barber_id,barber_name,created_by,anydesk_code,status,last_message_at,created_at,updated_at';

async function conversationForUser(user, id) {
  const conversation = await one(
    supabase.from('support_conversations').select(conversationColumns).eq('id', id),
    'Conversa de suporte não encontrada',
  );
  if (!isAdminRole(user.role) && !sameShop(user, conversation)) {
    throw new HttpError(403, 'Conversa fora da sua barbearia');
  }
  return conversation;
}

async function ensureShopConversation(user) {
  if (isAdminRole(user.role)) {
    throw new HttpError(400, 'O administrador deve selecionar uma conversa');
  }
  let builder = supabase.from('support_conversations')
    .select(conversationColumns)
    .order('last_message_at', { ascending: false })
    .limit(1);
  builder = user.shopId
    ? builder.eq('shop_id', user.shopId)
    : builder.eq('shop_name', user.shopName);
  const existing = (await query(builder))[0];
  if (existing) return existing;

  return query(supabase.from('support_conversations').insert({
    shop_id: user.shopId || null,
    shop_name: user.shopName || 'Barbearia',
    barber_id: user.id,
    barber_name: user.name || '',
    created_by: user.id,
  }).select(conversationColumns).single());
}

export async function listConversations(req, res) {
  if (isAdminRole(req.user.role)) {
    const conversations = await query(
      supabase.from('support_conversations')
        .select(conversationColumns)
        .order('last_message_at', { ascending: false })
        .limit(200),
    );
    res.json(conversations);
    return;
  }
  res.json([await ensureShopConversation(req.user)]);
}

export async function ensureConversation(req, res) {
  res.status(201).json(await ensureShopConversation(req.user));
}

export async function listMessages(req, res) {
  const conversation = await conversationForUser(req.user, req.params.id);
  const messages = await query(
    supabase.from('support_messages').select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(500),
  );
  const unreadIds = messages
    .filter((message) => isAdminRole(req.user.role)
      ? message.sender_role !== 'admin' && !message.read_by_admin_at
      : message.sender_role === 'admin' && !message.read_by_shop_at)
    .map((message) => message.id);
  if (unreadIds.length) {
    const field = isAdminRole(req.user.role)
      ? 'read_by_admin_at'
      : 'read_by_shop_at';
    await query(supabase.from('support_messages')
      .update({ [field]: new Date().toISOString() })
      .in('id', unreadIds));
  }
  res.json(messages);
}

export async function sendMessage(req, res) {
  const conversation = await conversationForUser(req.user, req.params.id);
  const body = String(req.body?.body || '').trim();
  const attachmentUrl = String(req.body?.attachmentUrl || '').trim();
  if (!body && !attachmentUrl) {
    throw new HttpError(400, 'Digite uma mensagem ou envie um anexo');
  }
  if (body.length > 4000) {
    throw new HttpError(400, 'A mensagem deve ter no máximo 4000 caracteres');
  }
  const senderRole = isAdminRole(req.user.role) ? 'admin' : 'barber';
  const message = await query(
    supabase.from('support_messages').insert({
      conversation_id: conversation.id,
      sender_id: req.user.id,
      sender_name: req.user.name || '',
      sender_role: senderRole,
      body: body || null,
      attachment_url: attachmentUrl || null,
      status: 'sent',
      delivered_at: new Date().toISOString(),
      ...(senderRole === 'admin'
        ? { read_by_admin_at: new Date().toISOString() }
        : { read_by_shop_at: new Date().toISOString() }),
    }).select('*').single(),
  );
  await query(supabase.from('support_conversations').update({
    last_message_at: message.created_at,
    updated_at: new Date().toISOString(),
    status: 'aberta',
  }).eq('id', conversation.id));
  res.status(201).json(message);
}

export async function updateConversation(req, res) {
  const conversation = await conversationForUser(req.user, req.params.id);
  const patch = {};
  if (req.body?.anydeskCode != null) {
    patch.anydesk_code = String(req.body.anydeskCode).trim().slice(0, 80);
  }
  if (req.body?.status != null) {
    const status = String(req.body.status).toLowerCase();
    if (!['aberta', 'aguardando', 'resolvida'].includes(status)) {
      throw new HttpError(400, 'Status de suporte inválido');
    }
    patch.status = status;
  }
  if (!Object.keys(patch).length) {
    throw new HttpError(400, 'Nenhuma alteração informada');
  }
  patch.updated_at = new Date().toISOString();
  res.json(await query(supabase.from('support_conversations')
    .update(patch).eq('id', conversation.id)
    .select(conversationColumns).single()));
}
