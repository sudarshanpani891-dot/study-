'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  ArrowLeft,
  RotateCcw,
  Zap,
  Sparkles,
  Check,
  CheckCircle2,
  ChevronRight,
  Radio,
  BookOpen,
  Bot,
  User,
  Flame,
  Info,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  matchOfflineConcept,
  saveActiveLessonProgress,
  enqueueOfflineItem,
  saveLocalMastery,
} from '@/lib/offline/dexie-db';
import {
  getCachedStudentProfile,
  generateLocalOfflineResponse,
} from '@/lib/matisathi/offline-storage';
import type { AgentDoubtResponse } from '@/lib/matisathi/types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  inputMode?: 'voice' | 'text';
  agentResponse?: {
    topicOdia: string;
    topicEnglish: string;
    explanationOdia: string;
    explanationEnglish?: string;
    analogyTitle?: string;
    analogyOdia?: string;
    interactiveChallenge?: {
      id: string;
      questionOdia: string;
      questionEnglish?: string;
      options: Array<{
        id: string;
        textOdia: string;
        textEnglish?: string;
        isCorrect: boolean;
        explanationOdia?: string;
      }>;
    };
    nextStep?: {
      titleOdia: string;
      titleEnglish: string;
      timing: string;
    };
    source: 'groq_ai' | 'local_offline';
  };
  quizAnswered?: boolean;
  selectedOptionId?: string;
  isQuizCorrect?: boolean;
}

const QUICK_SUGGESTIONS = [
  { label: '🧪 ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା', query: 'Chemical REACTIONS' },
  { label: '⚡ ବଳ ଓ ଗତି ନିୟମ', query: 'What are Newton’s laws of motion?' },
  { label: '🌿 ଆଲୋକ ସ୍ଲେଷଣ', query: 'What is photosynthesis?' },
  { label: '🔬 କୋଷ ପ୍ରାଚୀର ଓ ଝିଲ୍ଲୀ', query: 'Cell Wall vs Cell Membrane' },
  { label: '⚛️ ପରମାଣୁ ଓ ଅଣୁ', query: 'What are Atoms and Molecules?' },
];

