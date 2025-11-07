import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const dbEnv = (process.env.DB_ENV || 'development').toLowerCase();
const isProd = dbEnv === 'production';
const { DEV_DATABASE_URL, PROD_DATABASE_URL, DATABASE_URL } = process.env;
const url = DATABASE_URL || (isProd ? PROD_DATABASE_URL : DEV_DATABASE_URL);
console.log(`[Drizzle] Entorno de BD: ${isProd ? 'producción' : 'desarrollo'} (DB_ENV=${dbEnv})`);

if (!url) {
  throw new Error('No se encontró DATABASE_URL ni DEV/PROD_DATABASE_URL. Define una URL de conexión en .env.local');
}

const config = {
  schema: './drizzle/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  strict: true,
  dbCredentials: { url }
};

export default config;
