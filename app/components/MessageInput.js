'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, FileText, Paperclip, Loader2, Square, Mic, Send } from 'lucide-react';

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
      className="fixed bottom-0 w-full bg-gray-50 px-2 sm:px-4 md:px-6 py-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-full max-w-[95%] sm:max-w-full mx-auto relative">
        {/* Indicador de drag & drop */}
        {isDragOver && (
          <div className="absolute inset-0 bg-gray-800/10 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <UploadCloud className="w-12 h-12 text-gray-800 mx-auto mb-2" />
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
                <FileText className="w-8 h-8 text-gray-500" />
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
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="w-full sm:flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedImage ? "Describe qué quieres saber sobre la imagen..." : "Escribe tu mensaje..."}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 text-sm leading-tight min-h-[40px] max-h-[100px] sm:min-h-[44px] sm:max-h-[120px] md:px-4 md:py-3 md:rounded-2xl md:text-base md:min-h-[48px] md:max-h-[140px]"
              rows="1"
            />
            {/* Contador de caracteres */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 sm:right-3">
              {message.length}/1000
            </div>
          </div>
          
          {/* Contenedor de botones */}
          <div className="flex items-center justify-center space-x-2 sm:space-x-3">
            {/* Botón de adjuntar imagen */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-colors duration-200 hover:cursor-pointer"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botón de grabación de audio */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isProcessingAudio}
              className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:cursor-pointer ${
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
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : isRecording ? (
                <Square className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            
            <button
              type="submit"
              disabled={!message.trim() && !selectedImage}
              className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors duration-200"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
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