import { NextResponse } from 'next/server';
import { ensureTables, cleanupExpired, listConversations } from '@/app/db/index.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      ensureTables();
      cleanupExpired();
      const list = listConversations();
      return NextResponse.json({ conversations: list });
    } catch (e) {
      console.warn('Historial deshabilitado en deploy:', e?.message || e);
      return NextResponse.json({ conversations: [] });
    }
  } catch (e) {
    console.error('Error listando conversaciones:', e);
    return NextResponse.json({ error: 'No se pudo obtener el historial' }, { status: 500 });
  }
}