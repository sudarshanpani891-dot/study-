'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, BookOpen, Mic } from 'lucide-react';

interface PortalSwitcherPillProps {
  activePortal?: 'generator' | 'matisathi' | 'learn';
}

export function PortalSwitcherPill({ activePortal = 'generator' }: PortalSwitcherPillProps) {
  const pathname = usePathname();

  const isGen = activePortal === 'generator' && pathname === '/';
  const isMati = activePortal === 'matisathi' || pathname === '/matisathi';
  const isLearn = activePortal === 'learn' || pathname === '/learn';

  return (
    <nav
      aria-label="Portal Navigation"
      className="inline-flex items-center p-1 rounded-full bg-white/70 dark:bg-slate-900/80 border border-border/60 backdrop-blur-md shadow-md gap-1"
    >
      <Link
        href="/"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
          isGen
            ? 'bg-purple-600 text-white shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI Generator Studio</span>
      </Link>

      <Link
        href="/matisathi"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
          isMati
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <span>🌾</span>
        <span>MatiSathi Regional Class</span>
      </Link>

      <Link
        href="/learn"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
          isLearn
            ? 'bg-amber-600 text-white shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <Mic className="w-3.5 h-3.5" />
        <span>Voice Learn</span>
      </Link>
    </nav>
  );
}
