import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPerson, normalizePhone, phoneLookupVariants, issueQrToken, validateQrToken, receiptCode, receiptHash } from './core.js';

process.env.QR_SIGNING_SECRET='unique-test-secret-longer-than-thirty-two-characters';

test('Kişi bilgileri ve telefon biçimi normalize edilir',()=>{
  assert.deepEqual(cleanPerson({firstName:' Ayşe  Nur ',lastName:'Yılmaz',phone:'0532 123 45 67'}),
    {firstName:'Ayşe Nur',lastName:'Yılmaz',phone:'+905321234567'});
});
test('Geçersiz telefon reddedilir',()=>{
  assert.throws(()=>cleanPerson({firstName:'Ali',lastName:'Kaya',phone:'123'}));
});
test('Farklı mobil telefon biçimleri aynı kayda işaret eder',()=>{
  for(const v of ['0532 123 45 67','+90 5321234567','905321234567','5321234567','00905321234567'])
    assert.equal(normalizePhone(v),'+905321234567');
  assert.deepEqual(phoneLookupVariants('0532 123 45 67'),
    ['+905321234567','05321234567','905321234567','5321234567','00905321234567']);
});
test('QR amaç ve süre doğrulaması yapılır',()=>{
  const now=Date.UTC(2026,10,8,12);
  const code=issueQrToken('entry',now);
  assert.equal(validateQrToken(code,'entry',now),true);
  assert.equal(validateQrToken(code,'exit',now),false);
  assert.equal(validateQrToken(code,'entry',now+61000),false);
});
test('Sahte QR reddedilir',()=>{
  const code=issueQrToken('exit');
  assert.equal(validateQrToken(code.slice(0,-5)+'abcde','exit'),false);
});
test('Okunabilir çıkış kodu kısa ve eşdeğer formatlarda geçerlidir',()=>{
  const code=receiptCode();
  assert.match(code,/^(?:[0-9A-F]{4}-){3}[0-9A-F]{4}$/);
  assert.equal(receiptHash(code),receiptHash(code.toLowerCase().replace(/-/g,'')));
  assert.notEqual(receiptCode(),code);
  assert.equal(receiptHash(code).length,64);
});
test('Eski base64url çıkış kodları değiştirilmeden hashlenir',()=>{
  const old='zQ70He4pm7k-qBaBsiRG-LlE';
  assert.equal(receiptHash(old),receiptHash(old));
  assert.notEqual(receiptHash(old),receiptHash(old.toUpperCase()));
});
