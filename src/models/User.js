import db from '../database/init.js';
import bcrypt from 'bcryptjs';

export class User {
  static create({ email, password, fullName, role = 'content_editor' }) {
    const passwordHash = bcrypt.hashSync(password, 10);
    
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(email, passwordHash, fullName, role);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id);
    if (user) {
      delete user.password_hash;
    }
    return user;
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static findAll() {
    const stmt = db.prepare('SELECT id, email, full_name, role, is_active, created_at, last_login FROM users');
    return stmt.all();
  }

  static updateLastLogin(id) {
    const stmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  }

  static updatePassword(id, newPassword) {
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    const stmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(passwordHash, id);
  }

  static updateRole(id, role) {
    const stmt = db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(role, id);
  }

  static toggleActive(id) {
    const stmt = db.prepare('UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
  }
}

