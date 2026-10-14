/**
 * MatiSathi Curriculum Pack Endpoint
 * GET /api/matisathi/curriculum
 * Returns all pre-cached Class 9 syllabus capsules, initial student profile,
 * and concept mastery states for offline priming.
 */

import { NextResponse } from 'next/server';
import {
  CLASS_9_CURRICULUM,
  DEFAULT_STUDENT_PROFILE,
  INITIAL_MASTERY_STATE,
} from '@/lib/matisathi/curriculum-kb';

export async function GET() {
  return NextResponse.json({
    curriculum: CLASS_9_CURRICULUM,
    defaultStudentProfile: DEFAULT_STUDENT_PROFILE,
    initialMastery: INITIAL_MASTERY_STATE,
    version: '1.0.0-odisha-class9',
    timestamp: new Date().toISOString(),
  });
}
