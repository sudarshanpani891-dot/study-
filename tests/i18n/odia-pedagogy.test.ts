import { describe, it, expect } from 'vitest';
import {
  isOdiaLanguage,
  ODIA_LOCALE,
  ODIA_TEACHING_DIRECTIVE,
  ODIA_CHAT_PROMPT_SECTION,
} from '@/lib/ai/odia-teaching';
import { useSettingsStore } from '@/lib/store/settings';
import { runRequirements } from '@/lib/server/generation/run/engine';
import type { GenerationRunInput } from '@/lib/server/generation/run/types';

describe('Odia Pedagogical Language Support', () => {
  it('correctly detects Odia from locale codes and scripts', () => {
    expect(ODIA_LOCALE).toBe('or-IN');
    expect(isOdiaLanguage('or')).toBe(true);
    expect(isOdiaLanguage('or-IN')).toBe(true);
    expect(isOdiaLanguage('Odia')).toBe(true);
    expect(isOdiaLanguage('oriya')).toBe(true);
    expect(isOdiaLanguage('ଓଡ଼ିଆ')).toBe(true);
    expect(isOdiaLanguage(undefined, 'ଚିଲିକା ହ୍ରଦ ବିଷୟରେ ବୁଝାନ୍ତୁ')).toBe(true);
    expect(isOdiaLanguage(undefined, 'Teach in simple spoken Odia')).toBe(true);

    expect(isOdiaLanguage('en-US')).toBe(false);
    expect(isOdiaLanguage('zh-CN')).toBe(false);
    expect(isOdiaLanguage(undefined, 'Hello world')).toBe(false);
  });

  it('contains Class 9 curriculum directives, bracketed terms, and Odisha examples', () => {
    expect(ODIA_TEACHING_DIRECTIVE).toContain('Class 9');
    expect(ODIA_TEACHING_DIRECTIVE).toContain('ସରଳ କଥାବାର୍ତ୍ତା ଓଡ଼ିଆ');
    expect(ODIA_TEACHING_DIRECTIVE).toContain('photosynthesis');
    expect(ODIA_TEACHING_DIRECTIVE).toContain('Chilika Lake');
    expect(ODIA_TEACHING_DIRECTIVE).toContain('Mahanadi River');
    expect(ODIA_TEACHING_DIRECTIVE).toContain('Similipal');

    expect(ODIA_CHAT_PROMPT_SECTION).toContain('Class 9');
    expect(ODIA_CHAT_PROMPT_SECTION).toContain('BSE Odisha');
    expect(ODIA_CHAT_PROMPT_SECTION).toContain('photosynthesis');
    expect(ODIA_CHAT_PROMPT_SECTION).toContain('Chilika Lake');
  });

  it('manages responseLanguage setting in settings store', () => {
    const store = useSettingsStore.getState();
    expect(store.responseLanguage).toBeDefined();

    store.setResponseLanguage('or-IN');
    expect(useSettingsStore.getState().responseLanguage).toBe('or-IN');

    store.setResponseLanguage('auto');
    expect(useSettingsStore.getState().responseLanguage).toBe('auto');
  });

  it('propagates responseLanguage through runRequirements', () => {
    const input: GenerationRunInput = {
      requirement: 'ଫୋଟୋସିନ୍ଥେସିସ୍ ବୁଝାନ୍ତୁ',
      materialIds: [],
      interactive: false,
      taskEngine: false,
      agents: { mode: 'auto' },
      outlineReview: 'countdown',
      responseLanguage: 'or-IN',
    };

    const reqs = runRequirements(input, false);
    expect(reqs.responseLanguage).toBe('or-IN');
    expect(reqs.requirement).toBe('ଫୋଟୋସିନ୍ଥେସିସ୍ ବୁଝାନ୍ତୁ');
  });
});
