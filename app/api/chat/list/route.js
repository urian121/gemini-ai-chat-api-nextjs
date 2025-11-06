import { NextResponse } from 'next/server';
import { listConversations } from '@/app/db/queries.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await listConversations();
    return NextResponse.json({ conversations: list });
  } catch (e) {
    console.error('Error listando conversaciones:', e);
    return NextResponse.json({ error: 'No se pudo obtener el historial' }, { status: 500 });
  }
}