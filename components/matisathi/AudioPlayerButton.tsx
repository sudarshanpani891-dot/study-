'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerButtonProps {
  textToSpeak?: string;
  text?: string;
  label?: string;
  size?: 'sm' | 'default';
}

export function AudioPlayerButton({ textToSpeak, text, label = 'ଶୁଣନ୍ତୁ (Listen)', size = 'sm' }: AudioPlayerButtonProps) {
  const contentToSpeak = textToSpeak || text || '';
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Cancel any ongoing speech

    // Clean markdown symbols from text for speech
    const cleanText = contentToSpeak
      .replace(/[#*`_~[\]()]/g, ' ')
      .replace(/---EN---/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9; // Slower rate for clear pedagogical comprehension
    utterance.pitch = 1.0;

    // Prefer Odia or Indian voices if installed on phone/browser
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.startsWith('or') || v.lang.startsWith('hi') || v.lang.includes('IN')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleToggleSpeak}
      className={`rounded-full gap-1.5 text-xs font-medium transition-all ${
        speaking
          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 animate-pulse'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
      }`}
      title={speaking ? 'Stop Audio' : 'Play Odia Voice Readout'}
    >
      {speaking ? (
        <>
          <VolumeX className="w-3.5 h-3.5" />
          <span>ଅଟକାନ୍ତୁ (Stop)</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
