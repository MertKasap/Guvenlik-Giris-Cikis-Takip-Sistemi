import crypto from 'node:crypto';

export function normalizePhone(input) {
  const raw = String(input ?? '').trim().replace(/[^\d+]/g, '');
  const digits = raw.replace(/^\+/, '');
  let local = null;
  if (/^5\d{9}$/.test(digits)) local = digits;
  if (/^05\d{9}$/.test(digits)) local = digits.slice(1);
  if (/^905\d{9}$/.test(digits)) local = digits.slice(2);
  if (/^00905\d{9}$/.test(digits)) local = digits.slice(4);
  if (local) return '+90' + local;
  if (!/^\+?\d{10,15}$/.test(raw)) {
    throw Object.assign(new Error('Telefon 10-15 rakam içermelidir.'), { status: 400 });
  }
  return raw;
}

// Old visits may contain any previously accepted phone-number format.
export function phoneLookupVariants(input) {
  const normalized = normalizePhone(input);
  if (!/^\+905\d{9}$/.test(normalized)) return [normalized];
  const local = normalized.slice(3);
  return [normalized, '0' + local, '90' + local, local, '0090' + local];
}

export function cleanPerson(input = {}) {
  const firstName = String(input.firstName ?? '').trim().replace(/\s+/g, ' ');
  const lastName = String(input.lastName ?? '').trim().replace(/\s+/g, ' ');
  const phone = normalizePhone(input.phone);
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
  // 64 bits of randomness, formatted to make typing and copying easier.
  const chars = crypto.randomBytes(8).toString('hex').toUpperCase();
  return chars.match(/.{4}/g).join('-');
}
export function receiptHash(code) {
  const value = String(code ?? '').trim();
  // New hex codes are case-insensitive and may omit the hyphens.
  // Legacy base64url codes remain case-sensitive and valid.
  const normalized = /^(?:[0-9a-f]{4}-){3}[0-9a-f]{4}$/i.test(value) || /^[0-9a-f]{16}$/i.test(value)
    ? value.replace(/-/g, '').toUpperCase() : value;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
