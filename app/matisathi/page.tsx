'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  Volume2,
  RefreshCw,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  Award,
  Layers,
  ArrowUp,
  Wifi,
  WifiOff,
  Plane,
  RotateCw,
  Play,
  X,
} from 'lucide-react';
import { MatiSathiHeader } from '@/components/matisathi/MatiSathiHeader';
import { PortalSidebar } from '@/components/portal/PortalSidebar';
import { VoiceInputButton } from '@/components/matisathi/VoiceInputButton';
import { AudioPlayerButton } from '@/components/matisathi/AudioPlayerButton';
import { DecisionTraceViewer } from '@/components/matisathi/DecisionTraceViewer';
import { DoubtsAndSchedulePortal } from '@/components/matisathi/DoubtsAndSchedulePortal';
import { ProactiveNudgeCard } from '@/components/matisathi/ProactiveNudgeCard';
import { AgentLearningPlanCard } from '@/components/matisathi/AgentLearningPlanCard';
import {
  DEFAULT_STUDENT_PROFILE,
  INITIAL_MASTERY_STATE,
} from '@/lib/matisathi/curriculum-kb';
import {
  getCachedStudentProfile,
  saveCachedStudentProfile,
  getCachedMastery,
  saveCachedMastery,
  getCachedLearnerDoubts,
  saveCachedLearnerDoubts,
  recordLearnerDoubt,
  updateLearnerDoubtProgress,
  getOfflineQueuedDoubts,
  enqueueOfflineDoubt,
  generateLocalOfflineResponse,
  syncPendingDoubts,
  getActiveProactiveNudge,
  setActiveProactiveNudge,
} from '@/lib/matisathi/offline-storage';
import {
  seedLocalDexieConcepts,
  matchOfflineConcept,
  saveActiveLessonProgress,
  getActiveLessonProgress,
  clearActiveLessonProgress,
  saveLocalMastery,
  enqueueOfflineItem,
  type ActiveLessonState,
} from '@/lib/offline/dexie-db';
import {
  syncOfflineQueueToServer,
  probeOllama,
  type OllamaProbeResult,
} from '@/lib/offline/sync-engine';
import type {
  AgentDoubtResponse,
  ConceptMastery,
  ProactiveNudge,
  StudentProfile,
  LearnerDoubtRecord,
} from '@/lib/matisathi/types';
import { Button } from '@/components/ui/button';

interface MessageItem {
  id: string;
  sender: 'student' | 'agent';
  queryText?: string;
  response?: AgentDoubtResponse;
  timestamp: string;
}

