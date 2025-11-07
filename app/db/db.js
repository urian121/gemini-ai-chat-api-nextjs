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

const selectedUrl = DATABASE_URL;

if (!selectedUrl) {
  throw new Error("No se encontró DATABASE_URL ni DEV/PROD_DATABASE_URL. Define una URL de conexión en .env.local");
}

const sslOption = (() => {
  if (!isProd) return false;
  // Si la URL indica 'sslmode=disable', desactiva SSL. En otros casos, usa SSL tolerante.
  return /sslmode=disable/.test(selectedUrl) ? false : { rejectUnauthorized: false };
})();

const pool = new Pool({
  connectionString: selectedUrl,
  ssl: sslOption,
});

export default pool;
export const db = drizzle(pool);

// Ejecutar verificación de conexión y migraciones al arrancar, una sola vez
const MIGRATE_ON_START = ((process.env.MIGRATE_ON_START ?? (isProd ? 'true' : 'false')) === 'true');
export const dbInit = (globalThis.__dbInitPromise ??= (async () => {
  try {
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