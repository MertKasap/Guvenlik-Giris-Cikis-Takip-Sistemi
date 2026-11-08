import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPerson, issueQrToken, validateQrToken, receiptCode, receiptHash } from './core.js';
process.env.QR_SIGNING_SECRET = 'example-test-secret-with-at-least-32-characters';
test('ad ve telefon temizleme', () => {
  assert.deepEqual(cleanPerson({firstName:' Ayşe  Nur ',lastName:'Yılmaz',phone:'0532 123 45 67'}), {
    firstName:'Ayşe Nur',lastName:'Yılmaz',phone:'05321234567'
  });
});
test('geçersiz telefon reddedilir', () => {
  assert.throws(() => cleanPerson({firstName:'Ali',lastName:'Kaya',phone:'123'}));
});
test('QR amaç ve süre kontrolü', () => {
  const t = Date.UTC(2026,10,8,12);
  const code = issueQrToken('entry', t);
  assert.equal(validateQrToken(code,'entry',t),true);
  assert.equal(validateQrToken(code,'exit',t),false);
  assert.equal(validateQrToken(code,'entry',t+61000),false);
});
test('bozuk token reddedilir', () => {
  const code = issueQrToken('exit');
  assert.equal(validateQrToken(code.slice(0,-5)+'abcde','exit'),false);
});
test('çıkış kodları benzersiz, özeti sabit uzunlukta', () => {
  const a=receiptCode(), b=receiptCode();
  assert.notEqual(a,b);
  assert.equal(receiptHash(a).length,64);
});
