import CodeBlock from './CodeBlock';
import { useTypewriter } from '../hooks/useTypewriter';
import { useState } from 'react';
import Image from 'next/image';

export default function Message({ message, onRetry }) {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  // Usar efecto typewriter solo para mensajes del bot
  const { displayedText, isTyping } = useTypewriter(
    !isUser ? message.text : null, 
    25, // velocidad de escritura
    100 // delay inicial
  );
  
  // Función para copiar el mensaje completo
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  // Función para leer el mensaje en voz alta
  const handleReadAloud = () => {
    if (isReading) {
      // Si ya está leyendo, detener la lectura
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    if ('speechSynthesis' in window) {
      // Limpiar texto de markdown y caracteres especiales para mejor lectura
      const cleanText = message.text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remover ** de negrita
        .replace(/`(.*?)`/g, '$1') // Remover ` de código
        .replace(/```[\s\S]*?```/g, '[código]') // Reemplazar bloques de código
        .replace(/#{1,6}\s/g, '') // Remover headers markdown
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Simplificar links

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsReading(true);
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Tu navegador no soporta síntesis de voz');
    }
  };
  
  // Texto a mostrar: typewriter para bot, texto completo para usuario
  const textToShow = isUser ? message.text : displayedText;
  
  // Función para parsear texto y resaltar palabras con comillas y negrita
  const parseTextWithHighlights = (text) => {
    if (!text) return [];
    
    // Regex para detectar texto con comillas invertidas `texto`, comillas dobles "texto" y negrita **texto**
    const highlightRegex = /(`[^`]+`|"[^"]+"|'[^']+'|\*\*[^*]+\*\*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = highlightRegex.exec(text)) !== null) {
      // Agregar texto normal antes del resaltado
      if (match.index > lastIndex) {
        const normalText = text.slice(lastIndex, match.index);
        if (normalText) {
          parts.push({ type: 'normal', content: normalText });
        }
      }
      
      // Agregar texto resaltado
      const highlightedText = match[1];
      const isCode = highlightedText.startsWith('`') && highlightedText.endsWith('`');
      const isBold = highlightedText.startsWith('**') && highlightedText.endsWith('**');
      
      parts.push({ 
        type: 'highlight', 
        content: highlightedText,
        isCode,
        isBold
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Agregar texto restante
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        parts.push({ type: 'normal', content: remainingText });
      }
    }
    
    // Si no hay texto resaltado, devolver todo como normal
    if (parts.length === 0) {
      parts.push({ type: 'normal', content: text });
    }
    
    return parts;
  };

  // Función para parsear el texto y detectar bloques de código
  const parseMessageContent = (text) => {
    if (!text) return null;
    
    // Regex para detectar bloques de código con ```
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Agregar texto antes del bloque de código (con resaltado)
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({ type: 'text', content: textBefore });
        }
      }
      
      // Agregar bloque de código
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      parts.push({ type: 'code', language, content: code });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Agregar texto restante (con resaltado)
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push({ type: 'text', content: remainingText });
      }
    }
    
    // Si no hay bloques de código, devolver solo texto
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }
    
    return parts;
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-2xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end ${isUser ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
        {/* Avatar */}
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {isUser ? 'U' : 'AI'}
        </div>
        
        {/* Message bubble */}
        <div className={`px-4 py-2 rounded-2xl ${
          isUser 
            ? 'bg-blue-500 text-white rounded-br-md' 
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-700 rounded-bl-md'
        }`}>
          {/* Imagen si existe */}
          {message.image && (
            <div className="mb-2">
              <Image 
                src={message.image} 
                alt="Imagen adjunta" 
                className="max-w-full h-auto rounded-lg dark:border-gray-600"
                width={300}
                height={200}
              />
            </div>
          )}
          
          {/* Texto del mensaje */}
          {(textToShow || message.text) && (
            <div className="text-sm leading-relaxed">
              {parseMessageContent(textToShow || message.text).map((part, index) => {
                if (part.type === 'code') {
                  return (
                    <CodeBlock 
                      key={index} 
                      code={part.content} 
                      language={part.language} 
                    />
                  );
                } else {
                  // Parsear el texto para resaltar palabras con comillas
                  const textParts = parseTextWithHighlights(part.content);
                  return (
                    <p key={index} className="whitespace-pre-wrap mb-2 last:mb-0">
                      {textParts.map((textPart, textIndex) => {
                        if (textPart.type === 'highlight') {
                          if (textPart.isBold) {
                            // Renderizar texto en negrita sin los asteriscos
                            return (
                              <strong key={textIndex} className="font-bold">
                                {textPart.content.slice(2, -2)}
                              </strong>
                            );
                          } else {
                            return (
                              <span 
                                key={textIndex}
                                className={`${
                                  textPart.isCode 
                                    ? 'bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1 py-0.5 rounded font-mono text-xs'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1 py-0.5 rounded font-medium'
                                }`}
                              >
                                {textPart.content}
                              </span>
                            );
                          }
                        } else {
                          return textPart.content;
                        }
                      })}
                      {/* Cursor parpadeante solo para el último párrafo del bot mientras escribe */}
                      {!isUser && isTyping && index === parseMessageContent(textToShow || message.text).length - 1 && (
                        <span className="animate-pulse ml-1 text-gray-400">|</span>
                      )}
                    </p>
                  );
                }
              })}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4">
            <p className={`text-xs ${
              isUser 
                ? 'text-blue-100' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {new Intl.DateTimeFormat('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
              }).format(message.timestamp)}
            </p>

            {/* Botones de acción */}
            <div className="flex items-center space-x-3">
              {/* Botón de copiar */}
              {message.text && (
                <button
                  onClick={handleCopy}
                  className={`flex items-center space-x-1 text-xs transition-colors hover:cursor-pointer ${
                    copied 
                      ? 'text-green-500 dark:text-green-400' 
                      : isUser 
                        ? 'text-blue-300 hover:text-blue-200' 
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-300'
                  }`}
                  title={copied ? 'Copiado!' : 'Copiar mensaje'}
                >
                  {copied ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              )}

              {/* Botón de leer en voz alta - solo para mensajes del bot */}
              {!isUser && message.text && (
                <button
                  onClick={handleReadAloud}
                  className={`flex items-center space-x-1 text-xs transition-colors hover:cursor-pointer ${
                    isReading 
                      ? 'text-blue-500 dark:text-blue-400' 
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-300'
                  }`}
                  title={isReading ? 'Detener lectura' : 'Leer en voz alta'}
                >
                  {isReading ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                      </svg>
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span>Leer</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Botón de reintentar para mensajes fallidos del bot */}
          {message.failed && !isUser && onRetry && (
            <button
              onClick={() => onRetry(message.id)}
              className="flex items-center space-x-1 mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors hover:cursor-pointer"
              title="Reintentar pregunta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reintentar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}