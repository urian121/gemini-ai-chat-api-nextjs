import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Entorno de BD (usar solo DB_ENV; si falta, asumir 'development')
const dbEnv = (process.env.DB_ENV || 'development').toLowerCase();
const isProd = dbEnv === "production";
// Soporta DATABASE_URL genérico y los específicos por entorno (sin fallback a variables sueltas)
const DATABASE_URL = process.env.DATABASE_URL || (isProd ? process.env.PROD_DATABASE_URL : process.env.DEV_DATABASE_URL);
// Log seguro del entorno de BD seleccionado
console.log(`[DB] Entorno de BD: ${isProd ? 'producción' : 'desarrollo'} (DB_ENV=${dbEnv})`);

let pool;
let _db;

function resolveUrl() {
  const selectedUrl = DATABASE_URL;
  if (!selectedUrl) {
    throw new Error("No se encontró DATABASE_URL ni DEV/PROD_DATABASE_URL. Define una URL de conexión en el entorno (Vercel/variables de entorno).");
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