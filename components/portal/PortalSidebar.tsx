'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  BookOpen,
  Mic,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  Globe,
  Zap,
  Award,
  Layers,
  LogOut,
} from 'lucide-react';
import { getCachedStudentProfile } from '@/lib/matisathi/offline-storage';
import type { StudentProfile } from '@/lib/matisathi/types';

interface PortalSidebarProps {
  currentPortal?: 'generator' | 'matisathi' | 'learn';
  onSwitchPortal?: (portal: 'generator' | 'matisathi' | 'learn') => void;
}

export function PortalSidebar({ currentPortal = 'generator', onSwitchPortal }: PortalSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeLang, setActiveLang] = useState<'odia' | 'english'>('odia');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const prof = getCachedStudentProfile();
    if (prof) setProfile(prof);

    const storedLang = localStorage.getItem('matisathi_student_preferred_lang') as 'odia' | 'english' | null;
    if (storedLang) setActiveLang(storedLang);
  }, []);

  const handleToggleLang = () => {
    const next = activeLang === 'odia' ? 'english' : 'odia';
    setActiveLang(next);
    localStorage.setItem('matisathi_student_preferred_lang', next);
    // Dispatch custom event so open views react instantly
    window.dispatchEvent(new CustomEvent('matisathi-language-change', { detail: next }));
  };

  const navItems = [
    {
      id: 'generator',
      titleOdia: 'AI ପାଠ ଷ୍ଟୁଡିଓ',
      titleEn: 'AI Lesson Generator',
      subtitleOdia: 'ପ୍ରଶ୍ନ ପଚାରି କ୍ଲାସରୁମ୍ ଗଢ଼ନ୍ତୁ',
      subtitleEn: 'Ask questions or upload PDF',
      icon: Sparkles,
      iconColor: 'text-purple-400',
      badge: 'Interactive',
      href: '/',
      active: currentPortal === 'generator' && pathname === '/',
    },
    {
      id: 'matisathi',
      titleOdia: 'ମାଟି ସାଥୀ ଏଜେଣ୍ଟ',
      titleEn: 'MatiSathi Agentic Tutor',
      subtitleOdia: 'ସାର୍ବଜନୀନ ଏଜେଣ୍ଟିକ୍ ଶିକ୍ଷକ ଓ ଯୋଜନା',
      subtitleEn: 'Universal Agentic Tutor & Goal Planner',
      icon: BookOpen,
      iconColor: 'text-emerald-400',
      badge: 'Agentic EdTech',
      href: '/matisathi',
      active: currentPortal === 'matisathi' || pathname === '/matisathi',
    },
    {
      id: 'learn',
      titleOdia: 'ଭଏସ୍ ସାଥୀ (Voice AI Chatbot)',
      titleEn: 'Voice AI Chatbot',
      subtitleOdia: 'କଥା ହୁଅନ୍ତୁ ଓ ସନ୍ଦେହ ପଚାରନ୍ତୁ',
      subtitleEn: 'Talk & learn in low network',
      icon: Mic,
      iconColor: 'text-amber-400',
      badge: 'Low Data',
      href: '/learn',
      active: currentPortal === 'learn' || pathname === '/learn',
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 bg-slate-950/90 dark:bg-slate-950/95 border-r border-white/10 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Top Header Section */}
      <div>
        <div className="flex items-center justify-between p-3.5 border-b border-white/10">
          {!collapsed ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xl">🌾</span>
              <div>
                <h2 className="font-extrabold text-sm text-white tracking-tight leading-tight">
                  {activeLang === 'odia' ? 'ପୋର୍ଟାଲ୍ ସ୍ୱିଚର୍' : 'Portal Switcher'}
                </h2>
                <p className="text-[10px] text-emerald-400 font-semibold">OpenMAIC • MatiSathi</p>
              </div>
            </div>
          ) : (
            <span className="text-xl mx-auto">🌾</span>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Student Profile Identity Card */}
        {!collapsed ? (
          <div className="p-3 mx-3 my-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-xs">
                {profile?.nameOdia ? profile.nameOdia.charAt(0) : profile?.name ? profile.name.charAt(0) : 'ସ'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {activeLang === 'odia'
                    ? profile?.nameOdia || profile?.name || 'ସାଥୀ (Learner)'
                    : profile?.name || 'Learner (ସାଥୀ)'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {profile?.grade || 'Class 9'} • {profile?.district || 'Odisha'}
                </p>
              </div>
            </div>

            <Link
              href="/login"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Edit Profile / Switch Student"
            >
              <User className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="my-3 flex justify-center">
            <Link
              href="/login"
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-sm"
              title={`${profile?.name || 'ସାଥୀ (Learner)'} (Switch Profile)`}
            >
              {profile?.nameOdia ? profile.nameOdia.charAt(0) : profile?.name ? profile.name.charAt(0) : 'ସ'}
            </Link>
          </div>
        )}

        {/* Portal Navigation Items */}
        <div className="px-2 flex flex-col gap-1.5 mt-1">
          <p className={`text-[10px] uppercase font-bold text-slate-300 tracking-wider px-2 py-1 ${collapsed ? 'hidden' : 'block'}`}>
            {activeLang === 'odia' ? 'ଶିକ୍ଷା ପୋର୍ଟାଲ୍ ସମୂହ' : 'Learning Portals'}
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (onSwitchPortal) {
                    onSwitchPortal(item.id as any);
                  }
                }}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  item.active
                    ? 'bg-emerald-600/30 border border-emerald-500/50 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
                title={item.titleEn}
                suppressHydrationWarning
              >
                <div className={`p-1.5 rounded-lg bg-white/5 ${item.iconColor} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>

                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-white truncate">
                        {activeLang === 'odia' ? item.titleOdia : item.titleEn}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-semibold">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {activeLang === 'odia' ? item.subtitleOdia : item.subtitleEn}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Language Switcher & Controls */}
      <div className="p-3 border-t border-white/10">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            {/* Bilingual Switch Button */}
            <button
              type="button"
              onClick={handleToggleLang}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>ଭାଷା (Language):</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-black uppercase">
                {activeLang === 'odia' ? 'ଓଡ଼ିଆ' : 'English'}
              </span>
            </button>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-white py-1"
            >
              <LogOut className="w-3 h-3" />
              <span>{activeLang === 'odia' ? 'ଛାତ୍ର ବଦଳାନ୍ତୁ (Switch Student)' : 'Switch Student'}</span>
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleToggleLang}
            className="w-8 h-8 mx-auto rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 flex items-center justify-center"
            title={`Toggle Language (${activeLang === 'odia' ? 'ଓଡ଼ିଆ' : 'English'})`}
          >
            <Globe className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
