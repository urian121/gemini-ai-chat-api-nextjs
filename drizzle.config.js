import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const {
  POSTGRES_HOST,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_PORT = 5432
} = process.env;

if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_HOST || !POSTGRES_DB) {
  console.warn('⚠️ Variables de entorno PostgreSQL incompletas en .env.local');
}

const config = {
  schema: './drizzle/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  strict: true,
  dbCredentials: {
    host: POSTGRES_HOST,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
    port: Number(POSTGRES_PORT) || 5432,
    ssl: false
  }
};

export default config;
