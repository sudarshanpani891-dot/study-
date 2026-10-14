/**
 * MatiSathi IndexedDB Client (Dexie 4.x)
 * Offline-first local storage for Class 9 Odisha Science tutor.
 *
 * Caches:
 * - Concepts: syllabus capsules and competencies
 * - MicroLessons: generated explanations and rural analogies
 * - Quizzes: 2-3 question recall checks
 * - Mastery: student progress with timestamp (for last-write-wins sync)
 * - OfflineQueue: pending doubts, quiz results, and mastery updates
 * - ActiveLessonState: current position so learner continues where she left off
 */

import Dexie, { type EntityTable } from 'dexie';

import { CLASS_9_ODISHA_SCIENCE_CONCEPTS } from '@/lib/server/learner/seeds/odisha-class9-science';
import { CLASS_9_CURRICULUM } from '@/lib/matisathi/curriculum-kb';

// ==================== Entity Interfaces ====================

export interface CachedConcept {
  id: string;
  subject: string;
  chapter: string;
  nameOr: string;
  nameEn: string;
  prerequisites: string[];
  summaryOdia?: string;
  ruralAnalogyTitleOdia?: string;
  ruralAnalogyTextOdia?: string;
}

export interface CachedMicroLesson {
  id: string; // conceptId
  conceptId: string;
  textOdia: string;
  example: string;
  wordCount: number;
  cachedAt: string;
}

export interface CachedQuiz {
  id: string; // conceptId
  conceptId: string;
  questions: Array<{
    id: string;
    questionOdia: string;
    questionEnglish?: string;
    options: string[];
    correctAnswer: string;
    hintOdia: string;
  }>;
  cachedAt: string;
}

export interface LocalMasteryRecord {
  id: string; // `${learnerId}:${conceptId}`
  learnerId: string;
  conceptId: string;
  score: number;
  attempts: number;
  lastSeen: string;
  nextReviewAt: string | null;
  updatedAt: string;
}

export type OfflineQueueType = 'doubt' | 'quiz_attempt' | 'mastery_update';

export interface OfflineQueueItem {
  id: string;
  type: OfflineQueueType;
  learnerId: string;
  conceptId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

export interface ActiveLessonState {
  id: string; // 'current_active_lesson'
  conceptId: string;
  conceptNameOr: string;
  conceptNameEn: string;
  chapter: string;
  currentStep: 'teaching' | 'quiz' | 'completed';
  quizAnswers?: Record<string, string>;
  lastPosition?: number;
  updatedAt: string;
}

// ==================== Dexie Database Definition ====================

export class MatiSathiDexieDB extends Dexie {
  concepts!: EntityTable<CachedConcept, 'id'>;
  microLessons!: EntityTable<CachedMicroLesson, 'id'>;
  quizzes!: EntityTable<CachedQuiz, 'id'>;
  mastery!: EntityTable<LocalMasteryRecord, 'id'>;
  offlineQueue!: EntityTable<OfflineQueueItem, 'id'>;
  activeLessonState!: EntityTable<ActiveLessonState, 'id'>;

