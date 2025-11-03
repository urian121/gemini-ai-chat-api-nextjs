import { NextResponse } from 'next/server';
import { ensureTables, cleanupExpired, listConversations } from '@/app/db/index.js';

export async function GET() {
  try {
    ensureTables();
    cleanupExpired();
    const list = listConversations();
    return NextResponse.json({ conversations: list });
  } catch (e) {
    console.error('Error listando conversaciones:', e);
    return NextResponse.json({ error: 'No se pudo obtener el historial' }, { status: 500 });
  }
}