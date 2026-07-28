import { one, supabase } from '../services/supabaseService.js';
import {
  assertShopAccess,
  isRestrictedBarber,
} from '../services/accessService.js';
import { uploadPublicImage } from '../services/imageUploadService.js';
import { HttpError } from '../utils/httpError.js';

export async function uploadImage(req, res) {
  let input = req.body;
  if (req.body?.kind === 'professional') {
    const barberId = String(req.body.barberId || req.user.id);
    const barber = await one(
      supabase.from('barbers')
        .select('id,shop_id,shop_name')
        .eq('id', barberId),
      'Barbeiro nao encontrado',
    );
    assertShopAccess(req.user, barber);
    if (isRestrictedBarber(req.user) && barber.id !== req.user.id) {
      throw new HttpError(403, 'Sem permissao para alterar a foto deste profissional');
    }
    input = { ...req.body, subjectId: barber.id };
  }
  res.status(201).json(await uploadPublicImage(req.user, input));
}
