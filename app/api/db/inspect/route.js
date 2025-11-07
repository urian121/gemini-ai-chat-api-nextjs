import { NextResponse } from 'next/server';
import { db } from '@/app/db/db.js';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbEnv = (process.env.DB_ENV || 'development').toLowerCase();
    // Contar filas en tablas clave
    const conv = await db.execute(sql`SELECT COUNT(*)::INT AS count FROM conversations;`);
    const msgs = await db.execute(sql`SELECT COUNT(*)::INT AS count FROM messages;`);

    // Mostrar host y db sin credenciales si viene por URL
    let info = {};
    const url = process.env.DATABASE_URL || (dbEnv === 'production' ? process.env.PROD_DATABASE_URL : process.env.DEV_DATABASE_URL);
    try {
      if (url) {
        const u = new URL(url);
        info = { host: u.hostname, port: Number(u.port) || 5432, database: u.pathname.replace('/', '') };
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      dbEnv: dbEnv,
      db: info,
      counts: { conversations: conv.rows?.[0]?.count ?? 0, messages: msgs.rows?.[0]?.count ?? 0 },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}