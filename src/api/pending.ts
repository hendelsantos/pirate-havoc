import type { MatchRecord } from './contracts';

const PENDING_KEY = 'pirate-havoc:pending:v1';

export function getPendingRecords(): MatchRecord[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as MatchRecord[];
  } catch {
    return [];
  }
}

export function addPendingRecord(record: MatchRecord): void {
  const records = getPendingRecords().filter((item) => item.matchId !== record.matchId);
  records.push(record);
  localStorage.setItem(PENDING_KEY, JSON.stringify(records));
}

export function removePendingRecord(matchId: string): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(getPendingRecords().filter((item) => item.matchId !== matchId)));
}

