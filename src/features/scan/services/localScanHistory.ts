import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ResultSeverity} from '../../../navigation/types';

export type LocalScanRecord = {
  id: string;
  userId: string;
  hbValue: number;
  confidence: number;
  severity: ResultSeverity;
  qualityScore: number;
  modelVersion: string;
  takenAt: string;
};

const HISTORY_PREFIX = '@hbmonitor_scan_history:';
const MAX_RECORDS = 100;

function storageKey(userId: string) {
  return `${HISTORY_PREFIX}${userId}`;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadLocalScanHistory(userId: string): Promise<LocalScanRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(item => ({
        id: String(item.id ?? `${userId}-unknown`),
        userId: String(item.userId ?? userId),
        hbValue: safeNumber(item.hbValue),
        confidence: Math.max(0, Math.min(100, safeNumber(item.confidence))),
        severity: (item.severity ?? 'normal') as ResultSeverity,
        qualityScore: Math.max(0, Math.min(100, safeNumber(item.qualityScore))),
        modelVersion: String(item.modelVersion ?? 'unknown'),
        takenAt: String(item.takenAt ?? new Date(0).toISOString()),
      }))
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
  } catch {
    return [];
  }
}

export async function saveLocalScanRecord(
  record: Omit<LocalScanRecord, 'id' | 'takenAt'> & {takenAt?: string; id?: string},
): Promise<LocalScanRecord> {
  const complete: LocalScanRecord = {
    id: record.id ?? `${record.userId}-${Date.now()}`,
    userId: record.userId,
    hbValue: safeNumber(record.hbValue),
    confidence: Math.max(0, Math.min(100, safeNumber(record.confidence))),
    severity: record.severity,
    qualityScore: Math.max(0, Math.min(100, safeNumber(record.qualityScore))),
    modelVersion: record.modelVersion,
    takenAt: record.takenAt ?? new Date().toISOString(),
  };

  const existing = await loadLocalScanHistory(record.userId);
  const next = [complete, ...existing.filter(item => item.id !== complete.id)].slice(0, MAX_RECORDS);
  await AsyncStorage.setItem(storageKey(record.userId), JSON.stringify(next));
  return complete;
}

export async function clearLocalScanHistory(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