  constructor() {
    super('MatiSathiOfflineDB');

    this.version(1).stores({
      concepts: 'id, subject, chapter, nameOr, nameEn',
      microLessons: 'id, conceptId, cachedAt',
      quizzes: 'id, conceptId, cachedAt',
      mastery: 'id, learnerId, conceptId, updatedAt, score',
      offlineQueue: 'id, type, learnerId, createdAt',
      activeLessonState: 'id, conceptId, updatedAt',
    });
  }
}

// Single instance for browser lifecycle
export const db = typeof window !== 'undefined' ? new MatiSathiDexieDB() : (null as unknown as MatiSathiDexieDB);

// ==================== Helper Functions ====================

/**
 * Pre-populates the local IndexedDB with all 18 Class 9 concepts and curriculum capsules.
 */
export async function seedLocalDexieConcepts(): Promise<number> {
  if (!db) return 0;
  try {
    const existingCount = await db.concepts.count();
    if (existingCount >= CLASS_9_ODISHA_SCIENCE_CONCEPTS.length) {
      return existingCount;
    }

    const toInsert: CachedConcept[] = CLASS_9_ODISHA_SCIENCE_CONCEPTS.map((sc) => {
      const capsule = CLASS_9_CURRICULUM.find(
        (c) =>
          c.id.includes(sc.id) ||
          c.topicNameEnglish.toLowerCase().includes(sc.nameEn.toLowerCase()),
      );
      return {
        id: sc.id,
        subject: sc.subject,
        chapter: sc.chapter,
        nameOr: sc.nameOr,
        nameEn: sc.nameEn,
        prerequisites: [...sc.prerequisites],
        summaryOdia: capsule?.summaryOdia,
        ruralAnalogyTitleOdia: capsule?.ruralAnalogy.metaphorTitleOdia,
        ruralAnalogyTextOdia: capsule?.ruralAnalogy.explanationOdia,
      };
    });

    await db.concepts.bulkPut(toInsert);
    return toInsert.length;
  } catch (err) {
    console.warn('[Dexie] Failed to seed concepts:', err);
    return 0;
  }
}

export async function cacheMicroLesson(lesson: {
  conceptId: string;
  textOdia: string;
  example: string;
  wordCount: number;
}): Promise<void> {
  if (!db) return;
  await db.microLessons.put({
    id: lesson.conceptId,
    conceptId: lesson.conceptId,
    textOdia: lesson.textOdia,
    example: lesson.example,
    wordCount: lesson.wordCount,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedMicroLesson(conceptId: string): Promise<CachedMicroLesson | undefined> {
  if (!db) return undefined;
  return await db.microLessons.get(conceptId);
}

export async function cacheQuiz(quiz: {
  conceptId: string;
  questions: CachedQuiz['questions'];
}): Promise<void> {
  if (!db) return;
  await db.quizzes.put({
    id: quiz.conceptId,
    conceptId: quiz.conceptId,
    questions: quiz.questions,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedQuiz(conceptId: string): Promise<CachedQuiz | undefined> {
  if (!db) return undefined;
  return await db.quizzes.get(conceptId);
}

// In-memory fallback for SSR and non-browser test environments
const memoryFallback = {
  queue: [] as OfflineQueueItem[],
  activeLesson: undefined as ActiveLessonState | undefined,
  mastery: new Map<string, LocalMasteryRecord>(),
};

export function clearDexieMemoryForTesting(): void {
  memoryFallback.queue = [];
  memoryFallback.activeLesson = undefined;
  memoryFallback.mastery.clear();
}

export async function saveLocalMastery(record: {
  learnerId: string;
  conceptId: string;
  score: number;
  attempts: number;
  lastSeen: string;
  nextReviewAt: string | null;
  updatedAt?: string;
}): Promise<void> {
  const id = `${record.learnerId}:${record.conceptId}`;
  const rec: LocalMasteryRecord = {
    id,
    learnerId: record.learnerId,
    conceptId: record.conceptId,
    score: record.score,
    attempts: record.attempts,
    lastSeen: record.lastSeen,
    nextReviewAt: record.nextReviewAt,
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  };
  if (db) {
    await db.mastery.put(rec);
  } else {
    memoryFallback.mastery.set(id, rec);
  }
}

export async function getLocalMastery(
  learnerId: string,
  conceptId: string,
): Promise<LocalMasteryRecord | undefined> {
  const id = `${learnerId}:${conceptId}`;
  if (db) {
    return await db.mastery.get(id);
  }
  return memoryFallback.mastery.get(id);
}

export async function listLocalMastery(learnerId: string): Promise<LocalMasteryRecord[]> {
  if (db) {
    return await db.mastery.where('learnerId').equals(learnerId).toArray();
  }
  return Array.from(memoryFallback.mastery.values()).filter((m) => m.learnerId === learnerId);
}

export async function enqueueOfflineItem(
  type: OfflineQueueType,
  learnerId: string,
  payload: Record<string, unknown>,
  conceptId?: string,
): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    learnerId,
    conceptId,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  if (db) {
    await db.offlineQueue.put(item);
  } else {
    memoryFallback.queue.push(item);
  }
  return item;
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  if (db) {
    return await db.offlineQueue.orderBy('createdAt').toArray();
  }
  return [...memoryFallback.queue];
}

export async function removeOfflineQueueItem(id: string): Promise<void> {
  if (db) {
    await db.offlineQueue.delete(id);
  } else {
    memoryFallback.queue = memoryFallback.queue.filter((q) => q.id !== id);
  }
}

export async function saveActiveLessonProgress(progress: {
  conceptId: string;
  conceptNameOr: string;
  conceptNameEn: string;
  chapter: string;
  currentStep: 'teaching' | 'quiz' | 'completed';
  quizAnswers?: Record<string, string>;
  lastPosition?: number;
}): Promise<void> {
  const state: ActiveLessonState = {
    id: 'current_active_lesson',
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  if (db) {
    await db.activeLessonState.put(state);
  } else {
    memoryFallback.activeLesson = state;
  }
}

export async function getActiveLessonProgress(): Promise<ActiveLessonState | undefined> {
  if (db) {
    return await db.activeLessonState.get('current_active_lesson');
  }
  return memoryFallback.activeLesson;
}

export async function clearActiveLessonProgress(): Promise<void> {
  if (db) {
    await db.activeLessonState.delete('current_active_lesson');
  } else {
    memoryFallback.activeLesson = undefined;
  }
}

// ==================== Rule-Based Offline Concept Matcher ====================

/**
 * Pure keyword/embedding-free rule-based match for offline doubts.
 */
export function matchOfflineConcept(
  query: string,
  concepts: CachedConcept[] = CLASS_9_ODISHA_SCIENCE_CONCEPTS as CachedConcept[],
): CachedConcept {
  const lower = query.toLowerCase();

  if (/ପ୍ରାଚୀର|wall|ସେଲ୍ୟୁଲୋଜ|cellulose/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c5-cell-wall') ?? concepts[0];
  }
  if (/ଝିଲ୍ଲୀ|membrane|ବିସରଣ|diffusion/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c5-cell-membrane') ?? concepts[0];
  }
  if (/ପରାସରଣ|osmosis/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c5-osmosis') ?? concepts[0];
  }
  if (/ମାଇଟୋକଣ୍ଡ୍ରିଆ|mitochondria|ଶକ୍ତି|powerhouse|atp/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c5-mitochondria') ?? concepts[0];
  }
  if (/ହରିତକଣିକା|କ୍ଲୋରୋପ୍ଲାଷ୍ଟ|chloroplast|ପ୍ଲାଷ୍ଟିଡ|plastid/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c5-plastids') ?? concepts[0];
  }
  if (/ନ୍ୟୁକ୍ଲିଅସ୍|nucleus|ଗୁଣସୂତ୍ର|dna/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c5-nucleus') ?? concepts[0];
  }
  if (/କୋଷଜୀବକ|cytoplasm|organelle/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c5-cytoplasm') ?? concepts[0];
  }
  if (
    /plant.*animal|ପ୍ରାଣୀ.*ଉଦ୍ଭିଦ|ଉଦ୍ଭିଦ.*ପ୍ରାଣୀ|animal.*cell/i.test(lower) ||
    ((/ପାର୍ଥକ୍ୟ|ତୁଳନା/i.test(lower)) && /କୋଷ|cell/i.test(lower))
  ) {
    return concepts.find((c) => c.id === 'sci-c5-plant-vs-animal-cells') ?? concepts[0];
  }
  if (/ତ୍ୱରଣ|acceleration|ମନ୍ଦନ|retardation/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c8-acceleration') ?? concepts[0];
  }
  if (/ବେଗ|velocity|ଦ୍ରୁତି|speed/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c8-speed-velocity') ?? concepts[0];
  }
  if (/ଦୂରତା|distance|ବିସ୍ଥାପନ|displacement/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c8-distance-displacement') ?? concepts[0];
  }
  if (/ଗତି|motion|ସ୍ଥିତି|rest|ସନ୍ଦର୍ଭ/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c8-motion-rest') ?? concepts[0];
  }
  if (/ସମୀକରଣ|equation|v=u|ut\+/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c8-equations-of-motion') ?? concepts[0];
  }
  if (/ବୃତ୍ତୀୟ|circular/i.test(lower)) {
    return concepts.find((c) => c.id === 'sci-c8-circular-motion') ?? concepts[0];
  }

  // If no static concept matched, construct a dynamic concept for this query
  const cleanedTopic = query.replace(/[?।!.,;:()\[\]"']/g, '').trim();
  const slug = cleanedTopic.slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general-concept';
  const hasOdia = /[\u0B00-\u0B7F]/.test(query);

  return {
    id: `dyn-${slug}`,
    grade: 9,
    subjectId: 'General',
    chapter: 'Universal Learning Concept',
    nameOr: hasOdia ? cleanedTopic.slice(0, 40) : `ବିଷୟ: ${cleanedTopic.slice(0, 35)}`,
    nameEn: cleanedTopic.slice(0, 40) || 'Universal Learning Concept',
    prerequisites: ['Foundational Concepts (ମୌଳିକ ଧାରଣା)'],
    summaryOdia: `"${cleanedTopic.slice(0, 40)}" ବିଷୟରେ ମୌଳିକ ନିୟମ ଓ ସ୍ପଷ୍ଟୀକରଣ |`,
    ruralAnalogyTitleOdia: 'ଦୈନନ୍ଦିନ ବାସ୍ତବ ଉଦାହରଣ',
    ruralAnalogyTextOdia: 'ଏହି ନିୟମ ଆମ ଚତୁର୍ପାର୍ଶ୍ୱରେ ଘଟୁଥିବା ବାସ୍ତବ ଘଟଣା ସହ ସମାନ |',
  };
}
