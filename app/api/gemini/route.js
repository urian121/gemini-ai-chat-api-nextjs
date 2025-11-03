import { NextResponse } from 'next/server';
import { ensureTables, cleanupExpired, createConversation, saveMessage } from '../../db/index.js';

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

    const basePrompt = `Eres Gemini, un asistente IA eficiente y experto en desarrollo de software.
    Responde siempre en español, de forma clara y detallada pero sin ser excesivamente verboso.
    Mantén el contexto y la coherencia con la conversación o tema actual.
    Cuando muestres código, incluye una explicación de lo que hace y por qué.
    Usa formato Markdown para resaltar nombres de funciones, hooks, variables o directivas con **texto** para negrita y \`código\` para código inline.
    
    Para análisis de imágenes:
    - Describe detalladamente lo que observas
    - Identifica elementos específicos, texto, estructuras, colores relevantes
    - Si es un documento, explica su propósito y contenido principal
    - Proporciona contexto sobre lo que representa la imagen`;    

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
    ensureTables();
    cleanupExpired();

    let conversationId = incomingConversationId;
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      createConversation(conversationId);
    }

    // Guardar mensaje del usuario
    if (message) {
      saveMessage({ conversationId, content: message, sender: 'user', image: null });
    }
    if (image) {
      saveMessage({ conversationId, content: '[imagen]', sender: 'user', image });
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
    // Guardar respuesta del bot
    saveMessage({ conversationId, content: finalText, sender: 'bot', image: null });

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