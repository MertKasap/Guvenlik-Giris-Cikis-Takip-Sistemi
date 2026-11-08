import 'dotenv/config';
import app from './app.js';
import { initDatabase } from './db.js';
const port=Number(process.env.PORT || 3000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 ||
    !process.env.QR_SIGNING_SECRET || process.env.QR_SIGNING_SECRET.length < 32) {
  console.error('JWT_SECRET ve QR_SIGNING_SECRET en az 32 karakter olmalı.');
  process.exit(1);
}
try {
  await initDatabase();
  app.listen(port, '0.0.0.0', () => console.log('Uygulama '+port+' portunda hazır.'));
} catch (error) {
  console.error('Veritabanı başlatılamadı:',error.message);
  process.exit(1);
}
