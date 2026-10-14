import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedStudentProfile,
  saveCachedStudentProfile,
  clearStorageForTesting,
} from '@/lib/matisathi/offline-storage';
import type { StudentProfile } from '@/lib/matisathi/types';

describe('Student Login & Profile Management', () => {
  beforeEach(() => {
    clearStorageForTesting();
  });

  it('provides default student profile for rural Odisha learner', () => {
    const profile = getCachedStudentProfile();
    expect(profile).toBeDefined();
    expect(profile.name).toBe('ସାଥୀ (Learner)');
    expect(profile.nameOdia).toBe('ସାଥୀ (Learner)');
    expect(profile.grade).toContain('Class 9');
    expect(profile.district).toContain('Odisha');
    expect(profile.lowDataMode).toBe(true);
  });

  it('persists customized student profile across sessions', () => {
    const customProfile: StudentProfile = {
      id: 'learner_test_123',
      name: 'Rohan Mohapatra',
      nameOdia: 'ରୋହନ ମହାପାତ୍ର',
      grade: 'Class 9',
      school: 'Ravenshaw Collegiate School',
      district: 'Cuttack',
      motherTongue: 'Odia',
      mediumOfInstruction: 'English',
      eveningStudyMinutesRemaining: 45,
      lowDataMode: false,
      lastActiveDate: new Date().toISOString(),
    };

    saveCachedStudentProfile(customProfile);

    const loaded = getCachedStudentProfile();
    expect(loaded.id).toBe('learner_test_123');
    expect(loaded.name).toBe('Rohan Mohapatra');
    expect(loaded.nameOdia).toBe('ରୋହନ ମହାପାତ୍ର');
    expect(loaded.district).toBe('Cuttack');
    expect(loaded.lowDataMode).toBe(false);
  });

  it('supports bilingual name and school fields for both English and Odia scripts', () => {
    const sunitaProfile: StudentProfile = {
      id: 'learner_sunita',
      name: 'Sunita Majhi',
      nameOdia: 'ସୁନୀତା ମାଝୀ',
      grade: 'Class 9',
      school: 'Govt High School, Phulbani',
      district: 'Kandhamal',
      motherTongue: 'Kui / Odia',
      mediumOfInstruction: 'Odia with English technical terms',
      eveningStudyMinutesRemaining: 50,
      lowDataMode: true,
      lastActiveDate: new Date().toISOString(),
    };

    saveCachedStudentProfile(sunitaProfile);
    const result = getCachedStudentProfile();

    // Odia script check
    expect(result.nameOdia).toMatch(/[\u0B00-\u0B7F]/);
    // English script check
    expect(result.name).toMatch(/^[A-Za-z\s]+$/);
    expect(result.district).toBe('Kandhamal');
    expect(result.school).toContain('Phulbani');
  });
});
