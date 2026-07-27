import { uploadPublicImage } from '../services/imageUploadService.js';

export async function uploadImage(req, res) {
  res.status(201).json(await uploadPublicImage(req.user, req.body));
}
