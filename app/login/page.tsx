'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  BookOpen,
  MapPin,
  Globe,
  Zap,
  ArrowRight,
  Sparkles,
  School,
  Check,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import {
  getCachedStudentProfile,
  saveCachedStudentProfile,
} from '@/lib/matisathi/offline-storage';
import type { StudentProfile } from '@/lib/matisathi/types';
import { Button } from '@/components/ui/button';

const POPULAR_DISTRICTS = [
  { nameOdia: 'କନ୍ଧମାଳ', nameEn: 'Kandhamal' },
  { nameOdia: 'କୋରାପୁଟ', nameEn: 'Koraput' },
  { nameOdia: 'ମୟୂରଭଞ୍ଜ', nameEn: 'Mayurbhanj' },
  { nameOdia: 'ଖୋର୍ଦ୍ଧା', nameEn: 'Khordha' },
  { nameOdia: 'କଟକ', nameEn: 'Cuttack' },
  { nameOdia: 'ସମ୍ବଲପୁର', nameEn: 'Sambalpur' },
];

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('Sunita Majhi');
  const [nameOdia, setNameOdia] = useState('ସୁନୀତା ମାଝୀ');
  const [grade, setGrade] = useState('Class 9');
  const [district, setDistrict] = useState('Kandhamal');
  const [school, setSchool] = useState('Govt High School, Phulbani');
  const [language, setLanguage] = useState<'odia' | 'english'>('odia');
  const [lowDataMode, setLowDataMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<'home' | 'matisathi'>('home');

  useEffect(() => {
    // Load pre-existing student profile if any
    const existing = getCachedStudentProfile();
    if (existing) {
      if (existing.name) setName(existing.name);
      if (existing.nameOdia) setNameOdia(existing.nameOdia);
      if (existing.grade) setGrade(existing.grade);
      if (existing.district) setDistrict(existing.district);
      if (existing.school) setSchool(existing.school);
      if (existing.lowDataMode !== undefined) setLowDataMode(existing.lowDataMode);
    }
  }, []);

  const handleApplyPresetSunita = () => {
    setName('Sunita Majhi');
    setNameOdia('ସୁନୀତା ମାଝୀ');
    setGrade('Universal Learner');
    setDistrict('Kandhamal');
    setSchool('Govt High School, Phulbani');
    setLanguage('odia');
    setLowDataMode(true);
  };

  const handleApplyPresetRohan = () => {
    setName('Rohan Mohapatra');
    setNameOdia('ରୋହନ ମହାପାତ୍ର');
    setGrade('Universal Learner');
    setDistrict('Cuttack');
    setSchool('Ravenshaw Collegiate School');
    setLanguage('english');
    setLowDataMode(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    const profileData: StudentProfile = {
      id: `learner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || 'Sunita Majhi',
      nameOdia: nameOdia.trim() || 'ସୁନୀତା ମାଝୀ',
      grade,
      school: school.trim() || 'Govt High School',
      district,
      motherTongue: language === 'odia' ? 'Odia / Kui' : 'English',
      mediumOfInstruction: language === 'odia' ? 'Odia with English technical terms' : 'English',
      eveningStudyMinutesRemaining: 50,
      lowDataMode,
      lastActiveDate: new Date().toISOString(),
    };

    try {
      // 1. Save locally in cache and localStorage
      saveCachedStudentProfile(profileData);
      if (typeof window !== 'undefined') {
        localStorage.setItem('matisathi_student_logged_in', 'true');
        localStorage.setItem('matisathi_student_preferred_lang', language);
        localStorage.setItem('matisathi_low_data', String(lowDataMode));
      }

      // 2. Persist to server API if online
      await fetch('/api/learner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          language: language === 'odia' ? 'or-IN' : 'en-US',
          grade: profileData.grade,
          deviceProfile: {
            district: profileData.district,
            school: profileData.school,
            lowDataMode: profileData.lowDataMode,
          },
        }),
      }).catch((err) => console.warn('[Login] Remote profile sync deferred:', err));
    } finally {
      setSaving(false);
      // Navigate to intended destination
      if (redirectTarget === 'matisathi') {
        router.push('/matisathi');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 text-white flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="max-w-lg w-full bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ମୁଖ୍ୟ ପୃଷ୍ଠା (Home)</span>
          </Link>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ଛାତ୍ର ପଞ୍ଜୀକରଣ (Student Login)
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-3xl mx-auto shadow-lg shadow-emerald-950">
            🌾
          </div>
          <h1 className="text-2xl font-black mt-3 text-white tracking-tight">
            ମାଟି ସାଥୀ • ପ୍ରବେଶ ପୃଷ୍ଠା
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            Student Profile & Regional Classroom Onboarding
          </p>
        </div>

        {/* Quick Demo Pre-fills */}
        <div className="mb-6 p-3 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ତ୍ୱରିତ ପ୍ରୋଫାଇଲ୍ ବାଛନ୍ତୁ (Quick 1-Click Demo Profiles):</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleApplyPresetSunita}
              className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                name.includes('Sunita')
                  ? 'bg-emerald-600/30 border-emerald-400 text-white font-bold'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="font-extrabold text-emerald-300">🌿 ସୁନୀତା (Sunita)</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Class 9 • Kandhamal (Odia)</div>
            </button>
            <button
              type="button"
              onClick={handleApplyPresetRohan}
              className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                name.includes('Rohan')
                  ? 'bg-emerald-600/30 border-emerald-400 text-white font-bold'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="font-extrabold text-blue-300">📘 Rohan (ରୋହନ)</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Class 9 • Cuttack (English)</div>
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name in Odia and English */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>ଛାତ୍ର/ଛାତ୍ରୀଙ୍କ ନାମ (Odia)</span>
              </label>
              <input
                type="text"
                value={nameOdia}
                onChange={(e) => setNameOdia(e.target.value)}
                placeholder="ସୁନୀତା ମାଝୀ"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white text-sm focus:border-emerald-400 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Name (English)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sunita Majhi"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white text-sm focus:border-emerald-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Grade / Learner Focus Level */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>ଶିକ୍ଷଣ ସ୍ତର (Learner Level / Domain)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Universal Learner', odia: 'ସାର୍ବଜନୀନ (All Doubts)', en: 'Universal Learner' },
                { id: 'Class 6-8', odia: 'ଷଷ୍ଠ-ଅଷ୍ଟମ (Class 6-8)', en: 'Class 6-8' },
                { id: 'Class 9-10', odia: 'ନବମ-ଦଶମ (Class 9-10)', en: 'Class 9-10' },
                { id: 'College / Lifelong', odia: 'ଉଚ୍ଚଶିକ୍ଷା (Higher Ed)', en: 'College / Lifelong' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrade(g.id)}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-all text-center ${
                    grade === g.id
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-white/10 hover:bg-white/5'
                  }`}
                >
                  {language === 'odia' ? g.odia : g.en}
                </button>
              ))}
            </div>
          </div>

          {/* District Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>ଜିଲ୍ଲା (District in Odisha)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {POPULAR_DISTRICTS.map((d) => (
                <button
                  key={d.nameEn}
                  type="button"
                  onClick={() => setDistrict(d.nameEn)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                    district === d.nameEn
                      ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {d.nameOdia} ({d.nameEn})
                </button>
              ))}
            </div>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Or type custom district..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/20 text-white text-xs focus:border-emerald-400 focus:outline-hidden"
            />
          </div>

          {/* School Name */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-emerald-400" />
              <span>ବିଦ୍ୟାଳୟ (School / Village)</span>
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Govt High School"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white text-sm focus:border-emerald-400 focus:outline-hidden"
            />
          </div>

          {/* Preferred Language & Low Data Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>ପସନ୍ଦର ଭାଷା (Language)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLanguage('odia')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold ${
                    language === 'odia'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-white/10'
                  }`}
                >
                  ଓଡ଼ିଆ (Odia)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('english')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold ${
                    language === 'english'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-white/10'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>ଡାଟା ମୋଡ୍ (Data Mode)</span>
              </label>
              <button
                type="button"
                onClick={() => setLowDataMode(!lowDataMode)}
                className={`w-full py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  lowDataMode
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400'
                    : 'bg-slate-950 text-slate-300 border-white/10'
                }`}
              >
                <span>{lowDataMode ? '📶 ଡାଟା ସଞ୍ଚୟ (Low Data)' : '⚡ ସାଧାରଣ (Standard)'}</span>
                <span className="text-[10px] uppercase font-black">{lowDataMode ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Action Destination Select */}
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-300 mb-1.5">
              କେଉଁ ପୋର୍ଟାଲ୍ କୁ ଯିବେ? (Choose destination):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRedirectTarget('home')}
                className={`p-2.5 rounded-xl text-left border text-xs transition-colors ${
                  redirectTarget === 'home'
                    ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                    : 'bg-slate-950 text-slate-300 border-white/10'
                }`}
              >
                🎨 <strong>AI Generator</strong>
                <p className="text-[10px] text-slate-400 mt-0.5">Landing Page Studio</p>
              </button>
              <button
                type="button"
                onClick={() => setRedirectTarget('matisathi')}
                className={`p-2.5 rounded-xl text-left border text-xs transition-colors ${
                  redirectTarget === 'matisathi'
                    ? 'bg-emerald-600/30 border-emerald-400 text-white font-bold'
                    : 'bg-slate-950 text-slate-300 border-white/10'
                }`}
              >
                🌾 <strong>MatiSathi Class</strong>
                <p className="text-[10px] text-slate-400 mt-0.5">Class 9 Science Portal</p>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={saving}
            className="w-full mt-3 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
          >
            {saving ? (
              <span>ସଂରକ୍ଷଣ ହେଉଛି... (Saving Profile...)</span>
            ) : (
              <>
                <span>ପ୍ରବେଶ କରନ୍ତୁ (Start Learning)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Guest Pass */}
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-center text-xs text-slate-400 hover:text-white transition-colors py-1"
          >
            ଅତିଥି ଭାବରେ ପ୍ରବେଶ କରନ୍ତୁ (Continue as Guest →)
          </button>
        </form>
      </div>
    </div>
  );
}
