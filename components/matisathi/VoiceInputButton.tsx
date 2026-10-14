'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('କଣ୍ଠସ୍ୱର ଇନପୁଟ୍ (Speech Recognition) ଏହି ବ୍ରାଉଜରରେ ଉପଲବ୍ଧ ନାହିଁ | ଦୟାକରି ଲେଖି ପଚାରନ୍ତୁ |');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Prefer Odia (or-IN), with fallback
      recognition.lang = 'or-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          onTranscript(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceInput] Speech recognition error:', event.error);
        // If Odia recognition not supported by device engine, retry with Indian English/Hindi
        if (event.error === 'language-not-supported' && recognition.lang === 'or-IN') {
          recognition.lang = 'hi-IN';
          try {
            recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[VoiceInput] Failed to start recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Pulsing ring indicator while voice is actively listening */}
      {isListening && (
        <span className="absolute -inset-1 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
      )}

      <Button
        type="button"
        variant="default"
        size="lg"
        onClick={handleToggle}
        disabled={disabled}
        className={`relative h-12 px-4 rounded-full gap-2 font-semibold shadow-md transition-all ${
          isListening
            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
        }`}
        title={isListening ? 'Stop Recording' : 'Speak Doubt in Odia / English'}
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5 text-white animate-bounce" />
            <span className="text-sm">ଶୁଣୁଛି... (Listening)</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 text-white" />
            <span className="text-sm">ପଚାରନ୍ତୁ (Speak)</span>
          </>
        )}
      </Button>
    </div>
  );
}
