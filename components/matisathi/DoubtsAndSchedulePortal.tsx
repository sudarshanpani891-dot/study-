'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Flame,
  Award,
  ChevronRight,
  HelpCircle,
  Layers,
  Check,
  RefreshCw,
  Info,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LearnerDoubtRecord } from '@/lib/matisathi/types';

interface PlanItem {
  id: string;
  conceptId: string;
  conceptNameOr: string;
  conceptNameEn: string;
  scheduledDate: string;
  minutes: number;
  type: 'learn' | 'practice' | 'revise';
  status: 'pending' | 'completed' | 'skipped';
  reason: string;
  orderIndex: number;
}

interface StudyPlanResponse {
  studyPlan: {
    id: string;
    learnerId: string;
    dailyMinutes: number;
    examDate: string | null;
  };
  todayItems: PlanItem[];
  weekItems: PlanItem[];
  remainingMinutesToday: number;
  completedMinutesToday: number;
  dailyBudgetMinutes: number;
}

interface DoubtsAndSchedulePortalProps {
  doubts: LearnerDoubtRecord[];
  onSelectDoubt: (queryText: string) => void;
  onUpdateDoubtProgress?: (doubtId: string, updates: Partial<LearnerDoubtRecord>) => void;
  language: 'odia' | 'english';
}

