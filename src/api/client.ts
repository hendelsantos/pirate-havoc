import axios from 'axios';
import type { MatchRecord, PageResponse } from './contracts';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 3_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function getRanking(page: number, compatibility: string): Promise<PageResponse<MatchRecord>> {
  const response = await apiClient.get<PageResponse<MatchRecord>>('/ranking', { params: { page, compatibility } });
  return response.data;
}

export async function getHistory(page: number, playerId: string): Promise<PageResponse<MatchRecord>> {
  const response = await apiClient.get<PageResponse<MatchRecord>>('/history', { params: { page, playerId } });
  return response.data;
}

export async function submitMatch(record: MatchRecord): Promise<MatchRecord> {
  const response = await apiClient.post<MatchRecord>('/matches', record, {
    headers: { 'Idempotency-Key': record.matchId },
  });
  return response.data;
}

