import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No se encontró archivo de audio' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API key de Gemini no configurada' },
        { status: 500 }
      );
    }

    // Convertir el archivo a base64
    const bytes = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(bytes).toString('base64');

    // Configurar la solicitud para Gemini con audio
    const parts = [
      {
        text: 'Transcribe este audio a texto en español. Devuelve únicamente el texto transcrito, sin explicaciones adicionales.'
      },
      {
        inline_data: {
          mime_type: 'audio/webm',
          data: base64Audio
        }
      }
    ];

    // Llamada a Gemini 2.5 Flash con capacidades de audio
    const apiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const response = await fetch(
      `${apiUrl}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1, // Baja temperatura para transcripción precisa
            topK: 1,
            topP: 0.1,
            maxOutputTokens: 1024
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
        { error: `Error al procesar audio: ${errorData.error?.message || 'Error desconocido'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: 'No se pudo transcribir el audio' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      transcript: transcript,
      success: true
    });

  } catch (error) {
    console.error('Error procesando audio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}