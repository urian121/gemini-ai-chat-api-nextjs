import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Entorno de BD (usar solo DB_ENV; si falta, asumir 'development')
const dbEnv = (process.env.DB_ENV || 'development').toLowerCase();
const isProd = dbEnv === "production";
// Usar solo DEV_DATABASE_URL/PROD_DATABASE_URL presentes en .env.local
const DEV_URL = process.env.DEV_DATABASE_URL;
const PROD_URL = process.env.PROD_DATABASE_URL;
// Log seguro del entorno de BD seleccionado
console.log(`[DB] Entorno de BD: ${isProd ? 'producción' : 'desarrollo'} (DB_ENV=${dbEnv})`);

let pool;
let _db;

function resolveUrl() {
  const selectedUrl = isProd ? (PROD_URL || DEV_URL) : (DEV_URL || PROD_URL);
  if (!selectedUrl) {
    throw new Error("No se encontró DEV_DATABASE_URL ni PROD_DATABASE_URL. Define una URL de conexión en .env.local o variables de entorno.");
  }
  if (isProd && !PROD_URL && DEV_URL) {
    console.warn('[DB] PROD_DATABASE_URL no está definido; usando DEV_DATABASE_URL como fallback.');
  }
  return selectedUrl;
}

function computeSsl(url) {
  if (!isProd) return false;
  return /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false };
}

export function getDb() {
  if (_db) return _db;
  const url = resolveUrl();
  const ssl = computeSsl(url);
  pool = new Pool({ connectionString: url, ssl });
  _db = drizzle(pool);
  return _db;
}

// Ejecutar verificación de conexión y migraciones de forma perezosa, solo cuando se requiera
// Por defecto NO migrar automáticamente (evita anti-patrones en serverless). Actívalo solo explícitamente.
const MIGRATE_ON_START = ((process.env.MIGRATE_ON_START ?? 'false') === 'true');
export const dbInit = (globalThis.__dbInitPromise ??= (async () => {
  try {
    const db = getDb();
    console.log('[DB] Inicializando conexión y migraciones...');
    await pool.query('SELECT 1');
    console.log('[DB] Conexión OK');
    if (MIGRATE_ON_START) {
      await migrate(db, { migrationsFolder: 'drizzle' });
      console.log('[DB] Migraciones aplicadas');
    } else {
      console.log('[DB] MIGRATE_ON_START=false, no se aplican migraciones automáticas');
    }
  } catch (err) {
    console.error('[DB] Error de inicio:', err);
  }
})());