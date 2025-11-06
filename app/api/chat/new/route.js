import { NextResponse } from 'next/server';
import { createConversation } from '@/app/db/queries.js';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function create() {
  try {
    const id = randomUUID();
    await createConversation(id);
    return NextResponse.json({ conversationId: id });
  } catch (e) {
    console.error('Error creando nueva conversación:', e);
    return NextResponse.json({ error: 'No se pudo crear la conversación' }, { status: 500 });
  }
}

export async function POST() {
  return create();
}

export async function GET() {
  return create();
}