'use client';

import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text, speed = 30, startDelay = 0) {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    // Limpieza previa
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!text) {
      // Evitar setState sincrónico dentro del efecto
      queueMicrotask(() => setDisplayedText(''));
      return;
    }

    timeoutRef.current = setTimeout(() => {
      currentIndexRef.current = 0;

      intervalRef.current = setInterval(() => {
        if (document.hidden) {
          // Completar en segundo plano para evitar throttling en pestañas inactivas
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setDisplayedText(text);
          return;
        }

        const i = currentIndexRef.current;
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1));
          currentIndexRef.current = i + 1;
        } else {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, speed);
    }, startDelay);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, startDelay]);

  // Si la pestaña se vuelve visible y el texto no está completo, terminar inmediatamente
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && text && displayedText.length < text.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplayedText(text);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [text, displayedText]);

  const isTyping = !!text && displayedText.length < text.length;
  const isComplete = !text || displayedText.length === text.length;

  return { displayedText, isTyping, isComplete };
}