import { ensureTables, cleanupExpired } from '../app/db/index.js';

await ensureTables();
await cleanupExpired();

console.log('✅ SQLite inicializada: db.sqlite creado (si no existía) y tablas listas.');