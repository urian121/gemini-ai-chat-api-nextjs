import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// Conexión única a SQLite
const sqlite = new Database('db.sqlite');
// Usar un único archivo de base de datos (sin -wal/-shm)
sqlite.pragma('journal_mode = DELETE');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

// Crear tablas si no existen (mínimo JS, sin migraciones por ahora)
export function ensureTables() {
  sqlite
    .prepare(
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      )`
    )
    .run();

  sqlite
    .prepare(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        content TEXT NOT NULL,
        sender TEXT NOT NULL,
        image TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`
    )
    .run();
}

// Eliminar conversaciones de más de 48h (y cascada borra mensajes)
export function cleanupExpired() {
  const threshold = Date.now() - 48 * 60 * 60 * 1000; // 48h
  sqlite.prepare('DELETE FROM conversations WHERE created_at <= ?').run(threshold);
}

export function createConversation(id) {
  sqlite.prepare('INSERT INTO conversations (id, created_at) VALUES (?, ?)').run(id, Date.now());
}

export function saveMessage({ conversationId, content, sender, image }) {
  sqlite
    .prepare(
      'INSERT INTO messages (conversation_id, content, sender, image, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(conversationId, content, sender, image || null, Date.now());
}

export function getMessages(conversationId) {
  return sqlite
    .prepare('SELECT id, content, sender, image, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(conversationId);
}

export const db = drizzle(sqlite);
export { sqlite };

export function listConversations() {
  return sqlite
    .prepare(
      `SELECT c.id, c.created_at,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.sender = 'user' ORDER BY id ASC LIMIT 1) AS title,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
       FROM conversations c
       ORDER BY c.created_at DESC`
    )
    .all();
}