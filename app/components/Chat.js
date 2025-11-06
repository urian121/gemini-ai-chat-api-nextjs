'use client';

import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Sidebar from './Sidebar';

export default function Chat() {
  const [conversationId, setConversationId] = useState(null);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text, imageObj = null, historyOverride = null) => {
    if (!text.trim() && !imageObj) return;

    // Normalizar base64: acepta objeto { base64 } o string base64 directo
    const imageBase64 = typeof imageObj === 'string'
      ? imageObj
      : (imageObj?.base64 ?? null);

    // Agregar mensaje del usuario
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      image: imageBase64, // Usar solo el base64 para mostrar
      sender: 'user',
      timestamp: new Date()
    };

    const baseHistory = historyOverride ?? messages;
    const nextMessages = [...baseHistory, userMessage];
    setMessages(nextMessages);
    setIsTyping(true);

    try {
      // Asegurar conversación
      let cid = conversationId;
      if (!cid) {
        let newRes = await fetch('/api/chat/new', { method: 'POST' });
        if (!newRes.ok) {
          // Fallback en deploy si el método POST no está permitido
          newRes = await fetch('/api/chat/new');
        }
        if (!newRes.ok) {
          const textBody = await newRes.text();
          throw new Error(`No se pudo crear conversación: HTTP ${newRes.status} ${textBody.slice(0, 120)}...`);
        }
        const newData = await newRes.json();
        cid = newData.conversationId;
        setConversationId(cid);
      }
      // Llamar a la API de Gemini
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(),
          image: imageBase64, // Enviar solo el base64 al API
          history: nextMessages, // Enviar historial actualizado para contexto
          conversationId: cid
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

      // Parse robusto: si no es JSON, tratar como error
      const ct = response.headers.get('content-type') || '';
      let data;
      if (ct.includes('application/json')) {
        data = await response.json();
      } else {
        const textBody = await response.text();
        throw new Error(`Respuesta no-JSON del servidor: ${textBody.slice(0, 120)}...`);
      }
      if (data?.conversationId && !conversationId) setConversationId(data.conversationId);

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
      
      // Mostrar mensaje de error al usuario y permitir reintento
      const errorMessage = {
        id: Date.now() + 1,
        text: `Lo siento, hubo un error: ${error.message}. Por favor, intenta de nuevo.`,
        sender: 'bot',
        timestamp: new Date(),
        failed: true,
        originalMessage: text?.trim() || '',
        originalImage: imageBase64 || null
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

    // Preparar historial sin el mensaje fallido y actualizar estado
    const historyWithoutFailed = messages.filter(msg => msg.id !== messageId);
    setMessages(historyWithoutFailed);

    // Reenviar el mensaje original conservando imagen/base64 y contexto
    await handleSendMessage(
      failedMessage.originalMessage,
      failedMessage.originalImage,
      historyWithoutFailed
    );
  };

  const loadConversation = async (cid) => {
    try {
      const res = await fetch(`/api/chat/${cid}/messages`);
      const data = await res.json();
      setConversationId(cid);
      const mapped = (data.messages || []).map(m => ({
        id: m.id,
        text: m.content,
        image: m.image || null,
        sender: m.sender,
        timestamp: new Date(m.created_at)
      }));
      setMessages(mapped.length ? mapped : [{
        id: Date.now(),
        text: 'Conversación vacía. Escribe tu mensaje.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    } catch (e) {
      console.error('No se pudo cargar la conversación', e);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chat/new', { method: 'POST' });
      const data = await res.json();
      setConversationId(data.conversationId);
    } catch {}
    setMessages([
      {
        id: Date.now(),
        text: 'Nuevo chat iniciado. ¿En qué puedo ayudarte?',
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="flex h-screen">
      {/* contenido principal */}
      <div className="flex-1 flex flex-col w-full">
        <div className="flex-1 flex flex-col w-full max-w-full">
          <MessageList 
            messages={messages} 
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            onRetry={handleRetry}
          />
        </div>
        <MessageInput onSendMessage={handleSendMessage} isSidebarOpen={sidebarOpen} />
      </div>
      {/* sidebar derecho */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        onSelectConversation={loadConversation}
        onNewChat={handleNewChat}
      />
    </div>
  );
}