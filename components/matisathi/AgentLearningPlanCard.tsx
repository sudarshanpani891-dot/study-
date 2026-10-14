'use client';

import { useState } from 'react';
import {
  CheckCircle,
  HelpCircle,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
  Compass,
  Check,
  X,
  Calendar,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  AgentLearningPlan,
  InteractiveQuizChallenge,
  HandsOnActionTask,
} from '@/lib/matisathi/types';

interface AgentLearningPlanCardProps {
  learningPlan?: AgentLearningPlan;
  interactiveChallenge?: InteractiveQuizChallenge;
  actionTask?: HandsOnActionTask;
  language: 'odia' | 'english';
  onMasteryBoost?: (points: number) => void;
}

export function AgentLearningPlanCard({
  learningPlan,
  interactiveChallenge,
  actionTask,
  language,
  onMasteryBoost,
}: AgentLearningPlanCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);

  if (!learningPlan && !interactiveChallenge && !actionTask) {
    return null;
  }

  const handleSelectOption = (optionId: string, correct: boolean) => {
    if (hasAnswered && isCorrect) return; // Already solved
    setSelectedOptionId(optionId);
    setHasAnswered(true);
    setIsCorrect(correct);

    if (correct && onMasteryBoost) {
      onMasteryBoost(10);
    }

    if (interactiveChallenge?.id) {
      fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          conceptId: (interactiveChallenge as any).conceptTested || 'sci-c5-cell-wall',
          answers: { [interactiveChallenge.id]: optionId },
          questions: [
            {
              id: interactiveChallenge.id,
              type: 'mcq',
              questionText: interactiveChallenge.questionOdia || interactiveChallenge.questionEnglish,
              correctOptionId: interactiveChallenge.options.find((o) => o.isCorrect)?.id || 'a',
            },
          ],
        }),
      }).catch((e) => console.warn('[AgentLearningPlanCard] Practice submit warning:', e));
    }
  };

  const handleCompleteTask = () => {
    if (taskCompleted) return;
    setTaskCompleted(true);
    if (onMasteryBoost) {
      onMasteryBoost(15);
    }
  };

  return (
    <div className="mt-4 space-y-4 pt-3 border-t border-border/60">
      {/* ── 1. Autonomous Learning Plan & Pathway ── */}
      {learningPlan && (
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              <h4 className="font-bold text-sm text-foreground">
                {language === 'odia'
                  ? 'ସ୍ୱୟଂଚାଳିତ ଶିକ୍ଷା ଯୋଜନା (Autonomous Learning Plan)'
                  : 'Autonomous 4-Stage Learning Pathway'}
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
              Goal-Pursuing Agent
            </span>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {language === 'odia'
              ? (learningPlan.goalSummaryOdia || (learningPlan as unknown as { pedagogicalGoalOdia?: string }).pedagogicalGoalOdia || 'ଦକ୍ଷତା ବୃଦ୍ଧି ଓ ଅଭ୍ୟାସ ଯୋଜନା')
              : (learningPlan.goalSummaryEnglish || (learningPlan as unknown as { pedagogicalGoalEnglish?: string }).pedagogicalGoalEnglish || 'Targeted concept clarification and practice')}
          </p>

          {/* 4 Stages Progression */}
          {learningPlan.stages && learningPlan.stages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
              {learningPlan.stages.map((stage) => {
                const isCurrent = stage.status === 'in_progress';
                const isDone = stage.status === 'completed';
                return (
                  <div
                    key={stage.stageNumber}
                    className={`p-2.5 rounded-xl border text-[11px] transition-all ${isDone
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300'
                        : isCurrent
                          ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 ring-1 ring-indigo-500/30'
                          : 'border-border/60 bg-muted/20 text-muted-foreground'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">
                        {language === 'odia' ? `ସ୍ତର ${stage.stageNumber}` : `Stage ${stage.stageNumber}`}
                      </span>
                      {isDone ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      ) : isCurrent ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                      ) : (
                        <span className="text-[9px] opacity-60">Upcoming</span>
                      )}
                    </div>
                    <p className="font-semibold truncate">
                      {language === 'odia' ? stage.titleOdia : stage.titleEnglish}
                    </p>
                    <p className="text-[10px] opacity-75 line-clamp-2 mt-0.5">
                      {language === 'odia' ? stage.descriptionOdia : stage.descriptionEnglish}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Next What Should I Study Pathway */}
          {learningPlan.nextStudyRecommendations && learningPlan.nextStudyRecommendations.length > 0 && (
            <div className="pt-2 border-t border-indigo-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {language === 'odia'
                    ? 'ଆଗକୁ କ’ଣ ପଢ଼ିବେ? (What to Study Next)'
                    : 'What Should You Study Next? (Personalized Path)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {learningPlan.nextStudyRecommendations.map((rec, i) => (
                  <div
                    key={rec.conceptId + i}
                    className="p-2.5 rounded-xl border border-border/70 bg-background/80 flex flex-col justify-between gap-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-foreground truncate">
                        {language === 'odia' ? rec.topicNameOdia : rec.topicNameEnglish}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono font-medium shrink-0">
                        {rec.timing} • {rec.estimatedMinutes}m
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {language === 'odia' ? rec.reasonOdia : rec.reasonEnglish}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. Interactive Practice Challenge (Task 1) ── */}
      {interactiveChallenge && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-sm text-foreground">
                {language === 'odia'
                  ? 'ପ୍ରାକ୍ଟିସ୍ ଚ୍ୟାଲେଞ୍ଜ (Interactive Practice Challenge)'
                  : 'Interactive Practice Challenge'}
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
              +10 Mastery XP
            </span>
          </div>

          <p className="text-foreground font-medium text-xs leading-relaxed">
            {language === 'odia'
              ? interactiveChallenge.questionOdia
              : interactiveChallenge.questionEnglish}
          </p>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {interactiveChallenge.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const showCorrectness = hasAnswered && isSelected;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id, opt.isCorrect)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2 ${showCorrectness
                      ? opt.isCorrect
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                        : 'border-rose-500 bg-rose-500/15 text-rose-900 dark:text-rose-200'
                      : isSelected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/60 bg-background/60 hover:bg-muted text-foreground/90 hover:border-amber-500/40'
                    }`}
                >
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[11px] shrink-0 ${showCorrectness
                        ? opt.isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white'
                        : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {opt.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-normal">
                      {language === 'odia' ? opt.textOdia : opt.textEnglish}
                    </p>
                    {showCorrectness && (
                      <p
                        className={`text-[10px] mt-1 font-medium ${opt.isCorrect
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                          }`}
                      >
                        {opt.isCorrect ? '✅ ' : '❌ '}
                        {language === 'odia' ? opt.explanationOdia : opt.explanationEnglish}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {hasAnswered && isCorrect && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {language === 'odia'
                  ? 'ଅତି ଉତ୍ତମ! ଆପଣ ସଠିକ୍ ଉତ୍ତର ଦେଇଛନ୍ତି (+10% ଦକ୍ଷତା ସ୍କୋର ବୃଦ୍ଧି ପାଇଲା) |'
                  : 'Great job! You solved the concept challenge (+10% Mastery XP added)!'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Hands-On Action Task (Task 2) ── */}
      {actionTask && (
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-teal-500" />
              <h4 className="font-bold text-sm text-foreground">
                {language === 'odia'
                  ? `ପ୍ରାକ୍ଟିକାଲ୍ ଅନୁଭୂତି: ${actionTask.titleOdia}`
                  : `Hands-On Activity: ${actionTask.titleEnglish}`}
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-800 dark:text-teal-300 font-semibold">
              Real-World Task
            </span>
          </div>

          <p className="text-foreground/90 text-xs leading-relaxed">
            <span className="font-bold">
              {language === 'odia' ? 'କାର୍ଯ୍ୟ ନିର୍ଦ୍ଦେଶ:' : 'Instructions:'}{' '}
            </span>
            {language === 'odia' ? actionTask.instructionsOdia : actionTask.instructionsEnglish}
          </p>

          <p className="text-muted-foreground text-[11px]">
            <span className="font-bold">
              {language === 'odia' ? 'ଆଶା କରାଯାଉଥିବା ପରିଣାମ:' : 'Expected Outcome:'}{' '}
            </span>
            {language === 'odia' ? actionTask.expectedOutcomeOdia : actionTask.expectedOutcomeEnglish}
          </p>

          <div className="pt-1 flex items-center justify-between">
            <Button
              size="sm"
              variant={taskCompleted ? 'outline' : 'default'}
              onClick={handleCompleteTask}
              disabled={taskCompleted}
              className={`h-7 px-3 text-xs rounded-xl font-bold transition-all cursor-pointer ${taskCompleted
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
            >
              {taskCompleted ? (
                <>
                  <Check className="w-3 h-3 mr-1 text-emerald-500" />
                  <span>
                    {language === 'odia' ? 'କାର୍ଯ୍ୟ ସମାପ୍ତ (+15 XP)' : 'Task Completed (+15 XP)'}
                  </span>
                </>
              ) : (
                <span>
                  {language === 'odia' ? 'କାର୍ଯ୍ୟ ସମାପ୍ତ କଲି (Mark Done)' : 'Mark Task Done'}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── 4. Spaced Repetition Allocation ── */}
      {learningPlan?.allocatedNextReviewDate && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background/80 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <div>
              <p className="font-bold text-foreground">
                {language === 'odia'
                  ? 'ସ୍ୱୟଂଚାଳିତ ସ୍ପେସ୍ଡ୍ ରିଭ୍ୟୁ ଆବଣ୍ଟନ (Allocated Review)'
                  : 'Spaced Review Allocated'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {learningPlan.allocatedNextReviewDate}
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
            Autonomous Follow-up
          </span>
        </div>
      )}
    </div>
  );
}
