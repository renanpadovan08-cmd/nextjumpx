import { randomUUID } from 'node:crypto';
import { supabase } from './supabaseService.js';
import { HttpError } from '../utils/httpError.js';

export const publicImagesBucket = 'zenbarber-public';
export const maxImageBytes = 4 * 1024 * 1024;

const imageTypes = {
  'image/jpeg': {
    extension: 'jpg',
    matches: (buffer) =>
      buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    matches: (buffer) =>
      buffer.length >= 8
      && buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  'image/webp': {
    extension: 'webp',
    matches: (buffer) =>
      buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  'image/gif': {
    extension: 'gif',
    matches: (buffer) =>
      buffer.length >= 6
      && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
  },
};

const extensionTypes = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function safePathSegment(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function professionalImageBasePath(user, subjectId) {
  return `${safePathSegment(user.shopId || user.id)}/${safePathSegment(subjectId || user.id)}/professional`;
}

export function decodeImageUpload({ fileName, contentType, data }) {
  const extension = String(fileName || '').split('.').pop()?.toLowerCase();
  const normalizedType = String(contentType || extensionTypes[extension] || '')
    .trim()
    .toLowerCase();
  const imageType = imageTypes[normalizedType];
  if (!imageType) {
    throw new HttpError(
      400,
      'Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.',
    );
  }

  const base64 = String(data || '')
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s/g, '');
  if (!base64 || !/^[a-zA-Z0-9+/]+={0,2}$/.test(base64)) {
    throw new HttpError(400, 'Arquivo de imagem inválido');
  }
  if (base64.length > Math.ceil(maxImageBytes / 3) * 4 + 4) {
    throw new HttpError(413, 'A imagem deve ter no máximo 4 MB');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > maxImageBytes) {
    throw new HttpError(413, 'A imagem deve ter no máximo 4 MB');
  }
  if (!imageType.matches(buffer)) {
    throw new HttpError(400, 'O conteúdo do arquivo não corresponde ao formato da imagem');
  }

  return {
    buffer,
    contentType: normalizedType,
    extension: imageType.extension,
  };
}

async function ensurePublicImagesBucket() {
  const { data } = await supabase.storage.getBucket(publicImagesBucket);
  if (data) return;

  const { error } = await supabase.storage.createBucket(publicImagesBucket, {
    public: true,
    allowedMimeTypes: Object.keys(imageTypes),
    fileSizeLimit: maxImageBytes,
  });
  if (error && !/already exists|duplicate/i.test(error.message || '')) {
    throw new HttpError(502, `Não foi possível preparar o armazenamento: ${error.message}`);
  }
}

export async function uploadPublicImage(user, input) {
  const image = decodeImageUpload(input);
  const kind = ['logo', 'background', 'professional', 'service', 'support'].includes(input.kind)
    ? input.kind
    : 'image';

  await ensurePublicImagesBucket();

  const shop = safePathSegment(user.shopId || user.id);
  const owner = safePathSegment(user.id);
  const subject = safePathSegment(input.subjectId || user.id);
  const basePath = kind === 'support'
    ? `${shop}/${owner}/support/${Date.now()}_${randomUUID()}`
    : kind === 'professional'
      ? professionalImageBasePath(user, subject)
      : kind === 'service'
        ? `${shop}/${subject}/service`
    : `${shop}/${owner}/${kind}`;
  const path = `${basePath}.${image.extension}`;
  const bucket = supabase.storage.from(publicImagesBucket);
  if (kind !== 'support') {
    const obsoletePaths = ['jpg', 'png', 'webp', 'gif']
      .filter((extension) => extension !== image.extension)
      .map((extension) => `${basePath}.${extension}`);
    await bucket.remove(obsoletePaths);
  }

  const { error } = await bucket.upload(path, image.buffer, {
    contentType: image.contentType,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) {
    throw new HttpError(502, `Não foi possível enviar a imagem: ${error.message}`);
  }

  const { data } = bucket.getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new HttpError(502, 'Não foi possível gerar a URL pública da imagem');
  }
  return { url: `${data.publicUrl}?v=${Date.now()}`, path };
}
