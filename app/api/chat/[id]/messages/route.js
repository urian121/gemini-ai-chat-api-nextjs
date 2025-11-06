import { NextResponse } from 'next/server';
import { getMessages } from '@/app/db/queries.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, ctx) {
  try {
    const { id } = await ctx.params; // Next 15: params es async
    const msgs = await getMessages(id);
    return NextResponse.json({ messages: msgs });
  } catch (e) {
    console.error('Error obteniendo mensajes:', e);
    return NextResponse.json({ error: 'No se pudo obtener mensajes' }, { status: 500 });
  }
}