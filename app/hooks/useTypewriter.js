'use client';

import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text, speed = 30, startDelay = 0) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      setIsComplete(true);
      return;
    }

    // Reset states
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);

    timeoutRef.current = setTimeout(() => {
      let currentIndex = 0;
      
      intervalRef.current = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsTyping(false);
          setIsComplete(true);
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

  return { displayedText, isTyping, isComplete };
}