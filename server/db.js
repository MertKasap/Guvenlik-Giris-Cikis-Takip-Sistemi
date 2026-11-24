import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'security_entry_exit',
  waitForConnections: true, connectionLimit: 10, dateStrings: true
});
const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','guard') NOT NULL DEFAULT 'guard',
    session_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS visits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    entry_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_at DATETIME NULL,
    method ENUM('qr','manual') NOT NULL,
    receipt_hash CHAR(64) NOT NULL UNIQUE,
    created_by BIGINT UNSIGNED NULL,
    INDEX idx_visits_active (exit_at, entry_at),
    INDEX idx_visits_phone (phone),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT UNSIGNED NULL,
    visit_id BIGINT UNSIGNED NULL,
    action VARCHAR(40) NOT NULL,
    target_user_id BIGINT UNSIGNED NULL,
    details VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_visit (visit_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_target (target_user_id),
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];
export async function initDatabase() {
  for (const statement of schema) await db.query(statement);
  // Var olan veritabanlarında yeni alanları ekle; mevcut ziyaret kayıtları korunur.
  async function ensureColumn(table,column,definition){
    const [rows]=await db.execute(
      'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
      [table,column]
    );
    if(!rows.length) await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  await ensureColumn('users','session_version','INT NOT NULL DEFAULT 0');
  await ensureColumn('audit_logs','target_user_id','BIGINT UNSIGNED NULL');
  await ensureColumn('audit_logs','details','VARCHAR(255) NULL');
  const [auditIndexes]=await db.execute(
    "SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND INDEX_NAME='idx_audit_created'"
  );
  if(!auditIndexes.length) await db.query('ALTER TABLE audit_logs ADD INDEX idx_audit_created (created_at)');
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error('ADMIN_PASSWORD en az 12 karakter olmalıdır.');
    const [admins] = await db.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (!admins.length) {
      await db.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
        ['İlk Yönetici', email, await bcrypt.hash(password, 12), 'admin']);
      console.log('İlk yönetici hesabı oluşturuldu.');
    } else if (process.env.ADMIN_PASSWORD_RESET_ON_START === 'true') {
      // Mevcut yönetici için açıkça istenen tek seferlik kurtarma. Şifre yalnızca hash olarak saklanır.
      const [matches] = await db.execute(
        'SELECT id FROM users WHERE email=? AND role=? LIMIT 1', [email, 'admin']);
      if (!matches.length) {
        throw new Error('Yönetici şifresi sıfırlanamadı: ADMIN_EMAIL mevcut admin ile eşleşmiyor.');
      }
      await db.execute('UPDATE users SET password_hash=? WHERE id=?',
        [await bcrypt.hash(password, 12), matches[0].id]);
      console.log('Yönetici parola özeti güvenle yeniden oluşturuldu.');
    }
  }
}
