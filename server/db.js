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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_visit (visit_id),
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];
export async function initDatabase() {
  for (const statement of schema) await db.query(statement);
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error('ADMIN_PASSWORD en az 12 karakter olmalıdır.');
    const [admins] = await db.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (!admins.length) {
      await db.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
        ['İlk Yönetici', email, await bcrypt.hash(password, 12), 'admin']);
      console.log('İlk yönetici hesabı oluşturuldu.');
    }
  }
}
