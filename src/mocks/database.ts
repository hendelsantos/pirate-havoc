import type { MatchRecord } from '../api/contracts';
import { createGameConfig, DEFAULT_OPTIONS } from '../game/config/gameConfig';

const RECORDS_KEY = 'pirate-havoc:confirmed-records:v1';
const config = createGameConfig(DEFAULT_OPTIONS);

const FIXTURES: readonly MatchRecord[] = [
  { matchId: 'fixture-01', playerId: 'sea-wolf', playerName: 'Sea Wolf', timestamp: '2026-10-25T18:30:00.000Z', score: 18, activeDurationSeconds: 120, endReason: 'TIME_EXPIRED', config, compatibilityKey: 'duration:120|spawn:4' },
  { matchId: 'fixture-02', playerId: 'red-jenny', playerName: 'Red Jenny', timestamp: '2026-10-26T12:15:00.000Z', score: 14, activeDurationSeconds: 116.4, endReason: 'PLAYER_DESTROYED', config, compatibilityKey: 'duration:120|spawn:4' },
  { matchId: 'fixture-03', playerId: 'black-finch', playerName: 'Black Finch', timestamp: '2026-10-27T21:05:00.000Z', score: 11, activeDurationSeconds: 120, endReason: 'TIME_EXPIRED', config, compatibilityKey: 'duration:120|spawn:4' },
  { matchId: 'fixture-04', playerId: 'calico-moon', playerName: 'Calico Moon', timestamp: '2026-10-28T09:40:00.000Z', score: 9, activeDurationSeconds: 103.8, endReason: 'PLAYER_DESTROYED', config, compatibilityKey: 'duration:120|spawn:4' },
  { matchId: 'fixture-05', playerId: 'iron-mary', playerName: 'Iron Mary', timestamp: '2026-10-29T17:10:00.000Z', score: 8, activeDurationSeconds: 120, endReason: 'TIME_EXPIRED', config, compatibilityKey: 'duration:120|spawn:4' },
  { matchId: 'fixture-06', playerId: 'old-crow', playerName: 'Old Crow', timestamp: '2026-10-30T22:42:00.000Z', score: 7, activeDurationSeconds: 95.2, endReason: 'PLAYER_DESTROYED', config, compatibilityKey: 'duration:120|spawn:4' },
];

export function readRecords(): MatchRecord[] {
  try {
    const stored = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as MatchRecord[];
    return [...FIXTURES, ...stored];
  } catch {
    return [...FIXTURES];
  }
}

export function upsertRecord(record: MatchRecord): MatchRecord {
  const localRecords = readRecords().filter((item) => !item.matchId.startsWith('fixture-'));
  const existing = localRecords.find((item) => item.matchId === record.matchId);
  if (existing) return existing;
  localStorage.setItem(RECORDS_KEY, JSON.stringify([...localRecords, record]));
  return record;
}

export function resetRecords(): void {
  localStorage.removeItem(RECORDS_KEY);
}

