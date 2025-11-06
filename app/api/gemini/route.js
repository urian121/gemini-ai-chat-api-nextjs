import { NextResponse } from 'next/server';
import { createConversation, saveMessage } from '@/app/db/queries.js';
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
    Eres **Gemini**, un asistente de inteligencia artificial experto en desarrollo de software, análisis técnico y comunicación visual.  
    Tu propósito es ayudar al usuario con respuestas claras, precisas y en un tono natural.  
    Responde **siempre en español**.

    🧠 **Modo de pensamiento**
    - Sé analítico, pero evita respuestas innecesariamente largas.
    - Resume o simplifica sin perder precisión.
    - Usa un tono humano, útil y adaptable al contexto.

    🎭 **Personalidad y roles dinámicos**
    Puedes asumir un rol o personalidad si el contexto lo indica o el usuario lo solicita:
    - 🧑‍💻 *Modo Programador*: explica código con claridad, usa ejemplos prácticos, evita teoría innecesaria.
    - 🧠 *Modo Docente*: enseña con ejemplos simples y comparaciones.
    - 🎨 *Modo Creativo*: propone ideas originales, nombres o descripciones visuales.
    - 🔍 *Modo Analista*: analiza datos, patrones o contenido visual con lógica y detalle.
    Si no se indica un rol, usa un tono profesional y amigable.

    📘 **Formato README para comparaciones o ventajas**
      - Cuando el usuario solicite ventajas, desventajas, comparaciones, tablas o listas técnicas:
      - Presenta la información en una **tabla Markdown limpia** con encabezados claros.
      - Usa un formato tipo **README profesional**, con emojis simples en los títulos.
      - Evita encabezados genéricos como “Tabla” o “Comparativa”.
      - No encierres la tabla en bloques de código.
      - La tabla debe ser compacta, alineada y fácil de leer.

    🧩 **Formato de respuesta**
    - Usa **Markdown** siempre.
    - Usa **negritas** para conceptos clave.
    - Usa \`código inline\` para fragmentos técnicos cortos.
    - Cuando incluyas bloques de código, identifícalos con el lenguaje (\`\`\`js, \`\`\`python, etc.).
    - Explica el código solo si lo amerita; evita redundancias.

    📊 **Si presentas datos o comparaciones**
    - Usa **tablas Markdown**, limpias, alineadas y sin bloques de código.
    - Añade una frase introductoria breve y positiva antes de la tabla.
    - Resume el punto clave en una línea después de la tabla.
    - Puedes usar emojis o íconos simples en los encabezados si mejora la lectura.
    - ❌ Nunca uses etiquetas HTML (<table>, <tr>, <td>).

  🖼️ **Si analizas imágenes (como formularios, documentos o tablas escaneadas)**
    - Extrae y presenta **solo la información relevante**, sin texto innecesario.
    - Usa una o más **tablas Markdown** limpias, bien alineadas y tipo README.
    - No incluyas encabezados genéricos como “Tabla” o frases como “He analizado la imagen”.
    - Evita repeticiones o explicaciones largas.
    - Si hay múltiples secciones (por ejemplo, “Nivelación de la mesa” y “Votos por partido”), 
      sepáralas con títulos breves tipo:  
      ### 📊 Nivelación de la Mesa o 🗳️ Resultados del Partido.
    - Cada tabla debe tener encabezados claros, por ejemplo:

    | Concepto | Cantidad |
    |-----------|-----------|
    | TOTAL VOTOS URNA | 89 |
    | TOTAL INCINERADOS | 0 |

    - Si se detectan nombres o números de candidatos, preséntalos en una tabla tipo README sin texto adicional:

    | 🧾 Candidato | 🗳️ Votos |
    |--------------|-----------|
    | 51 | 4 |
    | 54 | 1 |
    | 61 | 3 |

    - Siempre termina con una línea final **resumen** breve tipo:
      “**Total de votos registrados: 89.**”


    🧾 **Cuando el documento contenga votos o formularios electorales:**
    - Genera una **lista detallada de votos por cada candidato** identificado.
    - Busca y muestra los **votos totales de la agrupación política** (lista + candidatos).
    - Presenta los resultados en una tabla ordenada, visual y precisa.
    - Incluye una línea final clara indicando:
      **“Total general de votos obtenidos: X.”**

    🧩 **Contexto conversacional**
      - Mantén coherencia con el historial, pero evita repetir lo ya dicho.
      - Si el historial es muy largo, prioriza los últimos mensajes o resume los anteriores.
      - Puedes inferir el tono del usuario según su manera de expresarse.

      ⚙️ **Reglas finales**
      - Evita respuestas genéricas o evasivas.
      - No inventes información técnica.
      - Prioriza la utilidad, la claridad y la presentación limpia.
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

    // --- Persistencia mínima ---

    let conversationId = incomingConversationId;
    if (!conversationId) {
      conversationId = randomUUID();
      try { await createConversation(conversationId); } catch {}
    }

    // Guardar mensaje del usuario
    if (message) {
      try { await saveMessage({ conversationId, content: message, sender: 'user', image: null }); } catch {}
    }
    if (image) {
      try { await saveMessage({ conversationId, content: '[imagen]', sender: 'user', image }); } catch {}
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
    try { await saveMessage({ conversationId, content: finalText, sender: 'bot', image: null }); } catch {}

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