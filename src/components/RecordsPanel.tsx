import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { NETWORK_SCENARIOS, type NetworkScenario } from '../api/contracts';
import { getPendingRecords } from '../api/pending';
import { getPlayer } from '../api/player';
import { useHistory, useRanking, useSubmitMatch } from '../hooks/useRecords';
import { resetRecords } from '../mocks/database';
import { getScenario, setScenario } from '../mocks/scenario';

interface RecordsPanelProps {
  readonly compatibility: string;
}

export function RecordsPanel({ compatibility }: RecordsPanelProps) {
  const [tab, setTab] = useState<'ranking' | 'history'>('ranking');
  const [page, setPage] = useState(1);
  const [scenario, setScenarioState] = useState<NetworkScenario>(getScenario);
  const [pending, setPending] = useState(getPendingRecords);
  const player = getPlayer();
  const ranking = useRanking(page, compatibility);
  const history = useHistory(page, player.id);
  const retry = useSubmitMatch();
  const queryClient = useQueryClient();
  const query = tab === 'ranking' ? ranking : history;

  const changeTab = (next: typeof tab): void => {
    setTab(next);
    setPage(1);
  };

  const changeScenario = (next: NetworkScenario): void => {
    setScenario(next);
    setScenarioState(next);
    void queryClient.resetQueries();
  };

  const resetMockState = (): void => {
    resetRecords();
    setScenario('success');
    setScenarioState('success');
    queryClient.clear();
  };

  const retryPending = (): void => {
    const record = pending[0];
    if (!record) return;
    retry.mutate(record, {
      onSuccess: () => setPending(getPendingRecords()),
    });
  };

  return (
    <section className="recordsPanel" aria-label="Captain records">
      <div className="recordTabs" role="tablist" aria-label="Records">
        <button type="button" role="tab" aria-selected={tab === 'ranking'} onClick={() => changeTab('ranking')}>World ranking</button>
        <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => changeTab('history')}>Match history</button>
      </div>

      {query.isPending && <p className="recordState" aria-live="polite">Loading ship logs…</p>}
      {query.isError && (
        <div className="recordState errorState" role="alert">
          <p>Records are unavailable. Gameplay remains ready.</p>
          <button type="button" onClick={() => void query.refetch()}>Try again</button>
        </div>
      )}
      {query.data && query.data.items.length === 0 && <p className="recordState">No records found for this fleet configuration.</p>}
      {query.data && query.data.items.length > 0 && (
        <div className="recordTableWrap">
          <table>
            <thead><tr><th>{tab === 'ranking' ? 'Rank' : 'Date'}</th><th>Captain</th><th>Score</th><th>Duration</th></tr></thead>
            <tbody>
              {query.data.items.map((record, index) => (
                <tr key={record.matchId}>
                  <td>{tab === 'ranking' ? (query.data.page - 1) * query.data.pageSize + index + 1 : new Date(record.timestamp).toLocaleDateString()}</td>
                  <td>{record.playerName}</td>
                  <td><strong>{record.score}</strong></td>
                  <td>{Math.round(record.activeDurationSeconds)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button type="button" disabled={query.data.page <= 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {query.data.page} of {query.data.totalPages}</span>
            <button type="button" disabled={query.data.page >= query.data.totalPages || query.isFetching} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="pendingNotice">
          <span>{pending.length} match submission{pending.length === 1 ? '' : 's'} pending</span>
          <button type="button" disabled={retry.isPending} onClick={retryPending}>{retry.isPending ? 'Retrying…' : 'Retry oldest'}</button>
        </div>
      )}

      <details className="networkTools">
        <summary>Network scenario tools</summary>
        <label>Scenario
          <select value={scenario} onChange={(event) => changeScenario(event.target.value as NetworkScenario)}>
            {NETWORK_SCENARIOS.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <button type="button" onClick={resetMockState}>Reset mock records and scenario</button>
      </details>
    </section>
  );
}

