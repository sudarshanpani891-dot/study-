'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wifi,
  WifiOff,
  Clock,
  RotateCw,
  Zap,
  Globe,
  Sparkles,
  ArrowLeft,
  Plane,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatiSathiHeaderProps {
  isOffline: boolean;
  onToggleOffline: () => void;
  airplaneMode?: boolean;
  onToggleAirplaneMode?: () => void;
  lowDataMode: boolean;
  onToggleLowData: () => void;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  language: 'odia' | 'english';
  onToggleLanguage: () => void;
  studyMinutesLeft: number;
}

export function MatiSathiHeader({
  isOffline,
  onToggleOffline,
  airplaneMode = false,
  onToggleAirplaneMode,
  lowDataMode,
  onToggleLowData,
  pendingSyncCount,
  onTriggerSync,
  language,
  onToggleLanguage,
  studyMinutesLeft,
}: MatiSathiHeaderProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSyncClick = async () => {
    setSyncing(true);
    try {
      await onTriggerSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-2.5 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Brand & Student Identity */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Return to OpenMAIC Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🌾</span>
              <h1 className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent">
                ମାଟି ସାଥୀ (MatiSathi)
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {language === 'odia' ? 'ସାର୍ବଜନୀନ ଏଜେଣ୍ଟିକ୍ ଶିକ୍ଷା' : 'Universal Agentic EdTech'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              {language === 'odia'
                ? 'ସମସ୍ତ ପ୍ରଶ୍ନ ଓ ସନ୍ଦେହ ପାଇଁ ସ୍ୱୟଂଚାଳିତ ଶିକ୍ଷାଦାନ • Goal-Pursuing Autonomous Tutor for Any Topic'
                : 'Goal-Pursuing Autonomous AI Tutor & Planner for Any Topic or Grade'}
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* 1-Hour Evening Study Timer */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-semibold"
            title="Shared phone 1-hour evening window countdown"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{studyMinutesLeft} ମିନିଟ୍ ବାକି ({studyMinutesLeft}m left)</span>
          </div>

          {/* Low Data Mode Toggle */}
          <button
            type="button"
            onClick={onToggleLowData}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${lowDataMode
                ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            title="Low Data Mode cuts cellular payload size"
          >
            <Zap className={`w-3 h-3 ${lowDataMode ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            <span className="hidden sm:inline">ଡାଟା ସଞ୍ଚୟ</span>
            <span className="sm:hidden">Low Data</span>
          </button>

          {/* Airplane Mode Demo Toggle Button */}
          {onToggleAirplaneMode && (
            <button
              type="button"
              onClick={onToggleAirplaneMode}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all shadow-sm ${airplaneMode
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-muted/70 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              title="Airplane Mode Demo: Simulate zero-signal offline village environment"
            >
              <Plane className="w-3.5 h-3.5" />
              <span>{airplaneMode ? '✈️ ଏୟାରପ୍ଲେନ୍ ମୋଡ୍ (ON)' : '✈️ Airplane Mode'}</span>
            </button>
          )}

          {/* Offline / Online Network Status Badge */}
          <button
            type="button"
            onClick={onToggleOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${isOffline || airplaneMode
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
              }`}
            title="Current network status (Offline / Online)"
          >
            {isOffline || airplaneMode ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>ଅଫଲାଇନ୍ (Offline Mode)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>ଅନଲାଇନ୍ (Online)</span>
              </>
            )}
          </button>

          {/* Sync Button */}
          {pendingSyncCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncClick}
              disabled={syncing}
              className="h-7 px-2 text-xs rounded-full bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800"
              title="Sync pending doubts with server"
            >
              <RotateCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              <span>ସିଙ୍କ୍ ({pendingSyncCount})</span>
            </Button>
          )}

          {/* Language Switcher (High Visibility Odia ⇄ English) */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
            title="Switch portal language between Odia and English"
            aria-label="Switch portal language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'odia' ? 'ଓଡ଼ିଆ ⇄ English' : 'English ⇄ ଓଡ଼ିଆ'}</span>
          </button>

          {/* Student Profile Link */}
          <Link
            href="/login"
            className="p-1.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit Student Profile / Switch User"
            aria-label="Student Profile"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
