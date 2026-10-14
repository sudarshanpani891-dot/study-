'use client';

import { Sparkles, HelpCircle, ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProactiveNudge } from '@/lib/matisathi/types';

interface ProactiveNudgeCardProps {
  nudge: ProactiveNudge;
  onAcceptNudge: (prompt: string) => void;
  onDismiss?: () => void;
}

export function ProactiveNudgeCard({
  nudge,
  onAcceptNudge,
  onDismiss,
}: ProactiveNudgeCardProps) {
  if (!nudge) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-amber-500/10 p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                ସ୍ୱୟଂଚାଳିତ ଅଭ୍ୟାସ (Agent Proactive Follow-up)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-medium">
                {nudge.topicNameEnglish}
              </span>
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground mt-0.5">
              {nudge.nudgePromptOdia}
            </h3>
          </div>
        </div>
      </div>

      {/* The Challenge Question */}
      <div className="mt-3 p-3 rounded-xl bg-background/80 border border-border/60 shadow-inner">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-foreground">
            <p className="font-medium text-emerald-950 dark:text-emerald-100">
              {nudge.challengeQuestionOdia}
            </p>
            <p className="text-muted-foreground text-[11px] mt-0.5 italic">
              {nudge.challengeQuestionEnglish}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-emerald-600" />
          {nudge.triggeredReason}
        </span>

        <Button
          type="button"
          size="sm"
          onClick={() => onAcceptNudge(nudge.challengeQuestionOdia)}
          className="rounded-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
        >
          <span>ଉତ୍ତର ଦିଅନ୍ତୁ (Solve Challenge)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
