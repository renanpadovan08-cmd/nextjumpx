import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const {
  decodeImageUpload,
  maxImageBytes,
  professionalImageBasePath,
} = await import('../src/services/imageUploadService.js');

const pngHeader = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

test('aceita imagem PNG válida e deriva o MIME pelo nome', () => {
  const decoded = decodeImageUpload({
    fileName: 'logo.png',
    data: pngHeader.toString('base64'),
  });

  assert.equal(decoded.contentType, 'image/png');
  assert.equal(decoded.extension, 'png');
  assert.deepEqual(decoded.buffer, pngHeader);
});

test('rejeita conteúdo disfarçado de imagem', () => {
  assert.throws(
    () => decodeImageUpload({
      fileName: 'logo.png',
      data: Buffer.from('<script>alert(1)</script>').toString('base64'),
    }),
    /conteúdo do arquivo não corresponde/i,
  );
});

test('rejeita formato não permitido e arquivo acima do limite', () => {
  assert.throws(
    () => decodeImageUpload({
      fileName: 'logo.svg',
      data: Buffer.from('<svg/>').toString('base64'),
    }),
    /formato de imagem não suportado/i,
  );

  assert.throws(
    () => decodeImageUpload({
      fileName: 'logo.png',
      data: Buffer.alloc(maxImageBytes + 1).toString('base64'),
    }),
    /no máximo 4 MB/i,
  );
});

test('separa a foto de cada profissional dentro da mesma barbearia', () => {
  const user = { id: 'manager-1', shopId: 'shop-1' };
  assert.equal(
    professionalImageBasePath(user, 'barber-1'),
    'shop-1/barber-1/professional',
  );
  assert.equal(
    professionalImageBasePath(user, 'barber-2'),
    'shop-1/barber-2/professional',
  );
});
