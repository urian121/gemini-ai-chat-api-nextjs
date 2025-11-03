import { NextResponse } from 'next/server';
import { ensureTables, cleanupExpired, getMessages } from '@/app/db/index.js';

export async function GET(request, ctx) {
  try {
    ensureTables();
    cleanupExpired();
    const { id } = await ctx.params; // Next 15: params es async
    const msgs = getMessages(id);
    return NextResponse.json({ messages: msgs });
  } catch (e) {
    console.error('Error obteniendo mensajes:', e);
    return NextResponse.json({ error: 'No se pudo obtener mensajes' }, { status: 500 });
  }
}