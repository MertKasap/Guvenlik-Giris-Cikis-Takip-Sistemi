import crypto from 'node:crypto';

export function cleanPerson(input = {}) {
  const firstName = String(input.firstName ?? '').trim().replace(/\s+/g, ' ');
  const lastName = String(input.lastName ?? '').trim().replace(/\s+/g, ' ');
  const phone = String(input.phone ?? '').replace(/[^\d+]/g, '');
  if (!/^[\p{L} '-]{2,60}$/u.test(firstName) || !/^[\p{L} '-]{2,60}$/u.test(lastName)) {
    throw Object.assign(new Error('Ad ve soyad 2-60 geçerli karakter içermelidir.'), { status: 400 });
  }
  if (!/^\+?\d{10,15}$/.test(phone)) {
    throw Object.assign(new Error('Telefon 10-15 rakam içermelidir.'), { status: 400 });
  }
  return { firstName, lastName, phone };
}
function qrSecret() {
  const s = process.env.QR_SIGNING_SECRET;
  if (!s || s.length < 32) throw new Error('QR_SIGNING_SECRET en az 32 karakter olmalıdır.');
  return s;
}
function signature(data) {
  return crypto.createHmac('sha256', qrSecret()).update(data).digest('base64url');
}
export function issueQrToken(purpose, now = Date.now()) {
  if (!['entry', 'exit'].includes(purpose)) throw new Error('Geçersiz QR amacı.');
  const ttl = Math.max(20, Math.min(180, Number(process.env.QR_TTL_SECONDS) || 60));
  const payload = Buffer.from(JSON.stringify({
    purpose, exp: Math.floor(now / 1000) + ttl, nonce: crypto.randomBytes(12).toString('hex')
  })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function validateQrToken(token, purpose, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 600) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [payload, mac] = parts;
  const actual = Buffer.from(mac, 'base64url');
  const expected = Buffer.from(signature(payload), 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;
  try {
    const content = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return content.purpose === purpose && Number.isInteger(content.exp) && content.exp > Math.floor(now / 1000);
  } catch { return false; }
}
export function receiptCode() {
  return crypto.randomBytes(18).toString('base64url');
}
export function receiptHash(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}
