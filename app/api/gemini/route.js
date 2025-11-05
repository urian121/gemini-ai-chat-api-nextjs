import { NextResponse } from 'next/server';
import { ensureTables, cleanupExpired, createConversation, saveMessage } from '@/app/db/index.js';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { message, image, history = [], conversationId: incomingConversationId } = await request.json();

    if (!message && !image)
      return NextResponse.json({ error: 'Mensaje o imagen requerido' }, { status: 400 });

    if (!process.env.GEMINI_API_KEY)
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });

    // --- Construcción del prompt ---
    const conversationContext = history
      .slice(-10)
      .map(({ sender, text }) => `${sender === 'user' ? 'Usuario' : 'Asistente'}: ${text}`)
      .join('\n') || '';

  const basePrompt = `
    Eres Gemini, un asistente IA eficiente, experto en desarrollo de software y con buena presentación visual.
    Responde siempre en español, de forma clara, directa y bien estructurada.

    📘 Reglas generales:
    - Mantén coherencia con la conversación.
    - Usa formato **Markdown** en toda la respuesta.
    - Usa **negritas** para resaltar conceptos clave.
    - Usa \`código inline\` solo para fragmentos técnicos cortos.
    - Explica el código brevemente si es necesario, pero sin extenderte.

    📊 Para tablas de datos:
    - Siempre muestra los datos en **tablas Markdown** (NO HTML).
    - La tabla debe ser **visual, limpia y bien alineada**.
    - Puedes usar emojis o íconos simples en los encabezados si ayudan a la lectura.
    - Antes de la tabla, escribe una frase introductoria corta, natural y con tono positivo.
    - Después de la tabla, añade una línea breve que resuma o destaque el dato principal.
    - Evita encabezados genéricos como "Tabla:" o explicaciones redundantes.
    - Mantén el estilo profesional pero con un toque amigable.

    🖼️ Para análisis de imágenes:
    - Describe lo que observas con claridad y orden.
    - Identifica texto, elementos, colores o estructuras relevantes.
    - Si hay datos tabulares, conviértelos a una tabla Markdown siguiendo las mismas reglas anteriores.

    ⚠️ Reglas finales:
    - No uses etiquetas HTML (<table>, <tr>, <td>).
    - No encierres tablas en bloques de código.
    - No devuelvas tablas como texto plano ni en HTML.
    - Prioriza siempre la presentación clara, visual y con tono natural.
    `;
 

    let contextualMessage = `${conversationContext ? `Contexto previo:\n${conversationContext}\n\n` : ''}${basePrompt}\n\n`;

    if (image && !message) {
      contextualMessage += 'Analiza detalladamente esta imagen y describe todo lo que puedas observar:';
    } else if (image && message) {
      contextualMessage += `Analiza la imagen y responde de forma detallada a la pregunta: "${message}"`;
    } else {
      contextualMessage += `Pregunta: ${message}`;
    }

    const parts = [{ text: contextualMessage }];

    if (image) {
      const match = image.match(/^data:(.*?);base64,(.*)$/);
      if (!match)
        return NextResponse.json({ error: 'Formato de imagen inválido' }, { status: 400 });

      const [, mimeType, base64Data] = match;
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
    }

    // --- Persistencia mínima y limpieza ---
    try {
      ensureTables();
      cleanupExpired();
    } catch (e) {
      // En serverless sin SQLite funcional, continuar sin persistencia
      console.warn('Persistencia deshabilitada:', e?.message || e);
    }

    let conversationId = incomingConversationId;
    if (!conversationId) {
      conversationId = randomUUID();
      try { createConversation(conversationId); } catch {}
    }

    // Guardar mensaje del usuario
    if (message) {
      try { saveMessage({ conversationId, content: message, sender: 'user', image: null }); } catch {}
    }
    if (image) {
      try { saveMessage({ conversationId, content: '[imagen]', sender: 'user', image }); } catch {}
    }

    // --- Configuración y llamada ---
    const apiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const response = await fetch(
      `${apiUrl}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.4,
            topK: 20,
            topP: 0.85,
            maxOutputTokens: 2048
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error de Gemini API:', errorData);
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${errorData.error?.message || 'Error desconocido'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    const finalText = responseText || 'No se obtuvo respuesta del modelo';
    // Guardar respuesta del bot (best effort)
    try { saveMessage({ conversationId, content: finalText, sender: 'bot', image: null }); } catch {}

    return NextResponse.json({
      message: finalText,
      success: !!responseText,
      conversationId
    });

  } catch (error) {
    console.error('Error con Gemini API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}