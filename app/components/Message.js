import CodeBlock from './CodeBlock';
import { useTypewriter } from '../hooks/useTypewriter';
import { useState } from 'react';
import Image from 'next/image';
import { Check, Copy, StopCircle, Volume2, RefreshCw } from 'lucide-react';

export default function Message({ message, onRetry, animate = false }) {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  // Usar efecto typewriter solo para mensajes del bot
  const { displayedText, isTyping } = useTypewriter(
    !isUser ? (animate ? message.text : null) : null,
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
  const textToShow = isUser ? message.text : (animate ? displayedText : message.text);
  
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

  // Función para parsear el texto y detectar bloques de código y headers markdown
  const parseMessageContent = (text) => {
    if (!text) return null;
    
    // Regex para detectar bloques de código con ```
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Agregar texto antes del bloque de código (procesando headers)
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push(...parseTextWithHeaders(textBefore));
        }
      }
      
      // Agregar bloque de código
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      parts.push({ type: 'code', language, content: code });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Agregar texto restante (procesando headers)
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push(...parseTextWithHeaders(remainingText));
      }
    }
    
    // Si no hay bloques de código, procesar todo el texto
    if (parts.length === 0) {
      parts.push(...parseTextWithHeaders(text));
    }
    
    return parts;
  };

  // Función para parsear headers markdown en texto
  const parseTextWithHeaders = (text) => {
    const lines = text.split('\n');
    const parts = [];
    let currentTextLines = [];
    
    lines.forEach((line) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Si hay texto acumulado, agregarlo como párrafo
        if (currentTextLines.length > 0) {
          const textContent = currentTextLines.join('\n').trim();
          if (textContent) {
            parts.push({ type: 'text', content: textContent });
          }
          currentTextLines = [];
        }
        
        // Agregar header
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        parts.push({ type: 'header', level, content });
      } else {
        // Acumular líneas de texto normal
        currentTextLines.push(line);
      }
    });
    
    // Agregar texto restante si existe
    if (currentTextLines.length > 0) {
      const textContent = currentTextLines.join('\n').trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }
    
    return parts;
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end mr-10' : 'justify-start ml-4'}`}>
      <div className={`
        flex w-full ${isUser 
          ? 'max-w-[80%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-md' 
          : 'max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-md'} ${isUser 
          ? 'flex-row-reverse' : 'flex-row'} items-end ${isUser 
          ? 'space-x-reverse space-x-2' 
          : 'space-x-2 sm:space-x-3'}`
        }>

        {/* Avatar */}
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isUser 
            ? 'bg-gray-800 text-white' 
            : 'bg-gray-200 text-gray-600'
        }`}>
          {isUser ? 'U' : 'AI'}
        </div>
        
        {/* Message bubble */}
        <div className={`flex-1 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl ${
          isUser 
            ? 'bg-gray-800 text-white rounded-br-md' 
            : 'bg-white text-gray-900 rounded-bl-md'
        }`}>
          {/* Imagen si existe */}
          {message.image && (
            <div className="mb-2">
              <Image 
                src={message.image} 
                alt="Imagen adjunta" 
                className="max-w-full h-auto rounded-lg"
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
                } else if (part.type === 'header') {
                  // Renderizar headers markdown
                  const HeaderTag = `h${Math.min(part.level, 6)}`;
                  const headerClasses = {
                    1: 'text-2xl font-bold mb-4 mt-6 first:mt-0',
                    2: 'text-xl font-bold mb-3 mt-5 first:mt-0',
                    3: 'text-lg font-bold mb-2 mt-4 first:mt-0',
                    4: 'text-base font-bold mb-2 mt-3 first:mt-0',
                    5: 'text-sm font-bold mb-1 mt-2 first:mt-0',
                    6: 'text-xs font-bold mb-1 mt-2 first:mt-0'
                  };
                  
                  return (
                    <HeaderTag 
                      key={index} 
                      className={`${headerClasses[part.level]} ${
                        isUser 
                          ? 'text-gray-300' 
                          : 'text-gray-900'
                      }`}
                    >
                      {part.content}
                    </HeaderTag>
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
                                    ? 'bg-gray-100 text-red-600 px-1 py-0.5 rounded font-mono text-xs'
                                    : 'bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-medium'
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
                ? 'text-gray-300' 
                : 'text-gray-500'
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
                      ? 'text-green-500' 
                      : isUser 
                        ? 'text-gray-300 hover:text-gray-400' 
                        : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title={copied ? 'Copiado!' : 'Copiar mensaje'}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
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
                      ? 'text-gray-800' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title={isReading ? 'Detener lectura' : 'Leer en voz alta'}
                >
                  {isReading ? (
                    <>
                      <StopCircle className="w-3 h-3" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" />
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
              className="flex items-center space-x-1 mt-2 text-xs text-red-500 hover:text-red-700 transition-colors hover:cursor-pointer"
              title="Reintentar pregunta"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}