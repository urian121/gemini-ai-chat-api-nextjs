'use client';

import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text, imageObj = null) => {
    if (!text.trim() && !imageObj) return;

    // Extraer el base64 del objeto imagen si existe
    const imageBase64 = imageObj ? imageObj.base64 : null;

    // Agregar mensaje del usuario
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      image: imageBase64, // Usar solo el base64 para mostrar
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Llamar a la API de Gemini
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(),
          image: imageBase64, // Enviar solo el base64 al API
          history: messages // Enviar historial para contexto
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Error en la respuesta';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Si no se puede parsear como JSON, usar mensaje genérico
          errorMessage = `Error HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Verificar si la respuesta es válida
      const isFailedResponse = data.message === 'No se obtuvo respuesta del modelo' || !data.success;

      // Agregar respuesta del bot
      const botMessage = {
        id: Date.now() + 1,
        text: data.message,
        sender: 'bot',
        timestamp: new Date(),
        failed: isFailedResponse,
        originalMessage: isFailedResponse ? text : null,
        originalImage: isFailedResponse ? imageBase64 : null
      };

      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      // Mostrar mensaje de error al usuario
      const errorMessage = {
        id: Date.now() + 1,
        text: `Lo siento, hubo un error: ${error.message}. Por favor, intenta de nuevo.`,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = async (messageId) => {
    // Encontrar el mensaje fallido
    const failedMessage = messages.find(msg => msg.id === messageId);
    if (!failedMessage || !failedMessage.failed) return;

    // Remover el mensaje fallido
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    // Reenviar el mensaje original
    await handleSendMessage(failedMessage.originalMessage, failedMessage.originalImage);
  };

  return (
    <div className="flex flex-col h-screen">      
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <MessageList 
          messages={messages} 
          isTyping={isTyping}
          messagesEndRef={messagesEndRef}
          onRetry={handleRetry}
        />
      </div>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}