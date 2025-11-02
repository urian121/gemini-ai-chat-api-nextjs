'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() || selectedImage) {
      onSendMessage(message, selectedImage);
      setMessage('');
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Función para procesar cualquier tipo de archivo
  const processAnyFile = (file) => {
    // Validar tamaño (máximo 10MB para cualquier archivo)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    // Si es imagen, usar la lógica existente
    if (file.type.startsWith('image/')) {
      processImageFile(file);
      return;
    }

    // Para otros tipos de archivo, solo guardar la referencia
    setSelectedImage(file);
    setImagePreview(null); // No hay preview para archivos no-imagen
  };

  // Función para procesar archivos de imagen (mantener la existente)
  const processImageFile = (file) => {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona solo archivos de imagen');
      return;
    }
    
    // Validar tamaño (máximo 5MB para imágenes)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setSelectedImage({
        file: file,
        base64: base64,
        name: file.name
      });
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processAnyFile(file);
    }
  };

  // Handlers para drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length > 0) {
      // Tomar solo el primer archivo
      processAnyFile(files[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Funciones para grabación de audio con MediaRecorder
  const startRecording = async () => {
    try {
      // Solicitar permisos de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Crear MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Configurar eventos
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsProcessingAudio(true);
        
        // Crear blob de audio
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          // Enviar audio al servidor para procesamiento
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice.webm');
          
          const response = await fetch('/api/voice', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.transcript) {
              setMessage(prev => prev + (prev ? ' ' : '') + result.transcript);
            } else {
              alert('No se pudo procesar el audio. Intenta de nuevo.');
            }
          } else {
            alert('Error al procesar el audio. Intenta de nuevo.');
          }
        } catch (error) {
          console.error('Error al procesar audio:', error);
          alert('Error al procesar el audio. Intenta de nuevo.');
        } finally {
          setIsProcessingAudio(false);
          // Detener el stream
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      // Iniciar grabación
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      if (error.name === 'NotAllowedError') {
        alert('Necesitas dar permisos de micrófono para usar esta función.');
      } else if (error.name === 'NotFoundError') {
        alert('No se encontró micrófono. Verifica que esté conectado.');
      } else {
        alert('Error al acceder al micrófono. Intenta de nuevo.');
      }
      setIsRecording(false);
      setIsProcessingAudio(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div 
      className="fixed bottom-0 w-full bg-gray-50 px-4 py-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto relative">
        {/* Indicador de drag & drop */}
        {isDragOver && (
          <div className="absolute inset-0 bg-gray-800/10 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-800 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-800 font-medium">Suelta el archivo aquí</p>
            </div>
          </div>
        )}
        
        {/* Preview de archivo */}
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            {imagePreview ? (
              // Preview de imagen
              <Image 
                src={imagePreview} 
                alt="Preview" 
                className="max-w-xs max-h-32 rounded-lg"
                width={200}
                height={200}
              />
            ) : (
              // Preview de archivo no-imagen
              <div className="flex items-center space-x-3 bg-gray-100 p-3 rounded-lg max-w-xs">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedImage.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedImage ? "Describe qué quieres saber sobre la imagen..." : "Escribe tu mensaje..."}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              rows="1"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {/* Contador de caracteres */}
            <div className="absolute bottom-2 right-3 text-xs text-gray-400">
              {message.length}/1000
            </div>
          </div>
          
          {/* Botón de adjuntar imagen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-colors duration-200 hover:cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Botón de grabación de audio */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isProcessingAudio}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:cursor-pointer ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : isProcessingAudio
                ? 'bg-yellow-500 text-white cursor-not-allowed'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title={
              isRecording 
                ? 'Detener grabación' 
                : isProcessingAudio 
                ? 'Procesando audio...' 
                : 'Grabar mensaje de voz'
            }
          >
            {isProcessingAudio ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : isRecording ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          
          <button
            type="submit"
            disabled={!message.trim() && !selectedImage}
            className="shrink-0 w-12 h-12 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors duration-200"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
              />
            </svg>
          </button>
        </form>
        
        {/* Input oculto para archivos */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Presiona Enter para enviar, Shift+Enter para nueva línea • Arrastra archivos para adjuntarlos • Usa el micrófono para dictar
        </p>
      </div>
    </div>
  );
}