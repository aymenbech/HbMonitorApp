// src/ml/hbSeverityMap.ts

import type { ResultSeverity } from '../navigation/types'; // عدّل المسار حسب مكان تعريف ResultSeverity

// هذه الدالة تحول النص من categorizeHb إلى ResultSeverity متوافق مع نوع الشاشة
export function mapCategoryToResultSeverity(
  category: string | null | undefined
): ResultSeverity | null {
  if (!category) return null;

  const c = category.toLowerCase();

  if (c.includes('sévère') || c.includes('severe')) {
    return 'severe';
  }
  if (c.includes('modérée') || c.includes('moderate')) {
    return 'moderate';
  }
  if (c.includes('légère') || c.includes('mild')) {
    return 'mild';
  }
  if (c.includes('normal')) {
    return 'normal';
  }

  return null;
}