const QUICK_CHIPS = [
  {
    labelOdia: '🌿 କୋଷ ପ୍ରାଚୀର vs କୋଷ ଝିଲ୍ଲୀ',
    labelEnglish: '🌿 Cell Wall vs Membrane',
    queryOdia: 'ଉଦ୍ଭିଦ କୋଷ ପ୍ରାଚୀର (Cell Wall) ଏବଂ କୋଷ ଝିଲ୍ଲୀ (Cell Membrane) ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ କ’ଣ?',
    queryEnglish: 'What is the difference between Plant Cell Wall and Cell Membrane?',
  },
  {
    labelOdia: '✈️ ଉଡ଼ାଜାହାଜ କିପରି ଉଡ଼େ? (Bernoulli)',
    labelEnglish: '✈️ How Planes Fly (Bernoulli)',
    queryOdia: 'ଭାରୀ ଉଡ଼ାଜାହାଜ ଆକାଶରେ କିପରି ଉଡ଼ିପାରେ? ବର୍ନୌଲିଙ୍କ ସିଦ୍ଧାନ୍ତ (Bernoulli’s Principle) କିପରି କାମ କରେ?',
    queryEnglish: 'How do heavy aeroplanes fly in the sky? How does Bernoulli’s Principle generate aerodynamic lift?',
  },
  {
    labelOdia: '🌾 ମାଟି ଉର୍ବରତା ଓ ଫସଲ ଚକ୍ର',
    labelEnglish: '🌾 Soil Health & Crop Rotation',
    queryOdia: 'ଡାଲି ଜାତୀୟ ଫସଲ ଲଗାଇଲେ ମାଟିର ଉର୍ବରତା କିପରି ବଢ଼େ? ନାଇଟ୍ରୋଜେନ୍ ସ୍ଥିରୀକରଣ (Nitrogen Fixation) କ’ଣ?',
    queryEnglish: 'How does crop rotation with legumes improve soil fertility? Explain biological nitrogen fixation.',
  },
  {
    labelOdia: '📐 ପିଥାଗୋରାସ ଉପପାଦ୍ୟ',
    labelEnglish: '📐 Pythagorean Theorem',
    queryOdia: 'ସମକୋଣୀ ତ୍ରିଭୁଜରେ ପିଥାଗୋରାସଙ୍କ ଉପପାଦ୍ୟ (Pythagorean Theorem: a² + b² = c²) କିପରି ପ୍ରମାଣିତ ହୁଏ?',
    queryEnglish: 'How does the Pythagorean theorem (a² + b² = c²) work in a right-angled triangle and real-world construction?',
  },
  {
    labelOdia: '💧 ମାଟି କଳସୀ ପାଣି ଓ ବାଷ୍ପୀଭବନ',
    labelEnglish: '💧 Evaporative Cooling',
    queryOdia: 'ଗ୍ରୀଷ୍ମ ଦିନେ ମାଟି କଳସୀର ପାଣି ଥଣ୍ଡା କାହିଁକି ରହେ? ଏଥିରେ ବାଷ୍ପୀଭବନ (Evaporation) କିପରି କାମ କରେ?',
    queryEnglish: 'Why does water in an earthen pot stay cool in summer? How does evaporation work?',
  },
  {
    labelOdia: '🌐 ଇଣ୍ଟରନେଟ୍ କିପରି କାମ କରେ?',
    labelEnglish: '🌐 How the Internet Works',
    queryOdia: 'ଆମ ଫୋନ୍ ରୁ ସାରା ଦୁନିଆକୁ ତଥ୍ୟ କିପରି ପହଞ୍ଚେ? ଇଣ୍ଟରନେଟ୍ ଓ IP Address କିପରି କାମ କରେ?',
    queryEnglish: 'How does data travel from a phone across the world? How do Internet routing and IP addresses work?',
  },
];

