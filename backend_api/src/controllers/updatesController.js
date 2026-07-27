import { supabase, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

export async function listUpdates(req, res) {
  const updates = await query(
    supabase.from('system_updates').select('*')
      .eq('active', true)
      .order('published_at', { ascending: false })
      .limit(100),
  );
  if (!updates.length) {
    res.json([]);
    return;
  }
  const views = await query(
    supabase.from('user_update_views').select('update_id,viewed_at')
      .eq('user_id', req.user.id)
      .in('update_id', updates.map((update) => update.id)),
  );
  const viewed = new Map(views.map((view) => [view.update_id, view.viewed_at]));
  res.json(updates.map((update) => ({
    ...update,
    viewed: viewed.has(update.id),
    viewed_at: viewed.get(update.id) || null,
  })));
}

export async function markViewed(req, res) {
  const updateId = String(req.params.id || '');
  if (!updateId) throw new HttpError(400, 'Novidade inválida');
  await query(supabase.from('user_update_views').upsert({
    user_id: req.user.id,
    update_id: updateId,
    viewed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,update_id' }));
  res.status(204).end();
}
