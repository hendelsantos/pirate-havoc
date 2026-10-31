import { delay, http, HttpResponse } from 'msw';
import type { MatchRecord, PageResponse } from '../api/contracts';
import { getScenario } from './scenario';
import { readRecords, upsertRecord } from './database';

const PAGE_SIZE = 5;
let latencySequence = 0;

function page<T>(items: readonly T[], pageNumber: number): PageResponse<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, pageNumber), totalPages);
  return {
    items: items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    page: safePage,
    pageSize: PAGE_SIZE,
    totalItems: items.length,
    totalPages,
  };
}

async function scenarioDelay(): Promise<Response | undefined> {
  const scenario = getScenario();
  if (scenario === 'slow') await delay(1_500);
  if (scenario === 'variable-latency') {
    latencySequence = (latencySequence + 1) % 5;
    await delay(180 + latencySequence * 190);
  }
  if (scenario === 'connection-failure') return HttpResponse.error();
  if (scenario === 'http-400') return HttpResponse.json({ message: 'Reproducible bad request scenario' }, { status: 400 });
  if (scenario === 'http-500') return HttpResponse.json({ message: 'Reproducible server error scenario' }, { status: 500 });
  return undefined;
}

export const handlers = [
  http.get('/api/ranking', async ({ request }) => {
    const commonFailure = await scenarioDelay();
    if (commonFailure) return commonFailure;
    if (getScenario() === 'ranking-failure') return HttpResponse.json({ message: 'Ranking unavailable' }, { status: 503 });
    const url = new URL(request.url);
    const pageNumber = Number(url.searchParams.get('page') ?? 1);
    const compatibility = url.searchParams.get('compatibility') ?? '';
    const records = getScenario() === 'empty' ? [] : readRecords()
      .filter((record) => record.compatibilityKey === compatibility)
      .sort((a, b) => b.score - a.score || a.activeDurationSeconds - b.activeDurationSeconds || a.timestamp.localeCompare(b.timestamp) || a.matchId.localeCompare(b.matchId));
    return HttpResponse.json(page(records, pageNumber));
  }),

  http.get('/api/history', async ({ request }) => {
    const commonFailure = await scenarioDelay();
    if (commonFailure) return commonFailure;
    if (getScenario() === 'history-failure') return HttpResponse.json({ message: 'History unavailable' }, { status: 503 });
    const url = new URL(request.url);
    const pageNumber = Number(url.searchParams.get('page') ?? 1);
    const playerId = url.searchParams.get('playerId') ?? '';
    const records = getScenario() === 'empty' ? [] : readRecords()
      .filter((record) => record.playerId === playerId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.matchId.localeCompare(b.matchId));
    return HttpResponse.json(page(records, pageNumber));
  }),

  http.post('/api/matches', async ({ request }) => {
    const commonFailure = await scenarioDelay();
    if (commonFailure) return commonFailure;
    const record = await request.json() as MatchRecord;
    if (request.headers.get('Idempotency-Key') !== record.matchId) {
      return HttpResponse.json({ message: 'Invalid idempotency key' }, { status: 400 });
    }
    const confirmed = upsertRecord(record);
    if (getScenario() === 'timeout-after-registration') {
      await delay(3_500);
      return HttpResponse.error();
    }
    return HttpResponse.json(confirmed, { status: 201 });
  }),
];

