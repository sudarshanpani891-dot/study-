'use client';

import { Award, AlertTriangle, CheckCircle, TrendingUp, BookOpen } from 'lucide-react';
import type { ConceptMastery } from '@/lib/matisathi/types';

interface MasteryDashboardProps {
  masteryState: Record<string, ConceptMastery>;
  onSelectTopic: (topicOdia: string) => void;
  language?: 'odia' | 'english';
}

export function MasteryDashboard({ masteryState, onSelectTopic, language = 'odia' }: MasteryDashboardProps) {
  const items = Object.values(masteryState);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              {language === 'odia' ? 'ନବମ ଶ୍ରେଣୀ ଦକ୍ଷତା ପ୍ରଗତି (Class 9 Mastery Tracker)' : 'Class 9 Science Mastery Tracker'}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {language === 'odia'
                ? 'Cognitive Mastery & Gap Diagnosis across Odisha SCERT Curriculum'
                : 'Cognitive Mastery & Gap Diagnosis across Odisha Board Curriculum'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          let statusBadge = (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {language === 'odia' ? 'ଚାଲିଛି (In Progress)' : 'In Progress'}
            </span>
          );

          if (item.status === 'mastered') {
            statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" />
                {language === 'odia' ? 'ଦକ୍ଷତା ପ୍ରାପ୍ତ (Mastered)' : 'Mastered'}
              </span>
            );
          } else if (item.status === 'needs_remedial') {
            statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                {language === 'odia' ? 'ସନ୍ଦେହ ଅଛି (Needs Remedial)' : 'Needs Practice'}
              </span>
            );
          }

          return (
            <div
              key={item.conceptId}
              className="rounded-xl border border-border/60 bg-muted/20 p-3 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase">
                    {item.subject}
                  </span>
                  {statusBadge}
                </div>

                <h4 className="font-semibold text-xs sm:text-sm text-foreground leading-snug">
                  {item.topicNameOdia}
                </h4>
                <p className="text-[11px] text-muted-foreground italic mt-0.5">
                  {item.topicNameEnglish}
                </p>

                {/* Progress bar */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">ଦକ୍ଷତା (Mastery)</span>
                    <span className="font-bold text-foreground font-mono">
                      {item.masteryScore}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.masteryScore >= 75
                          ? 'bg-emerald-500'
                          : item.masteryScore >= 50
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.masteryScore}%` }}
                    />
                  </div>
                </div>

                {/* Active misconception alert if any */}
                {item.activeMisconceptions && item.activeMisconceptions.length > 0 && (
                  <div className="mt-2 p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-900 dark:text-amber-200">
                    <span className="font-semibold">ଚିହ୍ନଟ ସନ୍ଦେହ:</span> {item.activeMisconceptions[0]}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectTopic(language === 'english' ? item.topicNameEnglish : item.topicNameOdia)}
                className="mt-3 w-full py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-3 h-3 text-emerald-600" />
                <span>{language === 'odia' ? 'ଏହି ବିଷୟ ପଚାରନ୍ତୁ (Ask Doubt)' : 'Practice / Ask Question'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