export function DoubtsAndSchedulePortal({
  doubts,
  onSelectDoubt,
  onUpdateDoubtProgress,
  language,
}: DoubtsAndSchedulePortalProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'plan' | 'schedule' | 'doubts'>('plan');
  const [planData, setPlanData] = useState<StudyPlanResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [activeTooltipItem, setActiveTooltipItem] = useState<string | null>(null);

  // Fetch adaptive study plan from /api/plan
  const fetchPlan = async () => {
    setLoadingPlan(true);
    try {
      const res = await fetch('/api/plan');
      if (res.ok) {
        const data = await res.json();
        setPlanData(data);
      }
    } catch (err) {
      console.warn('[DoubtsAndSchedulePortal] Failed to fetch study plan:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleMarkItemComplete = async (itemId: string) => {
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_item',
          itemId,
          status: 'completed',
        }),
      });
      if (res.ok) {
        await fetchPlan();
      }
    } catch (err) {
      console.warn('[DoubtsAndSchedulePortal] Could not complete item:', err);
    }
  };

  // Calculate statistics
  const totalDoubts = doubts.length;
  const avgProgress =
    totalDoubts > 0
      ? Math.round(doubts.reduce((acc, d) => acc + (d.progressPercent || 0), 0) / totalDoubts)
      : 0;
  const solvedChallenges = doubts.filter((d) => d.quizSolved).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ═══ Header Overview Card ═══ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-card to-card border border-emerald-500/30 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {language === 'odia'
                  ? 'ଅନୁକୂଳିତ ପାଠ ଖସଡ଼ା ଓ ସ୍ପେସ୍ଡ୍ ରିଭ୍ୟୁ (Adaptive Study Plan)'
                  : 'Adaptive Study Plan & Spaced Review'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'odia'
                ? 'ଦୁର୍ବଳ ବିଷୟ ପ୍ରଥମେ, ପୂର୍ବ-ଆବଶ୍ୟକ ଧାରଣା ଏବଂ ୧-୩-୭-୧୪ ଦିନର ସ୍ପେସ୍ଡ୍ ପୁନରାବୃତ୍ତି'
                : 'Weakest concepts first, prerequisite chains, and 1-3-7-14 day spaced review schedule'}
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-muted/70 border border-border/50 text-xs self-start sm:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'plan'
                  ? 'bg-background shadow-xs text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {language === 'odia' ? 'ଆଜିର ପାଠ ଖସଡ଼ା (Today’s Plan)' : "Today's Plan"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'schedule'
                  ? 'bg-background shadow-xs text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {language === 'odia' ? 'ସାପ୍ତାହିକ ଖସଡ଼ା (Week View)' : 'Week View'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('doubts')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${activeTab === 'doubts'
                  ? 'bg-background shadow-xs text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {language === 'odia' ? 'ସନ୍ଦେହ ଇତିହାସ (Doubts)' : 'All Doubts'}
            </button>
          </div>
        </div>

        {/* Real-time KPI Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
            <span className="text-[10px] font-medium text-muted-foreground block">
              {language === 'odia' ? 'ଆଜି ବାକି ସମୟ' : 'Remaining Time Today'}
            </span>
            <span className="text-lg font-extrabold text-amber-500 font-mono">
              {planData?.remainingMinutesToday ?? 60} min
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
            <span className="text-[10px] font-medium text-muted-foreground block">
              {language === 'odia' ? 'ଆଜି ସମ୍ପୂର୍ଣ୍ଣ ସମୟ' : 'Completed Today'}
            </span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono">
              {planData?.completedMinutesToday ?? 0} min
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
            <span className="text-[10px] font-medium text-muted-foreground block">
              {language === 'odia' ? 'ଦୈନିକ ବଜେଟ୍' : 'Daily Budget'}
            </span>
            <span className="text-lg font-extrabold text-teal-400 font-mono">
              {planData?.dailyBudgetMinutes ?? 60} min
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
            <span className="text-[10px] font-medium text-muted-foreground block">
              {language === 'odia' ? 'ପଚରାଯାଇଥିବା ସନ୍ଦେହ' : 'Total Doubts'}
            </span>
            <span className="text-lg font-extrabold text-foreground font-mono">
              {totalDoubts}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ TAB 1: TODAY'S ADAPTIVE PLAN (STEP 4) ═══ */}
      {activeTab === 'plan' && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  {language === 'odia' ? 'ଆଜିର ନିର୍ଦ୍ଦିଷ୍ଟ ପାଠ ତାଲିକା' : "Today's Study Plan Items"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'odia'
                    ? 'କମ୍ପ୍ୟୁଟର ଦ୍ୱାରା ପ୍ରସ୍ତୁତ ବ୍ୟକ୍ତିଗତ ଖସଡ଼ା — କ୍ରମ ଅନୁସାରେ ପଢ଼ନ୍ତୁ'
                    : 'Personalized sequence generated by the Planner Agent'}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchPlan}
              disabled={loadingPlan}
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPlan ? 'animate-spin' : ''}`} />
              <span>{language === 'odia' ? 'ନୂଆ ଯୋଜନା' : 'Re-Plan'}</span>
            </Button>
          </div>

          {planData?.todayItems && planData.todayItems.length > 0 ? (
            <div className="space-y-3">
              {planData.todayItems.map((item, idx) => {
                const isCompleted = item.status === 'completed';
                const isTooltipOpen = activeTooltipItem === item.id;

                let typeBadge = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
                if (item.type === 'practice') {
                  typeBadge = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
                } else if (item.type === 'revise') {
                  typeBadge = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
                }

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCompleted
                        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80'
                        : 'border-border/70 bg-muted/20 hover:border-emerald-500/40'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs font-mono shrink-0 mt-0.5">
                        {item.orderIndex || idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground">
                            {language === 'odia' ? item.conceptNameOr : item.conceptNameEn}
                          </h4>
                          <span className="text-xs text-muted-foreground italic">
                            ({language === 'odia' ? item.conceptNameEn : item.conceptNameOr})
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${typeBadge}`}>
                            {item.type}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {item.minutes} min
                          </span>
                        </div>

                        {/* "Why this?" Tooltip / Localized Pedagogical Reason */}
                        <div className="mt-1.5 flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setActiveTooltipItem(isTooltipOpen ? null : item.id)}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>{language === 'odia' ? 'ଏହି ପାଠ କାହିଁକି? (Why this?)' : 'Why this concept?'}</span>
                          </button>
                        </div>

                        {isTooltipOpen && (
                          <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200">
                            <strong>{language === 'odia' ? 'କାରଣ:' : 'Pedagogical Reason:'}</strong> {item.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 font-semibold"
                        onClick={() => onSelectDoubt(item.conceptNameOr || item.conceptNameEn)}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{language === 'odia' ? 'ପଢ଼ନ୍ତୁ' : 'Start'}</span>
                      </Button>

                      {!isCompleted ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => handleMarkItemComplete(item.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          <span>{language === 'odia' ? 'ସମାପ୍ତ' : 'Done'}</span>
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>{language === 'odia' ? 'ସରିଛି' : 'Completed'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">
              {loadingPlan
                ? 'Loading adaptive plan...'
                : language === 'odia'
                  ? 'ଆଜି ପାଇଁ କୌଣସି ପାଠ ବାକି ନାହିଁ | ନୂତନ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ!'
                  : 'No pending items for today. Ask a new doubt to get started!'}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: WEEK VIEW (STEP 4) ═══ */}
      {activeTab === 'schedule' && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  {language === 'odia' ? '୭-ଦିନର ସାପ୍ତାହିକ ଅଧ୍ୟୟନ ଖସଡ଼ା' : '7-Day Study Horizon'}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'odia'
                    ? 'ସ୍ପେସ୍ଡ୍ ରିଭିଜନ୍ ୧, ୩, ୭ ଏବଂ ୧୪ ଦିନ ଅନ୍ତରରେ ସ୍ଥିରୀକୃତ'
                    : 'Spaced repetition schedule at 1, 3, 7, and 14 day intervals'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {planData?.weekItems?.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {item.scheduledDate}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-muted">
                      {item.type} • {item.minutes}m
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-foreground">
                    {language === 'odia' ? item.conceptNameOr : item.conceptNameEn}
                  </h4>
                  <p className="text-[11px] text-muted-foreground italic">
                    {language === 'odia' ? item.conceptNameEn : item.conceptNameOr}
                  </p>

                  <div className="mt-2 p-2 rounded-lg bg-background/80 border border-border/60 text-xs">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                      {language === 'odia' ? 'ଉଦ୍ଦେଶ୍ୟ (Pedagogical Reason):' : 'Reason:'}
                    </p>
                    <p className="text-[11px] text-foreground leading-relaxed">
                      {item.reason}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 self-start"
                  onClick={() => onSelectDoubt(item.conceptNameOr || item.conceptNameEn)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  <span>{language === 'odia' ? 'ପୂର୍ବାବଲୋକନ' : 'Preview'}</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TAB 3: DOUBTS HISTORY ═══ */}
      {activeTab === 'doubts' && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              {language === 'odia' ? 'ପଚରାଯାଇଥିବା ସମସ୍ତ ସନ୍ଦେହ' : 'Doubt History'}
            </h3>
          </div>

          <div className="space-y-3">
            {doubts.map((doubt) => (
              <div
                key={doubt.id}
                className="p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {language === 'odia' ? doubt.topicOdia : doubt.topicEnglish}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{doubt.query}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 self-end sm:self-center shrink-0"
                  onClick={() => onSelectDoubt(doubt.query)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  <span>{language === 'odia' ? 'ପୁଣି ପଚାରନ୍ତୁ' : 'Ask Again'}</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
