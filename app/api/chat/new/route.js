import { NextResponse } from 'next/server';
import { ensureTables, cleanupExpired, createConversation } from '../../../db/index.js';

export async function POST() {
  try {
    ensureTables();
    cleanupExpired();

    const id = crypto.randomUUID();
    createConversation(id);

    return NextResponse.json({ conversationId: id });
  } catch (e) {
    console.error('Error creando nueva conversación:', e);
    return NextResponse.json({ error: 'No se pudo crear la conversación' }, { status: 500 });
  }
}