export default function MatiSathiPage() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_STUDENT_PROFILE);
  const [mastery, setMastery] = useState<Record<string, ConceptMastery>>(INITIAL_MASTERY_STATE);
  const [isOffline, setIsOffline] = useState(false);
  const [airplaneMode, setAirplaneMode] = useState(false);
  const [lowDataMode, setLowDataMode] = useState(true);
  const [language, setLanguage] = useState<'odia' | 'english'>('odia');
  const [studyMinutesLeft, setStudyMinutesLeft] = useState(60);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [activeNudge, setActiveNudge] = useState<ProactiveNudge | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'doubts_schedule'>('chat');
  const [learnerDoubts, setLearnerDoubts] = useState<LearnerDoubtRecord[]>([]);
  const [activeLesson, setActiveLesson] = useState<ActiveLessonState | null>(null);
  const [syncStatusBanner, setSyncStatusBanner] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaProbeResult | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize service worker, IndexedDB, and network listeners
  useEffect(() => {
    setMounted(true);
    const prof = getCachedStudentProfile();
    const mast = getCachedMastery();
    const queued = getOfflineQueuedDoubts();
    const nudge = getActiveProactiveNudge();
    const doubts = getCachedLearnerDoubts();

    if (prof) setProfile(prof);
    if (mast && Object.keys(mast).length > 0) setMastery(mast);
    setPendingSyncCount(queued.length);
    if (nudge) setActiveNudge(nudge);
    if (doubts && doubts.length > 0) setLearnerDoubts(doubts);

    // Fetch live learner data from database
    fetch('/api/learner/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.learner) {
          setProfile((prev) => ({
            ...prev,
            id: data.learner.id,
            name: data.learner.name || 'ସାଥୀ (Learner)',
            nameOdia: data.learner.name || 'ସାଥୀ (Learner)',
            grade: data.learner.grade || 'Class 9',
          }));
        }
      })
      .catch((e) => console.warn('[MatiSathi] Profile fetch error:', e));

    fetch('/api/plan')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.remainingMinutesToday === 'number') {
          setStudyMinutesLeft(data.remainingMinutesToday);
        }
      })
      .catch((e) => console.warn('[MatiSathi] Plan fetch error:', e));

    fetch('/api/tutor/due')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.due && data.card) {
          setActiveNudge({
            id: data.card.followupId,
            conceptId: data.card.conceptId,
            topicNameOdia: data.card.conceptName,
            topicNameEnglish: data.card.conceptNameEn,
            nudgePromptOdia: data.card.hook,
            nudgePromptEnglish: data.card.hook,
            scheduledTime: data.card.dueAt,
            challengeQuestionOdia: data.card.hook,
            challengeQuestionEnglish: data.card.hook,
            reasonOdia: 'ପୂର୍ବ ପାଠ ପୁନରାବୃତ୍ତି',
          });
        }
      })
      .catch((e) => console.warn('[MatiSathi] Due followup fetch error:', e));

    if (typeof window !== 'undefined') {
      const storedLang = localStorage.getItem('matisathi_student_preferred_lang') as 'odia' | 'english' | null;
      if (storedLang) setLanguage(storedLang);

      // 1. Register Service Worker for PWA offline shell
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
      }

      // 2. Pre-seed local Dexie IndexedDB concepts
      seedLocalDexieConcepts().catch((err) => {
        console.warn('[Dexie] Concept seeding error:', err);
      });

      // 3. Check if there was an active lesson in progress to resume
      getActiveLessonProgress().then((saved) => {
        if (saved) setActiveLesson(saved);
      });

      // 4. Probe optional local Ollama offline LLM
      probeOllama().then((res) => {
        if (res.reachable) setOllamaStatus(res);
      });

      setIsOffline(!navigator.onLine);

      const handleOnline = async () => {
        if (!airplaneMode) {
          setIsOffline(false);
          await triggerNetworkSync();
        }
      };

      const handleOffline = () => {
        setIsOffline(true);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [airplaneMode]);

  // Evening study timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setStudyMinutesLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 60000); // 1 minute
    return () => clearInterval(timer);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Network sync handler with Last-Write-Wins conflict resolution
  const triggerNetworkSync = async () => {
    try {
      const syncResult = await syncOfflineQueueToServer(profile.id);
      const queuedRemaining = getOfflineQueuedDoubts();
      setPendingSyncCount(queuedRemaining.length);

      if (syncResult.syncedCount > 0) {
        setSyncStatusBanner(
          `✅ ସଫଳ ସିଙ୍କ୍: ${syncResult.syncedCount} ଟି ଅଫଲାଇନ୍ ସନ୍ଦେହ ସର୍ଭରରେ ଅପଡେଟ୍ ହେଲା (${syncResult.conflictsResolved} ଟି କନଫ୍ଲିକ୍ଟ Last-Write-Wins ଦ୍ୱାରା ସମାଧାନ) |`,
        );
        setTimeout(() => setSyncStatusBanner(null), 6000);
      }
    } catch (err) {
      console.warn('[Sync] Sync failed:', err);
    }
  };

  // Toggle simulated Airplane Mode demo
  const handleToggleAirplaneMode = async () => {
    const nextMode = !airplaneMode;
    setAirplaneMode(nextMode);
    setIsOffline(nextMode);

    if (nextMode) {
      setSyncStatusBanner(
        '✈️ Airplane Mode Activated — Testing offline IndexedDB caching, local rule-based tutor answers, and local queuing.',
      );
      setTimeout(() => setSyncStatusBanner(null), 5000);
    } else {
      setSyncStatusBanner('🔄 Reconnected! Syncing queued offline doubts & resolving mastery (Last-Write-Wins)...');
      await triggerNetworkSync();
    }
  };

  // Toggle language between Odia and English
  const handleToggleLanguage = () => {
    const next = language === 'odia' ? 'english' : 'odia';
    setLanguage(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('matisathi_student_preferred_lang', next);
    }
  };

  // Handle student submitting a doubt (by voice or text)
  const handleSubmitDoubt = async (queryToSubmit?: string, inputMode: 'voice' | 'text' = 'text') => {
    const query = (queryToSubmit ?? inputText).trim();
    if (!query || loading) return;

    setInputText('');
    const userMsgId = `msg-user-${Date.now()}`;
    const newMsg: MessageItem = {
      id: userMsgId,
      sender: 'student',
      queryText: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    const isCurrentlyOffline = isOffline || airplaneMode;

    try {
      // ==========================================
      // OFFLINE MODE: IndexedDB + Rule-based Concept Matching
      // ==========================================
      if (isCurrentlyOffline) {
        // Artificial micro-delay for realistic local processing
        await new Promise((r) => setTimeout(r, 350));

        // 1. Keyword/embedding-free rule-based concept matching
        const matchedConcept = matchOfflineConcept(query);

        // 2. Generate local offline response from cached curriculum
        const offlineResp = generateLocalOfflineResponse(query, inputMode);

        // 3. Cache active lesson state so she can continue where she left off
        const activeState: ActiveLessonState = {
          id: 'current_active_lesson',
          conceptId: matchedConcept.id,
          conceptNameOr: matchedConcept.nameOr,
          conceptNameEn: matchedConcept.nameEn,
          chapter: matchedConcept.chapter,
          currentStep: 'teaching',
          updatedAt: new Date().toISOString(),
        };
        await saveActiveLessonProgress(activeState);
        setActiveLesson(activeState);

        // 4. Enqueue in Dexie offlineQueue for Last-Write-Wins cloud sync
        await enqueueOfflineItem('doubt', profile.id, {
          text: query,
          conceptId: matchedConcept.id,
          timestamp: new Date().toISOString(),
        }, matchedConcept.id);

        // 5. Update local mastery in IndexedDB
        await saveLocalMastery({
          learnerId: profile.id,
          conceptId: matchedConcept.id,
          score: offlineResp.updatedMasteryScore / 100,
          attempts: (mastery[matchedConcept.id]?.totalDoubtsAsked || 0) + 1,
          lastSeen: new Date().toISOString(),
          nextReviewAt: null,
          updatedAt: new Date().toISOString(),
        });

        const updatedMast = getCachedMastery();
        setMastery(updatedMast);
        setPendingSyncCount(getOfflineQueuedDoubts().length);

        // Record in learner doubt history and schedule
        const offlineDoubtRecord: LearnerDoubtRecord = {
          id: `doubt-${Date.now()}`,
          query,
          subject: matchedConcept.chapter || 'Science',
          topicOdia: matchedConcept.nameOr,
          topicEnglish: matchedConcept.nameEn,
          timestamp: 'Just now (Offline)',
          masteryScore: offlineResp.updatedMasteryScore,
          progressPercent: 45,
          quizSolved: false,
          taskCompleted: false,
          scheduledReviewDate: offlineResp.learningPlan?.allocatedNextReviewDate || 'Tomorrow @ 07:00 PM (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)',
          nextFollowupPromptOdia: offlineResp.learningPlan?.followupChallengePromptOdia || `${matchedConcept.nameOr} ବିଷୟରେ ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ`,
          nextFollowupPromptEnglish: offlineResp.learningPlan?.followupChallengePromptEnglish || `Next proactive challenge on ${matchedConcept.nameEn}`,
          whatToDoNextOdia: 'ସ୍ଥାନୀୟ ମେମୋରୀରୁ ପ୍ରାକ୍ଟିସ୍ ଚ୍ୟାଲେଞ୍ଜ ସମାଧାନ କରନ୍ତୁ (+10 XP) |',
          whatToDoNextEnglish: 'Solve practice challenge from local memory (+10 XP).',
          learningPlan: offlineResp.learningPlan,
          interactiveChallenge: offlineResp.interactiveChallenge,
          actionTask: offlineResp.actionTask,
        };
        recordLearnerDoubt(offlineDoubtRecord);
        setLearnerDoubts(getCachedLearnerDoubts());

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-agent-${Date.now()}`,
            sender: 'agent',
            response: offlineResp,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      // ==========================================
      // ONLINE MODE: Call LangGraph Tutor API endpoint
      // ==========================================
      const res = await fetch('/api/matisathi/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText: query,
          inputMode,
          studentId: profile.id,
          language: language === 'english' ? 'en' : 'or-IN',
          portal: 'matisathi',
          isOffline: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const agentResp: AgentDoubtResponse = await res.json();

      // Update mastery state
      setMastery((prev) => {
        const next = { ...prev };
        const capsuleId = agentResp.proactiveNextStep.conceptId;
        if (next[capsuleId]) {
          next[capsuleId] = {
            ...next[capsuleId],
            masteryScore: agentResp.updatedMasteryScore,
            totalDoubtsAsked: next[capsuleId].totalDoubtsAsked + 1,
            lastStudiedAt: new Date().toISOString(),
          };
        }
        saveCachedMastery(next);
        return next;
      });

      // Update active lesson progress in Dexie
      const activeState: ActiveLessonState = {
        id: 'current_active_lesson',
        conceptId: agentResp.proactiveNextStep.conceptId,
        conceptNameOr: agentResp.detectedTopicOdia,
        conceptNameEn: agentResp.detectedTopicEnglish,
        chapter: 'Class 9 Science',
        currentStep: 'teaching',
        updatedAt: new Date().toISOString(),
      };
      await saveActiveLessonProgress(activeState);
      setActiveLesson(activeState);

      // Record in learner doubt history and schedule
      const newDoubtRecord: LearnerDoubtRecord = {
        id: `doubt-${Date.now()}`,
        query,
        subject: agentResp.detectedSubject || 'Science',
        topicOdia: agentResp.detectedTopicOdia || agentResp.proactiveNextStep.topicNameOdia,
        topicEnglish: agentResp.detectedTopicEnglish || agentResp.proactiveNextStep.topicNameEnglish,
        timestamp: 'Just now',
        masteryScore: agentResp.updatedMasteryScore,
        progressPercent: 50,
        quizSolved: false,
        taskCompleted: false,
        scheduledReviewDate: agentResp.learningPlan?.allocatedNextReviewDate || 'Tomorrow @ 07:00 PM (ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟା)',
        nextFollowupPromptOdia: agentResp.learningPlan?.followupChallengePromptOdia || agentResp.proactiveNudge?.challengeQuestionOdia || `${agentResp.detectedTopicOdia} ବିଷୟରେ ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ`,
        nextFollowupPromptEnglish: agentResp.learningPlan?.followupChallengePromptEnglish || agentResp.proactiveNudge?.challengeQuestionEnglish || `Next proactive challenge on ${agentResp.detectedTopicEnglish}`,
        whatToDoNextOdia: `ଆସନ୍ତାକାଲି ସନ୍ଧ୍ୟାରେ ଏଜେଣ୍ଟ ସ୍ୱୟଂଚାଳିତ ପ୍ରଶ୍ନ ପଚାରିବ | ଆଜି ପ୍ରାକ୍ଟିସ୍ କ୍ଵିଜ୍ ସମାପ୍ତ କରନ୍ତୁ (+10 XP) |`,
        whatToDoNextEnglish: `Agent will follow up tomorrow evening. Complete today’s practice challenge (+10 XP) to prepare.`,
        learningPlan: agentResp.learningPlan,
        interactiveChallenge: agentResp.interactiveChallenge,
        actionTask: agentResp.actionTask,
      };
      recordLearnerDoubt(newDoubtRecord);
      setLearnerDoubts(getCachedLearnerDoubts());

      fetch('/api/plan')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && typeof data.remainingMinutesToday === 'number') {
            setStudyMinutesLeft(data.remainingMinutesToday);
          }
        })
        .catch(() => { });

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-agent-${Date.now()}`,
          sender: 'agent',
          response: agentResp,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.warn('[MatiSathi] Network error during query. Falling back to local offline Dexie agent:', err);
      const fallbackResp = generateLocalOfflineResponse(query, inputMode);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-agent-${Date.now()}`,
          sender: 'agent',
          response: fallbackResp,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeActiveLesson = (saved: ActiveLessonState) => {
    handleSubmitDoubt(`${saved.conceptNameOr} (${saved.conceptNameEn}) ବିଷୟରେ ପୂର୍ବ ପାଠ ଜାରି ରଖନ୍ତୁ`);
  };

  const handleDismissActiveLesson = async () => {
    await clearActiveLessonProgress();
    setActiveLesson(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* ═══ Portal Sidebar Navigation ═══ */}
      <PortalSidebar currentPortal="matisathi" />

      {/* Header with study timer, low data mode, network status, Airplane Mode toggle */}
      <MatiSathiHeader
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        airplaneMode={airplaneMode}
        onToggleAirplaneMode={handleToggleAirplaneMode}
        lowDataMode={lowDataMode}
        onToggleLowData={() => setLowDataMode(!lowDataMode)}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={triggerNetworkSync}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        studyMinutesLeft={studyMinutesLeft}
      />

      {/* Sync Status Banner Notification */}
      {syncStatusBanner && (
        <div className="w-full bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all shadow-xs">
          <span>{syncStatusBanner}</span>
          <button
            type="button"
            onClick={() => setSyncStatusBanner(null)}
            className="p-1 hover:bg-emerald-700 rounded-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Offline Badge & Local IndexedDB Status Indicator */}
        {(isOffline || airplaneMode) && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>
                <strong>
                  {language === 'odia'
                    ? 'ଅଫଲାଇନ୍ ମୋଡ୍ ସକ୍ରିୟ (Offline Mode Active)'
                    : 'Offline Mode Active'}
                </strong>
                {' — '}
                {language === 'odia'
                  ? 'ସ୍ଥାନୀୟ ମେମୋରୀ (IndexedDB) ରୁ ସମସ୍ତ ବିଷୟର ସନ୍ଦେହ, ଏଜେଣ୍ଟ ଯୋଜନା ଓ କ୍ଵିଜ୍ ଉପଲବ୍ଧ |'
                  : 'Universal concept capsules, autonomous learning pathways, and interactive quizzes available offline.'}
              </span>
            </div>
            {ollamaStatus?.reachable && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 text-[11px] font-bold">
                🦙 Ollama Local Ready
              </span>
            )}
            {pendingSyncCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                {pendingSyncCount} {language === 'odia' ? 'ଟି ପେଣ୍ଡିଂ ସିଙ୍କ୍' : 'pending sync'}
              </span>
            )}
          </div>
        )}

        {/* Student Welcome Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-base shadow-sm"
              suppressHydrationWarning
            >
              {language === 'odia' ? (profile.nameOdia?.charAt(0) || 'ସ') : (profile.name?.charAt(0) || 'S')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-foreground" suppressHydrationWarning>
                  {language === 'odia' ? profile.nameOdia : profile.name}
                </h2>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/30"
                  suppressHydrationWarning
                >
                  {profile.grade || (language === 'odia' ? 'ସାର୍ବଜନୀନ ଶିକ୍ଷାର୍ଥୀ (Universal)' : 'Universal Learner')}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground" suppressHydrationWarning>
                {profile.school} • {profile.district}
              </p>
            </div>
          </div>

          {/* Navigation tab switch */}
          <div className="flex items-center p-1 rounded-xl bg-muted/80 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'chat'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {language === 'odia' ? 'ପ୍ରଶ୍ନୋତ୍ତର (Doubt Q&A)' : 'Doubt Q&A'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('doubts_schedule')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'doubts_schedule'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {language === 'odia' ? 'ସନ୍ଦେହ ଓ କାର୍ଯ୍ୟସୂଚୀ (Doubts & Plans)' : 'Doubts & Schedule'}
            </button>
          </div>
        </div>

        {activeTab === 'doubts_schedule' ? (
          <DoubtsAndSchedulePortal
            doubts={learnerDoubts}
            onSelectDoubt={(queryText) => {
              setActiveTab('chat');
              handleSubmitDoubt(queryText);
            }}
            onUpdateDoubtProgress={(doubtId, updates) => {
              updateLearnerDoubtProgress(doubtId, updates);
              setLearnerDoubts(getCachedLearnerDoubts());
            }}
            language={language}
          />
        ) : (
          <>
            {/* Resume Current Lesson Card (continue where she left off) */}
            {activeLesson && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-500/30 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>{language === 'odia' ? 'ପୂର୍ବ ପାଠ:' : 'Active Lesson:'}</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                        {language === 'odia' ? activeLesson.conceptNameOr : activeLesson.conceptNameEn}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {language === 'odia'
                        ? 'ତୁମେ ଯେଉଁଠି ଛାଡ଼ିଥିଲ ସେଇଠୁ ଅଭ୍ୟାସ ଜାରି ରଖନ୍ତୁ'
                        : 'Pick up where you left off in your study plan'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 font-semibold"
                    onClick={() => handleResumeActiveLesson(activeLesson)}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{language === 'odia' ? 'ଜାରି ରଖନ୍ତୁ (Resume)' : 'Resume'}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground p-1.5"
                    onClick={handleDismissActiveLesson}
                    title="Dismiss resume prompt"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Proactive Unprompted Agent Challenge (at top of session) */}
            {activeNudge && (
              <ProactiveNudgeCard
                nudge={activeNudge}
                onAcceptNudge={(prompt) => handleSubmitDoubt(prompt)}
              />
            )}

            {/* Quick Doubt Suggestion Chips */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'odia' ? 'ତୁରନ୍ତ ପଚାରନ୍ତୁ (Quick Questions):' : 'Quick Questions from Syllabus:'}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSubmitDoubt(language === 'english' ? chip.queryEnglish : chip.queryOdia)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-border/80 bg-background hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-900 dark:hover:text-emerald-200 transition-all text-left"
                  >
                    {language === 'odia' ? chip.labelOdia : chip.labelEnglish}
                  </button>
                ))}
              </div>
            </div>

            {/* Q&A Message Feed */}
            <div className="flex-1 space-y-4 pt-2">
              {messages.length === 0 && (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border/80 bg-muted/10">
                  <div className="text-4xl mb-2">🌾</div>
                  <h3 className="font-bold text-base text-foreground" suppressHydrationWarning>
                    {language === 'odia'
                      ? `ନମସ୍କାର ${profile.nameOdia || 'ସାଥୀ'}! ମୁଁ ତୁମର ମାଟି ସାଥୀ (MatiSathi)`
                      : `Hello ${profile.name || 'Learner'}! I am your MatiSathi AI Agent`}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-lg mx-auto mt-1 leading-relaxed">
                    {language === 'odia'
                      ? 'ଯେକୌଣସି ବିଷୟର ସନ୍ଦେହ ଓଡ଼ିଆ କିମ୍ବା ଇଂରାଜୀରେ ପଚାରନ୍ତୁ — ବିଜ୍ଞାନ, ଗଣିତ, ପ୍ରଯୁକ୍ତିବିଦ୍ୟା, କୃଷି କିମ୍ବା ଦୈନନ୍ଦିନ ଜୀବନ | ଏଜେଣ୍ଟ ସ୍ୱୟଂଚାଳିତ ଭାବେ ଶିକ୍ଷଣ ଯୋଜନା, ହାତପାହାନ୍ତା ଟାସ୍କ, ଏବଂ ଇଣ୍ଟରାକ୍ଟିଭ୍ କ୍ଵିଜ୍ ପ୍ରସ୍ତୁତ କରିବ |'
                      : 'Ask any doubt or topic in English or Odia — Science, Math, History, Tech, or Real Life. Our Agentic AI autonomously formulates a learning pathway, real-world tasks, and interactive quizzes.'}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.sender === 'student' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-emerald-600 text-white p-3.5 shadow-sm">
                        <p className="text-sm font-medium leading-relaxed">{msg.queryText}</p>
                        <span className="text-[10px] text-emerald-200 block text-right mt-1 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-[95%] sm:max-w-[85%] rounded-2xl rounded-tl-xs bg-card border border-border/80 p-4 shadow-sm space-y-3">
                        {/* Topic Header & Mastery Delta */}
                        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm">🌱</span>
                            <span className="font-bold text-xs text-foreground">
                              {language === 'odia'
                                ? (msg.response?.detectedTopicOdia || msg.response?.detectedTopicEnglish)
                                : (msg.response?.detectedTopicEnglish || msg.response?.detectedTopicOdia)}
                            </span>
                            <span className="text-[11px] text-muted-foreground italic">
                              ({language === 'odia' ? msg.response?.detectedTopicEnglish : msg.response?.detectedTopicOdia})
                            </span>
                            {msg.response?.proactiveNextStep?.conceptId && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono">
                                #{msg.response.proactiveNextStep.conceptId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {msg.response?.masteryDelta !== undefined && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                {language === 'odia'
                                  ? `+${msg.response.masteryDelta}% ପ୍ରଗତି (Mastery: ${msg.response.updatedMasteryScore}%)`
                                  : `+${msg.response.masteryDelta}% Growth (Mastery: ${msg.response.updatedMasteryScore}%)`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Audio Narration Bar */}
                        {(language === 'odia' ? msg.response?.explanationOdia : (msg.response?.explanationEnglish || msg.response?.explanationOdia)) && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <AudioPlayerButton
                              text={(language === 'english' && msg.response?.explanationEnglish)
                                ? msg.response.explanationEnglish
                                : (msg.response?.explanationOdia || '')}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {language === 'odia'
                                ? 'କଣ୍ଠସ୍ୱରରେ ଶୁଣନ୍ତୁ (Natural Odia Voice)'
                                : 'Listen with Audio (Natural Voice)'}
                            </span>
                          </div>
                        )}

                        {/* Micro-lesson Explanation */}
                        <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90 font-medium">
                          {(language === 'english' && msg.response?.explanationEnglish)
                            ? msg.response.explanationEnglish
                            : msg.response?.explanationOdia}
                        </div>

                        {/* Key Technical / Domain Terms */}
                        {msg.response?.englishKeywords && msg.response.englishKeywords.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[11px] font-bold text-muted-foreground mr-1.5">
                              {language === 'odia' ? 'ମୁଖ୍ୟ ପାରିଭାଷିକ ଶବ୍ଦ (Key Terms):' : 'Key Technical Terms:'}
                            </span>
                            <div className="inline-flex flex-wrap gap-1 mt-1">
                              {msg.response.englishKeywords.map((kw, kidx) => (
                                <span
                                  key={kidx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prerequisites Badges */}
                        {msg.response?.prerequisites && msg.response.prerequisites.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {language === 'odia' ? 'ପୂର୍ବ ଆବଶ୍ୟକ ଧାରଣା (Prerequisites):' : 'Prerequisites:'}
                            </span>
                            {msg.response.prerequisites.map((prereq, pidx) => (
                              <span
                                key={pidx}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                              >
                                {prereq}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 🎯 AUTONOMOUS LEARNING PLAN & INTERACTIVE TASKS */}
                        {msg.response && (
                          <AgentLearningPlanCard
                            learningPlan={msg.response.learningPlan}
                            interactiveChallenge={msg.response.interactiveChallenge}
                            actionTask={msg.response.actionTask}
                            language={language}
                            onMasteryBoost={(pts) => {
                              setSyncStatusBanner(
                                language === 'odia'
                                  ? `🎉 ଅଭିନନ୍ଦନ! +${pts} XP ଆପଣଙ୍କ ଦକ୍ଷତାରେ ସଫଳତାର ସହ ଯୋଡ଼ି ହେଲା |`
                                  : `🎉 Congratulations! +${pts} XP earned and updated in your mastery vector.`
                              );
                              setTimeout(() => setSyncStatusBanner(null), 5000);
                            }}
                          />
                        )}

                        {/* Transparent Decision Trace */}
                        {msg.response?.decisionTrace && msg.response.decisionTrace.length > 0 && (
                          <DecisionTraceViewer steps={msg.response.decisionTrace} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-xs bg-muted/30 border border-border/60 p-3.5 flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span>
                      {language === 'odia'
                        ? 'ମାଟି ସାଥୀ ଆପଣଙ୍କ ପ୍ରଶ୍ନ ବିଶ୍ଳେଷଣ କରୁଛି ଓ ଶିକ୍ଷଣ ଯୋଜନା ପ୍ରସ୍ତୁତ କରୁଛି...'
                        : 'MatiSathi is analyzing your doubt and formulating an autonomous learning plan...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Sticky Input Bar */}
            <div className="sticky bottom-2 pt-2 bg-background/80 backdrop-blur-md">
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-card border border-border shadow-lg">
                <VoiceInputButton
                  onTranscript={(transcript) => handleSubmitDoubt(transcript, 'voice')}
                  disabled={loading}
                />

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitDoubt()}
                  placeholder={
                    isOffline || airplaneMode
                      ? (language === 'odia' ? 'ଅଫଲାଇନ୍ ସନ୍ଦେହ ପଚାରନ୍ତୁ (Ask any offline question)...' : 'Ask an offline doubt from local memory...')
                      : (language === 'odia' ? 'ଯେକୌଣସି ବିଷୟରେ ସନ୍ଦେହ ପଚାରନ୍ତୁ (ବିଜ୍ଞାନ, ଗଣିତ, ପ୍ରଯୁକ୍ତି, ଦୈନନ୍ଦିନ ଜୀବନ...)' : 'Ask any question or concept across any domain...')
                  }
                  disabled={loading}
                  className="flex-1 bg-transparent border-0 outline-hidden px-2 text-sm placeholder:text-muted-foreground"
                />

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSubmitDoubt()}
                  disabled={!inputText.trim() || loading}
                  className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === 'odia' ? 'ପଠାନ୍ତୁ' : 'Send'}</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