export default function LearnPage() {
  const [profile, setProfile] = useState<{ name: string; nameOdia: string; district: string }>({
    name: 'Learner',
    nameOdia: 'ସାଥୀ (Learner)',
    district: 'Odisha',
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lowDataMode, setLowDataMode] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const storedLowData = localStorage.getItem('matisathi_low_data');
      if (storedLowData !== null) {
        setLowDataMode(storedLowData === 'true');
      }

      const storedAutoSpeak = localStorage.getItem('matisathi_auto_speak');
      if (storedAutoSpeak !== null) {
        setAutoSpeak(storedAutoSpeak === 'true');
      }

      const cachedProf = getCachedStudentProfile();
      if (cachedProf) {
        setProfile({
          name: cachedProf.name || 'Learner',
          nameOdia: cachedProf.nameOdia || 'ସାଥୀ',
          district: cachedProf.district || 'Odisha',
        });
      }

      // Initial welcome message
      const welcomeMsg: ChatMessage = {
        id: 'welcome-initial',
        sender: 'assistant',
        text: 'ନମସ୍କାର ସାଥୀ! 🙏 ମୁଁ ତୁମର ମାଟି ସାଥୀ (MatiSathi) AI ଶିକ୍ଷକ | ମୁଁ କମ୍ ନେଟୱାର୍କ ଅଞ୍ଚଳରେ ବି ତୁମ ସହିତ କଥା ହୋଇ ସନ୍ଦେହ ସମାଧାନ କରିପାରିବି | ଯେକୌଣସି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ କିମ୍ବା ମାଇକ୍ ରେ କୁହନ୍ତୁ!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentResponse: {
          topicOdia: 'ମାଟି ସାଥୀ AI ଶିକ୍ଷକ',
          topicEnglish: 'MatiSathi Voice AI Companion',
          explanationOdia:
            'ତୁମେ ନବମ ଶ୍ରେଣୀ ବିଜ୍ଞାନ, ରସାୟନ ବିଜ୍ଞାନ, ପଦାର୍ଥ ବିଜ୍ଞାନ କିମ୍ବା ଯେକୌଣସି ପ୍ରଶ୍ନ ପଚାରିପାରିବ | ମୁଁ ସରଳ ଓଡ଼ିଆ ଓ ଗାଁର ଦୈନନ୍ଦିନ ଉଦାହରଣ ସହ ତୁରନ୍ତ ବୁଝାଇବି |',
          explanationEnglish:
            'Ask any science doubt or question in Odia or English. I provide instant explanations with local real-world analogies!',
          analogyTitle: '🌾 ଗ୍ରାମୀଣ ସାଥୀ',
          analogyOdia: 'ଯେପରି ଘରେ ବଡ଼ଭାଇ ବସି ପାଠ ପଢ଼ାନ୍ତି, ମୁଁ ସେହିପରି ତୁମର ୨୪ ଘଣ୍ଟାର ଡିଜିଟାଲ୍ ସାଥୀ |',
          source: 'groq_ai',
        },
      };

      setMessages([welcomeMsg]);

      // Service Worker registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, []);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, voiceTranscript]);

  const toggleLowDataMode = () => {
    const next = !lowDataMode;
    setLowDataMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('matisathi_low_data', String(next));
    }
  };

  const toggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('matisathi_auto_speak', String(next));
    }
    if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }
  };

  // Text-to-Speech (native on-device synthesis, 0 KB network data)
  const speakText = (text: string, id: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const cleanText = text
        .replace(/[*#_`]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const indVoice = voices.find(
        (v) =>
          v.lang.startsWith('or') ||
          v.lang.startsWith('hi') ||
          v.lang.includes('IN') ||
          v.name.includes('India'),
      );
      if (indVoice) {
        utterance.voice = indVoice;
      }
      utterance.lang = 'or-IN';
      utterance.rate = 0.9;

      utterance.onstart = () => setSpeakingMsgId(id);
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);

      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMsgId(null);
    }
  };

  // Speech-to-Text (Voice Recognition)
  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('କଣ୍ଠସ୍ୱର ଇନପୁଟ୍ ଏହି ବ୍ରାଉଜରରେ ସମର୍ଥିତ ନୁହେଁ | ଦୟାକରି ତଳ ବାକ୍ସରେ ଟାଇପ୍ କରନ୍ତୁ |');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'or-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript('');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setVoiceTranscript(transcript);
        if (event.results[0]?.isFinal) {
          setIsListening(false);
          handleSendMessage(transcript, 'voice');
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    if (voiceTranscript.trim()) {
      handleSendMessage(voiceTranscript, 'voice');
      setVoiceTranscript('');
    }
  };

  // Send message & get dynamic AI answer
  const handleSendMessage = async (queryText: string, mode: 'voice' | 'text' = 'text') => {
    const query = queryText.trim();
    if (!query || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      inputMode: mode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setVoiceTranscript('');
    setIsLoading(true);

    try {
      const onlineCheck = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!onlineCheck) {
        // Instant Offline Mode
        const offlineConcept = matchOfflineConcept(query);
        const offlineResp = generateLocalOfflineResponse(query, mode);

        await enqueueOfflineItem('doubt', profile.name, {
          text: query,
          conceptId: offlineConcept.id,
          timestamp: new Date().toISOString(),
        });

        const aiMsgId = `ai-${Date.now()}`;
        const cleanExplanation = offlineResp.explanationOdia.replace(
          /ନମସ୍କାର.*?\(ଅଫଲାଇନ୍ ପାଠ୍ୟ ସହାୟକ\)\n?/,
          '',
        );

        const aiMsg: ChatMessage = {
          id: aiMsgId,
          sender: 'assistant',
          text: cleanExplanation,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentResponse: {
            topicOdia: offlineConcept.nameOr,
            topicEnglish: offlineConcept.nameEn,
            explanationOdia: cleanExplanation,
            explanationEnglish: `${offlineConcept.nameEn}: Fundamental concept summary.`,
            analogyTitle: '🌾 ଗାଁ ଉଦାହରଣ',
            analogyOdia:
              offlineResp.ruralMetaphorUsed ||
              'ଏହି ଧାରଣାକୁ ଆମ ଗାଁ ଓ ଦୈନନ୍ଦିନ ପରିବେଶ ସହ ତୁଳନା କରାଯାଇଛି |',
            source: 'local_offline',
          },
        };

        setMessages((prev) => [...prev, aiMsg]);
        if (autoSpeak) {
          speakText(cleanExplanation, aiMsgId);
        }
        return;
      }

      // Online Dynamic Groq Multi-Agent Call
      const res = await fetch('/api/matisathi/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText: query,
          inputMode: mode,
          language: 'or-IN',
          studentId: profile.name,
          portal: 'learn',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const agentData: AgentDoubtResponse = await res.json();
      const aiMsgId = `ai-${Date.now()}`;

      const explanation =
        agentData.explanationOdia ||
        agentData.explanationEnglish ||
        'ଧାରଣା ସ୍ପଷ୍ଟିକରଣ ସଫଳ ହେଲା |';

      const ruralAnalogyText =
        typeof agentData.ruralMetaphorUsed === 'string'
          ? agentData.ruralMetaphorUsed
          : agentData.ruralMetaphorUsed?.explanationOdia || '';

      const topRecommendation = agentData.learningPlan?.nextStudyRecommendations?.[0];

      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentResponse: {
          topicOdia: agentData.detectedTopicOdia,
          topicEnglish: agentData.detectedTopicEnglish,
          explanationOdia: explanation,
          explanationEnglish: agentData.explanationEnglish,
          analogyTitle: '🌾 ଗାଁ ଉଦାହରଣ (Rural Analogy)',
          analogyOdia: ruralAnalogyText,
          interactiveChallenge: agentData.interactiveChallenge
            ? {
                id: agentData.interactiveChallenge.id,
                questionOdia: agentData.interactiveChallenge.questionOdia,
                questionEnglish: agentData.interactiveChallenge.questionEnglish,
                options: agentData.interactiveChallenge.options.map((o) => ({
                  id: o.id,
                  textOdia: o.textOdia,
                  textEnglish: o.textEnglish,
                  isCorrect: o.isCorrect,
                  explanationOdia: o.explanationOdia,
                })),
              }
            : undefined,
          nextStep: topRecommendation
            ? {
                titleOdia: topRecommendation.topicNameOdia,
                titleEnglish: topRecommendation.topicNameEnglish,
                timing: `${topRecommendation.timing} • ${topRecommendation.estimatedMinutes}m`,
              }
            : undefined,
          source: 'groq_ai',
        },
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Auto-read aloud via Web Speech Synthesis if enabled
      if (autoSpeak) {
        speakText(explanation, aiMsgId);
      }
    } catch (err) {
      console.warn('[LearnChatbot] Network query failed, using offline fallback:', err);
      const offlineConcept = matchOfflineConcept(query);
      const offlineResp = generateLocalOfflineResponse(query, mode);

      const aiMsgId = `ai-${Date.now()}`;
      const cleanExplanation = offlineResp.explanationOdia.replace(
        /ନମସ୍କାର.*?\(ଅଫଲାଇନ୍ ପାଠ୍ୟ ସହାୟକ\)\n?/,
        '',
      );

      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: cleanExplanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentResponse: {
          topicOdia: offlineConcept.nameOr,
          topicEnglish: offlineConcept.nameEn,
          explanationOdia: cleanExplanation,
          explanationEnglish: `${offlineConcept.nameEn}: Fundamental concept summary.`,
          analogyTitle: '🌾 ଗାଁ ଉଦାହରଣ',
          analogyOdia:
            offlineResp.ruralMetaphorUsed ||
            'ଏହି ଧାରଣାକୁ ଆମ ଗାଁ ଓ ଦୈନନ୍ଦିନ ପରିବେଶ ସହ ତୁଳନା କରାଯାଇଛି |',
          source: 'local_offline',
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (autoSpeak) {
        speakText(cleanExplanation, aiMsgId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizOptionClick = (msgId: string, optionId: string, isCorrect: boolean) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        return {
          ...m,
          quizAnswered: true,
          selectedOptionId: optionId,
          isQuizCorrect: isCorrect,
        };
      }),
    );

    if (isCorrect) {
      speakText('ବହୁତ ବଢ଼ିଆ! ସଠିକ୍ ଉତ୍ତର | ତୁମକୁ +୧୦ ଏକ୍ସପି ମିଳିଲା |', `feedback-${msgId}`);
    } else {
      speakText('ଏହା ସଠିକ୍ ନୁହେଁ | ଆଉଥରେ ବୁଝି ଚେଷ୍ଟା କରନ୍ତୁ |', `feedback-${msgId}`);
    }
  };

  const handleResetChat = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'ନମସ୍କାର ସାଥୀ! 🙏 ମୁଁ ତୁମର ମାଟି ସାଥୀ AI ଶିକ୍ଷକ | ମୁଁ କମ୍ ନେଟୱାର୍କ ଅଞ୍ଚଳରେ ବି ତୁମ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେବା ପାଇଁ ପ୍ରସ୍ତୁତ | କୌଣସି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ କିମ୍ବା ମାଇକ୍ ରେ କଥା ହୁଅନ୍ତୁ!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentResponse: {
          topicOdia: 'ପୁନଃ ସ୍ୱାଗତମ୍',
          topicEnglish: 'Chat Reset',
          explanationOdia:
            'ତୁମେ ନବମ ଶ୍ରେଣୀ ବିଜ୍ଞାନ କିମ୍ବା ଯେକୌଣସି ବିଷୟର ସନ୍ଦେହ ପଚାରିପାରିବ | ତଳେ ଥିବା ପ୍ରଶ୍ନ ବାଛନ୍ତୁ କିମ୍ବା ମାଇକ୍ ବଟନ୍ ଚାପନ୍ତୁ |',
          source: 'groq_ai',
        },
      },
    ]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      {/* ═══ 1. COMPACT LOW-DATA HEADER ═══ */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-slate-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Link
            href="/matisathi"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="ପୋର୍ଟାଲକୁ ଫେରନ୍ତୁ"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold shadow-xs">
              🌾
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  ମାଟି ସାଥୀ (MatiSathi)
                </h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Voice AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>{profile.nameOdia}</span>
                <span>•</span>
                <span className={isOnline ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                  {isOnline ? '🟢 Live AI' : '📶 Low Network Mode'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Low Data & Voice Read Aloud Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Auto-Voice Speak Toggle */}
          <button
            type="button"
            onClick={toggleAutoSpeak}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              autoSpeak
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={autoSpeak ? 'Auto Voice: ON (ପଢ଼ି ଶୁଣାଉଛି)' : 'Auto Voice: OFF'}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{autoSpeak ? 'Voice: ON' : 'Voice: OFF'}</span>
          </button>

          {/* Low Data Mode Toggle */}
          <button
            type="button"
            onClick={toggleLowDataMode}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              lowDataMode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Low Data Mode: saves phone bandwidth and battery"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">{lowDataMode ? 'Low Data: ON' : 'Full Data'}</span>
          </button>

          {/* Reset Chat */}
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
            title="ଚାଟ୍ ସଫା କରନ୍ତୁ (Reset Chat)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ═══ 2. CHAT STREAM CONTAINER ═══ */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 flex flex-col justify-between overflow-y-auto">
        {/* Quick Suggestion Chips */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>ତ୍ୱରିତ ସନ୍ଦେହ (Quick Questions - Tap to ask):</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
            {QUICK_SUGGESTIONS.map((sug) => (
              <button
                key={sug.label}
                type="button"
                onClick={() => handleSendMessage(sug.query, 'text')}
                disabled={isLoading}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 transition-all active:scale-95"
              >
                {sug.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Bubble Feed */}
        <div className="flex-1 space-y-4 pb-44">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSpeakingThis = speakingMsgId === msg.id;

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end gap-2 items-end">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-md border border-emerald-400/20">
                    <p className="text-sm sm:text-base leading-relaxed font-medium">{msg.text}</p>
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-emerald-200">
                      <span>{msg.inputMode === 'voice' ? '🎤 Voice' : '⌨️ Text'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xs text-emerald-300 shrink-0 mb-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            }

            // Assistant Response Card
            const resp = msg.agentResponse;

            return (
              <div key={msg.id} className="flex justify-start gap-2 items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-sm text-white shrink-0 shadow-xs mt-1">
                  🌾
                </div>

                <div className="max-w-[92%] sm:max-w-[85%] space-y-2.5">
                  <div className="rounded-2xl rounded-tl-xs bg-slate-900/90 border border-white/10 p-4 shadow-lg space-y-3">
                    {/* Assistant Card Header: Topic Badge + Voice Speaker */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-emerald-400">
                          {resp?.topicOdia || 'ବିଜ୍ଞାନ ସନ୍ଦେହ'}
                        </span>
                        {resp?.topicEnglish && (
                          <span className="text-[11px] text-slate-400 italic">
                            ({resp.topicEnglish})
                          </span>
                        )}
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded-md font-bold font-mono border ${
                            resp?.source === 'groq_ai'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {resp?.source === 'groq_ai' ? '⚡ Live AI' : '📦 Offline Cache'}
                        </span>
                      </div>

                      {/* Listen Voice Button */}
                      <button
                        type="button"
                        onClick={() => speakText(resp?.explanationOdia || msg.text, msg.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSpeakingThis
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                        }`}
                        title="ଏହି ଉତ୍ତରକୁ କଣ୍ଠସ୍ୱରରେ ଶୁଣନ୍ତୁ"
                      >
                        {isSpeakingThis ? (
                          <>
                            <Radio className="w-3.5 h-3.5 animate-spin" />
                            <span>କୁହୁଛି...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>ଶୁଣନ୍ତୁ</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Main Explanation Body */}
                    <div className="text-sm sm:text-base text-slate-100 leading-relaxed space-y-2">
                      <p className="font-normal whitespace-pre-line">{resp?.explanationOdia || msg.text}</p>
                    </div>

                    {/* Rural / Everyday Local Analogy Box */}
                    {resp?.analogyOdia && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                          <span>🌾</span>
                          <span>{resp.analogyTitle || 'ଗାଁର ଦୈନନ୍ଦିନ ଉଦାହରଣ (Rural Analogy):'}</span>
                        </div>
                        <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
                          {resp.analogyOdia}
                        </p>
                      </div>
                    )}

                    {/* Interactive Diagnostic Practice Question (if present) */}
                    {resp?.interactiveChallenge && (
                      <div className="mt-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>ପରୀକ୍ଷାମୂଳକ ଅଭ୍ୟାସ (Quick Practice):</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                            +10 XP
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed">
                          {resp.interactiveChallenge.questionOdia || resp.interactiveChallenge.questionEnglish}
                        </p>

                        {/* Options Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {resp.interactiveChallenge.options.map((opt) => {
                            const isSelected = msg.selectedOptionId === opt.id;
                            const showResult = msg.quizAnswered && isSelected;

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleQuizOptionClick(msg.id, opt.id, opt.isCorrect)}
                                className={`text-left p-2.5 rounded-xl text-xs font-medium border transition-all flex items-center justify-between gap-2 ${
                                  showResult
                                    ? opt.isCorrect
                                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                                      : 'border-rose-500 bg-rose-500/20 text-rose-200'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
                                }`}
                              >
                                <span>{opt.textOdia || opt.textEnglish}</span>
                                {showResult && (
                                  <span>
                                    {opt.isCorrect ? (
                                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : (
                                      <span className="text-rose-400 text-xs">✕</span>
                                    )}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Next Study Step Roadmap Pill */}
                    {resp?.nextStep && (
                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-slate-200">ଆଗକୁ କ’ଣ ପଢ଼ିବେ:</span>
                          <span className="text-emerald-300 truncate max-w-[200px]">
                            {resp.nextStep.titleOdia || resp.nextStep.titleEnglish}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {resp.nextStep.timing}
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 px-2 block">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {/* Typing / Thinking Indicator */}
          {isLoading && (
            <div className="flex justify-start gap-2 items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-sm text-white shrink-0 animate-pulse">
                🌾
              </div>
              <div className="rounded-2xl rounded-tl-xs bg-slate-900 border border-white/10 px-4 py-3 flex items-center gap-2 text-xs text-slate-300 shadow-md">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="font-semibold text-emerald-300">ସାଥୀ ବିଚାର କରୁଛି (Thinking)...</span>
              </div>
            </div>
          )}

          {/* Live Voice Recording Status */}
          {isListening && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>କଣ୍ଠସ୍ୱର ଶୁଣୁଛି... କୁହନ୍ତୁ (Listening in Odia/English):</span>
                <span className="italic font-normal text-white truncate max-w-[220px]">
                  {voiceTranscript || '...'}
                </span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                ସରିଲା (Done)
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ═══ 3. DOCKED BOTTOM VOICE & TEXT BAR ═══ */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 border-t border-white/10 backdrop-blur-lg px-3 sm:px-6 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText, 'text');
          }}
          className="max-w-3xl mx-auto flex items-center gap-2"
        >
          {/* Animated Big Microphone Button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
              isListening
                ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 animate-pulse'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white active:scale-95'
            }`}
            title={isListening ? 'ମାଇକ୍ ବନ୍ଦ କରନ୍ତୁ' : 'ମାଇକ୍ ରେ କଥା ହୁଅନ୍ତୁ (Tap to Speak)'}
          >
            {isListening ? <MicOff className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Text Input Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ଯେକୌଣସି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ (Ask anything in Odia or English)..."
              disabled={isLoading || isListening}
              className="w-full h-12 pl-4 pr-10 rounded-2xl bg-slate-900 border border-white/15 focus:border-emerald-500 focus:outline-hidden text-sm text-white placeholder:text-slate-400 transition-colors"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md active:scale-95"
            title="ପଠାନ୍ତୁ (Send)"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
